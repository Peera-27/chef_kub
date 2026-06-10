import { useEffect, useState } from "react";
import * as tf from "@tensorflow/tfjs";

export function useYoloModel() {
  const [model, setModel] = useState<tf.GraphModel | null>(null);

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

  return model;
}
