"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { identifyIngredients } from "./actions/analyzeImage";
import { generateRecipes, Recipe } from "./actions/generateRecipe";
import { generateFoodImage } from "./actions/generateFoodImage";
import { RecipeCard } from "./components/RecipeCard";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs";
import { labels } from "./utils/labels";
import { toThaiLabel } from "./utils/labelsTh";
import {
  BoundingBox,
  ImageItem,
  IngredientItem,
  ScanHistoryEntry,
} from "./utils/types";
import {
  addHistoryEntry,
  loadFavorites,
  loadHistory,
} from "./utils/storage";

type ViewMode = "home" | "camera" | "recipes" | "edit" | "favorites";

function mergeIngredients(items: IngredientItem[]): IngredientItem[] {
  const map = new Map<string, IngredientItem>();
  for (const item of items) {
    if (!map.has(item.name)) map.set(item.name, item);
  }
  return Array.from(map.values());
}

export default function Home() {
  const [loading, setLoading] = useState({ state: false, message: "" });
  const [gallery, setGallery] = useState<ImageItem[]>([]);
  const [allItems, setAllItems] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [favVersion, setFavVersion] = useState(0);

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
  const [model, setModel] = useState<tf.GraphModel | null>(null);

  useEffect(() => {
    setFavorites(loadFavorites());
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    async function loadModel() {
      try {
        const yolov8 = await tf.loadGraphModel("/model/model.json");
        const dummyInput = tf.zeros([1, 640, 640, 3]);
        yolov8.execute(dummyInput);
        tf.dispose(dummyInput);
        setModel(yolov8);
      } catch (err) {
        console.error("Model load error", err);
      }
    }
    loadModel();
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

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
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

  async function runYoloDetection(
    base64Url: string,
  ): Promise<{ items: IngredientItem[]; boxes: BoundingBox[]; ms: number }> {
    if (!model) return { items: [], boxes: [], ms: 0 };

    const start = performance.now();
    try {
      const img = new Image();
      img.src = base64Url;
      await new Promise((resolve) => (img.onload = resolve));

      const tfImg = tf.browser.fromPixels(img);
      const input = tf.image
        .resizeBilinear(tfImg, [640, 640])
        .div(255.0)
        .expandDims(0);

      const res = (await model.executeAsync(input)) as tf.Tensor;
      const transRes = res.transpose([0, 2, 1]) as tf.Tensor3D;
      const data = transRes.dataSync();
      const [_, numBoxes, numClassPlus4] = transRes.shape;

      const detectedBoxes: BoundingBox[] = [];
      const foundItems = new Map<string, IngredientItem>();

      for (let i = 0; i < numBoxes; i++) {
        const row = data.subarray(i * numClassPlus4, (i + 1) * numClassPlus4);
        const [x, y, w, h, ...classProbs] = Array.from(row);
        const maxScore = Math.max(...classProbs);
        const classIndex = classProbs.indexOf(maxScore);

        if (maxScore > 0.4) {
          const englishLabel = labels[classIndex] || "Unknown";
          const thaiName = toThaiLabel(englishLabel);
          foundItems.set(thaiName, { name: thaiName, source: "yolo" });

          const scaleX = img.width / 640;
          const scaleY = img.height / 640;
          detectedBoxes.push({
            x: (x - w / 2) * scaleX,
            y: (y - h / 2) * scaleY,
            w: w * scaleX,
            h: h * scaleY,
            label: thaiName,
          });
        }
      }

      tf.dispose([tfImg, input, res, transRes]);
      return {
        items: Array.from(foundItems.values()),
        boxes: detectedBoxes,
        ms: Math.round(performance.now() - start),
      };
    } catch (error) {
      console.error("YOLO Error:", error);
      return { items: [], boxes: [], ms: 0 };
    }
  }

  const processImage = async (base64Url: string) => {
    if (imageCache.current.has(base64Url)) {
      const cached = imageCache.current.get(base64Url)!;
      setGallery((prev) => [
        ...prev,
        { id: `${Date.now()}`, url: base64Url, items: cached },
      ]);
      return;
    }

    setLoading({ state: true, message: "กำลังวิเคราะห์วัตถุดิบ..." });

    try {
      setLoading({ state: true, message: "กำลังสแกนวัตถุดิบ..." });
      const yoloResult = await runYoloDetection(base64Url);
      const yoloItems = yoloResult.items;
      const boxes = yoloResult.boxes;

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

      const combined = mergeIngredients([...yoloItems, ...geminiItems]);
      imageCache.current.set(base64Url, combined);

      setGallery((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          url: base64Url,
          items: combined,
          boxes,
        },
      ]);
    } catch {
      alert("เกิดข้อผิดพลาดในการวิเคราะห์รูป กรุณาลองใหม่");
    } finally {
      setLoading({ state: false, message: "" });
    }
  };

  const handleInventRecipe = async () => {
    if (allItems.length === 0)
      return alert("กรุณาเพิ่มวัตถุดิบก่อน!");

    setLoading({ state: true, message: "กำลังคิดสูตรอาหาร..." });
    try {
      const res = await generateRecipes(allItems);
      const recipesWithImages: Recipe[] = [];

      for (let i = 0; i < res.length; i++) {
        setLoading({
          state: true,
          message: `กำลังสร้างรูปอาหาร ${i + 1}/${res.length}...`,
        });
        const imageUrl = await generateFoodImage(res[i].name);
        recipesWithImages.push({
          ...res[i],
          imageUrl: imageUrl ?? undefined,
        });
      }

      setRecipes(recipesWithImages);
      setTagFilter(null);
      setViewMode("recipes");

      const updatedHistory = addHistoryEntry(allItems, gallery.length);
      setHistory(updatedHistory);
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถสร้างสูตรได้ กรุณาลองใหม่");
    } finally {
      setLoading({ state: false, message: "" });
    }
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

  const removeImage = (imageId: string) => {
    setGallery((prev) => prev.filter((img) => img.id !== imageId));
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

  return (
    <main className="min-h-screen bg-neutral-100 p-4 text-gray-800">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold text-orange-500">Chef Kub</h1>
            <p className="text-xs text-gray-500">สแกนวัตถุดิบ → คิดสูตรอาหาร</p>
          </div>
          <div className="flex gap-2">
            {favorites.length > 0 && viewMode === "home" && (
              <button
                onClick={() => setViewMode("favorites")}
                className="cursor-pointer text-xs bg-pink-100 text-pink-600 px-2 py-1 rounded-lg"
              >
                ❤️ {favorites.length}
              </button>
            )}
            {viewMode !== "home" && (
              <button
                onClick={() => {
                  stopCamera();
                  setViewMode("home");
                }}
                className="cursor-pointer text-sm bg-orange-500 text-white px-3 py-1 rounded-lg"
              >
                กลับ
              </button>
            )}
          </div>
        </div>

        {viewMode === "home" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={startCamera}
                className="cursor-pointer bg-orange-500 text-white p-6 rounded-2xl font-medium active:scale-95 transition-transform"
              >
                ถ่ายรูป
              </button>
              <label className="bg-orange-500 text-white p-6 rounded-2xl text-center cursor-pointer font-medium active:scale-95 transition-transform">
                อัปโหลด
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (re) =>
                        processImage(re.target?.result as string);
                      reader.readAsDataURL(file);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            </div>

            <div className="space-y-3">
              {gallery.map((img) => (
                <div
                  key={img.id}
                  className="bg-white rounded-xl flex border border-orange-100 shadow-sm relative overflow-hidden"
                >
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute top-2 right-2 z-10 w-6 h-6 bg-red-500 text-white rounded-full text-xs cursor-pointer"
                  >
                    ✕
                  </button>

                  <div className="w-28 h-28 bg-gray-100 flex items-center justify-center shrink-0">
                    <img
                      src={img.url}
                      alt="วัตถุดิบ"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>

                  <div className="p-2 flex-1 pr-8 pb-8">
                    <div className="flex flex-wrap gap-1">
                      {img.items.map((it, i) => (
                        <span
                          key={i}
                          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700"
                        >
                          {it.name}
                          <button
                            onClick={() => removeItem(img.id, it.name)}
                            className="text-orange-400 hover:text-red-500 cursor-pointer"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                      {img.items.length === 0 && (
                        <span className="text-xs text-gray-400">
                          ไม่พบวัตถุดิบ
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setEditingImage(img);
                      setViewMode("edit");
                    }}
                    className="absolute right-2 bottom-2 bg-blue-500 text-white text-[10px] px-2 py-1 rounded cursor-pointer"
                  >
                    แก้ไข
                  </button>
                </div>
              ))}
            </div>

            {history.length > 0 && (
              <div className="bg-white rounded-xl p-3 border border-orange-100 text-xs text-gray-400">
                <p className="font-medium text-gray-500 mb-1">ประวัติล่าสุด</p>
                {history.slice(0, 3).map((h) => (
                  <p key={h.id}>{h.items.join(", ")}</p>
                ))}
              </div>
            )}

            <button
              onClick={handleInventRecipe}
              className="cursor-pointer w-full py-4 bg-orange-500 text-white rounded-xl font-bold shadow-md active:scale-95 transition-transform"
            >
              คิดสูตรอาหาร ({allItems.length} วัตถุดิบ)
            </button>
          </div>
        )}

        {viewMode === "camera" && (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-full aspect-[3/4] bg-black rounded-2xl overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
            <button
              onClick={capturePhoto}
              className="w-16 h-16 bg-white border-4 border-orange-400 rounded-full cursor-pointer active:scale-90 transition-transform"
            />
          </div>
        )}

        {viewMode === "edit" && editingImage && (
          <div className="flex flex-col items-center">
            <p className="text-xs text-gray-500 mb-2">
              วาดกรอบรอบวัตถุดิบแล้วใส่ชื่อ
            </p>
            <div className="relative rounded-lg overflow-hidden border-2 border-orange-400">
              <img
                src={editingImage.url}
                alt="แก้ไข"
                className="block max-w-full h-auto max-h-[60vh] opacity-60"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (canvasRef.current) {
                    canvasRef.current.width = img.clientWidth;
                    canvasRef.current.height = img.clientHeight;
                  }
                }}
              />
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
                className="absolute inset-0 z-10 cursor-crosshair touch-none"
              />
            </div>
            <button
              onClick={() => setViewMode("home")}
              className="cursor-pointer mt-6 w-full py-3 bg-orange-500 text-white rounded-xl font-bold"
            >
              เสร็จสิ้น
            </button>
          </div>
        )}

        {viewMode === "recipes" && (
          <div className="space-y-4 pb-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-orange-500">สูตรที่แนะนำ</h2>
              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
                {filteredRecipes.length} เมนู
              </span>
            </div>

            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setTagFilter(null)}
                  className={`cursor-pointer text-xs px-3 py-1 rounded-full ${
                    !tagFilter
                      ? "bg-orange-500 text-white"
                      : "bg-white text-orange-600 border border-orange-200"
                  }`}
                >
                  ทั้งหมด
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setTagFilter(tag)}
                    className={`cursor-pointer text-xs px-3 py-1 rounded-full ${
                      tagFilter === tag
                        ? "bg-orange-500 text-white"
                        : "bg-white text-orange-600 border border-orange-200"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {filteredRecipes.map((r, i) => (
              <RecipeCard
                key={i}
                recipe={r}
                onFavoriteChange={() => {
                  setFavorites(loadFavorites());
                  setFavVersion((v) => v + 1);
                }}
              />
            ))}
          </div>
        )}

        {viewMode === "favorites" && (
          <div className="space-y-4 pb-6">
            <h2 className="text-lg font-bold text-orange-500">รายการโปรด</h2>
            {favorites.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                ยังไม่มีสูตรโปรด
              </p>
            ) : (
              favorites.map((r, i) => (
                <RecipeCard
                  key={`${r.name}-${i}-${favVersion}`}
                  recipe={r}
                  onFavoriteChange={() => setFavorites(loadFavorites())}
                />
              ))
            )}
          </div>
        )}
      </div>

      {loading.state && (
        <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-50">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-orange-200 font-medium">{loading.message}</p>
        </div>
      )}
    </main>
  );
}
