import { useState, useRef, useEffect, useMemo } from "react";
import { identifyIngredients } from "../actions/analyzeImage";
import { generateRecipes } from "../actions/generateRecipe";
import { generateFoodImage } from "../actions/generateFoodImage";
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
import { useYoloModel } from "./useYoloModel";

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
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCache = useRef<Map<string, IngredientItem[]>>(new Map());

  useEffect(() => {
    setFavorites(loadFavorites());
    setHistory(loadHistory());
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
          const imageUrl = await generateFoodImage(recipe.name);
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
        message: `กำลังสร้างรูปอาหาร (${res.length} เมนู)...`,
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
        { id: `${Date.now()}`, url: base64Url, items: cached },
      ]);
      setLoading({ state: false, message: "" });
      return;
    }

    setLoading({ state: true, message: "กำลังวิเคราะห์วัตถุดิบ..." });

    try {
      setLoading({ state: true, message: "กำลังสแกนวัตถุดิบ..." });
      const yoloResult = model
        ? await runYoloDetection(model, base64Url)
        : { items: [], boxes: [], ms: 0 };

      let geminiItems: IngredientItem[] = [];
      setLoading({ state: true, message: "กำลังวิเคราะห์เพิ่มเติม..." });
      try {
        const detected = await identifyIngredients(base64Url);
        geminiItems = detected.map((name) => ({
          name,
          source: "gemini" as const,
        }));
      } catch (geminiErr) {
        console.warn("Gemini ไม่พร้อมใช้งาน:", geminiErr);
      }

      const combined = mergeIngredients([...yoloResult.items, ...geminiItems]);
      imageCache.current.set(base64Url, combined);

      setGallery((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          url: base64Url,
          items: combined,
          boxes: yoloResult.boxes,
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

  const quickCookFavorite = (recipe: Recipe) => {
    setActiveRecipe(recipe);
    setViewMode("cook");
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setStartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setIsDrawing(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setCurrentRect({
        x: startPos.x,
        y: startPos.y,
        w: e.clientX - rect.left - startPos.x,
        h: e.clientY - rect.top - startPos.y,
      });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentRect) return;
    setIsDrawing(false);
    const label = prompt("วัตถุดิบนี้คืออะไร?");
    if (label && editingImage) {
      const newBox: BoundingBox = { ...currentRect, label };
      const newItem: IngredientItem = { name: label, source: "manual" };
      const updated: ImageItem = {
        ...editingImage,
        items: mergeIngredients([...editingImage.items, newItem]),
        boxes: [...(editingImage.boxes || []), newBox],
      };
      setGallery((prev) =>
        prev.map((img) => (img.id === updated.id ? updated : img)),
      );
      setEditingImage(updated);
    }
    setCurrentRect(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && e.touches.length > 0) {
      setStartPos({
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      });
      setIsDrawing(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDrawing) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && e.touches.length > 0) {
      setCurrentRect({
        x: startPos.x,
        y: startPos.y,
        w: e.touches[0].clientX - rect.left - startPos.x,
        h: e.touches[0].clientY - rect.top - startPos.y,
      });
    }
  };

  useEffect(() => {
    if (viewMode === "edit" && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        editingImage?.boxes?.forEach((box) => {
          ctx.strokeStyle = "#10b981";
          ctx.strokeRect(box.x, box.y, box.w, box.h);
          ctx.fillStyle = "#10b981";
          ctx.fillText(box.label, box.x, box.y - 5);
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
      }
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

  return {
    loading,
    gallery,
    allItems,
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
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    goHome,
    startCook,
    endCook,
    refreshFavorites,
  };
}
