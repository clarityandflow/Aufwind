// KI-Wiederholungszähler (Beta).
// Lädt TensorFlow.js + MoveNet erst bei Bedarf per CDN (nicht im Offline-Bundle).
// Zählt Wiederholungen über die vertikale Oszillation eines Gelenks mit
// Auto-Kalibrierung + Hysterese. Ehrlich: Genauigkeit hängt von Winkel/Licht ab.

const TFJS = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js";
const POSE = "https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.1.3/dist/pose-detection.min.js";

let scriptsLoaded = false;
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src; s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Konnte Bibliothek nicht laden: " + src));
    document.head.appendChild(s);
  });
}
async function ensureLibs() {
  if (scriptsLoaded && window.tf && window.poseDetection) return;
  await loadScript(TFJS);
  await loadScript(POSE);
  scriptsLoaded = true;
}

// Welche Gelenke bewegen sich bei welcher Bewegung am stärksten (vertikal)?
export const MOVEMENTS = {
  auto:   { label: "Automatisch", joints: ["left_wrist", "right_wrist", "left_hip", "right_hip", "nose"] },
  curl:   { label: "Curl / Kettlebell (Arme)", joints: ["left_wrist", "right_wrist"] },
  squat:  { label: "Kniebeuge / Brücke (Hüfte)", joints: ["left_hip", "right_hip"] },
  press:  { label: "Druck über Kopf (Handgelenke)", joints: ["left_wrist", "right_wrist"] },
};

export class RepCounter {
  constructor({ video, onRep, onStatus, onDebug, movement = "auto" }) {
    this.video = video;
    this.onRep = onRep || (() => {});
    this.onStatus = onStatus || (() => {});
    this.onDebug = onDebug || (() => {});
    this.movement = movement;
    this.detector = null;
    this.stream = null;
    this.raf = null;
    this.running = false;
    // Zustand der Zähl-Heuristik
    this.count = 0;
    this.min = Infinity; this.max = -Infinity;
    this.state = "down"; // erwartet zuerst nach unten
    this.samples = 0;
  }

  async start() {
    this.onStatus("Kamera wird gestartet …");
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    this.video.srcObject = this.stream;
    this.video.setAttribute("playsinline", "true");
    await this.video.play().catch(() => {});

    this.onStatus("KI-Modell wird geladen …");
    await ensureLibs();
    const model = window.poseDetection.SupportedModels.MoveNet;
    this.detector = await window.poseDetection.createDetector(model, {
      modelType: window.poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    });

    this.running = true;
    this.onStatus("Positionier dich – Bewegung starten.");
    this.loop();
  }

  pickValue(keypointsByName) {
    const joints = MOVEMENTS[this.movement]?.joints || MOVEMENTS.auto.joints;
    const vals = [];
    for (const j of joints) {
      const kp = keypointsByName[j];
      if (kp && kp.score > 0.3) vals.push(kp.y);
    }
    if (!vals.length) return null;
    // Mittelwert der zuverlässigen Gelenke (y wächst nach unten)
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  async loop() {
    if (!this.running || !this.detector) return;
    try {
      const poses = await this.detector.estimatePoses(this.video, { flipHorizontal: true });
      if (poses && poses[0]) {
        const byName = {};
        poses[0].keypoints.forEach((k) => { byName[k.name] = k; });
        const y = this.pickValue(byName);
        if (y != null) this.process(y);
      }
    } catch (e) { /* Frame überspringen */ }
    this.raf = requestAnimationFrame(() => this.loop());
  }

  process(y) {
    this.samples++;
    // Auto-Kalibrierung des Bewegungsbereichs
    this.min = Math.min(this.min, y);
    this.max = Math.max(this.max, y);
    const range = this.max - this.min;
    this.onDebug({ y: Math.round(y), range: Math.round(range), state: this.state });
    if (range < 40 || this.samples < 12) return; // zu wenig Bewegung / noch am kalibrieren
    const norm = (y - this.min) / range; // 0 = oben, 1 = unten
    const UP = 0.35, DOWN = 0.65;         // Hysterese
    if (this.state === "down" && norm > DOWN) {
      this.state = "up";
    } else if (this.state === "up" && norm < UP) {
      this.state = "down";
      this.count++;
      this.onRep(this.count);
      if (navigator.vibrate) navigator.vibrate(30);
    }
  }

  resetCount() { this.count = 0; this.min = Infinity; this.max = -Infinity; this.state = "down"; this.samples = 0; }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    if (this.detector && this.detector.dispose) { try { this.detector.dispose(); } catch (e) {} }
    this.detector = null;
    this.stream = null;
  }
}
