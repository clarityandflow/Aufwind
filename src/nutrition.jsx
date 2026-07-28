import React, { useState, useRef } from "react";

// ============================================================
//  Energiebilanz – Logik + UI (Profil, Bewegungs-kcal, freies Essen)
//  Alles Näherungswerte: Ziel ist die Richtung/Trend, nicht Präzision.
// ============================================================

const RED = "#FF2D46", CY = "#39C9FF", GREEN = "#22E58A", INK = "#EAF2FF",
  SUB = "#93A7CC", LINE = "rgba(125,170,255,0.16)", SOFT = "rgba(125,170,255,0.10)",
  PANEL = "linear-gradient(180deg, #0C2350 0%, #071739 100%)", RC = "'Roboto Condensed', 'Roboto', sans-serif";

// ---- Profil / Rechen-Helfer ----
const PROFILE_KEY = "aufwind-profile";
export const DEFAULT_PROFILE = { height: 180, age: 45, sex: "m", activity: "light", intensity: "ambitioniert", weightStart: 128, weightGoal: 100, set: false };
export function loadProfile() { try { const r = localStorage.getItem(PROFILE_KEY); return r ? { ...DEFAULT_PROFILE, ...JSON.parse(r) } : { ...DEFAULT_PROFILE }; } catch (e) { return { ...DEFAULT_PROFILE }; } }
export function saveProfile(p) { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (e) {} }

export const ACTIVITY = { sed: { f: 1.3, label: "Überwiegend sitzend" }, light: { f: 1.45, label: "Leicht aktiv" }, active: { f: 1.6, label: "Aktiv" } };
export const INTENSITY = {
  moderat:      { kcal: 500,  label: "Moderat",      per: "≈ 0,5 kg/Woche" },
  ambitioniert: { kcal: 750,  label: "Ambitioniert", per: "≈ 0,75 kg/Woche" },
  aggressiv:    { kcal: 1000, label: "Aggressiv",    per: "≈ 1 kg/Woche" },
};
export const KCAL_PER_KG = 7700;
export const MIN_INTAKE = 1500; // Sicherheits-Untergrenze für die Zufuhr

// pro Mahlzeit-Slot (Näherung, Fallback)
export const SLOT_KCAL = { meal_breakfast: 350, meal_lunch: 520, meal_dinner: 520 };

// kcal + Protein (g) je Wochentag_Slot – Näherungswerte pro Rezept
export const MEAL_NUTRI = {
  "1_breakfast": { kcal: 350, protein: 14 }, "1_lunch": { kcal: 480, protein: 24 }, "1_dinner": { kcal: 520, protein: 38 },
  "2_breakfast": { kcal: 320, protein: 25 }, "2_lunch": { kcal: 550, protein: 30 }, "2_dinner": { kcal: 550, protein: 30 },
  "3_breakfast": { kcal: 300, protein: 20 }, "3_lunch": { kcal: 480, protein: 35 }, "3_dinner": { kcal: 380, protein: 34 },
  "4_breakfast": { kcal: 340, protein: 13 }, "4_lunch": { kcal: 500, protein: 20 }, "4_dinner": { kcal: 560, protein: 38 },
  "5_breakfast": { kcal: 340, protein: 28 }, "5_lunch": { kcal: 560, protein: 42 }, "5_dinner": { kcal: 430, protein: 36 },
  "6_breakfast": { kcal: 400, protein: 24 }, "6_lunch": { kcal: 620, protein: 24 }, "6_dinner": { kcal: 650, protein: 30 },
  "0_breakfast": { kcal: 400, protein: 28 }, "0_lunch": { kcal: 650, protein: 45 }, "0_dinner": { kcal: 300, protein: 14 },
};
export function mealNutri(weekday, slot) { return MEAL_NUTRI[`${weekday}_${slot}`] || { kcal: SLOT_KCAL[`meal_${slot}`] || 500, protein: 20 }; }

// Protein-Ziel: ~1,8 g pro kg Zielgewicht (muskelschützend im Defizit)
export function proteinTarget(profile) { const g = profile.weightGoal || 100; return Math.round(1.8 * g); }

export function bmr(weightKg, height, age, sex) {
  const base = 10 * weightKg + 6.25 * height - 5 * age;
  return Math.round(sex === "m" ? base + 5 : base - 161);
}
export function tdeeBase(profile, weightKg) {
  return Math.round(bmr(weightKg, profile.height, profile.age, profile.sex) * (ACTIVITY[profile.activity]?.f || 1.45));
}
export function targetIntake(profile, weightKg) {
  return Math.max(MIN_INTAKE, tdeeBase(profile, weightKg) - (INTENSITY[profile.intensity]?.kcal || 500));
}

export const MOVE_META = {
  walk:  { met: 3.8, speed: 5,  icon: "🚶", label: "Gelaufen" },
  bike:  { met: 6.8, speed: 18, icon: "🚴", label: "Rad" },
  other: { met: 6.0, speed: 8,  icon: "💪", label: "Anderes" },
};
export function moveKcal(type, { minutes, km }, weightKg) {
  const m = MOVE_META[type] || MOVE_META.other;
  let hours = 0;
  if (minutes) hours = minutes / 60;
  else if (km) hours = km / m.speed;
  return Math.round(m.met * weightKg * hours);
}

// ---- kleine UI-Bausteine ----
const btn = { border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer", padding: "12px" };
const field = { width: "100%", border: `1px solid ${LINE}`, borderRadius: 6, padding: "11px 12px", fontSize: 15, color: INK, background: "#0B1E44", outline: "none" };
const Sheet = ({ title, onClose, children }) => (
  <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 60 }}>
    <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: PANEL, border: `1px solid ${LINE}`, borderBottom: "none", borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: "18px 20px calc(28px + env(safe-area-inset-bottom))", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 -20px 60px rgba(0,0,0,0.5)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontFamily: RC, fontSize: 18, fontWeight: 700, color: INK, textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 24, color: SUB, cursor: "pointer", lineHeight: 1 }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

// ---- Bilanz-Karte (Heute) ----
export function BalanceCard({ profile, weightKg, intake, exerciseKcal, proteinIn, onOpenProfile, onOpenMealLog }) {
  const cardBox = { background: "rgba(14,34,74,0.60)", border: `1px solid ${LINE}`, borderRadius: 8, padding: "16px 18px", backdropFilter: "blur(8px)", boxShadow: "0 10px 30px rgba(0,0,0,0.35)" };
  if (!profile.set) {
    return (
      <div style={{ ...cardBox, marginTop: 12, textAlign: "center" }}>
        <div style={{ fontSize: 22 }}>📊</div>
        <div style={{ fontFamily: RC, fontSize: 17, fontWeight: 700, color: INK, marginTop: 4 }}>Kalorienbilanz aktivieren</div>
        <div style={{ fontSize: 12.5, color: SUB, marginTop: 4, lineHeight: 1.5 }}>Einmal Größe, Alter & Ziel eintragen – dann rechnet Aufwind rein/raus automatisch.</div>
        <button onClick={onOpenProfile} style={{ ...btn, background: CY, color: "#04121f", marginTop: 14, width: "100%" }}>Profil einrichten</button>
      </div>
    );
  }
  const tdee = tdeeBase(profile, weightKg);
  const target = targetIntake(profile, weightKg);
  const out = tdee + exerciseKcal;
  const logged = intake > 0;
  const deficit = out - intake;
  const remaining = Math.max(0, target - intake);
  const perWeekKg = Math.abs(deficit) * 7 / KCAL_PER_KG;
  const pct = target ? Math.min(1, intake / target) : 0;
  // Zonen: none = nichts geloggt · surplus · ontrack (bis 1000) · aggressive (>1000)
  const zone = !logged ? "none" : deficit < 0 ? "surplus" : deficit > 1000 ? "aggressive" : "ontrack";
  const ZC = { none: SUB, surplus: RED, ontrack: GREEN, aggressive: "#FF8A3D" }[zone];
  const ZBG = { none: "rgba(125,170,255,0.08)", surplus: "rgba(255,45,70,0.12)", ontrack: "rgba(34,229,138,0.12)", aggressive: "rgba(255,138,61,0.14)" }[zone];
  return (
    <div style={{ ...cardBox, marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontFamily: RC, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: SUB }}>Kalorienbilanz heute</div>
        <button onClick={onOpenProfile} style={{ background: "transparent", border: "none", color: CY, fontSize: 12, fontWeight: 700, cursor: "pointer", minHeight: 44, padding: "0 4px" }}>Profil</button>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: 8 }}>
        <div>
          <div style={{ fontFamily: RC, fontSize: 34, fontWeight: 700, color: INK, lineHeight: 1 }}>{intake}<span style={{ fontSize: 15, color: SUB }}> kcal rein</span></div>
          <div style={{ fontSize: 12, color: SUB, marginTop: 3 }}>Verbrauch ~{out} kcal · Grundumsatz {tdee}{exerciseKcal ? ` + Sport ${exerciseKcal}` : ""}</div>
        </div>
      </div>
      {/* Balken zur Zielzufuhr */}
      <div style={{ marginTop: 12, height: 10, borderRadius: 5, background: SOFT, overflow: "hidden", position: "relative" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: intake <= target ? CY : RED, boxShadow: `0 0 10px ${intake <= target ? CY : RED}66`, transition: "width .4s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: SUB, marginTop: 6 }}>
        <span>Ziel-Zufuhr {target} kcal</span>
        <span>{logged ? (intake <= target ? `noch ${remaining} kcal frei` : `${intake - target} über Ziel`) : "—"}</span>
      </div>
      {/* Ergebnis */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 14, padding: "12px 13px", borderRadius: 6, background: ZBG, border: `1px solid ${ZC}55` }}>
        {zone === "none" ? (
          <div style={{ fontSize: 13, color: INK, lineHeight: 1.45 }}>
            Noch nichts eingetragen.
            <div style={{ fontSize: 11.5, color: SUB, marginTop: 2 }}>Trag dein Essen ein, dann siehst du deine echte Bilanz.</div>
          </div>
        ) : (
          <>
            <span style={{ fontFamily: RC, fontSize: 22, fontWeight: 700, color: ZC }}>{deficit >= 0 ? "−" : "+"}{Math.abs(deficit)}</span>
            <div style={{ flex: 1, fontSize: 12.5, color: INK, lineHeight: 1.4 }}>
              {zone === "surplus" && <>kcal Überschuss heute<div style={{ fontSize: 11, color: SUB }}>Heute (noch) über dem Verbrauch.</div></>}
              {zone === "ontrack" && <>kcal Defizit heute<div style={{ fontSize: 11, color: SUB }}>Richtwert: −{perWeekKg.toFixed(2)} kg/Woche bei diesem Tempo.</div></>}
              {zone === "aggressive" && <>kcal Defizit — sehr aggressiv<div style={{ fontSize: 11, color: "#FF8A3D" }}>Nicht nachhaltig. Iss genug (v.a. Protein), sonst Muskelabbau.</div></>}
            </div>
          </>
        )}
      </div>
      {/* Protein */}
      {(() => {
        const pt = proteinTarget(profile);
        const pp = Math.min(1, (proteinIn || 0) / pt);
        return (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: SUB, marginBottom: 5 }}>
              <span style={{ fontWeight: 700, color: INK }}>Protein</span>
              <span>{proteinIn || 0} / {pt} g</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: SOFT, overflow: "hidden" }}>
              <div style={{ width: `${pp * 100}%`, height: "100%", background: GREEN, boxShadow: `0 0 8px ${GREEN}66`, transition: "width .4s" }} />
            </div>
            <div style={{ fontSize: 10.5, color: SUB, marginTop: 4 }}>Wichtig im Defizit: schützt Muskeln & macht satt.</div>
          </div>
        );
      })()}
      {profile.intensity === "aggressiv" && (
        <div style={{ marginTop: 12, fontSize: 11, color: SUB, lineHeight: 1.5, background: "rgba(255,45,70,0.10)", border: `1px solid ${RED}44`, borderRadius: 6, padding: "9px 11px" }}>
          Aggressives Tempo: achte auf Protein & genug Essen. Bei Diabetes-Medikamenten BZ im Blick behalten – bei Unsicherheit Arzt fragen.
        </div>
      )}
      <button onClick={onOpenMealLog} style={{ ...btn, background: SOFT, color: INK, border: `1px solid ${LINE}`, marginTop: 12, width: "100%", fontSize: 13.5 }}>+ Essen abweichend eintragen</button>
    </div>
  );
}

// ---- Profil-Sheet ----
export function ProfileSheet({ profile, onSave, onClose }) {
  const [p, setP] = useState({ ...profile });
  function upd(k, v) { setP((s) => ({ ...s, [k]: v })); }
  const num = (v) => { const n = parseInt(String(v).replace(/[^\d]/g, ""), 10); return isNaN(n) ? "" : n; };
  return (
    <Sheet title="Profil & Ziel" onClose={onClose}>
      <div style={{ display: "flex", gap: 10 }}>
        <label style={{ flex: 1 }}><div style={lab}>Größe (cm)</div><input style={field} inputMode="numeric" value={p.height} onChange={(e) => upd("height", num(e.target.value))} /></label>
        <label style={{ flex: 1 }}><div style={lab}>Alter</div><input style={field} inputMode="numeric" value={p.age} onChange={(e) => upd("age", num(e.target.value))} /></label>
      </div>
      <div style={lab}>Geschlecht</div>
      <div style={{ display: "flex", gap: 8 }}>
        {[["m", "Mann"], ["w", "Frau"]].map(([v, l]) => (
          <button key={v} onClick={() => upd("sex", v)} style={{ ...seg, ...(p.sex === v ? segOn : {}) }}>{l}</button>
        ))}
      </div>
      <div style={lab}>Alltags-Aktivität</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Object.entries(ACTIVITY).map(([k, v]) => (
          <button key={k} onClick={() => upd("activity", k)} style={{ ...row, ...(p.activity === k ? segOn : {}) }}>{v.label}</button>
        ))}
      </div>
      <div style={lab}>Abnehm-Tempo</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Object.entries(INTENSITY).map(([k, v]) => (
          <button key={k} onClick={() => upd("intensity", k)} style={{ ...row, ...(p.intensity === k ? segOn : {}), display: "flex", justifyContent: "space-between" }}>
            <span>{v.label}</span><span style={{ color: p.intensity === k ? "#04121f" : SUB, fontWeight: 600 }}>{v.per}</span>
          </button>
        ))}
      </div>
      <p style={{ fontSize: 11.5, color: SUB, lineHeight: 1.5, marginTop: 12 }}>Alles Näherungswerte. Bei Diabetes/Crohn das Tempo bitte kurz mit dem Arzt abstimmen – die Zufuhr wird nie unter {MIN_INTAKE} kcal angesetzt.</p>
      <button onClick={() => { onSave({ ...p, height: p.height || 180, age: p.age || 40, set: true }); onClose(); }} style={{ ...btn, background: CY, color: "#04121f", width: "100%", marginTop: 8 }}>Speichern</button>
    </Sheet>
  );
}

// ---- Bewegung: km/Zeit -> kcal ----
export function MovePrompt({ type, weightKg, onConfirm, onClose }) {
  const m = MOVE_META[type] || MOVE_META.other;
  const [mode, setMode] = useState("min");
  const [val, setVal] = useState("");
  const n = parseFloat(String(val).replace(",", ".")) || 0;
  const kcal = moveKcal(type, mode === "min" ? { minutes: n } : { km: n }, weightKg);
  const detail = n ? (mode === "min" ? `${n} Min` : `${n} km`) : "";
  return (
    <Sheet title={`${m.icon} ${m.label}`} onClose={onClose}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setMode("min")} style={{ ...seg, ...(mode === "min" ? segOn : {}) }}>Dauer (Min)</button>
        <button onClick={() => setMode("km")} style={{ ...seg, ...(mode === "km" ? segOn : {}) }}>Strecke (km)</button>
      </div>
      <input style={field} autoFocus inputMode="decimal" placeholder={mode === "min" ? "z.B. 45" : "z.B. 12"} value={val} onChange={(e) => setVal(e.target.value)} />
      <div style={{ textAlign: "center", margin: "16px 0" }}>
        <div style={{ fontFamily: RC, fontSize: 40, fontWeight: 700, color: CY, textShadow: `0 0 16px ${CY}55` }}>{kcal}</div>
        <div style={{ fontSize: 12, color: SUB }}>geschätzte kcal verbrannt</div>
      </div>
      <button onClick={() => onConfirm(kcal, detail)} disabled={!n} style={{ ...btn, background: n ? CY : SOFT, color: n ? "#04121f" : SUB, width: "100%" }}>Eintragen</button>
    </Sheet>
  );
}

// ---- Freies Essen (Diktat + Schätzung) ----
const PRESETS = [
  ["Haferflocken (gekocht) + Apfel", 330],
  ["Handvoll Nüsse", 180],
  ["Proteinshake", 220],
  ["Stück Kuchen / süß", 380],
];
const PORTIONS = [["Klein", 300], ["Normal", 550], ["Groß", 800], ["2 Teller", 1150]];

export function MealLogSheet({ onAdd, onClose }) {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  function dictate() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Sprach-Erkennung hier nicht verfügbar. Tipp: im Textfeld die Mikrofon-Taste der iPhone-Tastatur nutzen."); return; }
    try {
      const rec = new SR(); recRef.current = rec; rec.lang = "de-DE"; rec.interimResults = false;
      rec.onresult = (e) => { const t = e.results[0][0].transcript; setName((s) => (s ? s + " " : "") + t); };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      setListening(true); rec.start();
    } catch (e) { setListening(false); }
  }
  const k = parseInt(String(kcal).replace(/[^\d]/g, ""), 10) || 0;
  return (
    <Sheet title="Essen frei eintragen" onClose={onClose}>
      <div style={lab}>Was hast du gegessen?</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input style={{ ...field, flex: 1 }} placeholder="z.B. Gemüsenudeln Bolognese, 2 Teller" value={name} onChange={(e) => setName(e.target.value)} />
        <button onClick={dictate} aria-label="Diktieren" style={{ flex: "0 0 46px", borderRadius: 6, border: `1px solid ${listening ? RED : LINE}`, background: listening ? "rgba(255,45,70,0.15)" : SOFT, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={listening ? RED : CY} strokeWidth="2" strokeLinecap="round"><path d="M12 2a3 3 0 00-3 3v6a3 3 0 006 0V5a3 3 0 00-3-3z" /><path d="M19 10v1a7 7 0 01-14 0v-1M12 18v4" /></svg>
        </button>
      </div>

      <div style={lab}>Schnell-Auswahl</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {PRESETS.map(([n, c]) => (
          <button key={n} onClick={() => { setName(n); setKcal(String(c)); }} style={chip}>{n} · {c}</button>
        ))}
      </div>

      <div style={lab}>Portion schätzen</div>
      <div style={{ display: "flex", gap: 8 }}>
        {PORTIONS.map(([l, c]) => (
          <button key={l} onClick={() => setKcal(String(c))} style={{ ...seg, ...(k === c ? segOn : {}), padding: "10px 6px", fontSize: 12 }}>{l}<div style={{ fontSize: 10, opacity: 0.8 }}>{c}</div></button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <label style={{ flex: 1 }}><div style={lab}>Kalorien</div><input style={field} inputMode="numeric" placeholder="kcal" value={kcal} onChange={(e) => setKcal(e.target.value)} /></label>
        <label style={{ flex: 1 }}><div style={lab}>Protein (g, optional)</div><input style={field} inputMode="numeric" placeholder="g" value={protein} onChange={(e) => setProtein(e.target.value)} /></label>
      </div>

      <button onClick={() => { if (k > 0) { onAdd(name || "Freie Mahlzeit", k, parseInt(String(protein).replace(/[^\d]/g, ""), 10) || 0); onClose(); } }} disabled={!k} style={{ ...btn, background: k ? CY : SOFT, color: k ? "#04121f" : SUB, width: "100%", marginTop: 14 }}>Hinzufügen{k ? ` · ${k} kcal` : ""}</button>
      <p style={{ fontSize: 11, color: SUB, lineHeight: 1.5, marginTop: 10 }}>Diktat füllt die Beschreibung. Die Kalorien schätzt du über Preset/Portion oder tippst sie ein – bewusst als Näherung.</p>
    </Sheet>
  );
}

// ---- Onboarding (geführter Erststart) ----
export function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState({ ...DEFAULT_PROFILE });
  const upd = (k, v) => setP((s) => ({ ...s, [k]: v }));
  const num = (v) => { const n = parseInt(String(v).replace(/[^\d]/g, ""), 10); return isNaN(n) ? "" : n; };
  const STEPS = 4;
  const finish = () => onComplete({ ...p, height: p.height || 180, age: p.age || 40, weightStart: p.weightStart || 128, weightGoal: p.weightGoal || 100, set: true });
  const next = () => (step < STEPS - 1 ? setStep(step + 1) : finish());

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, background: "radial-gradient(130% 100% at 50% 0%, #0C3384 0%, #06183F 55%, #010817 100%)", display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto", padding: "calc(28px + env(safe-area-inset-top)) 22px 24px" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
        {Array.from({ length: STEPS }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? CY : "rgba(255,255,255,0.15)", boxShadow: i <= step ? `0 0 8px ${CY}88` : "none" }} />
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {step === 0 && (
          <div>
            <div style={{ fontFamily: RC, fontSize: 34, fontWeight: 800, color: "#fff", lineHeight: 1.05, letterSpacing: "0.02em" }}>Willkommen bei<br /><span style={{ color: CY, textShadow: `0 0 22px ${CY}66` }}>AUFWIND</span></div>
            <p style={{ fontSize: 15, color: "#C6D6F5", lineHeight: 1.6, marginTop: 16 }}>Kurz dein Ziel scharf machen – dann rechnet Aufwind Kalorien, Protein und deinen Fortschritt automatisch mit. 30 Sekunden, einmalig.</p>
            <div style={{ marginTop: 20, padding: "14px 16px", background: "rgba(255,255,255,0.05)", border: `1px solid ${LINE}`, borderRadius: 8, fontSize: 13.5, color: "#C6D6F5", lineHeight: 1.5 }}>Alles bleibt lokal auf deinem Gerät. Näherungswerte – es geht um Richtung & Trend.</div>
          </div>
        )}
        {step === 1 && (
          <div>
            <div style={ttl}>Deine Körperdaten</div>
            <div style={{ display: "flex", gap: 10 }}>
              <label style={{ flex: 1 }}><div style={lab}>Größe (cm)</div><input style={field} inputMode="numeric" value={p.height} onChange={(e) => upd("height", num(e.target.value))} /></label>
              <label style={{ flex: 1 }}><div style={lab}>Alter</div><input style={field} inputMode="numeric" value={p.age} onChange={(e) => upd("age", num(e.target.value))} /></label>
            </div>
            <div style={lab}>Geschlecht</div>
            <div style={{ display: "flex", gap: 8 }}>{[["m", "Mann"], ["w", "Frau"]].map(([v, l]) => <button key={v} onClick={() => upd("sex", v)} style={{ ...seg, ...(p.sex === v ? segOn : {}) }}>{l}</button>)}</div>
            <div style={lab}>Alltags-Aktivität</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{Object.entries(ACTIVITY).map(([k, v]) => <button key={k} onClick={() => upd("activity", k)} style={{ ...row, ...(p.activity === k ? segOn : {}) }}>{v.label}</button>)}</div>
          </div>
        )}
        {step === 2 && (
          <div>
            <div style={ttl}>Dein Gewicht & Ziel</div>
            <div style={{ display: "flex", gap: 10 }}>
              <label style={{ flex: 1 }}><div style={lab}>Aktuell (kg)</div><input style={field} inputMode="decimal" placeholder="128" value={p.weightStart} onChange={(e) => upd("weightStart", num(e.target.value))} /></label>
              <label style={{ flex: 1 }}><div style={lab}>Ziel (kg)</div><input style={field} inputMode="decimal" placeholder="100" value={p.weightGoal} onChange={(e) => upd("weightGoal", num(e.target.value))} /></label>
            </div>
            <div style={{ marginTop: 16, padding: "14px 16px", background: "rgba(57,201,255,0.10)", border: `1px solid ${CY}44`, borderRadius: 8, fontSize: 14, color: "#EAF2FF" }}>
              Ziel: <b>{(p.weightStart || 128) - (p.weightGoal || 100)} kg</b> runter. Machbar – Schritt für Schritt.
            </div>
          </div>
        )}
        {step === 3 && (
          <div>
            <div style={ttl}>Dein Tempo</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(INTENSITY).map(([k, v]) => (
                <button key={k} onClick={() => upd("intensity", k)} style={{ ...row, ...(p.intensity === k ? segOn : {}), display: "flex", justifyContent: "space-between" }}>
                  <span>{v.label}</span><span style={{ color: p.intensity === k ? "#04121f" : SUB, fontWeight: 600 }}>{v.per}</span>
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: SUB, lineHeight: 1.5, marginTop: 14 }}>Schlechte Tage sind eingeplant – gerechnet wird über den Wochenschnitt. Bei Diabetes/Crohn das Tempo kurz mit dem Arzt abstimmen.</p>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        {step > 0 && <button onClick={() => setStep(step - 1)} style={{ ...btn, flex: "0 0 90px", background: "rgba(255,255,255,0.08)", color: "#fff", border: `1px solid ${LINE}` }}>Zurück</button>}
        <button onClick={next} style={{ ...btn, flex: 1, background: CY, color: "#04121f" }}>{step < STEPS - 1 ? "Weiter" : "Los geht's 🚀"}</button>
      </div>
    </div>
  );
}

const ttl = { fontFamily: RC, fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 6 };
const lab = { fontSize: 11.5, fontWeight: 700, color: SUB, textTransform: "uppercase", letterSpacing: "0.06em", margin: "14px 0 7px" };
const seg = { flex: 1, background: SOFT, color: INK, border: `1px solid ${LINE}`, borderRadius: 6, padding: "11px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", textAlign: "center" };
const segOn = { background: CY, color: "#04121f", border: `1px solid ${CY}` };
const row = { background: SOFT, color: INK, border: `1px solid ${LINE}`, borderRadius: 6, padding: "12px 14px", fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "left" };
const chip = { background: SOFT, color: INK, border: `1px solid ${LINE}`, borderRadius: 20, padding: "8px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" };
