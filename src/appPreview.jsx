import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// Vorschau: komplette App in EINER HTML-Datei (ohne Service Worker),
// zum Doppelklick-Öffnen im Browser. Kamera/Push brauchen echtes HTTPS-Hosting.
createRoot(document.getElementById("root")).render(<App />);
