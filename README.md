# Aufwind — installierbare PWA

Deine persönliche 360°-Transformations-App als echte Progressive Web App:
installierbar auf dem iPhone-Home-Screen, offline nutzbar, mit lokaler
Datenspeicherung, Erinnerungen und Bring-Export.

## Neu in v1.1

- **Animiertes Intro**: Wortwolke setzt sich beim Start zusammen → AUFWIND-Logo.
  Tippen überspringt. Dunkelblau mit roten Akzentworten.
- **Übungs-Player**: bei jeder Übung ein roter **Start**-Button → Sätze zählen,
  „Satz fertig" mit automatischem **Pausen-Countdown** (Vibration + Ton).
- **KI-Wiederholungszähler (Beta)**: im Player die Kamera starten, die
  Wiederholungen automatisch mitzählt (TensorFlow.js/MoveNet, lädt nur bei
  Bedarf). Bewegungsart wählbar, +/− zur Korrektur.
  Ehrlich: **auf deinem iPhone noch ungetestet** — Genauigkeit hängt von
  Kamerawinkel & Licht ab. Bitte einmal live prüfen, dann justiere ich die
  Erkennung nach. Braucht HTTPS + Kamera-Freigabe.

Alles Fertige liegt im Ordner **`dist/`** — das ist die komplette Website.

---

## Deployen mit GitHub + Vercel (empfohlen)

Diese Dateien sind schon fertig gebaut – kein Build nötig.

1. **Diese Dateien** (nicht die ZIP) ins GitHub-Repo laden: `index.html`, `app.js`,
   `sw.js`, `manifest.webmanifest`, `vercel.json`, `README.md` und den Ordner
   `icons/`. Über GitHub: „Add file" → „Upload files" → alles reinziehen →
   „Commit changes". Wichtig: `index.html` liegt im **Hauptverzeichnis**.
2. **Vercel**: „Add New → Project" → Repo importieren → Framework-Preset **„Other"**
   (kein Build-Command) → **Deploy**.
3. HTTPS-Adresse in **Safari** öffnen → Teilen → „Zum Home-Bildschirm".

Die beiliegende `vercel.json` sorgt dafür, dass der Service Worker immer frisch
geladen wird (Updates kommen sofort an) und die Icons sinnvoll gecacht werden.
Ab dann: neue Version = Dateien neu pushen, Vercel deployt automatisch, das
iPhone aktualisiert sich selbst.

## 1. Alternative: einfaches Hosting

Service Worker & „Zum Home-Bildschirm" funktionieren **nur über HTTPS**. Drei
einfache Wege — du brauchst nur den Inhalt von `dist/`:

- **Netlify Drop** (am schnellsten, kostenlos): https://app.netlify.com/drop —
  den Ordner `dist` einfach ins Browserfenster ziehen. Fertig, du bekommst eine
  HTTPS-Adresse.
- **Vercel / Cloudflare Pages**: neues Projekt, `dist` als Ausgabeordner.
- **Eigener Webspace**: den Inhalt von `dist/` in einen Ordner hochladen
  (z. B. `deine-domain.de/aufwind/`). Wichtig: die Dateien behalten ihre
  Struktur (`index.html`, `app.js`, `sw.js`, `manifest.webmanifest`, `icons/`).

> Wichtig: `sw.js` und `manifest.webmanifest` müssen im selben Ordner liegen wie
> `index.html`. Die App nutzt relative Pfade, läuft also auch im Unterordner.

## 2. Auf dem iPhone installieren

1. Adresse in **Safari** öffnen (nicht Chrome — nur Safari kann installieren).
2. Teilen-Symbol → **„Zum Home-Bildschirm"**.
3. Name „Aufwind" bestätigen → das blaue Icon liegt jetzt auf dem Home-Screen.
4. Aus dem Icon starten: läuft im Vollbild, ohne Safari-Leiste, auch offline.

## 3. Erinnerungen aktivieren

Zahnrad oben rechts → **Benachrichtigungen erlauben**. Danach drei
Erinnerungen mit eigenen Uhrzeiten:

- **Morgen-Routine** (Standard 07:00)
- **Abend-Prep** (Standard 21:00)
- **Wochenplanung** (Freitag 17:00)

„Test-Benachrichtigung" prüft, ob alles sitzt.

> Ehrliche Einordnung: Die Erinnerungen laufen **lokal auf dem Gerät** und sind
> zuverlässig, solange du die App regelmäßig öffnest. Echte
> Hintergrund-Zustellung bei komplett geschlossener App bräuchte einen kleinen
> Push-Server — bewusst weggelassen, damit die App serverlos & privat bleibt.
> Wenn du das später willst, lässt es sich ergänzen.

## 4. Bring-Export

Tab **Essen** → Mahlzeit antippen → Zutaten öffnen → **„In Bring / Teilen"**.
Öffnet das iOS-Teilen-Menü; dort Bring auswählen, um die Zutaten zu übernehmen.

## 5. Daten

Alles wird lokal im Browser gespeichert (localStorage). Kein Konto, kein Server.
Beim Deinstallieren oder Löschen der Website-Daten gehen die Einträge verloren.

---

## Neu bauen / anpassen (optional, für Entwickler)

Quellcode liegt in `src/`:

- `src/App.jsx` — komplette App (Heute, Essen, Training, Verlauf, Einstellungen)
- `src/storage.js` — Persistenz (localStorage)
- `src/reminders.js` — lokale Erinnerungen
- `src/index.jsx` — Einstieg + Service-Worker-Registrierung

Bauen:

```bash
npm install
node build.mjs        # bündelt -> dist/app.js
node gen-icons.mjs    # erzeugt die Icons neu (nur bei Änderung nötig)
```

Statische Dateien (`index.html`, `manifest.webmanifest`, `sw.js`, `icons/`)
liegen direkt in `dist/`. Nach jeder Änderung an `sw.js` die Versionsnummer
`VERSION` erhöhen, damit Geräte den neuen Stand ziehen.

## Offene Punkte aus deinem Briefing

- **Lizenzierte Motivations-Fotos**: sind noch nicht drin — ich kann keine
  kommerziellen Stockfotos beschaffen/lizenzieren. Der Hero ist aktuell das
  cinematische Elektroblau mit Glow-Ring. Optionen: du lieferst lizenzierte
  Bilder, oder wir setzen KI-generierte, cinematisch orange-blaue Bilder ein.
- **Hintergrund-Push mit fixen Zeiten** (App geschlossen): siehe Abschnitt 3.
