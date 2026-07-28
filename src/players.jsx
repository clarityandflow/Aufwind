import React, { useState, useEffect, useRef } from "react";
import { RepCounter, MOVEMENTS } from "./repcounter.js";

const RED = "#FF2D46";
const BLUE = "#0E5BFF";
const INK = "#EAF2FF";
const SUB = "#93A7CC";
const LINE = "rgba(125,170,255,0.16)";
const SOFT = "rgba(125,170,255,0.10)";
const PANEL = "linear-gradient(180deg, #0C2350 0%, #060F2C 100%)";

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.start(); o.stop(ctx.currentTime + 0.36);
  } catch (e) {}
}

function parseSets(sub) {
  const m = /(\d+)\s*[×x]\s*([\d–—\-]+)/.exec(sub || "");
  return { sets: m ? Math.max(1, +m[1]) : 3, reps: m ? m[2] : "8–12" };
}

// Kreis-Countdown
function Ring({ frac, big, small, color }) {
  const size = 168, stroke = 12, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={SOFT} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: "stroke-dashoffset .5s linear", filter: `drop-shadow(0 0 10px ${color}66)` }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "'Roboto Condensed', 'Roboto', sans-serif", fontSize: 46, fontWeight: 800, color: INK, lineHeight: 1 }}>{big}</div>
        {small && <div style={{ fontSize: 12, color: SUB, marginTop: 4 }}>{small}</div>}
      </div>
    </div>
  );
}

export default function ExercisePlayer({ exercise, initialSets = 0, lastSets = 0, nextLabel = null, restSeconds = 60, onSetsChange, onClose }) {
  const target = parseSets(exercise.reps);
  const [doneSets, setDoneSets] = useState(initialSets);
  const [rest, setRest] = useState(0);          // verbleibende Pausensekunden
  const restRef = useRef(null);

  // Kamera-Zähler
  const [camOpen, setCamOpen] = useState(false);
  const [reps, setReps] = useState(0);
  const [status, setStatus] = useState("");
  const [movement, setMovement] = useState("auto");
  const [camError, setCamError] = useState("");
  const videoRef = useRef(null);
  const counterRef = useRef(null);

  useEffect(() => () => stopCam(), []);

  // Pausen-Timer
  useEffect(() => {
    if (rest <= 0) return;
    restRef.current = setInterval(() => {
      setRest((s) => {
        if (s <= 1) { clearInterval(restRef.current); beep(); if (navigator.vibrate) navigator.vibrate([80,40,80]); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(restRef.current);
  }, [rest > 0]);

  function completeSet(n) {
    const next = Math.min((typeof n === "number" ? n : doneSets + 1), target.sets);
    const allDoneNow = next >= target.sets;
    setDoneSets(next);
    onSetsChange && onSetsChange(next, allDoneNow);
    if (next < target.sets && next > 0) setRest(restSeconds);
    if (navigator.vibrate) navigator.vibrate(25);
  }

  async function startCam() {
    setCamError(""); setReps(0); setCamOpen(true);
    // kurz warten, bis <video> im DOM ist
    setTimeout(async () => {
      try {
        const rc = new RepCounter({
          video: videoRef.current,
          movement,
          onRep: (n) => { setReps(n); },
          onStatus: (s) => setStatus(s),
        });
        counterRef.current = rc;
        await rc.start();
      } catch (e) {
        setCamError(e && e.message ? e.message : "Kamera konnte nicht gestartet werden.");
        setStatus("");
      }
    }, 60);
  }
  function stopCam() {
    if (counterRef.current) { counterRef.current.stop(); counterRef.current = null; }
    setCamOpen(false); setStatus("");
  }
  function changeMovement(v) {
    setMovement(v);
    if (counterRef.current) { counterRef.current.movement = v; counterRef.current.resetCount(); setReps(0); }
  }

  const restFrac = rest > 0 ? rest / restSeconds : 0;
  const allDone = doneSets >= target.sets;

  // Nach letztem Satz automatisch zurück zu Heute (Haken ist gesetzt)
  useEffect(() => {
    if (allDone) { const t = setTimeout(() => { stopCam(); onClose && onClose(); }, 1500); return () => clearTimeout(t); }
  }, [allDone]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, background: PANEL, color: INK, display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ padding: "calc(14px + env(safe-area-inset-top)) 20px 10px", borderBottom: `1px solid ${LINE}` }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", color: RED, textTransform: "uppercase" }}>Übung läuft</div>
        <div style={{ fontFamily: RC, fontSize: 22, fontWeight: 700, color: INK, marginTop: 3 }}>{exercise.name}</div>
        {exercise.cue && <div style={{ fontSize: 12.5, color: SUB, marginTop: 3, lineHeight: 1.45 }}>{exercise.cue}</div>}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 12px" }}>
        {allDone ? (
          <div style={{ textAlign: "center", marginTop: 30 }}>
            <div style={{ fontSize: 46 }}>🔥</div>
            <div style={{ fontFamily: RC, fontSize: 25, fontWeight: 800, color: INK, marginTop: 8 }}>Alle {target.sets} Sätze geschafft!</div>
            <div style={{ fontSize: 13.5, color: SUB, marginTop: 8 }}>Haken gesetzt · zurück zu Heute …</div>
          </div>
        ) : rest > 0 ? (
          <div style={{ textAlign: "center" }}>
            <div style={kicker}>Pause</div>
            <Ring frac={restFrac} big={rest} small="Sekunden" color={RED} />
            <button onClick={() => setRest((s) => s + 15)} style={{ ...btnGhost, minHeight: 44, marginTop: 18, padding: "0 22px" }}>+15 Sek</button>
            {nextLabel && <div style={{ marginTop: 26, fontSize: 13, color: SUB }}>Als Nächstes: <span style={{ color: INK, fontWeight: 700 }}>{nextLabel}</span></div>}
          </div>
        ) : (
          <>
            {/* Satz-Tracker */}
            <div style={{ textAlign: "center" }}>
              <div style={kicker}>Sätze</div>
              <div style={{ fontFamily: RC, fontSize: 60, fontWeight: 800, color: INK, lineHeight: 1.05 }}>
                {doneSets}<span style={{ fontSize: 26, color: SUB }}> / {target.sets}</span>
              </div>
              <div style={{ fontSize: 13, color: SUB, marginTop: 2 }}>Ziel: {target.reps} Wdh. pro Satz{lastSets > 0 ? ` · letztes Mal ${lastSets} Sätze` : ""}</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
                {Array.from({ length: target.sets }).map((_, i) => (
                  <span key={i} style={{ width: 30, height: 10, borderRadius: 3, background: i < doneSets ? RED : SOFT, boxShadow: i < doneSets ? `0 0 10px ${RED}66` : "none", transition: "all .2s" }} />
                ))}
              </div>
              {nextLabel && <div style={{ marginTop: 16, fontSize: 12.5, color: SUB }}>Als Nächstes: <span style={{ color: INK, fontWeight: 700 }}>{nextLabel}</span></div>}
            </div>

            {/* Kamera-Zähler */}
            <div style={{ marginTop: 26, borderTop: `1px solid ${LINE}`, paddingTop: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: INK }}>KI-Wiederholungszähler</span>
                <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.08em", color: "#fff", background: RED, padding: "2px 6px", borderRadius: 3 }}>BETA</span>
              </div>
              <p style={{ fontSize: 12, color: SUB, lineHeight: 1.5, margin: "6px 0 12px" }}>
                Die Kamera zählt Wiederholungen automatisch mit. Genauigkeit hängt von Kamerawinkel & Licht ab – bei Bedarf mit +/− korrigieren.
              </p>

              {!camOpen ? (
                <button onClick={startCam} style={{ ...btnDark, width: "100%", padding: "13px" }}>Kamera-Zähler starten</button>
              ) : (
                <div>
                  <div style={{ position: "relative", borderRadius: 6, overflow: "hidden", background: "#0A1730" }}>
                    <video ref={videoRef} muted playsInline style={{ width: "100%", display: "block", transform: "scaleX(-1)", maxHeight: 320, objectFit: "cover" }} />
                    <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.55)", color: "#fff", padding: "4px 10px", borderRadius: 4, fontFamily: "'Roboto Condensed', 'Roboto', sans-serif", fontSize: 13, fontWeight: 700 }}>
                      Wdh. <span style={{ color: "#38C6FF", fontSize: 20 }}>{reps}</span>
                    </div>
                  </div>

                  {camError ? (
                    <div style={{ fontSize: 12.5, color: RED, marginTop: 10, lineHeight: 1.5 }}>{camError}</div>
                  ) : status && (
                    <div style={{ fontSize: 12, color: SUB, marginTop: 8 }}>{status}</div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                    <span style={{ fontSize: 12, color: SUB }}>Bewegung:</span>
                    <select value={movement} onChange={(e) => changeMovement(e.target.value)} style={{ flex: 1, border: `1px solid ${LINE}`, borderRadius: 4, padding: "8px 10px", fontSize: 13, color: INK, background: "#0B1E44" }}>
                      {Object.entries(MOVEMENTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
                    <button onClick={() => setReps((r) => Math.max(0, r - 1))} style={{ ...btnGhost, flex: "0 0 52px" }}>−</button>
                    <button onClick={() => setReps((r) => r + 1)} style={{ ...btnGhost, flex: "0 0 52px" }}>+</button>
                    <button onClick={() => { completeSet(); setReps(0); if (counterRef.current) counterRef.current.resetCount(); }} style={{ ...btnRed, flex: 1 }}>Satz mit {reps} Wdh. speichern</button>
                  </div>
                  <button onClick={stopCam} style={{ ...btnGhost, width: "100%", marginTop: 10, minHeight: 44 }}>Kamera stoppen</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom-Aktionsleiste – Daumenreichweite, Safe Area */}
      <div style={{ padding: "12px 20px calc(12px + env(safe-area-inset-bottom))", borderTop: `1px solid ${LINE}`, background: "rgba(6,16,40,0.6)", display: "flex", flexDirection: "column", gap: 10 }}>
        {!allDone && rest === 0 && (
          <button onClick={() => completeSet()} style={{ ...btnRed, width: "100%", minHeight: 56, fontSize: 17 }}>Satz fertig ✓ · {restSeconds}s Pause</button>
        )}
        {!allDone && rest > 0 && (
          <button onClick={() => setRest(0)} style={{ ...btnDark, width: "100%", minHeight: 56, fontSize: 17 }}>Pause überspringen</button>
        )}
        <button onClick={() => { stopCam(); onClose && onClose(); }} style={{ ...btnGhost, width: "100%", minHeight: 48, fontSize: 15 }}>{allDone ? "Zu Heute" : "Beenden"}</button>
      </div>
    </div>
  );
}

const RC = "'Roboto Condensed', 'Roboto', sans-serif";
const kicker = { fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", color: SUB, textTransform: "uppercase", marginBottom: 12 };
const btnBase = { border: "none", borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: "pointer", padding: "11px 16px", minHeight: 44 };
const btnRed = { ...btnBase, background: RED, color: "#fff", boxShadow: "0 6px 18px rgba(255,45,70,0.3)" };
const btnDark = { ...btnBase, background: BLUE, color: "#fff", boxShadow: "0 6px 18px rgba(14,91,255,0.35)" };
const btnGhost = { ...btnBase, background: SOFT, color: INK, border: `1px solid ${LINE}` };
