// Lokale Erinnerungen für Aufwind.
// Hinweis: Zuverlässig, solange die App zwischendurch geöffnet wird.
// Echte Hintergrund-Push (App komplett geschlossen) braucht einen Push-Server —
// bewusst weggelassen, damit die App 100 % offline & serverlos bleibt.

const REM_KEY = "aufwind-reminders";

export const DEFAULT_REMINDERS = {
  enabled: false,
  morning: { on: true, time: "07:00", title: "Guten Morgen 🌅", body: "Mobilität, Tabletten, Wasser — starte deine Routine." },
  evening: { on: true, time: "21:00", title: "Abend-Prep 🌙", body: "Vorabend ansetzen & Shakti-Matte. Morgen wird leichter." },
  friday: { on: true, time: "17:00", title: "Wochenplanung 📅", body: "Freitag 17:00 — nächste Woche planen & Bring-Liste erstellen." },
};

export function loadReminders() {
  try {
    const raw = localStorage.getItem(REM_KEY);
    if (!raw) return { ...DEFAULT_REMINDERS };
    return { ...DEFAULT_REMINDERS, ...JSON.parse(raw) };
  } catch (e) {
    return { ...DEFAULT_REMINDERS };
  }
}

export function saveReminders(r) {
  try {
    localStorage.setItem(REM_KEY, JSON.stringify(r));
  } catch (e) {}
}

export async function requestPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  try {
    return await Notification.requestPermission();
  } catch (e) {
    return Notification.permission;
  }
}

async function fire(title, body) {
  const opts = {
    body,
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    tag: "aufwind",
    renotify: true,
  };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg && reg.showNotification) {
      await reg.showNotification(title, opts);
      return;
    }
  } catch (e) {}
  try {
    new Notification(title, opts);
  } catch (e) {}
}

function nextOccurrence(timeStr, weekdayOnly) {
  const [h, m] = timeStr.split(":").map(Number);
  const now = new Date();
  const t = new Date();
  t.setHours(h, m, 0, 0);
  if (weekdayOnly != null) {
    // nächster passender Wochentag (0=So..6=Sa)
    let add = (weekdayOnly - now.getDay() + 7) % 7;
    if (add === 0 && t <= now) add = 7;
    t.setDate(t.getDate() + add);
  } else if (t <= now) {
    t.setDate(t.getDate() + 1);
  }
  return t;
}

let timers = [];
function clearTimers() {
  timers.forEach((id) => clearTimeout(id));
  timers = [];
}

// Plant die nächsten Auslöser für alle aktiven Erinnerungen (max ~24 h Fenster).
export function scheduleAll(r) {
  clearTimers();
  if (!r.enabled || Notification?.permission !== "granted") return;
  const now = Date.now();
  const jobs = [];
  if (r.morning.on) jobs.push({ when: nextOccurrence(r.morning.time), item: r.morning });
  if (r.evening.on) jobs.push({ when: nextOccurrence(r.evening.time), item: r.evening });
  if (r.friday.on) jobs.push({ when: nextOccurrence(r.friday.time, 5), item: r.friday });

  jobs.forEach(({ when, item }) => {
    const delay = when.getTime() - now;
    // setTimeout ist bei sehr großen Werten unzuverlässig -> nur < 24h einplanen,
    // Rest wird beim nächsten App-Start/Visibility-Wechsel neu berechnet.
    if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
      const id = setTimeout(() => {
        fire(item.title, item.body);
        // danach neu planen
        setTimeout(() => scheduleAll(loadReminders()), 60 * 1000);
      }, delay);
      timers.push(id);
    }
  });
}

// Testauslöser für die Einstellungen.
export function testFire() {
  fire("Aufwind Test ✓", "Erinnerungen funktionieren. Wir sehen uns morgen früh.");
}

// Bei Sichtbarkeitswechsel neu einplanen (deckt das >24h-Fenster ab).
export function attachVisibilityRescheduler() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") scheduleAll(loadReminders());
  });
}
