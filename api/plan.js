// Vercel Serverless Function · POST /api/plan
// Nutzt ANTHROPIC_API_KEY (Environment Variable) – Key liegt NIE im Client.
// Erzeugt einen Wochen-Essensplan im Aufwind-Schema als striktes JSON.

const SYSTEM = `Du bist Ernährungsplaner für die App "Aufwind" (Dirk).
Erzeuge einen Wochen-Essensplan als STRIKTES JSON. Gib NUR das JSON aus – keine Erklärungen, kein Markdown.

Format (Objekt, Schlüssel = Wochentag als String: "1"=Mo,"2"=Di,"3"=Mi,"4"=Do,"5"=Fr,"6"=Sa,"0"=So):
{
  "1": { "breakfast": <Gericht|weglassen>, "lunch": <Gericht>, "dinner": <Gericht> },
  ... weitere Tage ...
}
Ein <Gericht> ist:
{
  "cat": "fish"|"poultry"|"egg"|"dairy"|"veg"|"legume",
  "name": "deutscher Gerichtname",
  "kcal": Zahl, "protein": Zahl (Gramm),
  "prep": true (nur wenn am Vorabend vorzubereiten, sonst weglassen),
  "akutNote": "kurzer Hinweis" (nur wenn in fettarmer Akutphase kritisch, sonst weglassen),
  "normalExtra": "z.B. + 15 g Walnüsse" (nur wenn in Normalphase etwas ergänzt werden darf, sonst weglassen),
  "ing": [ { "b": Zahl|null, "u": "g"|"ml"|"St"|"Sch"|"EL"|"TL"|"", "n": "Zutat" } ],
  "steps": [ "Kochschritt 1", "Kochschritt 2" ]
}
Regeln:
- Portionsbasis = EINE Portion (Dirk).
- b=null nur für Gewürze/Basiszutaten ohne Menge (u dann "").
- Gesundheit strikt beachten: Typ-2-Diabetes (blutzuckerstabil, wenig schnelle Kohlenhydrate, Vollkorn), ruhiger Morbus Crohn (gut verträglich, schonend; Akutphase fettarm), Ziel Gewichtsreduktion mit VIEL Protein.
- Realistische, alltagstaugliche deutsche Gerichte. Fettarm, zuckerarm.
- Wenn der Nutzer Wünsche nennt (Zutaten meiden, bestimmte Tage, etc.), setze sie um.`;

function extractJson(t) {
  if (!t) return null;
  try { return JSON.parse(t); } catch (e) {}
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s >= 0 && e > s) { try { return JSON.parse(t.slice(s, e + 1)); } catch (_) {} }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Nur POST." }); return; }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(500).json({ error: "ANTHROPIC_API_KEY fehlt in den Vercel Environment Variables." }); return; }
  try {
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const instruction = (body && body.instruction) || "Erstelle einen ausgewogenen, fettarmen, blutzuckerstabilen Wochenplan (Mo–So).";
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 4096, system: SYSTEM, messages: [{ role: "user", content: instruction }] }),
    });
    const data = await r.json();
    if (!r.ok) { res.status(r.status).json({ error: (data && data.error && (data.error.message || JSON.stringify(data.error))) || "Anthropic-Fehler" }); return; }
    const text = (data.content && data.content[0] && data.content[0].text) || "";
    const plan = extractJson(text);
    if (!plan || typeof plan !== "object") { res.status(502).json({ error: "KI-Antwort war kein gültiges JSON.", raw: String(text).slice(0, 400) }); return; }
    res.status(200).json({ plan });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
