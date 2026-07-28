import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import Intro from "./Intro.jsx";

// Vorschau: spielt das Intro in Schleife, damit man es ohne Hosting ansehen kann.
function Loop() {
  const [k, setK] = useState(0);
  return <Intro key={k} onDone={() => setTimeout(() => setK((x) => x + 1), 700)} />;
}
createRoot(document.getElementById("root")).render(<Loop />);
