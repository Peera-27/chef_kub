import { useState, useRef, useMemo,useEffect } from "react";
import { generateRecipes } from "../actions/generateRecipe";
import { generateRecipeImage } from "../actions/generateRecipeImage";
import { listClasses } from "../actions/classes";
import { getLabeledImageByHash } from "../actions/getLabeledImage";
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
} from "../utils/storage";
import { hashImageBase64 } from "../utils/imageHash";
import { getOrCreateSessionId } from "../utils/sessionId";
import {
  canvasToImagePixels,
  imagePixelsToCanvas,
  normalizePixelRect,
} from "../utils/toYoloBBox";
import {
  setClassRegistry,
  type ClassEntry,
} from "../utils/classRegistry";
import { resolveClassId } from "../utils/resolveClassId";
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

export type ViewMode =
  | "home"
  | "camera"
  | "recipes"
  | "edit"
  | "favorites"
  | "cook";

export function useChefKub() {
  const model = useYoloModel();

  const [loading, setLoading] = useState({ state: false, message: "" });
  const [gallery, setGallery] = useState<ImageItem[]>([]);
  const [allItems, setAllItems] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [favVersion, setFavVersion] = useState(0);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    recipes.forEach((r) => r.tags.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    if (!tagFilter) return recipes;
    return recipes.filter((r) => r.tags.includes(tagFilter));
  }, [recipes, tagFilter]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startCamera = async () => {
    setViewMode("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
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

  const attachRecipeImages = async (recipeList: Recipe[]): Promise<Recipe[]> => {
    return Promise.all(
      recipeList.map(async (recipe) => {
        try {
          const imageUrl = await generateRecipeImage(recipe.name);
          return imageUrl ? { ...recipe, imageUrl } : recipe;
        } catch {
          return recipe;
        }
      }),
    );
  };

  const generateRecipesFlow = async (
    ingredients: string[],
    options: { navigate?: boolean } = { navigate: true },
  ) => {
    if (ingredients.length === 0) return false;

    setLoading({ state: true, message: "กำลังจัดเมนูให้คุณทำเลย..." });
    try {
      const res = await generateRecipes(ingredients);
      if (res.length === 0) {
        alert("ไม่พบเมนูที่เหมาะกับวัตถุดิบนี้ ลองเพิ่มรูปอีกใบ");
        return false;
      }

      setLoading({
        state: true,
        message: `กำลังหารูปอาหาร (${res.length} เมนู)...`,
      });
      const recipesWithImages = await attachRecipeImages(res);

      setRecipes(recipesWithImages);
      setTagFilter(null);
      if (options.navigate) setViewMode("recipes");

      addHistoryEntry(ingredients, gallery.length);
      setHistory(loadHistory());

      return true;
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถสร้างสูตรได้ กรุณาลองใหม่");
      return false;
    } finally {
      setLoading({ state: false, message: "" });
    }
  };

  const processImage = async (base64Url: string) => {
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
      const hash = await hashImageBase64(base64Url);

      setLoading({ state: true, message: "กำลังเช็ค label ที่เคยบันทึก..." });
      const saved = await getLabeledImageByHash(hash);

      if (saved) {
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

      setLoading({ state: true, message: "กำลังสแกนวัตถุดิบ..." });
      const yoloResult = model
        ? await runYoloDetection(model, base64Url)
        : { items: [], boxes: [], ms: 0 };

      const combined = yoloResult.items;

      if (combined.length > 0 || yoloResult.boxes.length > 0) {
        imageCache.current.set(base64Url, {
          items: combined,
          boxes: yoloResult.boxes,
          imageWidth,
          imageHeight,
        });
      }

      setGallery((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          url: base64Url,
          items: combined,
          boxes: yoloResult.boxes,
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
  useEffect(() => {
    if (viewMode !== "edit" || !canvasRef.current || !editingImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imgW = editingImage.imageWidth;
    const imgH = editingImage.imageHeight;

    // ยังไม่มีขนาดภาพ — รอให้ onLoad ของ <img> ตั้งค่าก่อน
    if (!imgW || !imgH) return;

    // ปรับขนาด canvas ให้ตรงกับภาพจริง (ถ้ายังไม่ตรง)
    if (canvas.width !== imgW || canvas.height !== imgH) {
      canvas.width = imgW;
      canvas.height = imgH;
    }


    editingImage.boxes?.forEach((box) => {
      const display = imagePixelsToCanvas(
        box,
        imgW,
        imgH,
        canvas.width,
        canvas.height,
      );
      const valid = resolveClassId(box.label) !== null;
      ctx.strokeStyle = valid ? "#10b981" : "#f59e0b";
      ctx.lineWidth = Math.max(2, Math.round(imgW / 200));
      ctx.strokeRect(display.x, display.y, display.w, display.h);
      ctx.fillStyle = valid ? "#10b981" : "#f59e0b";
      const fontSize = Math.max(12, Math.round(imgW / 40));
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillText(box.label, display.x, display.y - 5);
    });

    if (currentRect) {
      ctx.strokeStyle = "#3b82f6";
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        currentRect.x,
        currentRect.y,
        currentRect.w,
        currentRect.h,
      );
      ctx.setLineDash([]);
    }
  }, [currentRect, editingImage, viewMode]);

  const startCook = (recipe: Recipe) => {
    setActiveRecipe(recipe);
    setViewMode("cook");
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

      await saveLabeledImage({
        imageBase64: editingImage.url,
        sessionId: getOrCreateSessionId(),
        imageWidth,
        imageHeight,
        boxes: boxes.map((box) => ({
          ...box,
          source: sourceByLabel.get(box.label) ?? "manual",
        })),
      });

      imageCache.current.set(editingImage.url, {
        items: editingImage.items,
        boxes,
        imageWidth,
        imageHeight,
      });
    } catch (err) {
      console.warn("บันทึก label ไม่สำเร็จ:", err);
    } finally {
      setLoading({ state: false, message: "" });
      setViewMode("home");
    }
  };
  
  

  return {
    loading,
    gallery,
    allItems,
    currentRect,
    recipes,
    viewMode,
    setViewMode,
    tagFilter,
    setTagFilter,
    favorites,
    history,
    favVersion,
    activeRecipe,
    editingImage,
    setEditingImage,
    videoRef,
    canvasRef,
    allTags,
    filteredRecipes,
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
