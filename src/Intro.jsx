import React, { useEffect, useState } from "react";

// Blockbuster-Intro: große, dichte Wortwolke im Stil des Originalbilds.
// Breites Farbenspiel (Weiß/Cyan/Eisblau/Blau/Indigo + rote Akzente in
// unterschiedlichen Größen), Gradient-Hero mit Shimmer, Lichtstrahlen,
// Push-in-Zoom + Impact-Flash. Bewusst energetisch, nicht ruhig.

const WH  = "#F1F6FF";
const CY  = "#39C9FF";
const ICE = "#9CD9FF";
const BL  = "#2E7DF0";
const IND = "#6E7BFF";
const RED = "#FF2D46";
const GY  = "#7E93B8";

// tier -> CSS font-size (skaliert mit Viewport)
const SIZE = {
  hero: "clamp(28px, 9vw, 82px)",
  xl:   "clamp(24px, 7.2vw, 54px)",
  l:    "clamp(18px, 5.2vw, 38px)",
  m:    "clamp(15px, 4vw, 28px)",
  s:    "clamp(12px, 3.1vw, 21px)",
};

// x/y in % · z=Größe · c=Farbe · d=Tiefe(0 hinten … 2 vorn) · grad=Verlaufs-Hero
const WORDS = [
  { t: "TRANSFORMATION", x: 50, y: 50, z: "hero", c: WH, w: 800, d: 2, grad: true },

  // große Ebene
  { t: "BURN",       x: 18, y: 20, z: "xl", c: RED, w: 800, d: 2 },
  { t: "POWER",      x: 82, y: 26, z: "xl", c: RED, w: 800, d: 2 },
  { t: "MUSCLES",    x: 15, y: 44, z: "xl", c: CY,  w: 800, d: 2 },
  { t: "HEALTHCARE", x: 74, y: 48, z: "xl", c: WH,  w: 700, d: 2 },

  { t: "ENERGY",     x: 84, y: 70, z: "l", c: RED, w: 800, d: 1 },
  { t: "STRENGTH",   x: 20, y: 74, z: "l", c: RED, w: 800, d: 2 },
  { t: "GRIT",       x: 50, y: 15, z: "l", c: RED, w: 800, d: 1 },
  { t: "FITNESS",    x: 31, y: 64, z: "l", c: CY,  w: 700, d: 1 },
  { t: "NUTRITION",  x: 35, y: 28, z: "l", c: ICE, w: 700, d: 1 },
  { t: "WORKOUT",    x: 66, y: 22, z: "l", c: WH,  w: 700, d: 1 },
  { t: "PHYSICAL",   x: 70, y: 63, z: "l", c: WH,  w: 700, d: 1 },
  { t: "VITALITY",   x: 43, y: 72, z: "l", c: ICE, w: 700, d: 1 },
  { t: "ENDURANCE",  x: 60, y: 81, z: "l", c: IND, w: 700, d: 1 },
  { t: "MOMENTUM",   x: 26, y: 56, z: "l", c: BL,  w: 700, d: 1 },

  // mittlere Ebene
  { t: "TRAINING",   x: 61, y: 36, z: "m", c: WH,  w: 600, d: 1 },
  { t: "MINDSET",    x: 40, y: 40, z: "m", c: CY,  w: 700, d: 1 },
  { t: "BODY",       x: 26, y: 50, z: "m", c: WH,  w: 700, d: 1 },
  { t: "DRIVE",      x: 89, y: 44, z: "m", c: RED, w: 800, d: 1 },
  { t: "IGNITE",     x: 11, y: 62, z: "m", c: RED, w: 800, d: 1 },
  { t: "RECOVERY",   x: 75, y: 84, z: "m", c: ICE, w: 600, d: 0 },
  { t: "CARDIO",     x: 47, y: 61, z: "m", c: BL,  w: 700, d: 1 },
  { t: "STAMINA",    x: 36, y: 84, z: "m", c: IND, w: 700, d: 0 },
  { t: "HEART",      x: 64, y: 57, z: "m", c: CY,  w: 700, d: 1 },

  // kleine Ebene (Füllung / Tiefe)
  { t: "CALORIES",   x: 10, y: 34, z: "s", c: GY,  w: 600, d: 0 },
  { t: "WELLNESS",   x: 41, y: 22, z: "s", c: GY,  w: 600, d: 0 },
  { t: "ATHLETIC",   x: 60, y: 74, z: "s", c: GY,  w: 600, d: 0 },
  { t: "MEDICAL",    x: 88, y: 60, z: "s", c: GY,  w: 600, d: 0 },
  { t: "CARE",       x: 56, y: 54, z: "s", c: BL,  w: 700, d: 0 },
  { t: "SPORT",      x: 30, y: 86, z: "s", c: GY,  w: 600, d: 0 },
  { t: "LIFE",       x: 72, y: 88, z: "s", c: CY,  w: 700, d: 0 },
  { t: "FORM",       x: 14, y: 30, z: "s", c: GY,  w: 600, d: 0 },
  { t: "DISCIPLINE", x: 48, y: 58, z: "s", c: WH,  w: 600, d: 1 },
  { t: "PROGRESS",   x: 76, y: 14, z: "s", c: GY,  w: 600, d: 0 },
  { t: "FOCUS",      x: 86, y: 34, z: "s", c: RED, w: 800, d: 1 },
  { t: "FIRE",       x: 22, y: 38, z: "s", c: RED, w: 800, d: 1 },
  { t: "INTENSITY",  x: 66, y: 69, z: "s", c: RED, w: 800, d: 1 },
  { t: "GROWTH",     x: 44, y: 87, z: "s", c: ICE, w: 700, d: 0 },
  { t: "MOBILITY",   x: 18, y: 68, z: "s", c: BL,  w: 600, d: 0 },
  { t: "BALANCE",    x: 82, y: 53, z: "s", c: IND, w: 600, d: 0 },
  { t: "PROTEIN",    x: 34, y: 47, z: "s", c: GY,  w: 600, d: 0 },
  { t: "WILLPOWER",  x: 58, y: 44, z: "s", c: WH,  w: 600, d: 1 },
];

function offset(i) {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12543.132;
  const dx = ((a - Math.floor(a)) - 0.5) * 700;
  const dy = ((b - Math.floor(b)) - 0.5) * 700;
  return { dx: Math.round(dx), dy: Math.round(dy) };
}

function glowFor(c) {
  if (c === RED) return "rgba(255,60,90,0.62)";
  if (c === CY)  return "rgba(57,201,255,0.55)";
  if (c === ICE) return "rgba(156,217,255,0.5)";
  if (c === IND) return "rgba(120,130,255,0.55)";
  if (c === BL)  return "rgba(46,125,240,0.5)";
  return "rgba(120,180,255,0.42)";
}

function depthStyle(d, c) {
  const glow = glowFor(c);
  if (d === 2) return { opacity: 1,    filter: "none",       textShadow: `0 0 30px ${glow}, 0 2px 12px rgba(0,0,0,0.55)` };
  if (d === 1) return { opacity: 0.94, filter: "none",       textShadow: `0 0 18px ${glow}` };
  return         { opacity: 0.5,  filter: "blur(0.6px)", textShadow: "0 0 9px rgba(40,80,160,0.4)" };
}

export default function Intro({ onDone }) {
  const [phase, setPhase] = useState("cloud"); // cloud -> logo -> gone

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("logo"), 3100);
    const t2 = setTimeout(() => finish(), 5200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  function finish() {
    setPhase("gone");
    setTimeout(() => onDone && onDone(), 500);
  }

  return (
    <div onClick={finish} style={{
      position: "fixed", inset: 0, zIndex: 100, cursor: "pointer",
      background: "radial-gradient(130% 100% at 50% 44%, #0C3384 0%, #06183F 52%, #010817 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
      opacity: phase === "gone" ? 0 : 1, transition: "opacity .5s ease",
    }}>
      <style>{introCss}</style>

      <div className="aw-rays" />
      <div style={{ position: "absolute", width: "min(92vw,660px)", height: "min(92vw,660px)", background: "radial-gradient(circle, rgba(90,160,255,0.38) 0%, rgba(20,60,140,0.12) 40%, transparent 68%)", filter: "blur(6px)" }} />
      <div className="aw-grid2" style={{ position: "absolute", inset: 0, opacity: 0.45 }} />
      <div className="aw-flare" />
      <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 220px 60px rgba(0,0,0,0.75)", pointerEvents: "none" }} />

      {/* Wortwolke (ohne Hero) – groß & dicht, mit Push-in-Zoom */}
      <div className={phase === "cloud" ? "aw-push" : ""} style={{
        position: "relative", width: "min(99vw, 720px)", height: "min(84vh, 620px)", zIndex: 1,
        opacity: phase === "cloud" ? 1 : 0,
        transform: phase === "cloud" ? undefined : "scale(1.5)",
        transition: "opacity .55s ease, transform .65s ease",
      }}>
        {WORDS.filter((w) => !w.grad).map((wd, i) => {
          const { dx, dy } = offset(i + 1);
          const flyDelay = 0.04 + i * 0.04;
          return (
            <span key={wd.t} className="aw-word" style={{
              position: "absolute", left: `${wd.x}%`, top: `${wd.y}%`,
              fontFamily: "'Roboto Condensed', 'Roboto', sans-serif",
              fontSize: SIZE[wd.z], fontWeight: wd.w,
              letterSpacing: "0.015em", whiteSpace: "nowrap",
              "--dx": `${dx}px`, "--dy": `${dy}px`,
              color: wd.c, ...depthStyle(wd.d, wd.c),
              animation: `awFly .85s cubic-bezier(.16,.8,.24,1) ${flyDelay}s both`,
            }}>{wd.t}</span>
          );
        })}
      </div>

      {/* Impact-Flash */}
      <div style={{ position: "absolute", inset: 0, background: "#Eaf4ff", pointerEvents: "none",
        opacity: 0, animation: phase === "logo" ? "awFlash .6s ease-out both" : "none" }} />

      {/* HERO: TRANSFORMATION – erscheint zuletzt, liegt obenauf, bleibt stehen */}
      <div style={{
        position: "absolute", left: "50%", top: phase === "logo" ? "35%" : "50%",
        transform: "translate(-50%, -50%)", zIndex: 8, pointerEvents: "none",
        transition: "top .7s cubic-bezier(.2,.85,.2,1)",
        opacity: phase === "gone" ? 0 : 1,
      }}>
        <span className="aw-grad" style={{
          display: "inline-block", fontFamily: "'Roboto Condensed', 'Roboto', sans-serif",
          fontSize: SIZE.hero, fontWeight: 800, letterSpacing: "-0.005em", whiteSpace: "nowrap",
          backgroundImage: "linear-gradient(100deg, #FFFFFF 0%, #9CD9FF 32%, #39C9FF 52%, #FFFFFF 78%, #8FB6FF 100%)",
          backgroundSize: "230% 100%", WebkitBackgroundClip: "text", backgroundClip: "text",
          WebkitTextFillColor: "transparent", color: "transparent",
          filter: "drop-shadow(0 0 36px rgba(57,201,255,0.6)) drop-shadow(0 3px 12px rgba(0,0,0,0.5))",
          animation: "awHeroIn 1s cubic-bezier(.16,.8,.24,1) 1.95s both, awShimmer 3.6s linear 2.6s infinite",
        }}>TRANSFORMATION</span>
      </div>

      {/* Logo-Finale – rückt unter die TRANSFORMATION */}
      <div style={{
        position: "absolute", left: "50%", top: "60%", transform: "translate(-50%, -50%)",
        zIndex: 6, textAlign: "center", pointerEvents: "none",
        opacity: phase === "logo" || phase === "gone" ? 1 : 0,
      }}>
        <div style={{ animation: phase === "logo" ? "awSlam .7s cubic-bezier(.18,.9,.2,1) both" : "none", opacity: phase === "logo" ? 1 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
            <span style={{ width: 14, height: "clamp(44px,10vw,68px)", background: "#0E5BFF", boxShadow: "0 0 28px rgba(14,91,255,0.9)" }} />
            <span style={{ fontFamily: "'Roboto Condensed', 'Roboto', sans-serif", fontSize: "clamp(46px,13vw,84px)", fontWeight: 800, letterSpacing: "0.12em", color: "#fff", textShadow: "0 0 40px rgba(57,201,255,0.6)" }}>AUFWIND</span>
          </div>
          <div style={{ marginTop: 12, fontSize: "clamp(11px,3vw,15px)", letterSpacing: "0.44em", color: RED, fontWeight: 700, textShadow: "0 0 20px rgba(255,45,70,0.7)" }}>360°</div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: "calc(24px + env(safe-area-inset-bottom))", fontSize: 11, letterSpacing: "0.2em", color: "rgba(255,255,255,0.42)" }}>TIPPEN ZUM ÜBERSPRINGEN</div>
    </div>
  );
}

const introCss = `
@keyframes awFly {
  0%   { opacity: 0; transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(.3); filter: blur(4px); }
  55%  { opacity: 1; filter: blur(0); }
  100% { opacity: 1; transform: translate(-50%, -50%) translate(0,0) scale(1); }
}
@keyframes awShimmer { 0% { background-position: 0% 50%; } 100% { background-position: 230% 50%; } }
@keyframes awHeroIn { 0% { opacity: 0; transform: scale(.32); filter: blur(6px); } 55% { opacity: 1; filter: blur(0); } 72% { transform: scale(1.07); } 100% { opacity: 1; transform: scale(1); } }
@keyframes awPushZoom { 0% { transform: scale(.9); } 100% { transform: scale(1.09); } }
@keyframes awFlash { 0% { opacity: 0; } 22% { opacity: .85; } 100% { opacity: 0; } }
@keyframes awSlam {
  0%   { opacity: 0; transform: scale(1.5); filter: blur(6px); }
  55%  { opacity: 1; filter: blur(0); }
  70%  { transform: scale(.97); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes awSpin { to { transform: rotate(360deg); } }
@keyframes awSweep { 0% { transform: translateX(-120%) rotate(-8deg); opacity: 0; } 40% { opacity: .55; } 100% { transform: translateX(120%) rotate(-8deg); opacity: 0; } }
.aw-word { display: inline-block; will-change: transform, opacity; transform: translate(-50%, -50%); }
.aw-grad { background-repeat: no-repeat; }
.aw-push { animation: awPushZoom 2.8s ease-out both; }
.aw-rays {
  position: absolute; width: 200%; height: 200%;
  background: conic-gradient(from 0deg at 50% 50%,
    rgba(57,201,255,0.12) 0deg, transparent 12deg, rgba(255,45,70,0.08) 30deg, transparent 48deg,
    rgba(110,123,255,0.10) 66deg, transparent 88deg, rgba(156,217,255,0.10) 116deg, transparent 146deg,
    rgba(255,45,70,0.06) 186deg, transparent 214deg, rgba(57,201,255,0.11) 262deg, transparent 296deg,
    rgba(120,180,255,0.09) 328deg, transparent 360deg);
  filter: blur(9px); animation: awSpin 24s linear infinite;
}
.aw-flare {
  position: absolute; top: 38%; left: 0; width: 64%; height: 32%;
  background: linear-gradient(90deg, transparent, rgba(190,225,255,0.4), transparent);
  filter: blur(22px); animation: awSweep 2.8s ease-in-out .3s infinite;
}
.aw-grid2 { background-image: linear-gradient(rgba(120,180,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(120,180,255,0.06) 1px, transparent 1px); background-size: 46px 46px; }
@media (prefers-reduced-motion: reduce) {
  .aw-word { animation-duration: .01s !important; }
  .aw-push, .aw-rays, .aw-flare, .aw-grad { animation: none !important; }
}
`;
