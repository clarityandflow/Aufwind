import sharp from "sharp";
import { writeFileSync } from "fs";

// Ganzkörper-Low-Poly-Figur mit hellem Lichtkern (eigene Zeichnung), im Stil der Referenz.
const RIGHT = [
  [256,80],[284,92],[292,120],[278,148],[270,152],[268,170],[300,180],
  [344,200],[360,252],[364,300],[356,346],[372,372],[380,392],[368,398],[360,388],[350,352],
  [330,304],[331,254],[303,216],[300,266],[292,308],[300,334],
  [308,356],[316,396],[302,436],[302,478],[288,508],[303,518],[273,518],
  [273,504],[271,466],[269,436],[263,396],[256,376],
];
function silhouette(){ const left=RIGHT.map(([x,y])=>[512-x,y]).reverse(); const pts=[...RIGHT,...left]; return "M "+pts.map(p=>p.join(",")).join(" L ")+" Z"; }

// dichtes Dreiecksnetz über den ganzen Körper (symmetrisch gespiegelt)
const HALF = [
  "M256,150 L300,180 L342,200 M256,150 L256,252 L300,180 M300,180 L292,254 L256,252",
  "M342,200 L326,254 L292,254 M256,252 L292,254 L280,300 L256,300 M292,254 L300,300 L280,300",
  "M342,200 L360,300 L330,300 L326,254 M330,300 L350,352 M256,300 L280,300 L268,352 L256,340",
  "M280,300 L300,334 L268,352 M256,340 L256,430 L268,352 M268,352 L292,396 L256,430",
  "M300,334 L307,396 L292,396 M292,396 L300,470 L256,470 L256,430 M300,470 L288,508",
  "M256,430 L256,470",
];
function mesh(){
  const mirror = HALF.map(d=>d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g,(m,x,y)=>`${512-parseFloat(x)},${y}`));
  return [...HALF,...mirror].map(d=>`<path d="${d}" stroke="#7FE0FF" stroke-width="1.5" fill="none" opacity="0.85"/>`).join("");
}
const NODES = [[256,150],[300,180],[344,200],[256,252],[292,254],[326,254],[360,300],[280,300],[330,300],
  [256,300],[300,334],[268,352],[350,352],[256,340],[256,430],[292,396],[307,396],[300,470],[256,470],[288,508]]
  .flatMap(([x,y])=> x===256?[[x,y]]:[[x,y],[512-x,y]])
  .map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.8" fill="#CFF3FF"/>`).join("");

function burst(cx,cy){
  return `<g filter="url(#soft)">
    <rect x="${cx-2.5}" y="${cy-140}" width="5" height="280" fill="url(#ray)"/>
    <rect x="${cx-150}" y="${cy-2.5}" width="300" height="5" fill="url(#rayH)"/>
    <rect x="${cx-2}" y="${cy-95}" width="4" height="190" fill="#EAF6FF" transform="rotate(45 ${cx} ${cy})" opacity="0.8"/>
    <rect x="${cx-2}" y="${cy-95}" width="4" height="190" fill="#EAF6FF" transform="rotate(-45 ${cx} ${cy})" opacity="0.8"/>
    <circle cx="${cx}" cy="${cy}" r="30" fill="url(#core)"/>
    <circle cx="${cx}" cy="${cy}" r="9" fill="#FFFFFF"/>
  </g>`;
}

function svg(scale=0.9, bg=true){
  const CX=256, CY=300;
  const inner=`<g transform="translate(256,256) scale(${scale}) translate(-256,-300)">
    <g filter="url(#glow)"><path d="${silhouette()}" fill="url(#body)" stroke="url(#edge)" stroke-width="2.5"/></g>
    ${mesh()}${NODES}${burst(CX,CY)}
  </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>
    <radialGradient id="bgrad" cx="50%" cy="58%" r="70%">
      <stop offset="0%" stop-color="#1E5AD6"/><stop offset="45%" stop-color="#0A2358"/><stop offset="100%" stop-color="#02081C"/>
    </radialGradient>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#173C86"/><stop offset="100%" stop-color="#0A245E"/>
    </linearGradient>
    <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#CFF3FF"/><stop offset="100%" stop-color="#39C9FF"/>
    </linearGradient>
    <radialGradient id="core"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="45%" stop-color="#BFE9FF"/><stop offset="100%" stop-color="#39C9FF" stop-opacity="0"/></radialGradient>
    <linearGradient id="ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#BFE9FF" stop-opacity="0"/><stop offset="50%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="#BFE9FF" stop-opacity="0"/></linearGradient>
    <linearGradient id="rayH" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#BFE9FF" stop-opacity="0"/><stop offset="50%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="#BFE9FF" stop-opacity="0"/></linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4"/></filter>
  </defs>
  ${bg?`<rect width="512" height="512" fill="url(#bgrad)"/>`:""}${inner}</svg>`;
}
async function png(s,size,out,flat){ let img=sharp(Buffer.from(s)).resize(size,size); if(flat) img=img.flatten({background:flat}); await img.png().toFile(out); console.log("wrote",out); }
await png(svg(0.9),192,"dist/icons/icon-192.png");
await png(svg(0.9),512,"dist/icons/icon-512.png");
await png(svg(0.64),512,"dist/icons/icon-maskable-512.png");
await png(svg(0.84),180,"dist/icons/apple-touch-icon.png","#02081C");
await png(svg(0.95),64,"dist/icons/favicon-64.png");
writeFileSync("dist/icons/favicon.svg", svg(0.95));
console.log("done");
