/**
 * Gera os ícones do PWA a partir de um SVG.
 *   node scripts/gerar-icones.mjs
 * Rodar de novo só quando o ícone mudar; os PNGs ficam versionados.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destino = resolve(raiz, "public/icons");
mkdirSync(destino, { recursive: true });

const svg = (fundo, comMargem) => {
  const m = comMargem ? 96 : 0; // "maskable" precisa de zona segura nas bordas
  const s = 512 - m * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${fundo}"/>
  <g transform="translate(${m} ${m}) scale(${s / 512})">
    <circle cx="256" cy="256" r="196" fill="none" stroke="#ffffff" stroke-width="26"/>
    <path d="M256 128 v256 M188 186 h136 M188 246 h136"
          stroke="#ffffff" stroke-width="30" stroke-linecap="round" fill="none"/>
    <path d="M324 186 a68 60 0 0 1 0 120 h-68"
          stroke="#ffffff" stroke-width="30" stroke-linecap="round" fill="none"/>
  </g>
</svg>`;
};

const alvos = [
  { arquivo: "icon-192.png", tamanho: 192, svg: svg("#0f172a", false) },
  { arquivo: "icon-512.png", tamanho: 512, svg: svg("#0f172a", false) },
  { arquivo: "icon-maskable-512.png", tamanho: 512, svg: svg("#0f172a", true) },
  { arquivo: "apple-touch-icon.png", tamanho: 180, svg: svg("#0f172a", false) },
];

for (const alvo of alvos) {
  const png = await sharp(Buffer.from(alvo.svg))
    .resize(alvo.tamanho, alvo.tamanho)
    .png()
    .toBuffer();
  writeFileSync(resolve(destino, alvo.arquivo), png);
  console.log("gerado", alvo.arquivo, `${alvo.tamanho}x${alvo.tamanho}`, png.length, "bytes");
}

writeFileSync(resolve(raiz, "public/icon.svg"), svg("#0f172a", false));
console.log("gerado icon.svg");
