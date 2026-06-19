export function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function downsample(buffer: Float32Array, ratio: number): Float32Array {
  if (ratio <= 1) return buffer;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    result[i] = buffer[Math.round(i * ratio)];
  }
  return result;
}

export class LiveAudioPlayer {
  private audioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private activeSources = new Set<AudioBufferSourceNode>();

  async init() {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    await this.audioContext.resume();
    this.nextStartTime = this.audioContext.currentTime;
  }

  /** หยุดเสียงที่กำลังเล่น — ใช้เมื่อผู้ใช้พูดทับหรือ AI ตอบใหม่ */
  stop() {
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // already stopped
      }
    }
    this.activeSources.clear();
    if (this.audioContext) {
      this.nextStartTime = this.audioContext.currentTime;
    }
  }

  playPcmBase64(base64: string) {
    if (!this.audioContext) return;

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const int16 = new Int16Array(
      bytes.buffer,
      bytes.byteOffset,
      Math.floor(bytes.byteLength / 2),
    );
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const buffer = this.audioContext.createBuffer(1, float32.length, 24000);
    buffer.copyToChannel(float32, 0);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    const start = Math.max(this.audioContext.currentTime, this.nextStartTime);
    source.start(start);
    this.nextStartTime = start + buffer.duration;

    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
    };
  }

  close() {
    this.stop();
    void this.audioContext?.close();
    this.audioContext = null;
    this.nextStartTime = 0;
  }
}

export class LiveAudioCapture {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private muted = false;

  constructor(private onChunk: (base64: string) => void) {}

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    this.audioContext = new AudioContext();
    await this.audioContext.resume();

    const source = this.audioContext.createMediaStreamSource(this.stream);
    const ratio = this.audioContext.sampleRate / 16000;

    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (event) => {
      if (this.muted) return;
      const input = event.inputBuffer.getChannelData(0);
      const downsampled = downsample(input, ratio);
      const pcm = floatTo16BitPCM(downsampled);
      this.onChunk(arrayBufferToBase64(pcm));
    };

    source.connect(this.processor);
    // ไม่ส่งเสียงไมค์ออกลำโพง — ป้องกัน feedback ที่ทำให้ AI ตอบซ้ำ
    const silent = this.audioContext.createGain();
    silent.gain.value = 0;
    this.processor.connect(silent);
    silent.connect(this.audioContext.destination);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  stop() {
    this.processor?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    void this.audioContext?.close();
    this.processor = null;
    this.stream = null;
    this.audioContext = null;
  }
}
