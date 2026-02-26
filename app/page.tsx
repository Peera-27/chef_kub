"use client";

import React, { useState, useRef, useEffect } from "react";
import { identifyIngredients } from "./actions/analyzeImage";
import { generateRecipes, Recipe } from "./actions/generateRecipe";

interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

interface ImageItem {
  id: string;
  url: string;
  items: string[];
  boxes?: BoundingBox[];
}

export default function Home() {
  const [loading, setLoading] = useState({ state: false, message: "" });
  const [gallery, setGallery] = useState<ImageItem[]>([]);
  const [allItems, setAllItems] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [viewMode, setViewMode] = useState<
    "home" | "camera" | "recipes" | "edit"
  >("home");

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

  // อัปเดตรายการวัตถุดิบรวมจาก Gallery ทั้งหมด
  useEffect(() => {
    const mergedItems = new Set<string>();
    gallery.forEach((img) => {
      img.items.forEach((item) => mergedItems.add(item));
    });
    setAllItems(Array.from(mergedItems));
  }, [gallery]);

  // --- ระบบกล้อง ---
  const startCamera = async () => {
    setViewMode("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("ไม่สามารถเข้าถึงกล้องได้");
      setViewMode("home");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL("image/jpeg");
      stopCamera();
      setViewMode("home");
      processImage(base64);
    }
  };

  // ฟังก์ชันลบวัตถุดิบบางอย่างออกจากรูปภาพ
  const removeItem = (imageId: string, itemName: string) => {
    setGallery((prev) =>
      prev.map((img) => {
        if (img.id === imageId) {
          return {
            ...img,
            items: img.items.filter((item) => item !== itemName),
            boxes: img.boxes?.filter((box) => box.label !== itemName),
          };
        }
        return img;
      }),
    );
  };
  async function runYoloDetection(base64Url: string): Promise<string[]> {
    try {
      // ในอนาคตคุณจะใช้ tf.loadGraphModel('/model/model.json') ตรงนี้
      console.log("กำลังรัน YOLO Model บนเบราว์เซอร์...");

      // สมมติว่านี่คือ Logic ของการทำ Inference
      // สำหรับตอนนี้เราจะคืนค่าว่างไปก่อนเพื่อให้ Code ไม่ Error
      const detectedFromYolo: string[] = [];

      return detectedFromYolo;
    } catch (error) {
      console.error("YOLO Error:", error);
      return [];
    }
  }
  const processImage = async (base64Url: string) => {
    setLoading({ state: true, message: "🤖 กำลังประมวลผลวัตถุดิบ..." });
    try {
      // 1. ตรวจจับด้วย Custom YOLO (โมเดลที่คุณเทรนเอง)
      // สมมติว่าคุณมีฟังก์ชัน runYoloDetection ที่รันโมเดลบน Browser
      const yoloDetected = await runYoloDetection(base64Url);

      // 2. วิเคราะห์ด้วย Gemini (Vision API)
      // เพื่อหาวัตถุดิบอื่นๆ ที่โมเดล YOLO อาจจะยังไม่รู้จัก
      const geminiDetected = await identifyIngredients(base64Url);

      // 3. รวมผลลัพธ์จากทั้ง 2 แหล่ง (และกำจัดชื่อที่ซ้ำกัน)
      const combinedItems = Array.from(
        new Set([...yoloDetected, ...geminiDetected]),
      );

      const newImage: ImageItem = {
        id: `${Date.now()}`,
        url: base64Url,
        items: combinedItems,
      };

      setGallery((prev) => [...prev, newImage]);
    } catch (error) {
      console.error("Processing Error:", error);
      alert("เกิดข้อผิดพลาดในการวิเคราะห์ภาพ");
    } finally {
      setLoading({ state: false, message: "" });
    }
  };

  // --- Manual Labeling Handlers ---
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
      const updated = {
        ...editingImage,
        items: Array.from(new Set([...editingImage.items, label])),
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
  // วาดกรอบบน Canvas
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
    <main className="min-h-screen bg-gray-900 text-white p-4 font-[family-name:var(--font-kanit)]">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-green-400">Chefkub</h1>
        {viewMode !== "home" && (
          <button
            onClick={() => {
              stopCamera();
              setViewMode("home");
            }}
            className="text-sm bg-gray-700 px-3 py-1 rounded-lg"
          >
            กลับ
          </button>
        )}
      </div>

      {/* VIEW: HOME */}
      {viewMode === "home" && (
        <div className="max-w-md mx-auto space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={startCamera}
              className="bg-green-600 p-6 rounded-2xl active:scale-95 transition-transform"
            >
              📷 ถ่ายรูป
            </button>
            <label className="bg-gray-800 p-6 rounded-2xl text-center cursor-pointer border border-gray-700 active:scale-95 transition-transform">
              🖼️ อัปโหลด
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
                className="bg-gray-800 rounded-xl overflow-hidden flex border border-gray-700 relative shadow-md group"
              >
                <button
                  onClick={() => removeImage(img.id)}
                  className="absolute top-2 right-2 z-10 p-1.5 bg-red-500/20 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                  title="ลบรูปภาพ"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </button>

                <div className="w-28 h-28 bg-black flex items-center justify-center">
                  <img
                    src={img.url}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>

                <div className="p-2 flex-1">
                  <div className="flex flex-wrap gap-1">
                    {img.items.map((it, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1 text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-800"
                      >
                        {it}
                        <button
                          onClick={() => removeItem(img.id, it)}
                          className="hover:text-red-500 ml-1"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEditingImage(img);
                    setViewMode("edit");
                  }}
                  className="absolute right-2 bottom-2 bg-blue-600 text-[10px] px-2 py-1 rounded shadow-sm"
                >
                  ✏️ แก้ไข
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={async () => {
              if (allItems.length === 0) return alert("กรุณาเพิ่มวัตถุดิบก่อน");
              setLoading({ state: true, message: "👩‍🍳 กำลังคิดเมนู..." });
              const res = await generateRecipes(allItems);
              setRecipes(res);
              setViewMode("recipes");
              setLoading({ state: false, message: "" });
            }}
            className="w-full py-4 bg-green-600 rounded-xl font-bold mt-4 shadow-lg active:scale-95 transition-transform"
          >
            คิดเมนู ({allItems.length})
          </button>
        </div>
      )}

      {/* VIEW: CAMERA */}
      {viewMode === "camera" && (
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative w-full max-w-md aspect-[3/4] bg-black rounded-2xl overflow-hidden shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex gap-4">
            <button
              onClick={capturePhoto}
              className="w-16 h-16 bg-white border-4 border-gray-400 rounded-full active:scale-90 transition-transform shadow-lg"
            />
          </div>
        </div>
      )}

      {/* VIEW: EDIT */}
      {viewMode === "edit" && editingImage && (
        <div className="flex flex-col items-center">
          <div className="relative inline-block bg-black rounded-lg overflow-hidden border-2 border-green-500 shadow-xl">
            <img
              src={editingImage.url}
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
              className="absolute inset-0 z-10 cursor-crosshair touch-none" // touch-none สำคัญมากเพื่อไม่ให้หน้าจอเลื่อนตอนกำลังวาด
            />
          </div>
          <button
            onClick={() => setViewMode("home")}
            className="mt-6 w-full max-w-xs py-3 bg-green-600 rounded-xl font-bold shadow-md"
          >
            เสร็จสิ้น
          </button>
        </div>
      )}

      {/* VIEW: RECIPES */}
      {viewMode === "recipes" && (
        <div className="max-w-md mx-auto space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">
              เมนูที่แนะนำสำหรับคุณ
            </h2>
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-md">
              3 เมนูใหม่
            </span>
          </div>

          {recipes.map((r, i) => (
            <div
              key={i}
              className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-xl"
            >
              <div className="p-4 border-b border-gray-700 bg-gray-800/50 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-green-400 leading-tight">
                    {r.name}
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {r.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-800/50"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-[10px] font-mono bg-gray-900 text-orange-400 px-2 py-1 rounded-full border border-orange-900/50">
                  🔥 {r.calories}
                </span>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>{" "}
                    วัตถุดิบที่ต้องใช้
                  </h4>
                  <ul className="grid grid-cols-1 gap-1">
                    {r.ingredients.map((ing, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-gray-300 flex items-start gap-2"
                      >
                        <span className="text-green-500 mt-0.5">•</span> {ing}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-2">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>{" "}
                    ขั้นตอนการปรุง
                  </h4>
                  <div className="space-y-3">
                    {r.instructions.map((step, idx) => (
                      <div key={idx} className="flex gap-3">
                        <span className="flex-none w-5 h-5 bg-gray-700 text-gray-300 text-[10px] font-bold flex items-center justify-center rounded-full mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-sm text-gray-300 leading-relaxed">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={() => setViewMode("home")}
            className="w-full py-3 bg-gray-800 text-gray-400 rounded-xl border border-gray-700 hover:bg-gray-700 transition-colors"
          >
            กลับไปสแกนวัตถุดิบเพิ่ม
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {loading.state && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-green-400 font-medium">{loading.message}</p>
        </div>
      )}
    </main>
  );
}
