import { build } from "esbuild";

await build({
  entryPoints: ["src/index.jsx"],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2019"],
  jsx: "automatic",
  outfile: "dist/app.js",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "info",
});

console.log("Build fertig -> dist/app.js");
