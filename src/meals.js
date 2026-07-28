// ============================================================
//  AUFWIND · Essensplan-Daten (einzige Mahlzeiten-Quelle)
//  Reicheres Schema aus AufwindEssensplan.jsx, hier weekday-gekeyt
//  (0=So … 6=Sa) + Montag ergänzt + kcal/Protein je Gericht (Basis Dirk).
//  Genutzt von: Essen-Tab, Heute-Timeline, Kalorien-/Protein-Bilanz.
// ============================================================

export const BIANCA = 0.65; // Biancas Anteil an Dirks Portion (168 cm / 59 kg)

// Kategorie-Farben (aus den Aufwind-Tokens, funktionieren auf Dunkel)
export const CAT = { fish: "#3B8CFF", poultry: "#FF6A3D", egg: "#FF6A3D", dairy: "#22E58A", veg: "#A78BFA", legume: "#A78BFA" };
export const TAGCOLOR = { edocs: "#22C58A", prep: "#E0A83E" };
export const catColor = (c) => CAT[c] || "#93A7CC";
export const CATEMOJI = { fish: "🐟", poultry: "🍗", egg: "🍳", dairy: "🥣", veg: "🥗", legume: "🫘" };

// ing: { b:number|null, u:string, n:string } · b/u leer => Gewürz/Basis ohne Menge
export const q = (b, u, n) => ({ b, u, n });

// PLAN[weekday] = { breakfast?, lunch?, dinner? } · jedes Gericht mit vollem Schema
export const PLAN = {
  // MO (1): in deinem Plan (noch) kein Gericht hinterlegt.
  2: { // DI
    lunch: { cat: "veg", name: "Rote-Linsen-Karotten-Suppe (püriert)", prep: true, kcal: 320, protein: 16,
      ing: [q(60, "g", "rote Linsen"), q(150, "g", "Karotte"), q(1, "St", "Zwiebel"), q(400, "ml", "Gemüsebrühe"), q(null, "", "Kreuzkümmel")],
      steps: ["Zwiebel in Sprühöl glasig dünsten.", "Linsen, gewürfelte Karotte und Brühe zugeben, ~20 Min weich köcheln.", "Fein pürieren, würzen. Gut für die Thermoskanne."] },
    dinner: { cat: "dairy", name: "Leichte Brotzeit (satt vom Mittag)", kcal: 300, protein: 24,
      ing: [q(2, "Sch", "Vollkornbrot"), q(150, "g", "Magerquark"), q(100, "g", "Gurke"), q(1, "St", "Tomate"), q(null, "", "Schnittlauch, Radieschen, Pfeffer")],
      steps: ["Magerquark mit Schnittlauch & Pfeffer verrühren.", "Auf Vollkornbrot streichen, mit Gurke, Tomate & Radieschen belegen.", "Bewusst leicht – du bist vom Mittag satt."] },
  },
  3: { // MI
    breakfast: { cat: "dairy", name: "Magerquark mit Heidelbeeren & Zimt", kcal: 300, protein: 30, normalExtra: "+ 15 g Walnüsse",
      ing: [q(250, "g", "Magerquark"), q(80, "g", "Heidelbeeren"), q(30, "g", "Haferflocken"), q(null, "", "Zimt")],
      steps: ["Magerquark mit einem Schluck Wasser cremig rühren.", "Haferflocken kurz einweichen, mit Beeren und Zimt untermischen."] },
    lunch: { cat: "veg", name: "Rucola mit Ziegenfrischkäse & Tomaten", kcal: 280, protein: 14, akutNote: "Ziegenfrischkäse ist Fett – in der Akutphase Portion klein halten.",
      ing: [q(60, "g", "Rucola"), q(150, "g", "Tomaten"), q(50, "g", "Ziegenfrischkäse"), q(1, "Sch", "Vollkornbrot"), q(null, "", "Zitrone/Balsamico, Pfeffer")],
      steps: ["Rucola waschen, mit Tomatenscheiben anrichten.", "Ziegenfrischkäse in Flöckchen darüber.", "Mit Zitrone/Balsamico und Pfeffer abschmecken."] },
    dinner: { cat: "fish", name: "Gegrillter Rotbarsch mit Pak Choi & Gemüse", kcal: 360, protein: 40, normalExtra: "+ 1 EL Olivenöl übers Gemüse",
      ing: [q(250, "g", "Rotbarschfilet"), q(200, "g", "Pak Choi"), q(100, "g", "Möhre"), q(1, "St", "Knoblauchzehe"), q(null, "", "Ingwer, Frühlingszwiebel"), q(null, "", "Sojasoße, Zitrone")],
      steps: ["Rotbarsch mit Zitrone, Salz, Pfeffer würzen, in der Grillpfanne garen (bei Crohn ganz durch).", "Pak Choi halbieren, mit Sprühöl weich grillen; Möhre mitgaren.", "Ingwer, Knoblauch, Sojasoße & Zitrone darüber."] },
  },
  4: { // DO
    breakfast: { cat: "egg", name: "Rührei aus 1 Ei + 2 Eiweiß mit Schnittlauch", kcal: 250, protein: 22,
      ing: [q(1, "St", "Ei"), q(2, "St", "Eiweiß"), q(1, "Sch", "Vollkornbrot"), q(1, "St", "Tomate"), q(null, "", "Schnittlauch")],
      steps: ["Ei und Eiweiß verquirlen, würzen.", "In Sprühöl stocken lassen, Schnittlauch dazu.", "Mit Brot und Tomate servieren."] },
    lunch: { cat: "legume", name: "Linsenbratlinge mit Joghurtdip", edocs: true, ns: true, serves: "Original · 4 Portionen", prep: true, kcal: 420, protein: 22,
      akutNote: "Original-e-Docs-Rezept: enthält Öl, Chili, Eigelb – fetter als deine Akutphase.",
      ing: [q(200, "g", "braune/grüne Linsen"), q(null, "", "½ TL Thymian, 1 Lorbeer"), q(80, "g", "Zwiebeln"), q(2, "St", "Knoblauchzehen"), q(1, "St", "rote Chili"), q(1, "EL", "Olivenöl"), q(200, "g", "Möhren"), q(1, "St", "Dinkelbrötchen (altbacken)"), q(1, "EL", "heller Sesam"), q(1, "St", "Eigelb"), q(2, "EL", "Dinkelmehl"), q(null, "", "Dip: 300 g Naturjoghurt, 60 g Frühlingszwiebeln, 1 EL Olivenöl, 1 EL Leinöl")],
      steps: ["Linsen mit Thymian/Lorbeer ~40 Min weich kochen.", "Zwiebel, Knoblauch, Chili anschwitzen; Brötchen einweichen, ausdrücken.", "Linsen, geraspelte Möhren, Petersilie, Sesam, Eigelb, Mehl verkneten, würzen.", "8–10 Bratlinge formen, beidseitig je 3–4 Min braten.", "Dip aus Joghurt, Frühlingszwiebeln und Ölen verrühren."] },
    dinner: { cat: "fish", name: "Viktoriabarsch aus dem Ofen mit Kartoffel & Möhren", kcal: 430, protein: 40,
      ing: [q(250, "g", "Viktoriabarschfilet"), q(250, "g", "Kartoffel"), q(150, "g", "Möhren"), q(null, "", "Zitrone, Dill/Petersilie")],
      steps: ["Kartoffeln garen (vorgekocht + gekühlt, dann erwärmen).", "Viktoriabarsch salzen, mit Zitrone beträufeln, bei 180 °C ~15 Min backen.", "Möhren weich dünsten, mit Kräutern servieren."] },
  },
  5: { // FR
    breakfast: { cat: "veg", name: "Warmer Haferbrei in Wasser mit Apfel & Zimt", kcal: 300, protein: 8,
      ing: [q(50, "g", "Haferflocken"), q(250, "ml", "Wasser"), q(1, "St", "Apfel"), q(null, "", "Zimt")],
      steps: ["Haferflocken in Wasser cremig köcheln.", "Apfel reiben, unterrühren, mit Zimt abschmecken."] },
    lunch: { cat: "dairy", name: "Kräuterquark auf Vollkornbrot mit Gurke & Tomate", kcal: 350, protein: 30,
      ing: [q(250, "g", "Magerquark"), q(2, "Sch", "Vollkornbrot"), q(100, "g", "Gurke"), q(1, "St", "Tomate"), q(null, "", "Schnittlauch, Kräuter, Pfeffer")],
      steps: ["Magerquark mit Kräutern, Schnittlauch, Pfeffer verrühren.", "Auf das Brot streichen, mit Gurke und Tomate belegen."] },
    dinner: { cat: "poultry", name: "Toskanischer Hähnchen-Gemüse-Auflauf", edocs: true, ns: true, serves: "Original · 2 Portionen", kcal: 480, protein: 45,
      akutNote: "Original-e-Docs-Rezept: enthält Honig, Chilisoße, mehr Öl.",
      ing: [q(300, "g", "Hähnchenbrust"), q(300, "g", "Paprika"), q(100, "g", "Zucchini"), q(1, "St", "kleine Kartoffel"), q(1, "St", "große Zwiebel"), q(1, "St", "Knoblauchzehe"), q(2, "St", "Tomaten"), q(25, "ml", "Hühnerbrühe"), q(null, "", "Rosmarin, Thymian"), q(null, "", "Marinade: 3 TL Olivenöl, 1 TL Honig, 2 EL Sojasoße, 1 EL Chilisoße, 3 TL Tomatenmark")],
      steps: ["Hähnchen in der Marinade ≥1 Std ziehen lassen.", "Ofen 200 °C. Zwiebel, Knoblauch, Kräuter in Rapsöl andünsten.", "Gemüse + Kartoffel in die Form, Fleisch darauf, Brühe angießen.", "~40 Min garen."] },
  },
  6: { // SA
    breakfast: { cat: "dairy", name: "Grießbrei aus Magermilch mit Himbeeren", kcal: 320, protein: 16,
      ing: [q(40, "g", "Hartweizengrieß"), q(250, "ml", "Magermilch"), q(80, "g", "Himbeeren"), q(null, "", "Zimt")],
      steps: ["Magermilch erhitzen, Grieß einrühren, aufquellen lassen.", "Mit Himbeeren und Zimt servieren."] },
    lunch: { cat: "fish", name: "Seelachs auf Gemüsebett", kcal: 400, protein: 38,
      ing: [q(250, "g", "Seelachs"), q(100, "g", "Zucchini geschält"), q(100, "g", "Möhre"), q(150, "g", "passierte Tomaten"), q(1, "St", "Zwiebel"), q(200, "g", "Kartoffel")],
      steps: ["Zwiebel und Gemüse weich dünsten, passierte Tomaten dazu.", "Seelachs auflegen, zugedeckt ~15 Min garen.", "Mit Kartoffeln servieren."] },
    dinner: { cat: "poultry", name: "Auberginen-Puten-Moussaka mit Kartoffel", kcal: 450, protein: 40,
      ing: [q(150, "g", "Aubergine geschält"), q(250, "g", "mageres Putenhack"), q(200, "g", "passierte Tomaten"), q(200, "g", "Kartoffel"), q(1, "St", "Zwiebel"), q(null, "", "Oregano, Prise Zimt")],
      steps: ["Aubergine schälen, in Scheiben bei 200 °C ~15 Min weich garen.", "Putenhack mit Zwiebel anbraten, Tomaten + Gewürze, ~10 Min köcheln.", "Schichten, mit Kartoffel servieren."] },
  },
  0: { // SO
    breakfast: { cat: "dairy", name: "Overnight Oats mit Magerquark & Blaubeeren", prep: true, kcal: 330, protein: 22,
      ing: [q(40, "g", "Haferflocken"), q(150, "g", "Magerquark"), q(80, "g", "Blaubeeren"), q(1, "TL", "gemahlene Chiasamen")],
      steps: ["Haferflocken, Magerquark, Chia und Wasser verrühren.", "Über Nacht kühlen, morgens mit Blaubeeren toppen."] },
    lunch: { cat: "egg", name: "Kartoffel-Zucchini-Frittata mit Tomatensalat", prep: true, kcal: 330, protein: 24,
      ing: [q(1, "St", "Ei"), q(3, "St", "Eiweiß"), q(150, "g", "Kartoffel"), q(100, "g", "Zucchini geschält"), q(1, "St", "Tomate"), q(null, "", "Kräuter")],
      steps: ["Kartoffel und Zucchini würfeln, andünsten.", "Ei-Eiweiß-Masse würzen, darübergeben, stocken lassen.", "Mit Tomatensalat servieren – kalt transportierbar."] },
    dinner: { cat: "fish", name: "Zander mit Kürbispüree & Möhren", kcal: 380, protein: 40,
      ing: [q(250, "g", "Zander"), q(250, "g", "Kürbis"), q(100, "g", "Möhre"), q(null, "", "Zitrone, Dill")],
      steps: ["Kürbis und Möhre weich kochen, Kürbis pürieren.", "Zander mit Zitrone ~8 Min braten.", "Mit Püree und Möhren anrichten."] },
  },
};

// Aktiver Plan: Standard-PLAN, oder ein per KI erzeugter/lokal gespeicherter Plan.
const PLAN_KEY = "aufwind:plan";
let _active = PLAN;
try { if (typeof localStorage !== "undefined") { const raw = localStorage.getItem(PLAN_KEY); if (raw) { const p = JSON.parse(raw); if (p && typeof p === "object") _active = p; } } } catch (e) {}
export function getPlan() { return _active; }
export function isCustomPlan() { return _active !== PLAN; }
export function setActivePlan(p) { _active = p || PLAN; try { if (p) localStorage.setItem(PLAN_KEY, JSON.stringify(p)); } catch (e) {} }
export function resetPlan() { _active = PLAN; try { localStorage.removeItem(PLAN_KEY); } catch (e) {} }

export const SLOTS = [["breakfast", "Morgens"], ["lunch", "Mittags"], ["dinner", "Abends"]];
export const WD_ORDER = [1, 2, 3, 4, 5, 6, 0]; // MO..SO
export const WD_SHORT = { 1: "MO", 2: "DI", 3: "MI", 4: "DO", 5: "FR", 6: "SA", 0: "SO" };

// Menge skalieren: Basis = Dirk. Bianca-Faktor 0,65 → both = ×1,65.
export function scaleAmt(meal, ing, persons) {
  if (ing.b == null) return null;
  if (meal.ns) return ing.b; // e-Docs-Original: feste Portionszahl, NIE skalieren
  if (persons !== "both") return ing.b;
  if (ing.u === "g" || ing.u === "ml") return Math.round((ing.b * (1 + BIANCA)) / 5) * 5;
  return Math.max(ing.b, Math.round(ing.b * (1 + BIANCA))); // Stück/Scheibe/EL/TL
}

// Einkaufsliste über die ganze Woche (Personen berücksichtigt)
export function buildShoppingList(persons) {
  const amounts = {}; const noQty = new Set();
  const P = getPlan();
  WD_ORDER.forEach((wd) => {
    const day = P[wd]; if (!day) return;
    SLOTS.forEach(([slot]) => {
      const m = day[slot]; if (!m) return;
      m.ing.forEach((ing) => {
        if (ing.b == null) { if (ing.n) noQty.add(ing.n); return; }
        const val = scaleAmt(m, ing, persons);
        const key = ing.n + "|" + ing.u;
        amounts[key] = (amounts[key] || 0) + (val || 0);
      });
    });
  });
  const lines = Object.entries(amounts)
    .map(([key, sum]) => { const [n, u] = key.split("|"); return `• ${Math.round(sum)}${u ? " " + u : ""} ${n}`; })
    .sort((a, b) => a.localeCompare(b, "de"));
  let out = "Einkauf Wochenplan 🛒\n(" + (persons === "both" ? "Dirk + Bianca" : "Nur Dirk") + ")\n\n" + lines.join("\n");
  if (noQty.size) out += "\n\nWürze/Basis: " + [...noQty].join(", ");
  return out;
}
