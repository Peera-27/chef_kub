import { loadKitchenSettings } from "../utils/storage/kitchenEquipment";
import { useState, useRef, useEffect, useMemo } from "react";
import { generateRecipes } from "../actions/generateRecipe";
import { generateRecipeImage } from "../actions/generateRecipeImage";
import { getCachedRecipeImages } from "../actions/getCachedRecipeImages";
import { detectIngredients } from "../actions/detectIngredients";
import type { Notice } from "../components/NoticeModal";
import { listClasses } from "../actions/classes";
import { findLabeledImage } from "../actions/getLabeledImage";
import { saveLabeledImage } from "../actions/saveLabeledImage";
/* import type เท่านั้น — โมดูลนี้ import tfjs ไว้บนหัวไฟล์ ถ้าดึงแบบ static
   tfjs จะติดเข้า bundle ก้อนแรกทางนี้ ทั้งที่ useYoloModel เลี่ยงไปแล้ว
   ตัวฟังก์ชันโหลดด้วย dynamic import ตอนจะสแกนจริง */
import type { YoloDetectionResult } from "../lib/yolo/runYoloDetection";
import type { Recipe } from "../types/recipe";
import { mergeIngredients } from "../utils/mergeIngredients";
import { getActiveIngredients } from "../utils/activeIngredients";
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
import { getModelVersionOverride, useYoloModel } from "./useYoloModel";

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
function saveErrorNotice(error?: string): Notice {
  // ทุกเคสค้างอยู่หน้าแก้ไข — hint เดียวกันคือย้ำว่ากรอบที่ลากไว้ยังอยู่
  const keptHint = "กรอบที่แก้ไว้ยังอยู่ครบ ไม่ได้หายไปไหน";
  switch (error) {
    case "rate_limited":
      return {
        title: "บันทึกถี่ไปหน่อยแล้ว",
        message: "พักสักครู่แล้วค่อยกดบันทึกอีกครั้งนะ",
        hint: keptHint,
      };
    case "missing_config":
      return {
        title: "ยังบันทึกไม่ได้",
        message: "ระบบยังไม่ได้เชื่อมต่อฐานข้อมูล เลยเก็บ label ไว้ไม่ได้",
        hint: "รบกวนแจ้งผู้ดูแลระบบให้หน่อยนะ",
      };
    default:
      return {
        title: "บันทึกไม่สำเร็จ",
        message: "ลองกดบันทึกอีกครั้งดูนะ",
        hint: keptHint,
      };
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
  const {
    ensureModel: ensureYoloModel,
    prefetchModel: prefetchYoloModel,
    isModelReady: isYoloModelReady,
  } = useYoloModel();

  const [loading, setLoading] = useState({ state: false, message: "" });
  // true ระหว่างทยอย gen รูปอาหารหลังได้สูตรแล้ว — การ์ดจะโชว์ skeleton แทน overlay ทับจอ
  const [imageGenPending, setImageGenPending] = useState(false);
  const [gallery, setGallery] = useState<ImageItem[]>([]);
  const [historySelection, setHistorySelection] = useState<string[] | null>(null);
  const allItems = useMemo(
    () => getActiveIngredients(gallery, historySelection),
    [gallery, historySelection],
  );
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
  const [notice, setNotice] = useState<Notice | null>(null);
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
  const [pendingRect, setPendingRect] = useState<BoundingBox | null>(null);
  const [editingBoxIndex, setEditingBoxIndex] = useState<number | null>(null);
  const [classOptions, setClassOptions] = useState<ClassEntry[]>([]);

  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestRef = useRef(0);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const imageCache = useRef<Map<string, CachedImageResult>>(new Map());
  const ingredientsKeyRef = useRef("");

  useEffect(() => {
    setFavorites(loadFavorites());
    setHistory(loadHistory());
    listClasses().then((entries) => {
      setClassRegistry(entries);
      setClassOptions(entries);
    });
  }, []);

  useEffect(() => {
    const nextKey = [...allItems].sort().join("|");

    // A menu generated from the previous ingredient set becomes misleading as
    // soon as the user adds, removes, or corrects an ingredient.
    if (ingredientsKeyRef.current !== nextKey && recipes.length > 0) {
      setRecipes([]);
    }

    ingredientsKeyRef.current = nextKey;
  }, [allItems, recipes.length]);

  useEffect(
    () => () => {
      cameraRequestRef.current += 1;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const stopCamera = () => {
    cameraRequestRef.current += 1;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraStream(null);
  };

  const startCamera = async () => {
    /* กดเปิดกล้อง = ตั้งใจจะสแกนแน่แล้ว เริ่มดึงน้ำหนักโมเดลคู่ขนานไปเลย
       ระหว่างที่ผู้ใช้รอ permission prompt + เล็งภาพ ไม่ใช่ไปเริ่มตอนกดชัตเตอร์เสร็จ */
    prefetchYoloModel();
    stopCamera();
    setHistorySelection(null);
    const requestId = ++cameraRequestRef.current;
    setViewMode("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      setCameraStream(stream);
    } catch {
      if (requestId !== cameraRequestRef.current) return;
      setNotice({
        title: "เปิดกล้องไม่ได้",
        message: "เบราว์เซอร์ยังไม่ได้อนุญาตให้ใช้กล้อง",
        hint: "กดไอคอนหน้า URL แล้วเปิดสิทธิ์กล้อง หรือเลือกรูปจากเครื่องแทนก็ได้",
      });
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
        setNotice(
          result.reason === "rate_limited"
            ? {
                title: "คิดเมนูถี่ไปหน่อยแล้ว",
                message: "พักสักครู่แล้วค่อยลองใหม่นะ ชั่วโมงหน้าได้ต่อ",
              }
            : {
                title: "คิดเมนูไม่สำเร็จ",
                message: "มีอะไรสะดุดระหว่างทาง ลองกดอีกครั้งดูนะ",
              },
        );
        return false;
      }

      const res = result.recipes;

      if (res.length === 0) {
        setNotice({
          title: "ยังนึกเมนูไม่ออกเลย",
          message: "ของเท่าที่มีอยู่ยังจับเป็นเมนูไม่ได้",
          hint: "ลองสแกนเพิ่มอีกสักใบ หรือเช็คว่าของที่สแกนมากินได้จริงไหม",
        });
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
        setNotice({
          title: "โควตารูปอาหารวันนี้หมดแล้ว",
          message: "เดี๋ยวรีเซ็ตพรุ่งนี้ วันนี้เมนูจะไม่มีรูปประกอบนะ",
          hint: "สูตรกับขั้นตอนทำยังใช้ได้ครบตามปกติ",
        });
      }

      return true;
    } catch (err) {
      console.error(err);
      setNotice({
        title: "คิดเมนูไม่สำเร็จ",
        message: "มีอะไรสะดุดระหว่างทาง ลองกดอีกครั้งดูนะ",
      });
      return false;
    } finally {
      setLoading({ state: false, message: "" });
      setImageGenPending(false);
    }
  };

  const processImage = async (rawBase64Url: string) => {
    setHistorySelection(null);
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

      /* ปกติโมเดลถูกสั่งโหลดไปตั้งแต่ตอนเปิดกล้อง/เปิดตัวเลือกไฟล์แล้ว (prefetchYoloModel)
         บรรทัดนี้จึงมักได้ของที่โหลดเสร็จ/โหลดค้างอยู่แล้ว ไม่ใช่เริ่มนับหนึ่งใหม่ —
         แต่ยังต้องเรียกอยู่ดี เพราะมีทางเข้าที่ข้าม prefetch ได้ (เช่นวางรูปทับหน้า)
         ถ้าโหลดไม่ได้หรือเครื่องแรงไม่พอจะได้ null กลับมา แล้วปล่อยให้ Gemini ตัดสินคนเดียว */
      /* ต่อท้ายข้อความว่าใช้น้ำหนักเวอร์ชันไหน เฉพาะตอนถูกบังคับด้วย ?model= —
         บน iPhone เปิด console ไม่ได้ถ้าไม่มี Mac ต้องมีอะไรบนจอให้ยืนยันว่าสลับติดจริง
         ไม่งั้นถ่ายรูปเทียบ v1/v2 ไปก็ไม่รู้ว่าได้เทียบจริงหรือดูของตัวเดิมสองรอบ */
      const modelTag = getModelVersionOverride();
      const withTag = (message: string) =>
        modelTag ? `${message} [${modelTag}]` : message;

      setLoading({
        state: true,
        message: withTag(
          isYoloModelReady()
            ? "กำลังสแกนวัตถุดิบ..."
            : "กำลังเตรียมตัวสแกน (ครั้งแรกโหลดนานหน่อย)...",
        ),
      });
      const model = await ensureYoloModel();

      let yoloResult: YoloDetectionResult = { items: [], boxes: [], ms: 0 };
      if (model) {
        setLoading({ state: true, message: withTag("กำลังสแกนวัตถุดิบ...") });
        // โมเดลโหลดได้แปลว่า tfjs อยู่ในแคชแล้ว — import นี้จึงไม่ต้องรอโหลดซ้ำ
        const { runYoloDetection } = await import(
          "../lib/yolo/runYoloDetection"
        );
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
      } else if (verdict.reason === "not_food") {
        /* ไม่มีของกินในรูปเลย — ไม่เข้าแกลเลอรี เพราะรูปเปล่าที่เข้าไปได้แปลว่า
           ผู้ใช้ลากกรอบแปะชื่อวัตถุดิบทับหน้าคนแล้วกดบันทึกได้ ซึ่งจะไหลไปปน
           training data ทั้งชุด กันตั้งแต่ตรงนี้จบกว่าไปกันทีหลังตอนบันทึก */
        setNotice({
          title: "ไม่เจอของกินในรูปเลย",
          message: "รูปนี้ดูไม่มีวัตถุดิบหรือของกินอยู่เลย เลยเอาไปคิดเมนูต่อไม่ได้",
          hint: "ลองถ่ายของในตู้เย็น ของสดบนเขียง หรือถุงของจากตลาดดูนะ",
          actionLabel: "ถ่ายใหม่",
        });
        return;
      } else if (verdict.reason === "prepared_dish") {
        // จานที่ทำเสร็จแล้วเอาไปทำต่อไม่ได้ — ทิ้งผล YOLO ไปเลย ไม่งั้นจะเหลือ
        // ข้าวสวย/ไข่ดาว/กะเพรา ค้างอยู่ แล้วดูเหมือนแอปแตกสูตรจากจานได้จริง
        setNotice({
          title: "อันนี้ทำเสร็จแล้วนี่นา",
          message:
            "รูปนี้ดูเหมือนอาหารที่ปรุงเสร็จจัดจานแล้ว เลยเอาไปคิดเมนูต่อไม่ได้",
          hint: "ลองถ่ายของในตู้เย็น ของสดบนเขียง หรือถุงของจากตลาดดูนะ",
          actionLabel: "ถ่ายใหม่",
        });
        return;
      } else if (verdict.reason === "quota") {
        // โควตา Gemini หมด — ตรวจสอบไม่ได้ ใช้ผล YOLO ดิบ ๆ ไปก่อน (ดีกว่าไม่มีอะไรเลย)
        setNotice({
          title: "โควตา AI วันนี้หมดแล้ว",
          message: "เดี๋ยวรีเซ็ตพรุ่งนี้ ระหว่างนี้ยังสแกนต่อได้อยู่",
          hint: "ผลที่เห็นมาจาก YOLO ตรง ๆ ยังไม่ผ่านการตรวจสอบ อาจมีของที่ไม่แม่น ลบหรือแก้เองได้",
        });
      } else if (verdict.reason === "rate_limited") {
        // เหมือนกรณีโควตาหมด ต่างแค่รอชั่วโมงเดียวไม่ใช่ข้ามวัน
        setNotice({
          title: "สแกนถี่ไปหน่อยแล้ว",
          message: "พักสักครู่แล้วค่อยลองใหม่นะ ชั่วโมงหน้าได้ต่อ",
          hint: "ผลที่เห็นมาจาก YOLO ตรง ๆ ยังไม่ผ่านการตรวจสอบ อาจมีของที่ไม่แม่น ลบหรือแก้เองได้",
        });
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
      setNotice({
        title: "วิเคราะห์รูปไม่สำเร็จ",
        message: "มีอะไรสะดุดระหว่างทาง ลองสแกนอีกครั้งดูนะ",
      });
    } finally {
      setLoading({ state: false, message: "" });
    }
  };

  /* รับ element มาจาก CameraView ที่ถูกกดจริง ๆ ไม่ใช้ ref ก้อนกลาง
     เพราะ layout จอเล็ก/จอใหญ่ mount CameraView ไว้พร้อมกันทั้งคู่ ref เดียวจะโดนทับกัน */
  const capturePhoto = (video: HTMLVideoElement) => {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
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

  const quickStartFromHistory = (items: string[]) => {
    const selectedItems = Array.from(
      new Set(items.map((item) => item.trim()).filter(Boolean)),
    );
    if (selectedItems.length === 0) return;

    setHistorySelection(selectedItems);
    setRecipes([]);
    setViewMode("home");
  };

  const removeHistoryIngredient = (itemName: string) => {
    setHistorySelection((current) =>
      current?.filter((item) => item !== itemName) ?? null,
    );
    setRecipes([]);
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
      setNotice({
        title: `ยังมี ${invalid.length} กรอบที่ไม่รู้จัก`,
        message: invalid.map((b) => b.label).join(", "),
        hint: 'กด "แก้ไข" ที่กรอบนั้นแล้วเลือกชื่อจากรายการก่อนบันทึกนะ',
      });
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
        setNotice(saveErrorNotice(result.error));
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
      setNotice(saveErrorNotice());
    } finally {
      setLoading({ state: false, message: "" });
    }
  };
  
  

  return {
    notice,
    dismissNotice: () => setNotice(null),
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
    cameraStream,
    startCamera,
    capturePhoto,
    processImage,
    prefetchScanner: prefetchYoloModel,
    removeItem,
    removeImage,
    handleInventRecipe,
    quickStartFromHistory,
    selectedHistoryItems: historySelection,
    removeHistoryIngredient,
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
