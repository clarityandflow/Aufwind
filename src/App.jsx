import React, { useState, useEffect, useMemo } from "react";
import "./storage";
import Intro from "./Intro.jsx";
import ExercisePlayer from "./players.jsx";
import { loadProfile, saveProfile, tdeeBase, BalanceCard, ProfileSheet, MealLogSheet, MovePrompt, Onboarding } from "./nutrition.jsx";
import { PLAN, getPlan, isCustomPlan, setActivePlan, resetPlan, SLOTS, WD_ORDER, WD_SHORT, scaleAmt, catColor, buildShoppingList, CATEMOJI, TAGCOLOR } from "./meals.js";
import {
  loadReminders,
  saveReminders,
  scheduleAll,
  requestPermission,
  testFire,
  attachVisibilityRescheduler,
} from "./reminders";

// ============================================================
//  AUFWIND — 360° Transformation (installierbare PWA)
//  Heute · Essen-Wochenplan · Training · Verlauf
//  Ziel: 128 → 100 kg · Muskeln · zurück aufs MTB
// ============================================================

const STORE_KEY = "aufwind-v5";
const APP_VERSION = "1.9.0";

// Cinematic Dark-Theme (Farbwelt des Intros)
const T = {
  bg: "#0B1E44",                       // Eingabe-/Basisfläche dunkel
  soft: "rgba(125,170,255,0.10)",      // leicht erhöhte Fläche
  card: "rgba(14,34,74,0.60)",         // Panel
  ink: "#EAF2FF",                      // Haupttext hell
  sub: "#93A7CC",                      // Nebentext gedämpft
  line: "rgba(125,170,255,0.16)",      // feine Kante
  yellow: "#FF8A3D",
  green: "#22E58A",
  blue: "#2E7DF0",
  orange: "#FF8A3D",
  cyan: "#39C9FF",
  yellowSoft: "rgba(255,138,61,0.16)",
  greenSoft: "rgba(34,229,138,0.15)",
  blueSoft: "rgba(57,201,255,0.15)",
  red: "#FF2D46",
  redSoft: "rgba(255,45,70,0.14)",
};
const CAT = { Morgen: T.cyan, Bewegung: T.orange, Abend: T.green };

const WEEK = {
  0: { key: "ruhe", label: "Ruhetag" },
  1: { key: "kraftA", label: "Kraft A" },
  2: { key: "taichi", label: "Tai-Chi / Yoga" },
  3: { key: "kraftB", label: "Kraft B" },
  4: { key: "yoga", label: "Mobilität / Yoga" },
  5: { key: "kraftC", label: "Kraft C" },
  6: { key: "walk", label: "Langer Spaziergang" },
};

// kurze, verständliche Beschreibung, worum es beim heutigen Fokus geht
const FOCUSDESC = {
  kraftA: "Beine & ISG-Stabilität",
  kraftB: "Rumpf & ISG-Stabilität",
  kraftC: "Oberkörper & Brust",
  taichi: "Ruhe & Beweglichkeit",
  yoga: "Mobilität & ISG",
  walk: "Langer Spaziergang",
  ruhe: "Erholung – ISG entlasten",
};
const MOVE_GOAL = 3; // Bewegungs-/Spaziergang-Ziel pro Woche

const SESSIONS = {
  kraftA: { name: "Kraft A", sub: "ISG-Stabi · Beine · 2 × 8–10", items: [
    ["Glute Bridge", "Becken hoch bis Linie Schulter–Hüfte–Knie. Kein Hohlkreuz."],
    ["Bird-Dog", "Gegenüberliegend Arm + Bein. Becken nicht verdrehen."],
    ["Seitliches Beinheben", "Oberes Bein gestreckt heben. Hüfte gestapelt."],
    ["Aufstehen vom Stuhl", "Langsam hoch, kontrolliert runter."]] },
  kraftB: { name: "Kraft B", sub: "ISG-Stabi · Rumpf · 2 × 8–10 (pro Seite)", items: [
    ["Beckenkippen", "Kleine Bewegung, unterer Rücken in den Boden."],
    ["Dead Bug", "Arm + Bein absenken, Rücken bleibt am Boden."],
    ["Muschel (Clamshell)", "Knie öffnen, Füße zusammen, Becken ruhig."],
    ["Beinheben nach hinten", "Am Stuhl, Bein gestreckt nach hinten."]] },
  kraftC: { name: "Kraft C", sub: "Oberkörper · Brust · 2 × 8–12", items: [
    ["Wandliegestütz", "Hände an die Wand, Körper gerade, langsam beugen."],
    ["Erhöhter Liegestütz", "Hände auf Tisch/Couch – mehr Reiz, Rumpf fest."],
    ["Bankdrücken am Boden (Band)", "Theraband um den Rücken, nach oben drücken."],
    ["Brustpresse stehend (Band)", "Band hinter dem Rücken, Arme nach vorn pressen."]] },
  taichi: { name: "Stuhl-Tai-Chi", sub: "Ruhig & fließend", items: [
    ["Wolkenhände", "Hände vor dem Körper kreisen, Blick folgt sanft."],
    ["Atmen & Arme heben", "Einatmen heben, ausatmen sinken lassen."]] },
  yoga: { name: "Sanftes Yoga", sub: "ISG-freundlich", items: [
    ["Katze-Kuh", "Rücken sanft rund / leicht durchhängen."],
    ["Kindhaltung", "Knie weiter auseinander = angenehmer fürs ISG."],
    ["Knie zur Brust", "Beide Knie sanft heranziehen."]] },
  walk: { name: "Spaziergang", sub: "Dein täglicher Anker", items: [["Langer Spaziergang", "Tempo locker, dranbleiben."]] },
  ruhe: { name: "Ruhetag", sub: "Erholung fürs ISG", items: [["Sanftes Stuhl-Tai-Chi (optional)", "Nur wenn dir danach ist."]] },
};

const MORNING = [["m_mob", "5 Min Hüft-/Gesäß-Mobilität"], ["m_pills", "Tabletten / Vitamine"], ["m_water", "Großes Glas Wasser"]];

// Mahlzeiten-Daten kommen jetzt aus ./meals.js (PLAN) – eine gemeinsame Quelle.

async function loadData() { try { const r = await window.storage.get(STORE_KEY); return r ? JSON.parse(r.value) : null; } catch (e) { return null; } }
async function saveData(d) { try { await window.storage.set(STORE_KEY, JSON.stringify(d)); } catch (e) {} }

// Zutaten in Bring (oder generisches Teilen-Sheet) exportieren.
async function shareIngredients(title, ingredients) {
  const text = ingredients.join("\n");
  if (navigator.share) {
    try { await navigator.share({ title: `Bring: ${title}`, text }); return; } catch (e) { if (e && e.name === "AbortError") return; }
  }
  try { await navigator.clipboard.writeText(text); alert("Zutaten kopiert – in Bring einfügen."); }
  catch (e) { alert(text); }
}

const keyOf = (d) => d.toISOString().slice(0, 10);
const WD = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const WD2 = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const WDS = ["S", "M", "D", "M", "D", "F", "S"];
const MN = ["Jan", "Feb", "März", "Apr", "Mai", "Juni", "Juli", "Aug", "Sep", "Okt", "Nov", "Dez"];

function buildItemsForDate(d) {
  const plan = WEEK[d.getDay()];
  const day = getPlan()[d.getDay()];
  const out = [];
  // Morgens: Mobilität, Tabletten, Wasser
  MORNING.forEach(([id, label]) => out.push({ id, label, group: "Morgen", cue: id === "m_mob" ? "Locker machen: Hüfte kreisen, sanfte Mobilisation vor dem Training." : undefined }));
  // Frühstück
  if (day && day.breakfast) { const m = day.breakfast; out.push({ id: "meal_breakfast", label: `Frühstück · ${m.name}`, group: "Morgen", meal: true, emoji: CATEMOJI[m.cat] || "🍽️", kcal: m.kcal, protein: m.protein }); }
  // Training
  const sess = SESSIONS[plan.key];
  sess.items.forEach((it, i) => out.push({ id: `sport_${plan.key}_${i}`, label: it[0], cue: it[1], group: "Bewegung", sport: true, session: plan.label, reps: sess.sub }));
  // Mittagessen
  if (day && day.lunch) { const m = day.lunch; out.push({ id: "meal_lunch", label: `Mittag · ${m.name}`, group: "Mittag", meal: true, emoji: CATEMOJI[m.cat] || "🍽️", kcal: m.kcal, protein: m.protein }); }
  // Abendessen
  if (day && day.dinner) { const m = day.dinner; out.push({ id: "meal_dinner", label: `Abend · ${m.name}`, group: "Abend", meal: true, emoji: CATEMOJI[m.cat] || "🍽️", kcal: m.kcal, protein: m.protein }); }
  // Abend-Routine
  out.push({ id: "e_shakti", label: "Shakti-Matte · 10 Min runterfahren", group: "Abend" });
  const tom = new Date(d); tom.setDate(tom.getDate() + 1);
  const td = getPlan()[tom.getDay()];
  if (td) SLOTS.forEach(([slot]) => { const m = td[slot]; if (m && m.prep) out.push({ id: `e_prep_${slot}`, label: `Vorbereiten: ${m.name}`, group: "Abend" }); });
  return out;
}

function Check({ label, done, color, onToggle }) {
  return (
    <button onClick={onToggle} className="aw-row" style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${T.line}`, padding: "13px 2px", textAlign: "left", cursor: "pointer" }}>
      <span style={{ flex: "0 0 22px", width: 22, height: 22, borderRadius: "50%", border: `2px solid ${done ? color : "rgba(0,0,0,0.18)"}`, background: done ? color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .18s" }}>
        {done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </span>
      <span style={{ flex: 1, fontSize: 15.5, color: T.ink, lineHeight: 1.35, textDecoration: done ? "line-through" : "none", opacity: done ? 0.4 : 1 }}>{label}</span>
    </button>
  );
}

function ExRow({ item, done, onToggle, onStart }) {
  return (
    <div style={{ borderBottom: `1px solid ${T.line}`, padding: "12px 2px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onToggle} className="aw-row" style={{ flex: "0 0 22px", width: 22, height: 22, borderRadius: "50%", border: `2px solid ${done ? T.orange : "rgba(0,0,0,0.18)"}`, background: done ? T.orange : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
          {done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </button>
        <span style={{ flex: 1, fontSize: 15.5, color: T.ink, textDecoration: done ? "line-through" : "none", opacity: done ? 0.4 : 1 }}>{item.label}</span>
        {onStart && (
          <button onClick={onStart} aria-label="Übung starten" className="aw-row" style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 5, background: T.red, color: "#fff", border: "none", borderRadius: 4, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 3px 10px rgba(255,45,70,0.3)" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><path d="M6 4l14 8-14 8z" /></svg>Start
          </button>
        )}
      </div>
      {item.cue && <div style={{ padding: "6px 0 0 34px", fontSize: 12.5, color: T.sub, lineHeight: 1.45 }}>{item.cue}</div>}
    </div>
  );
}

function HeroRing({ pct, done, total }) {
  const size = 150, stroke = 16, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        <circle className="aw-pulse" cx={size / 2} cy={size / 2} r={r + 7} fill="none" stroke="#8BEBFF" strokeWidth="2" opacity="0.5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#8BEBFF" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .7s ease", filter: "drop-shadow(0 0 12px rgba(139,235,255,0.85))" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "'Roboto Condensed', 'Roboto', sans-serif", fontSize: 48, fontWeight: 700, lineHeight: 1, color: "#fff" }}>{done}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.78)", marginTop: 2 }}>von {total}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("heute");
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [player, setPlayer] = useState(null); // { exercise, id }
  const [profile, setProfile] = useState(() => loadProfile());
  const [profileOpen, setProfileOpen] = useState(false);
  const [mealLogOpen, setMealLogOpen] = useState(false);
  const [movePrompt, setMovePrompt] = useState(null); // Bewegungstyp
  const [planVersion, setPlanVersion] = useState(0);  // steigt, wenn KI den Plan ändert

  const now = new Date();
  const tKey = keyOf(now);
  const todayItems = useMemo(() => buildItemsForDate(new Date()), [planVersion]);
  const focusKey = WEEK[now.getDay()].key;
  const focus = WEEK[now.getDay()].label;
  const focusDesc = FOCUSDESC[focusKey];

  useEffect(() => { (async () => { const d = (await loadData()) || { history: {}, weights: {} }; if (!d.history) d.history = {}; if (!d.weights) d.weights = {}; setData(d); setLoaded(true); })(); }, []);
  useEffect(() => { attachVisibilityRescheduler(); scheduleAll(loadReminders()); }, []);

  const checks = (data && data.history[tKey]) || {};
  const done = todayItems.filter((i) => checks[i.id]).length;
  const total = todayItems.length;
  const pct = total ? done / total : 0;
  function toggle(id) { setData((p) => { const n = { ...p, history: { ...p.history } }; const day = { ...(n.history[tKey] || {}) }; day[id] = !day[id]; n.history[tKey] = day; saveData(n); return n; }); }
  function addWeight(kg) { setData((p) => { const n = { ...p, weights: { ...(p.weights || {}) } }; n.weights[tKey] = kg; saveData(n); return n; }); }
  function setSets(id, count, allDone) { setData((p) => { const n = { ...p, history: { ...p.history } }; const day = { ...(n.history[tKey] || {}) }; day[`${id}__sets`] = count; if (allDone) day[id] = true; n.history[tKey] = day; saveData(n); return n; }); }
  const moveToday = checks.move || null;
  const moveKcalToday = checks.moveKcal || 0;
  const weekMove = useMemo(() => { if (!data) return 0; let c = 0; const off = (now.getDay() + 6) % 7; for (let i = 0; i <= off; i++) { const d = new Date(); d.setDate(d.getDate() - i); const h = data.history[keyOf(d)]; if (h && h.move) c++; } return c; }, [data, tKey]);
  // Bewegungstyp antippen: gleicher Typ -> zurücksetzen, sonst km/Zeit-Dialog
  function onMoveType(type) { if (checks.move === type) { setData((p) => { const n = { ...p, history: { ...p.history } }; const day = { ...(n.history[tKey] || {}) }; day.move = undefined; day.moveKcal = 0; day.moveDetail = undefined; n.history[tKey] = day; saveData(n); return n; }); } else { setMovePrompt(type); } }
  function confirmMove(kcal, detail) { const type = movePrompt; setData((p) => { const n = { ...p, history: { ...p.history } }; const day = { ...(n.history[tKey] || {}) }; day.move = type; day.moveKcal = kcal; day.moveDetail = detail; n.history[tKey] = day; saveData(n); return n; }); if (navigator.vibrate) navigator.vibrate(20); setMovePrompt(null); }
  // Energiebilanz
  const weightKg = useMemo(() => { const ws = (data && data.weights) || {}; const ks = Object.keys(ws).sort(); return ks.length ? ws[ks[ks.length - 1]] : 128; }, [data]);
  const extrasToday = checks.extra || [];
  const intakeKcal = useMemo(() => { let s = 0; todayItems.forEach((it) => { if (it.meal && checks[it.id]) s += (it.kcal || 500); }); extrasToday.forEach((e) => { s += (e.kcal || 0); }); return s; }, [todayItems, checks]);
  const proteinIn = useMemo(() => { let s = 0; todayItems.forEach((it) => { if (it.meal && checks[it.id]) s += (it.protein || 0); }); extrasToday.forEach((e) => { s += (e.protein || 0); }); return s; }, [todayItems, checks]);
  function addExtraMeal(name, kcal, protein) { setData((p) => { const n = { ...p, history: { ...p.history } }; const day = { ...(n.history[tKey] || {}) }; day.extra = [...(day.extra || []), { name, kcal, protein: protein || 0 }]; n.history[tKey] = day; saveData(n); return n; }); }
  function removeExtraMeal(idx) { setData((p) => { const n = { ...p, history: { ...p.history } }; const day = { ...(n.history[tKey] || {}) }; day.extra = (day.extra || []).filter((_, i) => i !== idx); n.history[tKey] = day; saveData(n); return n; }); }
  function completeOnboarding(pr) { setProfile(pr); saveProfile(pr); const w = pr.weightStart || 128; setData((prev) => { const base = prev || { history: {}, weights: {} }; const n = { ...base, weights: { ...(base.weights || {}) } }; if (n.weights[tKey] == null) n.weights[tKey] = w; saveData(n); return n; }); }
  function addBloodSugar(v) { setData((p) => { const n = { ...p, bloodSugar: { ...(p.bloodSugar || {}) } }; n.bloodSugar[tKey] = v; saveData(n); return n; }); }
  function startExercise(exercise, id) { setPlayer({ exercise, id }); }
  function lastSetsFor(id) { if (!data) return 0; for (let i = 1; i < 45; i++) { const d = new Date(); d.setDate(d.getDate() - i); const h = data.history[keyOf(d)]; const v = h && h[`${id}__sets`]; if (v) return v; } return 0; }

  const week7 = useMemo(() => { if (!data) return []; const a = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const it = buildItemsForDate(d); const day = data.history[keyOf(d)] || {}; a.push({ d, frac: it.length ? it.filter((x) => day[x.id]).length / it.length : 0, isToday: i === 0 }); } return a; }, [data, tKey]);
  const heat = useMemo(() => { if (!data) return []; const a = []; for (let i = 27; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const it = buildItemsForDate(d); const day = data.history[keyOf(d)] || {}; a.push({ frac: it.length ? it.filter((x) => day[x.id]).length / it.length : 0, isToday: i === 0 }); } return a; }, [data, tKey]);
  const streak = useMemo(() => { if (!data) return 0; let s = 0; for (let i = 0; i < 200; i++) { const d = new Date(); d.setDate(d.getDate() - i); const day = data.history[keyOf(d)]; const any = day && Object.values(day).some(Boolean); if (any) s++; else if (i === 0) continue; else break; } return s; }, [data, tKey]);
  const best = useMemo(() => { if (!data) return 0; let b = 0, c = 0; for (let i = 199; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const day = data.history[keyOf(d)]; const any = day && Object.values(day).some(Boolean); if (any) { c++; if (c > b) b = c; } else c = 0; } return b; }, [data, tKey]);
  const avg7 = useMemo(() => week7.length ? Math.round(week7.reduce((a, w) => a + w.frac, 0) / week7.length * 100) : 0, [week7]);

  if (!loaded) return <div style={{ ...wrap, justifyContent: "center", alignItems: "center", color: T.sub }}>lädt …</div>;
  const dateLabel = `${WD[now.getDay()]}, ${now.getDate()}. ${MN[now.getMonth()]}`;

  return (
    <div style={wrap}>
      <style>{css}</style>
      {showIntro && <Intro onDone={() => setShowIntro(false)} />}
      {!showIntro && !profile.set && <Onboarding onComplete={completeOnboarding} />}
      {player && (
        <ExercisePlayer
          exercise={player.exercise}
          initialSets={(checks[`${player.id}__sets`]) || 0}
          lastSets={lastSetsFor(player.id)}
          nextLabel={(() => { const idx = todayItems.findIndex((i) => i.id === player.id); if (idx < 0) return null; for (let j = idx + 1; j < todayItems.length; j++) { if (!checks[todayItems[j].id]) return todayItems[j].label; } return null; })()}
          onSetsChange={(n, allDone) => setSets(player.id, n, allDone)}
          onClose={() => setPlayer(null)}
        />
      )}
      <header style={{ padding: "calc(14px + env(safe-area-inset-top)) 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 10, height: 26, background: "#0E5BFF" }} />
          <div>
            <div style={{ fontFamily: "'Roboto Condensed', 'Roboto', sans-serif", fontSize: 23, fontWeight: 700, letterSpacing: "0.14em", color: T.ink, textTransform: "uppercase" }}>Aufwind</div>
            <div style={{ fontSize: 9.5, color: T.sub, letterSpacing: "0.22em", textTransform: "uppercase", marginTop: 1 }}>360° Transformation</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12.5, color: T.sub }}>{dateLabel}</div>
            <div style={{ fontSize: 9, color: T.sub, opacity: 0.7, letterSpacing: "0.08em" }}>v{APP_VERSION}</div>
          </div>
          <button onClick={() => setSettingsOpen(true)} aria-label="Einstellungen" style={{ background: "transparent", border: "none", cursor: "pointer", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={T.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
          </button>
        </div>
      </header>

      <main style={{ flex: 1, overflowY: "auto", padding: "6px 20px 92px" }}>
        {tab === "heute" && <Heute {...{ done, total, pct, focus, focusDesc, week7, items: todayItems, checks, toggle, streak, onStart: startExercise, now, moveToday, moveKcalToday, weekMove, moveGoal: MOVE_GOAL, onMoveType, profile, weightKg, intakeKcal, proteinIn, exerciseKcal: moveKcalToday, extras: extrasToday, onRemoveExtra: removeExtraMeal, onOpenProfile: () => setProfileOpen(true), onOpenMealLog: () => setMealLogOpen(true) }} />}
        {tab === "essen" && <Essen now={now} onPlanChanged={() => setPlanVersion((v) => v + 1)} />}
        {tab === "training" && <Training open={open} setOpen={setOpen} onStart={startExercise} />}
        {tab === "verlauf" && <Verlauf {...{ streak, best, avg7, week7, heat, weights: (data.weights || {}), addWeight, profile, history: data.history, bloodSugar: (data.bloodSugar || {}), addBloodSugar, weightKg, intakeKcal, proteinIn, exerciseKcal: moveKcalToday, extras: extrasToday, onRemoveExtra: removeExtraMeal, onOpenProfile: () => setProfileOpen(true), onOpenMealLog: () => setMealLogOpen(true) }} />}
      </main>

      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
      {profileOpen && <ProfileSheet profile={profile} onSave={(p) => { setProfile(p); saveProfile(p); }} onClose={() => setProfileOpen(false)} />}
      {mealLogOpen && <MealLogSheet onAdd={addExtraMeal} onClose={() => setMealLogOpen(false)} />}
      {movePrompt && <MovePrompt type={movePrompt} weightKg={weightKg} onConfirm={confirmMove} onClose={() => setMovePrompt(null)} />}

      <nav style={{ position: "sticky", bottom: 0, display: "flex", background: "rgba(6,16,40,0.88)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderTop: `1px solid ${T.line}`, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {[["heute", "Heute", "M3 11l9-7 9 7M5 10v10h14V10"], ["essen", "Essen", "M6 3v18M9 3v6a3 3 0 01-3 3M15 3c0 4 4 4 4 8v7"], ["training", "Training", "M6 6v12M18 6v12M6 12h12M3 9v6M21 9v6"], ["verlauf", "Verlauf", "M3 17l5-5 4 4 7-8M21 8h-4M21 8v4"]].map(([k, label, d]) => (
          <button key={k} onClick={() => { setTab(k); setOpen(null); }} style={{ flex: 1, padding: "11px 0 13px", background: "transparent", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={tab === k ? T.ink : "#5F739A"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
            <span style={{ fontSize: 10.5, color: tab === k ? T.ink : "#5F739A", fontWeight: tab === k ? 700 : 500 }}>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{ width: 46, height: 27, borderRadius: 4, border: "none", background: on ? "#0E5BFF" : "#26375C", position: "relative", cursor: "pointer", transition: "background .18s", flex: "0 0 46px", boxShadow: on ? "0 0 14px rgba(14,91,255,0.6)" : "none" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 22 : 3, width: 21, height: 21, borderRadius: 3, background: "#fff", transition: "left .18s" }} />
    </button>
  );
}

function Settings({ onClose }) {
  const [r, setR] = useState(loadReminders());
  const [perm, setPerm] = useState(typeof Notification !== "undefined" ? Notification.permission : "unsupported");

  function persist(next) { setR(next); saveReminders(next); scheduleAll(next); }
  async function enable() {
    const p = await requestPermission();
    setPerm(p);
    if (p === "granted") persist({ ...r, enabled: true });
  }
  const rows = [["morning", "Morgen-Routine"], ["evening", "Abend-Prep"], ["friday", "Wochenplanung (Fr)"]];

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "linear-gradient(180deg, #0C2350 0%, #071739 100%)", border: `1px solid ${T.line}`, borderBottom: "none", borderTopLeftRadius: 10, borderTopRightRadius: 10, padding: "18px 20px calc(28px + env(safe-area-inset-bottom))", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 -20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontFamily: "'Roboto Condensed', 'Roboto', sans-serif", fontSize: 18, fontWeight: 700, color: T.ink, textTransform: "uppercase", letterSpacing: "0.08em" }}>Erinnerungen</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 22, color: T.sub, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {perm !== "granted" ? (
          <div style={{ marginTop: 10 }}>
            <p style={{ fontSize: 13.5, color: T.sub, lineHeight: 1.5, margin: "0 0 14px" }}>
              Aktiviere Benachrichtigungen für tägliche Erinnerungen. Auf dem iPhone bitte die App zuerst über „Zum Home-Bildschirm" installieren.
            </p>
            <button onClick={enable} style={{ width: "100%", background: "#0E5BFF", color: "#fff", border: "none", borderRadius: 4, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Benachrichtigungen erlauben</button>
            {perm === "denied" && <p style={{ fontSize: 12, color: T.orange, marginTop: 10 }}>Blockiert — in den iPhone-Einstellungen für Aufwind wieder freigeben.</p>}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${T.line}` }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Erinnerungen aktiv</span>
              <Toggle on={r.enabled} onChange={(v) => persist({ ...r, enabled: v })} />
            </div>
            {rows.map(([k, label]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${T.line}`, opacity: r.enabled ? 1 : 0.4 }}>
                <Toggle on={r[k].on} onChange={(v) => persist({ ...r, [k]: { ...r[k], on: v } })} />
                <span style={{ flex: 1, fontSize: 14.5, color: T.ink }}>{label}</span>
                <input type="time" value={r[k].time} onChange={(e) => persist({ ...r, [k]: { ...r[k], time: e.target.value } })} style={{ border: `1px solid ${T.line}`, borderRadius: 4, padding: "7px 9px", fontSize: 14, color: T.ink, background: T.bg }} />
              </div>
            ))}
            <button onClick={testFire} style={{ width: "100%", marginTop: 16, background: T.soft, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 4, padding: "11px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Test-Benachrichtigung senden</button>
          </>
        )}
        <p style={{ fontSize: 11.5, color: T.sub, lineHeight: 1.55, marginTop: 16 }}>
          Erinnerungen laufen lokal auf dem Gerät. Zuverlässig, wenn du die App regelmäßig öffnest. Für echte Hintergrund-Zustellung (App komplett geschlossen) wäre später ein kleiner Push-Server nötig.
        </p>
      </div>
    </div>
  );
}

const PHASE = {
  Morgen: { label: "Morgens", color: T.cyan, icon: "☀️" },
  Bewegung: { label: "Training", color: T.red, icon: "💪" },
  Mittag: { label: "Mittags", color: T.orange, icon: "🍽️" },
  Abend: { label: "Abends", color: T.green, icon: "🌙" },
};

const MOVE_TYPES = [["walk", "🚶", "Gelaufen"], ["bike", "🚴", "Rad"], ["other", "💪", "Anderes"]];
const MOVE_LABEL = { walk: "Gelaufen", bike: "Rad gefahren", other: "Bewegt" };

function Heute({ done, total, pct, focus, focusDesc, week7, items, checks, toggle, streak, onStart, now, moveToday, moveKcalToday, weekMove, moveGoal, onMoveType, profile, weightKg, intakeKcal, proteinIn, exerciseKcal, extras, onRemoveExtra, onOpenProfile, onOpenMealLog }) {
  const hour = now.getHours();
  const greeting = hour < 11 ? "Guten Morgen" : hour < 17 ? "Guten Tag" : "Guten Abend";
  // Nächster offener Schritt in der Reihenfolge des Tages
  const nextIdx = items.findIndex((i) => !checks[i.id]);
  const next = nextIdx >= 0 ? items[nextIdx] : null;
  const allDone = !next;
  // Essen zuerst, Training zuletzt (Start dreht sich primär ums Essen)
  const phaseOrder = ["Morgen", "Mittag", "Abend", "Bewegung"].filter((g) => items.some((i) => i.group === g));
  const [openPhases, setOpenPhases] = useState(() => ({ Morgen: true, Mittag: true, Abend: true }));
  const [balanceOpen, setBalanceOpen] = useState(false);
  const RCF = "'Roboto Condensed', 'Roboto', sans-serif";
  const Chevron = ({ open }) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.sub} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}><path d="M6 9l6 6 6-6" /></svg>;

  return (
    <>
      {/* Cinematic Hero mit Glow-Ring */}
      <div style={{ position: "relative", borderRadius: 8, padding: "24px 20px 20px", background: "linear-gradient(135deg, #1E6BFF 0%, #0E5BFF 42%, #0B2C8C 100%)", boxShadow: "0 18px 44px rgba(14,91,255,0.5), inset 0 1px 0 rgba(255,255,255,0.14)", border: "1px solid rgba(120,180,255,0.28)", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -30, width: 160, height: 160, background: "radial-gradient(circle, rgba(57,201,255,0.4), transparent 65%)", filter: "blur(8px)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <HeroRing pct={pct} done={done} total={total} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{greeting}, Dirk</div>
            <div style={{ fontFamily: "'Roboto Condensed', 'Roboto', sans-serif", fontSize: 28, fontWeight: 700, color: "#FFC24A", marginTop: 12 }}>🔥 {streak}</div>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.75)" }}>Tage am Stück</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 5, marginTop: 16 }}>
          {week7.map((w, i) => (
            <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: w.frac > 0 ? `rgba(255,255,255,${0.45 + w.frac * 0.55})` : "rgba(255,255,255,0.22)" }} />
          ))}
        </div>
      </div>

      {/* Fokus mit Kontext */}
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ ...chip, background: T.redSoft, borderColor: `${T.red}66`, color: T.ink }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.red, boxShadow: `0 0 8px ${T.red}` }} />
          Heute: {focus}
        </div>
        {focusDesc && <span style={{ fontSize: 12.5, color: T.sub }}>{focusDesc}</span>}
      </div>

      {/* JETZT DRAN */}
      {allDone ? (
        <div style={{ ...cardBox, marginTop: 12, textAlign: "center", borderColor: `${T.green}66`, boxShadow: `0 0 26px ${T.green}22, inset 0 1px 0 rgba(150,190,255,0.06)` }}>
          <div style={{ fontSize: 30 }}>🎉</div>
          <div style={{ fontFamily: "'Roboto Condensed', 'Roboto', sans-serif", fontSize: 20, fontWeight: 700, color: T.ink, marginTop: 4 }}>Tag geschafft!</div>
          <div style={{ fontSize: 12.5, color: T.sub, marginTop: 3 }}>Alle Schritte erledigt. Stark, Dirk.</div>
        </div>
      ) : (
        <div style={{ position: "relative", marginTop: 12, borderRadius: 8, padding: "16px 18px", background: "linear-gradient(135deg, rgba(255,45,70,0.16), rgba(14,91,255,0.12))", border: `1px solid ${T.red}55`, boxShadow: `0 0 28px ${T.red}22, inset 0 1px 0 rgba(255,255,255,0.06)` }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.16em", color: T.red, textTransform: "uppercase", textShadow: `0 0 12px ${T.red}88` }}>Jetzt dran</div>
          <div style={{ fontFamily: "'Roboto Condensed', 'Roboto', sans-serif", fontSize: 22, fontWeight: 700, color: T.ink, marginTop: 4, lineHeight: 1.15 }}>{next.label}</div>
          {(next.cue || next.session) && <div style={{ fontSize: 12.5, color: T.sub, marginTop: 4, lineHeight: 1.45 }}>{next.sport ? `Training · ${next.session}` : next.cue}</div>}
          <div style={{ display: "flex", gap: 9, marginTop: 14 }}>
            {next.sport ? (
              <button onClick={() => onStart({ name: next.label, cue: next.cue, reps: next.reps }, next.id)} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, background: T.red, color: "#fff", border: "none", borderRadius: 6, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: `0 8px 20px ${T.red}44` }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M6 4l14 8-14 8z" /></svg>Übung starten
              </button>
            ) : (
              <button onClick={() => toggle(next.id)} style={{ flex: 1, background: T.red, color: "#fff", border: "none", borderRadius: 6, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: `0 8px 20px ${T.red}44` }}>{next.meal ? "Gegessen ✓" : "Erledigt ✓"}</button>
            )}
          </div>
          <div style={{ fontSize: 11, color: T.sub, marginTop: 10, textAlign: "center" }}>Schritt {done + 1} von {total} heute</div>
        </div>
      )}

      {!profile.set && (
        <BalanceCard profile={profile} weightKg={weightKg} intake={intakeKcal} proteinIn={proteinIn} exerciseKcal={exerciseKcal} onOpenProfile={onOpenProfile} onOpenMealLog={onOpenMealLog} />
      )}

      {/* DEIN TAG – Essen zuerst, Training zuletzt */}
      <div style={{ marginTop: 20 }}>
        <h3 style={{ ...hStyle, marginBottom: 10 }}>Dein Tag · Essen zuerst</h3>
        {phaseOrder.map((g) => {
          const list = items.filter((i) => i.group === g);
          const dn = list.filter((i) => checks[i.id]).length;
          const ph = PHASE[g] || PHASE.Morgen;
          const isOpen = !!openPhases[g];
          const sess = g === "Bewegung" && list[0] ? list[0].session : null;
          return (
            <div key={g} style={{ ...cardBox, marginBottom: 10, padding: 0, overflow: "hidden" }}>
              <button onClick={() => setOpenPhases((p) => ({ ...p, [g]: !p[g] }))} style={{ width: "100%", minHeight: 54, display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: dn === list.length && list.length ? "rgba(34,229,138,0.06)" : "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 17 }}>{ph.icon}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: ph.color }}>{ph.label}</span>
                  {sess && <span style={{ fontSize: 12, color: T.sub }}> · {sess}</span>}
                </span>
                <span style={{ fontFamily: RCF, fontSize: 14, fontWeight: 700, color: dn === list.length && list.length ? T.green : T.sub }}>{dn}/{list.length}</span>
                <Chevron open={isOpen} />
              </button>
              {isOpen && (
                <div style={{ padding: "0 14px 6px" }}>
                  {list.map((it) => {
                    const isDone = !!checks[it.id];
                    const isNext = next && it.id === next.id;
                    return (
                      <div key={it.id} style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "10px 0", borderTop: `1px solid ${T.line}`, minHeight: 44 }}>
                        <button onClick={() => toggle(it.id)} className="aw-row" style={{ flex: "0 0 28px", width: 28, height: 28, borderRadius: "50%", border: `2px solid ${isDone ? T.green : isNext ? T.red : T.line}`, background: isDone ? T.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0, fontSize: it.meal ? 14 : 12 }}>
                          {isDone ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#031018" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></svg> : (it.meal ? it.emoji : "")}
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, color: T.ink, lineHeight: 1.3, textDecoration: isDone ? "line-through" : "none", opacity: isDone ? 0.45 : 1 }}>{it.label}</div>
                          {it.cue && !isDone && <div style={{ fontSize: 12, color: T.sub, marginTop: 3, lineHeight: 1.4 }}>{it.cue}</div>}
                        </div>
                        {it.sport && !isDone && (
                          <button onClick={() => onStart({ name: it.label, cue: it.cue, reps: it.reps }, it.id)} aria-label="Übung starten" className="aw-row" style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 5, background: T.red, color: "#fff", border: "none", borderRadius: 4, padding: "0 12px", minHeight: 44, fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: `0 3px 10px ${T.red}4d` }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><path d="M6 4l14 8-14 8z" /></svg>Start
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {profile.set && (
        <button onClick={onOpenMealLog} style={{ width: "100%", minHeight: 48, marginTop: 4, background: T.soft, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 6, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>+ Essen frei eintragen (Abweichung)</button>
      )}

      {/* BEWEGUNG – Wochenziel mit One-Click-Typ */}
      <div style={{ ...cardBox, marginTop: 18, padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink }}>Bewegung diese Woche</div>
            <div style={{ fontSize: 11.5, color: T.sub, marginTop: 2 }}>{moveToday ? `Heute: ${MOVE_LABEL[moveToday] || "Bewegt"}${moveKcalToday ? ` · ${moveKcalToday} kcal` : ""} ✓` : `Antippen → km/Zeit → kcal. Ziel ${moveGoal}×.`}</div>
          </div>
          <div style={{ fontFamily: "'Roboto Condensed', 'Roboto', sans-serif", fontSize: 26, fontWeight: 700, color: weekMove >= moveGoal ? T.green : T.cyan, textShadow: `0 0 12px ${(weekMove >= moveGoal ? T.green : T.cyan)}55` }}>{weekMove}<span style={{ fontSize: 14, color: T.sub }}>/{moveGoal}</span></div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          {Array.from({ length: moveGoal }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 7, borderRadius: 3, background: i < weekMove ? T.cyan : T.soft, boxShadow: i < weekMove ? `0 0 10px ${T.cyan}66` : "none" }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {MOVE_TYPES.map(([type, icon, label]) => {
            const active = moveToday === type;
            return (
              <button key={type} onClick={() => onMoveType(type)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: active ? T.cyan : T.soft, color: active ? "#04121f" : T.ink, border: `1px solid ${active ? T.cyan : T.line}`, borderRadius: 6, padding: "10px 6px", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: active ? `0 0 14px ${T.cyan}55` : "none" }}>
                <span style={{ fontSize: 19 }}>{icon}</span>
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function Seg({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", background: T.soft, border: `1px solid ${T.line}`, borderRadius: 6, overflow: "hidden" }}>
      {options.map(([v, l]) => {
        const on = value === v;
        return <button key={v} onClick={() => onChange(v)} style={{ flex: 1, minHeight: 44, textAlign: "center", padding: "9px 8px", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", color: on ? "#fff" : T.sub, background: on ? T.blue : "transparent", border: "none", cursor: "pointer", boxShadow: on ? `0 0 14px ${T.blue}55` : "none" }}>{l}</button>;
      })}
    </div>
  );
}

function Essen({ now, onPlanChanged }) {
  const [phase, setPhase] = useState("akut");   // akut | normal
  const [persons, setPersons] = useState("solo"); // solo | both
  const [day, setDay] = useState(now.getDay());
  const [open, setOpen] = useState({});          // aufgeklappte Mahlzeiten
  const [showShop, setShowShop] = useState(false);
  const [copied, setCopied] = useState(false);
  const [kiOpen, setKiOpen] = useState(false);
  const [kiText, setKiText] = useState("");
  const [kiBusy, setKiBusy] = useState(false);
  const [kiError, setKiError] = useState("");
  const [tick, setTick] = useState(0);           // erzwingt Re-render nach Plan-Änderung

  // Persistenz (Phase + Personen) über den vorhandenen Storage
  useEffect(() => { (async () => {
    try {
      const a = await window.storage.get("aufwind:phase"); if (a && a.value) setPhase(a.value);
      const b = await window.storage.get("aufwind:persons"); if (b && b.value) setPersons(b.value);
    } catch (e) {}
  })(); }, []);
  const persist = (k, v) => { try { window.storage.set("aufwind:" + k, v); } catch (e) {} };
  const setPhaseP = (v) => { setPhase(v); persist("phase", v); };
  const setPersonsP = (v) => { setPersons(v); persist("persons", v); };

  const dayObj = getPlan()[day] || {};
  const shopText = buildShoppingList(persons);
  const copyList = async () => { try { await navigator.clipboard.writeText(shopText); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (e) {} };
  async function generatePlan() {
    setKiBusy(true); setKiError("");
    try {
      const r = await fetch("/api/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ instruction: kiText || undefined }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.plan) { setKiError(data.error || "KI-Fehler."); setKiBusy(false); return; }
      setActivePlan(data.plan); setTick((t) => t + 1); onPlanChanged && onPlanChanged();
      setKiBusy(false); setKiOpen(false);
    } catch (e) { setKiError("Keine Verbindung zur KI. Nur auf der deployten App (Vercel) mit gesetztem API-Key verfügbar."); setKiBusy(false); }
  }
  function doReset() { resetPlan(); setTick((t) => t + 1); onPlanChanged && onPlanChanged(); }

  const tag = (label, color) => <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color, border: `1px solid ${color}`, borderRadius: 4, padding: "1px 5px", marginLeft: 5 }}>{label}</span>;

  return (
    <>
      <h3 style={{ ...hStyle, marginTop: 12, marginBottom: 10 }}>Essensplan</h3>
      <div style={{ marginBottom: 8 }}><Seg options={[["akut", "Akut · Fettarm"], ["normal", "Normal"]]} value={phase} onChange={setPhaseP} /></div>
      <div style={{ marginBottom: 12 }}><Seg options={[["solo", "Nur Dirk"], ["both", "Dirk + Bianca"]]} value={persons} onChange={setPersonsP} /></div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button onClick={() => setKiOpen(true)} style={{ flex: 1, minHeight: 46, background: "linear-gradient(135deg, #1E6BFF, #0B2C8C)", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: `0 6px 16px ${T.blue}44` }}>✨ KI: Woche planen / anpassen</button>
        {isCustomPlan() && <button onClick={doReset} style={{ flex: "0 0 auto", minHeight: 46, padding: "0 14px", background: T.soft, color: T.sub, border: `1px solid ${T.line}`, borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Standard</button>}
      </div>
      {isCustomPlan() && <div style={{ fontSize: 11, color: T.cyan, marginTop: -8, marginBottom: 12 }}>✨ KI-Plan aktiv (lokal gespeichert)</div>}

      {/* Tagesleiste MO–SO */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {WD_ORDER.map((wd) => {
          const on = wd === day; const isToday = wd === now.getDay();
          return <button key={wd} onClick={() => setDay(wd)} style={{ flex: 1, minHeight: 44, textAlign: "center", padding: "8px 0", fontSize: 11, fontWeight: 800, color: on ? "#04121f" : (isToday ? T.cyan : T.sub), background: on ? T.cyan : T.soft, border: `1px solid ${on ? T.cyan : T.line}`, borderRadius: 6, cursor: "pointer" }}>{WD_SHORT[wd]}</button>;
        })}
      </div>

      {/* Tageskarte */}
      <div style={{ ...cardBox, marginBottom: 12, padding: "6px 14px" }}>
        {!SLOTS.some(([s]) => dayObj[s]) && (
          <div style={{ padding: "16px 2px", textAlign: "center", fontSize: 13, color: T.sub, lineHeight: 1.5 }}>Für diesen Tag ist noch kein Gericht hinterlegt.<br />Sag mir, was du an dem Tag isst — ich trage es ein.</div>
        )}
        {SLOTS.map(([slot, label]) => {
          const m = dayObj[slot]; if (!m) return null;
          const oid = slot; const isOpen = !!open[oid];
          return (
            <div key={slot} style={{ borderTop: `1px solid ${T.line}`, padding: "12px 0" }}>
              <button onClick={() => setOpen((o) => ({ ...o, [oid]: !o[oid] }))} style={{ width: "100%", background: "transparent", border: "none", padding: 0, textAlign: "left", cursor: "pointer", minHeight: 44 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: T.sub, marginBottom: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: catColor(m.cat) }} />{label}
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: T.ink, lineHeight: 1.3 }}>
                  {m.name}
                  {m.edocs && tag(`E-Docs${m.serves ? " · " + m.serves : ""}`, TAGCOLOR.edocs)}
                  {m.prep && tag("Prep", TAGCOLOR.prep)}
                </div>
                {!isOpen && <div style={{ fontSize: 11.5, color: T.sub, marginTop: 3 }}>Antippen für Zutaten & Kochanleitung</div>}
              </button>
              {isOpen && (
                <div style={{ marginTop: 10 }}>
                  {phase === "akut" && m.akutNote && <div style={{ fontSize: 11.5, color: "#E0A83E", background: "rgba(224,168,62,0.10)", border: "1px solid rgba(224,168,62,0.35)", borderRadius: 6, padding: "8px 10px", marginBottom: 8, lineHeight: 1.4 }}>⚠ {m.akutNote}</div>}
                  {phase === "normal" && m.normalExtra && <div style={{ fontSize: 11.5, color: T.green, background: "rgba(34,229,138,0.10)", border: `1px solid ${T.green}44`, borderRadius: 6, padding: "8px 10px", marginBottom: 8 }}>Normal-Phase: {m.normalExtra}</div>}
                  <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: T.cyan, margin: "8px 0 6px" }}>Zutaten ({persons === "both" ? "Dirk + Bianca" : "Nur Dirk"}{m.ns ? " · fixe Portion" : ""})</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {m.ing.map((ing, k) => {
                      if (ing.b == null) return <span key={k} style={chipD}>{ing.n}</span>;
                      const val = scaleAmt(m, ing, persons);
                      return <span key={k} style={chipD}><b style={{ color: T.cyan }}>{val}</b>{ing.u ? " " + ing.u : ""} {ing.n}</span>;
                    })}
                  </div>
                  <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: T.cyan, margin: "12px 0 4px" }}>Kochanleitung</div>
                  <ol style={{ margin: "2px 0 0 18px", padding: 0 }}>{m.steps.map((s, k) => <li key={k} style={{ fontSize: 12.5, color: T.ink, marginBottom: 5, lineHeight: 1.45 }}>{s}</li>)}</ol>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={() => setShowShop(true)} style={{ width: "100%", minHeight: 50, background: T.blue, color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", cursor: "pointer", boxShadow: `0 8px 20px ${T.blue}44` }}>Einkaufsliste erzeugen →</button>
      <p style={{ fontSize: 11, color: T.sub, textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>{phase === "akut" ? "Akutphase: fettarm, zuckerfrei, blutzuckerstabil, Crohn-schonend." : "Normalphase: Avocado, Nüsse, Öl & Käse wieder erlaubt."}</p>

      {showShop && (
        <div onClick={() => setShowShop(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 60 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "linear-gradient(180deg, #0C2350 0%, #071739 100%)", border: `1px solid ${T.line}`, borderBottom: "none", borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: "18px 20px calc(24px + env(safe-area-inset-bottom))", maxHeight: "88vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontFamily: "'Roboto Condensed', 'Roboto', sans-serif", fontSize: 16, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: T.cyan }}>Einkaufsliste</div>
              <button onClick={() => setShowShop(false)} style={{ background: "transparent", border: "none", color: T.sub, fontSize: 22, cursor: "pointer", minHeight: 44, minWidth: 36 }}>×</button>
            </div>
            <textarea readOnly value={shopText} style={{ width: "100%", height: 260, border: `1px solid ${T.line}`, borderRadius: 6, padding: 12, fontSize: 12.5, fontFamily: "inherit", resize: "none", color: T.ink, background: "#0B1E44", lineHeight: 1.5 }} />
            <button onClick={copyList} style={{ width: "100%", minHeight: 50, marginTop: 10, background: T.blue, color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", cursor: "pointer" }}>{copied ? "Kopiert ✓" : "In Zwischenablage kopieren"}</button>
            <p style={{ fontSize: 10.5, color: T.sub, textAlign: "center", marginTop: 10 }}>Danach in Nachrichten, Bring! oder eure geteilte Notiz einfügen.</p>
          </div>
        </div>
      )}

      {kiOpen && (
        <div onClick={() => !kiBusy && setKiOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 60 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "linear-gradient(180deg, #0C2350 0%, #071739 100%)", border: `1px solid ${T.line}`, borderBottom: "none", borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: "18px 20px calc(24px + env(safe-area-inset-bottom))", maxHeight: "88vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontFamily: "'Roboto Condensed', 'Roboto', sans-serif", fontSize: 16, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: T.cyan }}>✨ KI · Wochenplan</div>
              <button onClick={() => !kiBusy && setKiOpen(false)} style={{ background: "transparent", border: "none", color: T.sub, fontSize: 22, cursor: "pointer", minHeight: 44, minWidth: 36 }}>×</button>
            </div>
            <p style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.5, margin: "0 0 10px" }}>Beschreibe, was du willst – die KI baut einen fettarmen, blutzuckerstabilen Plan (Basis Dirk, Crohn-schonend). Beispiele: „neue Woche, kein Fisch montags", „mehr Protein, weniger Brot".</p>
            <textarea value={kiText} onChange={(e) => setKiText(e.target.value)} placeholder="z.B. Neue Woche Mo–So, fettarm, viel Protein, kein Fisch am Montag" style={{ width: "100%", height: 110, border: `1px solid ${T.line}`, borderRadius: 6, padding: 12, fontSize: 14, fontFamily: "inherit", resize: "none", color: T.ink, background: "#0B1E44", lineHeight: 1.5 }} />
            {kiError && <div style={{ fontSize: 12, color: T.red, marginTop: 8, lineHeight: 1.4 }}>{kiError}</div>}
            <button onClick={generatePlan} disabled={kiBusy} style={{ width: "100%", minHeight: 50, marginTop: 12, background: kiBusy ? T.soft : T.blue, color: kiBusy ? T.sub : "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}>{kiBusy ? "Plane … (kann 10–20 Sek dauern)" : "Plan generieren"}</button>
            <p style={{ fontSize: 10.5, color: T.sub, textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>Nur auf der deployten App (Vercel) mit gesetztem API-Key. Der neue Plan überschreibt lokal deinen Plan; „Standard" stellt das Original wieder her.</p>
          </div>
        </div>
      )}
    </>
  );
}
const chipD = { fontSize: 11.5, background: T.soft, border: `1px solid ${T.line}`, borderRadius: 5, padding: "3px 8px", color: T.ink };

const TRAINCOLORS = { kraftA: "#2E7DF0", kraftB: "#19B6E6", kraftC: "#F2862A", taichi: "#23B574", yoga: "#9ACA3C" };

function ExIcon({ k }) {
  const p = { fill: "none", stroke: "#fff", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  if (k === "taichi") return (<svg width="30" height="30" viewBox="0 0 24 24"><circle cx="12" cy="4.5" r="2" {...p} /><path d="M12 6.5v6M12 8.5l-5 2M12 8.5l5 2M12 12.5l-3 6M12 12.5l3 6" {...p} /></svg>);
  if (k === "yoga") return (<svg width="30" height="30" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" {...p} /><path d="M12 7v4M4 19c2-5 5-6 8-6s6 1 8 6M4 19h16" {...p} /></svg>);
  return (<svg width="30" height="30" viewBox="0 0 24 24"><path d="M3 9v6M6.5 6.5v11M17.5 6.5v11M21 9v6M6.5 12h11" {...p} /></svg>);
}

function Training({ open, setOpen, onStart }) {
  const order = ["kraftA", "kraftB", "kraftC", "taichi", "yoga"];
  const sel = open && SESSIONS[open] ? open : null;
  const S = sel ? SESSIONS[sel] : null;
  return (
    <>
      <h3 style={{ ...hStyle, marginTop: 12, marginBottom: 12 }}>Training</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {order.map((k) => {
          const s = SESSIONS[k]; const c = TRAINCOLORS[k]; const active = open === k;
          return (
            <button key={k} onClick={() => setOpen(active ? null : k)} style={{ background: c, borderRadius: 4, padding: "16px 15px", border: active ? "3px solid #EAF2FF" : "3px solid transparent", textAlign: "left", cursor: "pointer", color: "#fff", minHeight: 124, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: active ? `0 0 26px ${c}, 0 12px 26px ${c}55` : `0 10px 22px ${c}40` }}>
              <ExIcon k={k} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{s.name}</div>
                <div style={{ fontSize: 11, opacity: 0.92, marginTop: 2 }}>{s.sub}</div>
              </div>
            </button>
          );
        })}
      </div>
      {S && (
        <div style={{ ...cardBox, marginTop: 14, borderTop: `4px solid ${TRAINCOLORS[sel]}` }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.ink, marginBottom: 4 }}>{S.name} <span style={{ fontSize: 12, fontWeight: 600, color: T.sub }}>· {S.sub}</span></div>
          {S.items.map(([name, cue], i) => (
            <div key={i} style={{ padding: "11px 0", borderTop: `1px solid ${T.line}`, display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, color: T.ink, fontWeight: 600 }}>{name}</div>
                <div style={{ fontSize: 12.5, color: T.sub, marginTop: 3, lineHeight: 1.45 }}>{cue}</div>
              </div>
              {onStart && (
                <button onClick={() => onStart({ name, cue, reps: S.sub }, `train_${sel}_${i}`)} aria-label="Übung starten" className="aw-row" style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, background: T.red, color: "#fff", border: "none", borderRadius: 4, padding: "0 14px", minHeight: 44, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 3px 10px rgba(255,45,70,0.3)" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><path d="M6 4l14 8-14 8z" /></svg>Start
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <p style={{ fontSize: 12, color: T.sub, marginTop: 14, lineHeight: 1.6 }}>Kachel antippen öffnet die Übungen. Kraft C = Brust/Oberkörper (ISG-neutral). Kettlebell &amp; Rudern folgen später.</p>
    </>
  );
}

function WeightCard({ weights, onAdd, start, goal }) {
  const [val, setVal] = useState("");
  const START = start || 128, GOAL = goal || 100;
  const entries = Object.keys(weights).sort().map((k) => ({ k, kg: weights[k] }));
  const latest = entries.length ? entries[entries.length - 1].kg : START;
  const lost = +(START - latest).toFixed(1);
  const PX = 30, PY = 8, PW = 282, PH = 144, WKS = 36;
  const YMIN = Math.max(30, GOAL - 5), YMAX = Math.max(START, latest) + 3;
  const x = (wk) => PX + (Math.min(wk, WKS) / WKS) * PW;
  const y = (kg) => PY + ((YMAX - Math.max(Math.min(kg, YMAX), YMIN)) / (YMAX - YMIN)) * PH;
  const firstDate = entries.length ? new Date(entries[0].k) : null;
  const wkOf = (k) => firstDate ? (new Date(k) - firstDate) / (7 * 86400000) : 0;
  let ema = null;
  const emaPts = entries.map((e) => { ema = ema == null ? e.kg : ema + 0.4 * (e.kg - ema); return `${x(wkOf(e.k))},${y(ema)}`; }).join(" ");
  const mod = `${x(0)},${y(START)} ${x(26)},${y(GOAL)} ${x(WKS)},${y(GOAL)}`;
  const con = `${x(0)},${y(START)} ${x(34)},${y(GOAL)} ${x(WKS)},${y(GOAL)}`;
  const gmin = Math.floor(YMIN / 10) * 10, gmax = Math.ceil(YMAX / 10) * 10, grid = [];
  for (let g = gmin; g <= gmax; g += 10) grid.push(g);
  function submit() { const n = parseFloat(val.replace(",", ".")); if (!isNaN(n) && n > 40 && n < 300) { onAdd(n); setVal(""); } }
  return (
    <div style={{ ...cardBox, marginTop: 12, padding: "16px 18px" }}>
      <div style={hLabel}>Gewicht</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
        <div style={{ fontFamily: "'Roboto Condensed', 'Roboto', sans-serif", fontSize: 26, fontWeight: 700, color: T.ink }}>{latest} kg</div>
        <div style={{ fontSize: 12.5, color: T.sub }}>{lost > 0 ? `−${lost} kg seit Start` : "Start"} · Ziel {GOAL}</div>
      </div>
      <svg viewBox="0 0 320 170" width="100%" style={{ display: "block" }}>
        {grid.map((g) => <g key={g}><line x1={PX} y1={y(g)} x2={PX + PW} y2={y(g)} stroke={T.line} strokeWidth="1" /><text x="2" y={y(g) + 3} fontSize="9" fill={T.sub}>{g}</text></g>)}
        <polyline points={con} fill="none" stroke={T.orange} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
        <polyline points={mod} fill="none" stroke={T.cyan} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
        {entries.length > 1 && <polyline points={emaPts} fill="none" stroke="#EAF2FF" strokeWidth="3" style={{ filter: "drop-shadow(0 0 6px rgba(234,242,255,0.5))" }} />}
        {entries.map((e, i) => <circle key={i} cx={x(wkOf(e.k))} cy={y(e.kg)} r="2.6" fill={T.sub} />)}
      </svg>
      <div style={{ display: "flex", gap: 12, fontSize: 10.5, color: T.sub, marginTop: 6 }}>
        <span style={{ color: T.cyan, fontWeight: 700 }}>— moderat</span>
        <span style={{ color: T.orange, fontWeight: 700 }}>— konservativ</span>
        <span style={{ color: "#EAF2FF", fontWeight: 700 }}>— dein Trend</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input value={val} onChange={(e) => setVal(e.target.value)} inputMode="decimal" placeholder="Gewicht heute (kg)" style={{ flex: 1, border: `1px solid ${T.line}`, borderRadius: 3, padding: "10px 12px", fontSize: 14, color: T.ink, outline: "none", background: T.bg }} />
        <button onClick={submit} style={{ background: T.orange, color: "#04121f", border: "none", borderRadius: 3, padding: "0 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Eintragen</button>
      </div>
    </div>
  );
}

function BloodSugarCard({ bloodSugar, onAdd }) {
  const [val, setVal] = useState("");
  const keys = Object.keys(bloodSugar).sort();
  const latest = keys.length ? bloodSugar[keys[keys.length - 1]] : null;
  const last7 = keys.slice(-7).map((k) => bloodSugar[k]);
  const avg = last7.length ? Math.round(last7.reduce((a, b) => a + b, 0) / last7.length) : null;
  const zone = (v) => v == null ? T.sub : v < 100 ? T.green : v < 140 ? T.cyan : v < 180 ? T.orange : T.red;
  function submit() { const n = parseInt(val.replace(/[^\d]/g, ""), 10); if (!isNaN(n) && n > 40 && n < 600) { onAdd(n); setVal(""); } }
  return (
    <div style={{ ...cardBox, marginTop: 12, padding: "16px 18px" }}>
      <div style={hLabel}>Blutzucker (nüchtern)</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontFamily: "'Roboto Condensed', 'Roboto', sans-serif", fontSize: 26, fontWeight: 700, color: zone(latest) }}>{latest != null ? latest : "–"}<span style={{ fontSize: 13, color: T.sub }}> mg/dl</span></div>
        {avg != null && <div style={{ fontSize: 12.5, color: T.sub }}>Ø 7 Tage: {avg}</div>}
      </div>
      {last7.length > 1 && (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 40, marginTop: 10 }}>
          {last7.map((v, i) => <div key={i} style={{ flex: 1, height: Math.max(6, Math.min(1, (v - 70) / 130) * 40), borderRadius: 3, background: zone(v), boxShadow: `0 0 8px ${zone(v)}55` }} />)}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input value={val} onChange={(e) => setVal(e.target.value)} inputMode="numeric" placeholder="BZ heute (mg/dl)" style={{ flex: 1, border: `1px solid ${T.line}`, borderRadius: 3, padding: "10px 12px", fontSize: 14, color: T.ink, outline: "none", background: T.bg }} />
        <button onClick={submit} style={{ background: T.cyan, color: "#04121f", border: "none", borderRadius: 3, padding: "0 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Eintragen</button>
      </div>
      <div style={{ fontSize: 10.5, color: T.sub, marginTop: 8, lineHeight: 1.5 }}>Dein wichtigster Gesundheits-KPI. Werte & Ziele bitte mit dem Arzt abstimmen.</div>
    </div>
  );
}

function BalanceHistory({ history, weights, profile }) {
  if (!profile.set) return null;
  const wk = Object.keys(weights).sort();
  const weightOn = (key) => { let w = profile.weightStart || 128; for (const k of wk) { if (k <= key) w = weights[k]; else break; } return w; };
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); const key = keyOf(d);
    const items = buildItemsForDate(d); const day = history[key] || {};
    let intake = 0; items.forEach((it) => { if (it.meal && day[it.id]) intake += (it.kcal || 0); });
    (day.extra || []).forEach((e) => { intake += (e.kcal || 0); });
    const hasData = intake > 0;
    const deficit = hasData ? (tdeeBase(profile, weightOn(key)) + (day.moveKcal || 0)) - intake : null;
    days.push({ deficit, hasData });
  }
  const withData = days.filter((x) => x.hasData);
  const avg = withData.length ? Math.round(withData.reduce((a, x) => a + x.deficit, 0) / withData.length) : 0;
  const maxAbs = Math.max(600, ...days.map((x) => Math.abs(x.deficit || 0)));
  const H = 74, mid = H / 2;
  return (
    <div style={{ ...cardBox, marginTop: 12, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={hLabel}>Kalorienbilanz · 14 Tage</div>
        {withData.length > 0 && <div style={{ fontSize: 12, color: avg >= 0 ? T.green : T.red, fontWeight: 700 }}>Ø {avg >= 0 ? "−" : "+"}{Math.abs(avg)} kcal</div>}
      </div>
      <div style={{ position: "relative", height: H, marginTop: 4 }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: mid, height: 1, background: T.line }} />
        <div style={{ display: "flex", gap: 3, height: "100%" }}>
          {days.map((x, i) => {
            if (!x.hasData) return <div key={i} style={{ flex: 1, position: "relative", height: H }}><div style={{ position: "absolute", left: "20%", right: "20%", top: mid - 3, height: 6, borderRadius: 2, background: T.soft }} /></div>;
            const good = x.deficit >= 0, hgt = Math.max(4, (Math.abs(x.deficit) / maxAbs) * (mid - 4));
            return <div key={i} style={{ flex: 1, position: "relative", height: H }}><div style={{ position: "absolute", left: "18%", right: "18%", ...(good ? { bottom: mid, height: hgt } : { top: mid, height: hgt }), background: good ? T.green : T.red, borderRadius: 2, boxShadow: `0 0 8px ${good ? T.green : T.red}55` }} /></div>;
          })}
        </div>
      </div>
      <div style={{ fontSize: 10.5, color: T.sub, marginTop: 8, lineHeight: 1.5 }}>Grün = Defizit (abnehmen), Rot = Überschuss, Grau = kein Essen geloggt. Es zählt der Schnitt, nicht der einzelne Tag.</div>
    </div>
  );
}

function Verlauf({ streak, best, avg7, week7, heat, weights, addWeight, profile, history, bloodSugar, addBloodSugar, weightKg, intakeKcal, proteinIn, exerciseKcal, extras, onRemoveExtra, onOpenProfile, onOpenMealLog }) {
  const start = (profile && profile.weightStart) || 128, goal = (profile && profile.weightGoal) || 100;
  const wkeys = Object.keys(weights).sort();
  const latest = wkeys.length ? weights[wkeys[wkeys.length - 1]] : start;
  const kgLost = +(start - latest).toFixed(1);
  let trainWeek = 0;
  for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate() - i); const h = (history && history[keyOf(d)]) || {}; const its = buildItemsForDate(d); if (its.some((x) => x.sport && h[x.id])) trainWeek++; }
  return (
    <>
      <div style={{ marginTop: 10, marginBottom: 14, fontSize: 12.5, color: T.sub }}>Ziel: {start} → {goal} kg · Muskeln · zurück aufs MTB</div>

      {/* KALORIENBILANZ (aus dem Start hierher verschoben) */}
      <BalanceCard profile={profile} weightKg={weightKg} intake={intakeKcal} proteinIn={proteinIn} exerciseKcal={exerciseKcal} onOpenProfile={onOpenProfile} onOpenMealLog={onOpenMealLog} />
      {extras && extras.length > 0 && (
        <div style={{ ...cardBox, marginTop: 10, padding: "8px 14px", marginBottom: 4 }}>
          {extras.map((e, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < extras.length - 1 ? `1px solid ${T.line}` : "none" }}>
              <span style={{ fontSize: 15 }}>🍽️</span>
              <span style={{ flex: 1, fontSize: 13.5, color: T.ink }}>{e.name}</span>
              <span style={{ fontSize: 12.5, color: T.sub, fontWeight: 700 }}>{e.kcal} kcal</span>
              <button onClick={() => onRemoveExtra(i)} aria-label="Entfernen" style={{ background: "transparent", border: "none", color: T.sub, fontSize: 20, cursor: "pointer", lineHeight: 1, minHeight: 44, minWidth: 32 }}>×</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 12 }}>
        <Stat value={kgLost > 0 ? `−${kgLost}` : "0"} label="kg runter" bg={T.greenSoft} />
        <Stat value={streak} label="Streak" bg={T.yellowSoft} />
        <Stat value={trainWeek} label="Train./Wo" bg={T.redSoft} />
        <Stat value={`${avg7}%`} label="7-Tage" bg={T.blueSoft} />
      </div>
      <WeightCard weights={weights} onAdd={addWeight} start={start} goal={goal} />
      <BalanceHistory history={history || {}} weights={weights} profile={profile || {}} />
      <BloodSugarCard bloodSugar={bloodSugar || {}} onAdd={addBloodSugar} />
      <div style={{ ...cardBox, marginTop: 12, padding: "16px 18px" }}>
        <div style={hLabel}>Letzte 7 Tage</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 60 }}>
          {week7.map((w, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
              <div style={{ width: 20, height: 44, background: T.soft, borderRadius: 6, display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
                <div style={{ width: "100%", height: `${Math.max(w.frac * 100, w.frac > 0 ? 12 : 0)}%`, background: w.isToday ? T.green : T.ink, borderRadius: 6, transition: "height .6s ease" }} />
              </div>
              <span style={{ fontSize: 10.5, color: w.isToday ? T.ink : T.sub, fontWeight: w.isToday ? 700 : 500 }}>{WDS[w.d.getDay()]}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...cardBox, marginTop: 12, padding: "16px 18px" }}>
        <div style={hLabel}>Letzte 4 Wochen</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
          {heat.map((h, i) => <div key={i} style={{ aspectRatio: "1", borderRadius: 6, background: h.frac > 0 ? `rgba(0,222,121,${0.2 + h.frac * 0.8})` : T.soft, border: h.isToday ? `2px solid ${T.ink}` : "none" }} />)}
        </div>
      </div>
    </>
  );
}

function Stat({ value, label, bg }) {
  return (
    <div style={{ flex: 1, background: bg || T.soft, borderRadius: 4, padding: "16px 8px", textAlign: "center" }}>
      <div style={{ fontFamily: "'Roboto Condensed', 'Roboto', sans-serif", fontSize: 24, fontWeight: 700, color: T.ink, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: T.sub, marginTop: 5, fontWeight: 700 }}>{label}</div>
    </div>
  );
}

const wrap = { display: "flex", flexDirection: "column", height: "100vh", maxWidth: 480, margin: "0 auto", background: "radial-gradient(135% 90% at 50% -5%, #12336E 0%, #08194080 45%, transparent 100%), #050F26", color: T.ink, fontFamily: "'Roboto', -apple-system, system-ui, sans-serif", position: "relative" };
const cardBox = { background: T.card, border: `1px solid ${T.line}`, borderRadius: 6, padding: 16, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", boxShadow: "0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(150,190,255,0.06)" };
const chip = { display: "inline-flex", alignItems: "center", gap: 7, background: T.soft, padding: "7px 12px", borderRadius: 4, fontSize: 12.5, fontWeight: 600, color: T.ink, border: `1px solid ${T.line}` };
const hStyle = { fontSize: 11.5, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 };
const hLabel = { fontSize: 11.5, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 };
const css = `
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Roboto+Condensed:wght@400;500;700&display=swap');
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body { margin: 0; background: #050F26; color: #EAF2FF; }
body { padding-bottom: env(safe-area-inset-bottom); }
input, select, textarea { color: #EAF2FF; }
input::placeholder { color: #6E86AE; }
input[type="time"] { color-scheme: dark; }
.aw-row:active { opacity: 0.6; }
@keyframes auraPulse { 0%,100% { opacity: .85; } 50% { opacity: .3; } }
.aw-pulse { animation: auraPulse 2.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .aw-pulse { animation: none !important; } * { transition: none !important; } }
`;
