"use client";

import React, { useState, useEffect, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import { labels } from "./utils/labels";
import { generateRecipes, Recipe } from "./actions/generateRecipe"; // import server action

// --- Interfaces ---
interface LoadingState {
  state: boolean;
  progress: number;
  message?: string;
}

interface ImageItem {
  id: string;
  originalUrl: string;
  processedUrl: string;
  items: string[];
}

interface DetectionResult {
  boxes: number[][];
  scores: number[];
  classes: number[];
}

export default function Home() {
  // --- States ---
  const [loading, setLoading] = useState<LoadingState>({
    state: true,
    progress: 0,
    message: "กำลังเตรียม AI...",
  });

  const [model, setModel] = useState<tf.GraphModel | null>(null);
  const [gallery, setGallery] = useState<ImageItem[]>([]);
  const [allItems, setAllItems] = useState<string[]>([]);

  // เพิ่ม State สำหรับเก็บสูตรอาหาร
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [viewMode, setViewMode] = useState<"home" | "camera" | "recipes">(
    "home",
  );

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. โหลดโมเดล
  useEffect(() => {
    async function loadModel() {
      try {
        const yolov8 = await tf.loadGraphModel("/model/model.json", {
          onProgress: (fractions) => {
            setLoading({
              state: true,
              progress: fractions,
              message: "กำลังโหลดสมอง AI...",
            });
          },
        });
        const dummyInput = tf.zeros([1, 640, 640, 3]);
        yolov8.execute(dummyInput);
        tf.dispose(dummyInput);
        setModel(yolov8);
        setLoading({ state: false, progress: 1 });
      } catch (err) {
        console.error("Model Error:", err);
        alert("ไม่พบไฟล์โมเดล! ตรวจสอบ folder /public/model/");
        setLoading({ state: false, progress: 0 });
      }
    }
    loadModel();
  }, []);

  // 2. รวมวัตถุดิบ
  useEffect(() => {
    const mergedItems = new Set<string>();
    gallery.forEach((img) => {
      img.items.forEach((item) => mergedItems.add(item));
    });
    setAllItems(Array.from(mergedItems));
  }, [gallery]);

  // --- Functions ---

  // ฟังก์ชันเรียก Gemini (ใหม่!)
  const handleGenerateRecipes = async () => {
    if (allItems.length === 0) return;

    setLoading({
      state: true,
      progress: 0,
      message: "กำลังปรึกษาเชฟ Gemini...",
    });
    try {
      // เรียก Server Action
      const result = await generateRecipes(allItems);
      setRecipes(result);
      setViewMode("recipes"); // เปลี่ยนไปหน้าแสดงสูตร
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการคิดสูตร");
    } finally {
      setLoading({ state: false, progress: 0 });
    }
  };

  const startCamera = async () => {
    setViewMode("camera");
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "environment" },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }
    } catch (error) {
      console.error("Camera Error:", error);
      alert("ไม่สามารถเปิดกล้องได้");
      setViewMode("home");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const captureImage = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageUrl = canvas.toDataURL("image/jpeg");
        stopCamera();
        setViewMode("home");
        processImage(imageUrl);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        const url = URL.createObjectURL(file);
        processImage(url);
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processImage = async (url: string) => {
    if (!model) return;
    const img = new Image();
    img.src = url;
    img.onload = async () => {
      setLoading({ state: true, progress: 0, message: "กำลังวิเคราะห์..." });
      const tfImg = tf.browser.fromPixels(img);
      const input = tf.image
        .resizeBilinear(tfImg, [640, 640])
        .div(255.0)
        .expandDims(0);
      const res = (await model.executeAsync(input)) as tf.Tensor;
      const result = parseResult(res, img.width, img.height);

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        drawBoxes(ctx, result);
      }
      const processedUrl = canvas.toDataURL("image/jpeg");
      const foundItems = new Set<string>();
      result.classes.forEach((c, i) => {
        if (result.scores[i] > 0.4) foundItems.add(labels[c]);
      });
      const newImage: ImageItem = {
        id: Date.now().toString() + Math.random(),
        originalUrl: url,
        processedUrl: processedUrl,
        items: Array.from(foundItems),
      };
      setGallery((prev) => [...prev, newImage]);
      tf.dispose([tfImg, input, res]);
      setLoading({ state: false, progress: 0 });
    };
  };

  const parseResult = (
    res: tf.Tensor,
    imgW: number,
    imgH: number,
  ): DetectionResult => {
    const transRes = res.transpose([0, 2, 1]) as tf.Tensor3D;
    const data = transRes.dataSync();
    const [_, numBoxes, numClassPlus4] = transRes.shape;
    const boxes = [];
    const scores = [];
    const classes = [];
    for (let i = 0; i < numBoxes; i++) {
      const row = data.subarray(i * numClassPlus4, (i + 1) * numClassPlus4);
      const [x, y, w, h, ...classProbs] = Array.from(row);
      const maxScore = Math.max(...classProbs);
      const classIndex = classProbs.indexOf(maxScore);
      if (maxScore > 0.4) {
        const scaleX = imgW / 640;
        const scaleY = imgH / 640;
        boxes.push([
          (x - w / 2) * scaleX,
          (y - h / 2) * scaleY,
          w * scaleX,
          h * scaleY,
        ]);
        scores.push(maxScore);
        classes.push(classIndex);
      }
    }
    tf.dispose(transRes);
    return { boxes, scores, classes };
  };

  const drawBoxes = (
    ctx: CanvasRenderingContext2D,
    result: DetectionResult,
  ) => {
    result.boxes.forEach((box, i) => {
      const [x, y, w, h] = box;
      const label = labels[result.classes[i]] || "Unknown";
      const score = Math.round(result.scores[i] * 100);
      ctx.strokeStyle = "#00FF00";
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "#00FF00";
      ctx.font = "bold 20px Kanit";
      const text = `${label} ${score}%`;
      const textWidth = ctx.measureText(text).width;
      ctx.fillRect(x, y - 30, textWidth + 10, 30);
      ctx.fillStyle = "black";
      ctx.fillText(text, x + 5, y - 8);
    });
  };

  const removeImage = (id: string) => {
    setGallery((prev) => prev.filter((img) => img.id !== id));
  };

  // --- RENDER ---
  return (
    <main className="flex min-h-screen flex-col bg-gray-900 text-white font-[family-name:var(--font-kanit)]">
      {/* Loading Overlay */}
      {loading.state && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-green-400 animate-pulse">{loading.message}</p>
        </div>
      )}

      <div className="p-4 bg-black/50 text-center sticky top-0 z-10 backdrop-blur-sm shadow-md flex justify-between items-center">
        {viewMode === "recipes" && (
          <button
            onClick={() => setViewMode("home")}
            className="text-sm text-green-400"
          >
            &lt; กลับ
          </button>
        )}
        <h1 className="text-xl font-bold text-green-400 mx-auto">
          AI Chef : Multi-Scan 🍳
        </h1>
        <div className="w-8"></div> {/* Spacer for centering */}
      </div>

      <div className="flex-1 flex flex-col p-4 w-full max-w-md mx-auto">
        {/* VIEW 1: CAMERA */}
        {viewMode === "camera" && (
          <div className="relative w-full aspect-[3/4] bg-black rounded-2xl overflow-hidden shadow-2xl mb-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-6">
              <button
                onClick={() => {
                  stopCamera();
                  setViewMode("home");
                }}
                className="p-3 bg-gray-800/80 rounded-full text-white"
              >
                ❌
              </button>
              <button
                onClick={captureImage}
                className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              >
                <div className="w-12 h-12 bg-white rounded-full border-2 border-black"></div>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: HOME / GALLERY */}
        {viewMode === "home" && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={startCamera}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
              >
                📸 ถ่ายเพิ่ม
              </button>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 w-full shadow-lg h-full"
                >
                  🖼️ อัปโหลด
                </label>
              </div>
            </div>

            {gallery.length > 0 ? (
              <div className="flex flex-col gap-4 mb-24">
                <h2 className="text-gray-300 text-sm font-semibold">
                  รูปที่สแกนแล้ว ({gallery.length})
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {gallery.map((img) => (
                    <div
                      key={img.id}
                      className="relative group rounded-xl overflow-hidden border border-gray-700 bg-black aspect-square"
                    >
                      <img
                        src={img.processedUrl}
                        alt="scan"
                        className="w-full h-full object-cover opacity-90"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-center">
                        <span className="text-[10px] text-green-400">
                          เจอ {img.items.length} อย่าง
                        </span>
                      </div>
                      <button
                        onClick={() => removeImage(img.id)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md active:scale-90"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 py-10">
                <div className="text-4xl mb-2">🥗</div>
                <p>ยังไม่มีรูปภาพ</p>
                <p className="text-sm">ถ่ายรูปหรืออัปโหลดเพื่อเริ่มสแกน</p>
              </div>
            )}
          </>
        )}

        {/* VIEW 3: RECIPES (หน้าแสดงผลลัพธ์) */}
        {viewMode === "recipes" && (
          <div className="flex flex-col gap-6 animate-slide-up">
            <h2 className="text-xl font-bold text-white mb-2">
              เมนูแนะนำสำหรับคุณ ✨
            </h2>
            {recipes.map((recipe, index) => (
              <div
                key={index}
                className="bg-gray-800 rounded-2xl overflow-hidden shadow-lg border border-gray-700"
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-green-400">
                      {recipe.name}
                    </h3>
                    <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">
                      {recipe.calories}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {recipe.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-xs text-blue-300 bg-blue-900/30 px-2 py-0.5 rounded-full border border-blue-900"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="mb-4">
                    <h4 className="text-sm font-bold text-gray-300 mb-1">
                      ส่วนผสม:
                    </h4>
                    <ul className="list-disc list-inside text-sm text-gray-400">
                      {recipe.ingredients.map((ing, i) => (
                        <li key={i}>{ing}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-gray-300 mb-1">
                      วิธีทำ:
                    </h4>
                    <ol className="list-decimal list-inside text-sm text-gray-400 space-y-1">
                      {recipe.instructions.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={() => setViewMode("home")}
              className="w-full py-4 bg-gray-700 rounded-xl font-bold text-white hover:bg-gray-600"
            >
              กลับไปหน้าแรก
            </button>
          </div>
        )}
      </div>

      {/* Bottom Sheet (วัตถุดิบรวม) - แสดงเฉพาะหน้า Home */}
      {viewMode === "home" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white text-black rounded-t-3xl p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] z-20 transition-transform duration-300">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">
              วัตถุดิบรวม ({allItems.length})
            </h2>
            {gallery.length > 0 && (
              <button
                onClick={() => setGallery([])}
                className="text-xs text-red-500 underline"
              >
                ล้างทั้งหมด
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mb-4 max-h-[120px] overflow-y-auto">
            {allItems.length > 0 ? (
              allItems.map((item, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium border border-green-200"
                >
                  {item}
                </span>
              ))
            ) : (
              <p className="text-gray-400 w-full text-center text-sm">
                ...รอข้อมูลวัตถุดิบ...
              </p>
            )}
          </div>
          <button
            onClick={handleGenerateRecipes} // <-- กดปุ่มนี้แล้วไปเรียก AI
            disabled={allItems.length === 0}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg ${
              allItems.length > 0
                ? "bg-gradient-to-r from-green-600 to-green-500 text-white hover:shadow-green-500/30 active:scale-95"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            ✨ ให้ AI คิดสูตร ({allItems.length})
          </button>
        </div>
      )}
    </main>
  );
}
