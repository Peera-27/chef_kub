import { loadKitchenSettings } from "../utils/storage/kitchenEquipment";
import { useState, useRef, useEffect } from "react";
import { generateRecipes } from "../actions/generateRecipe";
import { generateRecipeImage } from "../actions/generateRecipeImage";
import { getCachedRecipeImages } from "../actions/getCachedRecipeImages";
import { detectIngredients } from "../actions/detectIngredients";
import { listClasses } from "../actions/classes";
import { findLabeledImage } from "../actions/getLabeledImage";
import { saveLabeledImage } from "../actions/saveLabeledImage";
import { runYoloDetection } from "../lib/yolo/runYoloDetection";
import type { Recipe } from "../types/recipe";
import { mergeIngredients } from "../utils/mergeIngredients";
import {
  BoundingBox,
  ImageItem,
  IngredientItem,
  ScanHistoryEntry,
} from "../utils/types";
import {
  addHistoryEntry,
  loadFavorites,
  loadHistory,
  updateFavoriteImage,
} from "../utils/storage";
import { downscaleImage } from "../utils/downscaleImage";
import { hashImageBase64 } from "../utils/imageHash";
import { perceptualHashBase64 } from "../utils/perceptualHash";
import { getOrCreateSessionId } from "../utils/sessionId";
import { normalizePixelRect } from "../utils/toYoloBBox";
import {
  resolveClassId,
  setClassRegistry,
  type ClassEntry,
} from "../utils/classRegistry";
import {
  DEFAULT_COOKING_MODE,
  getCookingMode,
  type CookingMode,
} from "../utils/cookingModes";
import { useYoloModel } from "./useYoloModel";

function syncItemsFromBoxes(
  boxes: BoundingBox[],
  prevItems: IngredientItem[],
): IngredientItem[] {
  const sourceByLabel = new Map(prevItems.map((item) => [item.name, item.source]));
  const seen = new Set<string>();
  const items: IngredientItem[] = [];

  for (const box of boxes) {
    if (seen.has(box.label)) continue;
    seen.add(box.label);
    items.push({
      name: box.label,
      source: sourceByLabel.get(box.label) ?? "manual",
    });
  }

  return items;
}

interface CachedImageResult {
  items: IngredientItem[];
  boxes: BoundingBox[];
  imageWidth: number;
  imageHeight: number;
}

async function measureImage(
  base64Url: string,
): Promise<{ width: number; height: number }> {
  const img = new Image();
  img.src = base64Url;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("โหลดรูปไม่สำเร็จ"));
  });
  return { width: img.naturalWidth, height: img.naturalHeight };
}

/** แปลง error code จาก saveLabeledImage เป็นข้อความที่บอกผู้ใช้ว่าทำอะไรต่อได้ */
function saveErrorMessage(error?: string): string {
  switch (error) {
    case "rate_limited":
      return "บันทึกบ่อยเกินไปในชั่วโมงนี้ พักสักครู่แล้วกดบันทึกอีกครั้ง\nกรอบที่แก้ไว้ยังอยู่ ไม่ได้หายไปไหน";
    case "missing_config":
      return "ระบบยังไม่ได้เชื่อมต่อฐานข้อมูล จึงบันทึก label ไม่ได้\nกรุณาแจ้งผู้ดูแลระบบ";
    default:
      return "บันทึก label ไม่สำเร็จ กรุณาลองกดบันทึกอีกครั้ง\nกรอบที่แก้ไว้ยังอยู่ ไม่ได้หายไปไหน";
  }
}

export type ViewMode =
  | "home"
  | "camera"
  | "recipes"
  | "edit"
  | "favorites"
  | "cook"
  | "settings";

export function useChefKub() {
  const { ensureModel: ensureYoloModel, isFirstLoad: isYoloFirstLoad } =
    useYoloModel();

  const [loading, setLoading] = useState({ state: false, message: "" });
  // true ระหว่างทยอย gen รูปอาหารหลังได้สูตรแล้ว — การ์ดจะโชว์ skeleton แทน overlay ทับจอ
  const [imageGenPending, setImageGenPending] = useState(false);
  const [gallery, setGallery] = useState<ImageItem[]>([]);
  const [allItems, setAllItems] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [favVersion, setFavVersion] = useState(0);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [cookingMode, setCookingMode] =
    useState<CookingMode>(DEFAULT_COOKING_MODE);

  const [editingImage, setEditingImage] = useState<ImageItem | null>(null);
const isDrawingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
  const [pendingRect, setPendingRect] = useState<BoundingBox | null>(null);
  const [editingBoxIndex, setEditingBoxIndex] = useState<number | null>(null);
  const [classOptions, setClassOptions] = useState<ClassEntry[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const imageCache = useRef<Map<string, CachedImageResult>>(new Map());

  useEffect(() => {
    setFavorites(loadFavorites());
    setHistory(loadHistory());
    listClasses().then((entries) => {
      setClassRegistry(entries);
      setClassOptions(entries);
    });
  }, []);

  useEffect(() => {
    const merged = new Set<string>();
    gallery.forEach((img) => {
      img.items.forEach((item) => merged.add(item.name));
    });
    setAllItems(Array.from(merged));
  }, [gallery]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startCamera = async () => {
    setViewMode("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      alert("ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้กล้องแล้วลองใหม่");
      setViewMode("home");
    }
  };

  const removeImage = (imageId: string) => {
    setGallery((prev) => prev.filter((img) => img.id !== imageId));
  };

  const applyRecipeImage = (dishName: string, imageUrl: string) => {
    setRecipes((prev) =>
      prev.map((r) => (r.name === dishName ? { ...r, imageUrl } : r)),
    );
  };

  /**
   * โควตา neurons รายวันของ Workers AI มีจำกัด จึงไม่ gen รูปให้ทุกเมนูอีกแล้ว:
   * เมนูที่เคย gen ไว้แล้วเติมได้ฟรีทุกใบ ส่วนที่ยังไม่มีรูป gen สดแค่การ์ดใบแรก
   * ที่เหลือรอจนผู้ใช้กด "เริ่มทำอาหาร" ค่อย gen (ดู ensureRecipeImage)
   */
  const attachRecipeImages = async (
    recipeList: Recipe[],
    mode: CookingMode,
  ): Promise<{ quotaExhausted: boolean }> => {
    const { imageStyle } = getCookingMode(mode);

    const cached = await getCachedRecipeImages(
      recipeList.map((r) => r.name),
      imageStyle,
    );
    for (const [dishName, imageUrl] of Object.entries(cached)) {
      applyRecipeImage(dishName, imageUrl);
    }

    const hero = recipeList[0];
    if (!hero || cached[hero.name]) return { quotaExhausted: false };

    try {
      const result = await generateRecipeImage(
        hero.imagePrompt || hero.name,
        imageStyle,
        // แคชด้วยชื่อเมนู ไม่ใช่ imagePrompt — prompt โมเดลเขียนใหม่ไม่ซ้ำเดิมทุกครั้ง
        // ใช้เป็น key เมื่อไหร่ก็ไม่มีวันเจอของเก่า
        hero.name,
      );
      if (result.ok) applyRecipeImage(hero.name, result.imageUrl);
      return { quotaExhausted: !result.ok && result.reason === "quota" };
    } catch {
      // รูปพลาดก็ข้ามไป — สูตรยังใช้ได้
      return { quotaExhausted: false };
    }
  };

  /** gen รูปตอนผู้ใช้เปิดเมนูจริง ๆ — ถ้าเคย gen ไว้แล้วจะได้ของในแคชฟรี ๆ */
  const ensureRecipeImage = async (recipe: Recipe) => {
    if (recipe.imageUrl) return;

    const { imageStyle } = getCookingMode(cookingMode);
    setImageGenPending(true);

    try {
      const result = await generateRecipeImage(
        recipe.imagePrompt || recipe.name,
        imageStyle,
        recipe.name,
      );
      if (!result.ok) return;

      applyRecipeImage(recipe.name, result.imageUrl);
      setActiveRecipe((prev) =>
        prev?.name === recipe.name
          ? { ...prev, imageUrl: result.imageUrl }
          : prev,
      );
      // เมนูที่กดหัวใจไว้เก็บไว้ใน localStorage ตั้งแต่ตอนยังไม่มีรูป — เติมให้ด้วย
      if (updateFavoriteImage(recipe.name, result.imageUrl)) refreshFavorites();
    } catch {
      // ไม่ได้รูปก็ทำอาหารต่อได้ ไม่ต้องรบกวนผู้ใช้
    } finally {
      setImageGenPending(false);
    }
  };

  const generateRecipesFlow = async (
    ingredients: string[],
    options: { navigate?: boolean } = { navigate: true },
  ) => {
    if (ingredients.length === 0) return false;

    setLoading({ state: true, message: "กำลังจัดเมนูให้คุณทำเลย..." });
    try {
      const kitchenSettings = loadKitchenSettings();
      const equipment = kitchenSettings?.equipment ?? [];

      const result = await generateRecipes(ingredients, cookingMode, equipment);

      if (!result.ok) {
        alert(
          result.reason === "rate_limited"
            ? "คุณสร้างสูตรบ่อยเกินไปในชั่วโมงนี้ พักสักครู่แล้วลองใหม่นะ"
            : "ไม่สามารถสร้างสูตรได้ กรุณาลองใหม่",
        );
        return false;
      }

      const res = result.recipes;

      if (res.length === 0) {
        alert(
          "ไม่พบเมนูที่เหมาะกับวัตถุดิบนี้ ลองเพิ่มรูปอีกใบ หรือเช็คว่าของที่สแกนมากินได้จริง",
        );
        return false;
      }

      // โชว์สูตรทันที ปิด overlay แล้วค่อยทยอยเติมรูป (การ์ดโชว์ skeleton ระหว่างรอ)
      setRecipes(res);
      if (options.navigate) setViewMode("recipes");
      setLoading({ state: false, message: "" });

      addHistoryEntry(ingredients, gallery.length);
      setHistory(loadHistory());

      setImageGenPending(true);
      const { quotaExhausted } = await attachRecipeImages(res, cookingMode);

      if (quotaExhausted) {
        alert(
          "โควตาสร้างรูปอาหารของวันนี้หมดแล้ว (รีเซ็ตพรุ่งนี้)\nสูตรอาหารยังใช้ได้ตามปกติ แค่ไม่มีรูปประกอบ",
        );
      }

      return true;
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถสร้างสูตรได้ กรุณาลองใหม่");
      return false;
    } finally {
      setLoading({ state: false, message: "" });
      setImageGenPending(false);
    }
  };

  const processImage = async (rawBase64Url: string) => {
    /* ย่อตรงนี้จุดเดียว เพราะทั้งกล้องและอัปโหลดไฟล์ไหลผ่าน processImage หมด
       และต้องย่อ "ก่อน" คิด hash — ไม่งั้น hash จะไม่ตรงกับไฟล์ที่เก็บจริงใน R2 */
    const base64Url = await downscaleImage(rawBase64Url);

    if (imageCache.current.has(base64Url)) {
      const cached = imageCache.current.get(base64Url)!;
      setLoading({ state: true, message: "แคชรูปภาพ — วิเคราะห์ทันที ⚡" });
      setGallery((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          url: base64Url,
          items: cached.items,
          boxes: cached.boxes,
          imageWidth: cached.imageWidth,
          imageHeight: cached.imageHeight,
        },
      ]);
      setLoading({ state: false, message: "" });
      return;
    }

    setLoading({ state: true, message: "กำลังวิเคราะห์วัตถุดิบ..." });

    try {
      const { width: imageWidth, height: imageHeight } =
        await measureImage(base64Url);
      const [hash, phash] = await Promise.all([
        hashImageBase64(base64Url),
        perceptualHashBase64(base64Url),
      ]);

      setLoading({ state: true, message: "กำลังเช็คภาพที่เคยบันทึก..." });
      const saved = await findLabeledImage({ imageHash: hash, phash });

      if (saved) {
        setLoading({
          state: true,
          message:
            saved.matchType === "similar"
              ? "เจอรูปคล้ายกับที่เคยบันทึก — ใช้ label เดิม ✨"
              : "เจอรูปที่เคยบันทึก — โหลด label ทันที ⚡",
        });
        const result: CachedImageResult = {
          items: saved.items,
          boxes: saved.boxes,
          imageWidth: saved.imageWidth,
          imageHeight: saved.imageHeight,
        };
        imageCache.current.set(base64Url, result);
        setGallery((prev) => [
          ...prev,
          {
            id: `${Date.now()}`,
            url: base64Url,
            items: saved.items,
            boxes: saved.boxes,
            imageWidth: saved.imageWidth,
            imageHeight: saved.imageHeight,
          },
        ]);
        setLoading({ state: false, message: "" });
        return;
      }

      /* โมเดลเริ่มโหลดตรงนี้ ไม่ใช่ตอนเปิดหน้า — ครั้งแรกจะรอนาน (11MB) แต่ครั้งถัด ๆ ไป
         ได้จากแคชเบราว์เซอร์ทันที ถ้าโหลดไม่ได้หรือเครื่องแรงไม่พอจะได้ null กลับมา
         แล้วปล่อยให้ Gemini ตัดสินคนเดียว ซึ่งยังใช้งานได้ครบ */
      setLoading({
        state: true,
        message: isYoloFirstLoad()
          ? "กำลังเตรียมตัวสแกน (ครั้งแรกโหลดนานหน่อย)..."
          : "กำลังสแกนวัตถุดิบ...",
      });
      const model = await ensureYoloModel();

      let yoloResult = { items: [], boxes: [], ms: 0 } as Awaited<
        ReturnType<typeof runYoloDetection>
      >;
      if (model) {
        setLoading({ state: true, message: "กำลังสแกนวัตถุดิบ..." });
        yoloResult = await runYoloDetection(model, base64Url);
      }

      // Gemini เป็นตัวตัดสินสุดท้ายของทุกภาพ — YOLO "มั่นใจแต่มั่ว" ได้ จึงไม่เชื่อ
      // count/confidence ของมันตรง ๆ ส่ง label ที่ YOLO เดาไปให้ Gemini ยืนยัน/ปฏิเสธ
      let items = yoloResult.items;
      let boxes = yoloResult.boxes;

      setLoading({ state: true, message: "ให้ AI ตรวจสอบวัตถุดิบ..." });
      const verdict = await detectIngredients(
        base64Url,
        yoloResult.items.map((item) => item.name),
      );

      if (verdict.ok) {
        // เก็บเฉพาะ box ที่ Gemini ยืนยัน — ที่เหลือคือของมั่ว ตัดทิ้งทั้งใน list และบนรูป
        const confirmed = new Set(verdict.confirmed);
        boxes = yoloResult.boxes.filter((box) => confirmed.has(box.label));
        items = mergeIngredients([
          ...verdict.confirmed.map((name) => ({
            name,
            source: "yolo" as const,
          })),
          ...verdict.added.map((name) => ({
            name,
            source: "gemini" as const,
          })),
        ]);
      } else if (verdict.reason === "quota") {
        // โควตา Gemini หมด — ตรวจสอบไม่ได้ ใช้ผล YOLO ดิบ ๆ ไปก่อน (ดีกว่าไม่มีอะไรเลย)
        alert(
          "โควตา AI ตรวจสอบของวันนี้หมดแล้ว (รีเซ็ตพรุ่งนี้)\nแสดงผลจาก YOLO ตรง ๆ อาจมีของที่ไม่แม่น ลบ/แก้เองได้",
        );
      } else if (verdict.reason === "rate_limited") {
        // เหมือนกรณีโควตาหมด ต่างแค่รอชั่วโมงเดียวไม่ใช่ข้ามวัน
        alert(
          "คุณสแกนบ่อยเกินไปในชั่วโมงนี้ พักสักครู่แล้วลองใหม่นะ\nระหว่างนี้แสดงผลจาก YOLO ตรง ๆ อาจมีของที่ไม่แม่น ลบ/แก้เองได้",
        );
      }

      if (items.length > 0 || boxes.length > 0) {
        imageCache.current.set(base64Url, {
          items,
          boxes,
          imageWidth,
          imageHeight,
        });
      }

      setGallery((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          url: base64Url,
          items,
          boxes,
          imageWidth,
          imageHeight,
        },
      ]);
    } catch {
      alert("เกิดข้อผิดพลาดในการวิเคราะห์รูป กรุณาลองใหม่");
    } finally {
      setLoading({ state: false, message: "" });
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg");
    stopCamera();
    setViewMode("home");
    processImage(base64);
  };

  const removeItem = (imageId: string, itemName: string) => {
    setGallery((prev) =>
      prev.map((img) => {
        if (img.id !== imageId) return img;
        return {
          ...img,
          items: img.items.filter((item) => item.name !== itemName),
          boxes: img.boxes?.filter((box) => box.label !== itemName),
        };
      }),
    );
  };

  const handleInventRecipe = async () => {
    await generateRecipesFlow(allItems);
  };

  const quickStartFromHistory = async (items: string[]) => {
    await generateRecipesFlow(items);
  };

  const applyImageUpdate = (updated: ImageItem) => {
    setGallery((prev) =>
      prev.map((img) => (img.id === updated.id ? updated : img)),
    );
    setEditingImage(updated);
  };

  const cancelLabelPicker = () => {
    setLabelPickerOpen(false);
    setPendingRect(null);
    setEditingBoxIndex(null);
  };

  const confirmLabelSelection = (label: string) => {
    if (!editingImage) {
      cancelLabelPicker();
      return;
    }

    const boxes = [...(editingImage.boxes ?? [])];

    if (editingBoxIndex !== null) {
      boxes[editingBoxIndex] = { ...boxes[editingBoxIndex], label };
      const items = syncItemsFromBoxes(boxes, editingImage.items).map((item) =>
        item.name === label ? { name: label, source: "manual" as const } : item,
      );
      applyImageUpdate({ ...editingImage, boxes, items });
    } else if (pendingRect) {
      
      const boxCoords = {
        x: pendingRect.x,
        y: pendingRect.y,
        w: pendingRect.w,
        h: pendingRect.h,
      };
      const newBox: BoundingBox = { ...boxCoords, label };
      boxes.push(newBox);
      applyImageUpdate({
        ...editingImage,
        boxes,
        items: mergeIngredients([
          ...editingImage.items,
          { name: label, source: "manual" as const },
        ]),
      });
      }
      
      
    

    cancelLabelPicker();
  };

  const removeBoxAtIndex = (index: number) => {
    if (!editingImage?.boxes) return;
    const boxes = editingImage.boxes.filter((_, i) => i !== index);
    applyImageUpdate({
      ...editingImage,
      boxes,
      items: syncItemsFromBoxes(boxes, editingImage.items),
    });
  };

  const startEditBoxLabel = (index: number) => {
    setPendingRect(null);
    setEditingBoxIndex(index);
    setLabelPickerOpen(true);
  };

  const handleClassesChange = (entries: ClassEntry[]) => {
    setClassRegistry(entries);
    setClassOptions(entries);
  };

  const quickCookFavorite = (recipe: Recipe) => {
    setActiveRecipe(recipe);
    setViewMode("cook");
    ensureRecipeImage(recipe);
  };
const getPointerCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget; 
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };
const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (labelPickerOpen) return;
    e.preventDefault(); 
    e.currentTarget.setPointerCapture(e.pointerId);
    
    const pos = getPointerCoords(e); // ส่ง e เข้าไป
    if (pos) {
      startPosRef.current = pos;
      isDrawingRef.current = true;
    }
  };

const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();

    const pos = getPointerCoords(e); // ส่ง e เข้าไป
    if (pos) {
      // ✅ ดึงพิกัดจาก Ref มาใช้ จะได้ค่าที่สดใหม่เสมอ
      setCurrentRect({
        x: startPosRef.current.x,
        y: startPosRef.current.y,
        w: pos.x - startPosRef.current.x,
        h: pos.y - startPosRef.current.y,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId); // ปลดล็อคเมาส์
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (!currentRect || labelPickerOpen) return;

    const rect = normalizePixelRect(currentRect);
    if (Math.abs(rect.w) < 8 || Math.abs(rect.h) < 8) {
      setCurrentRect(null);
      return;
    }

    setPendingRect({ ...rect, label: "" });
    setEditingBoxIndex(null);
    setLabelPickerOpen(true);
    setCurrentRect(null);
  };
  const startCook = (recipe: Recipe) => {
    setActiveRecipe(recipe);
    setViewMode("cook");
    ensureRecipeImage(recipe);
  };

  const endCook = () => {
    setActiveRecipe(null);
    setViewMode("recipes");
  };

  const goHome = () => {
    stopCamera();
    setActiveRecipe(null);
    setViewMode("home");
  };

  const refreshFavorites = () => {
    setFavorites(loadFavorites());
    setFavVersion((v) => v + 1);
  };

  const handleEditImageMetrics = (width: number, height: number) => {
    if (!editingImage) return;
    applyImageUpdate({ ...editingImage, imageWidth: width, imageHeight: height });
  };

  const finishEditing = async () => {
    if (!editingImage) {
      setViewMode("home");
      return;
    }

    const boxes = editingImage.boxes ?? [];

    if (boxes.length === 0) {
      setViewMode("home");
      return;
    }

    const invalid = boxes.filter((box) => resolveClassId(box.label) === null);
    if (invalid.length > 0) {
      alert(
        `มี ${invalid.length} label ที่ไม่รู้จัก (${invalid.map((b) => b.label).join(", ")})\nกรุณากด "แก้ไข" เพื่อเลือกจากรายการ`,
      );
      return;
    }

    setLoading({ state: true, message: "กำลังบันทึกข้อมูล..." });

    try {
      const img = new Image();
      img.src = editingImage.url;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("โหลดรูปไม่สำเร็จ"));
      });

      const sourceByLabel = new Map(
        editingImage.items.map((item) => [item.name, item.source]),
      );

      const imageWidth = editingImage.imageWidth ?? img.naturalWidth;
      const imageHeight = editingImage.imageHeight ?? img.naturalHeight;

      const [imageHash, phash] = await Promise.all([
        hashImageBase64(editingImage.url),
        perceptualHashBase64(editingImage.url),
      ]);

      const result = await saveLabeledImage({
        imageBase64: editingImage.url,
        imageHash,
        phash,
        sessionId: getOrCreateSessionId(),
        imageWidth,
        imageHeight,
        boxes: boxes.map((box) => ({
          ...box,
          source: sourceByLabel.get(box.label) ?? "manual",
        })),
      });

      /* saveLabeledImage ไม่ throw เวลาล้มเหลว มัน return { ok: false } เฉย ๆ
         ถ้าไม่เช็คตรงนี้ catch ข้างล่างจะไม่มีวันทำงาน แล้วผู้ใช้จะเห็นหน้าจอ
         เด้งกลับ home เหมือนบันทึกสำเร็จ ทั้งที่กรอบที่ลากมาทั้งหมดไม่ได้ถูกเก็บ */
      if (!result.ok) {
        console.warn("บันทึก label ไม่สำเร็จ:", result.error);
        alert(saveErrorMessage(result.error));
        // ค้างอยู่หน้าแก้ไขเพื่อให้กดบันทึกซ้ำได้ ไม่ทิ้งงานที่เพิ่งลากกรอบไว้
        return;
      }

      imageCache.current.set(editingImage.url, {
        items: editingImage.items,
        boxes,
        imageWidth,
        imageHeight,
      });
      setViewMode("home");
    } catch (err) {
      console.warn("บันทึก label ไม่สำเร็จ:", err);
      alert(saveErrorMessage());
    } finally {
      setLoading({ state: false, message: "" });
    }
  };
  
  

  return {
    loading,
    imageGenPending,
    gallery,
    allItems,
    currentRect,
    recipes,
    viewMode,
    setViewMode,
    favorites,
    history,
    favVersion,
    activeRecipe,
    cookingMode,
    setCookingMode,
    editingImage,
    setEditingImage,
    videoRef,
    startCamera,
    capturePhoto,
    processImage,
    removeItem,
    removeImage,
    handleInventRecipe,
    quickStartFromHistory,
    quickCookFavorite,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    goHome,
    startCook,
    endCook,
    refreshFavorites,
    finishEditing,
    labelPickerOpen,
    confirmLabelSelection,
    cancelLabelPicker,
    removeBoxAtIndex,
    startEditBoxLabel,
    editingBoxIndex,
    classOptions,
    handleClassesChange,
    handleEditImageMetrics,
  };
}
