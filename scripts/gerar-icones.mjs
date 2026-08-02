/**
 * Gera os icones do PWA a partir da imagem versionada em public/icons/app-icon-source.png.
 *   node scripts/gerar-icones.mjs
 * Rodar de novo so quando o icone mudar; os PNGs ficam versionados.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destino = resolve(raiz, "public/icons");
const appDir = resolve(raiz, "src/app");
const fonte = resolve(destino, "app-icon-source.png");
mkdirSync(destino, { recursive: true });

const gerarPng = async ({ arquivo, tamanho, margem = 0, pasta = destino }) => {
  const conteudo = await sharp(fonte)
    .resize(tamanho - margem * 2, tamanho - margem * 2, {
      fit: "cover",
      position: "center",
    })
    .extend({
      top: margem,
      right: margem,
      bottom: margem,
      left: margem,
      background: "#0f172a",
    })
    .png()
    .toBuffer();

  writeFileSync(resolve(pasta, arquivo), conteudo);
  console.log("gerado", arquivo, `${tamanho}x${tamanho}`, conteudo.length, "bytes");
};

const gerarIco = async () => {
  const png = await sharp(fonte)
    .resize(256, 256, { fit: "cover", position: "center" })
    .ensureAlpha()
    .png({ palette: false })
    .toBuffer();
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // icon
  header.writeUInt16LE(1, 4); // one image
  header.writeUInt8(0, 6); // 256px is encoded as 0
  header.writeUInt8(0, 7);
  header.writeUInt8(0, 8);
  header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  const ico = Buffer.concat([header, png]);
  writeFileSync(resolve(appDir, "favicon.ico"), ico);
  console.log("gerado favicon.ico 256x256", ico.length, "bytes");
};

const alvos = [
  { arquivo: "icon-192.png", tamanho: 192 },
  { arquivo: "icon-512.png", tamanho: 512 },
  { arquivo: "icon-maskable-512.png", tamanho: 512, margem: 56 },
  { arquivo: "apple-touch-icon.png", tamanho: 180 },
  { arquivo: "icon.png", tamanho: 512, pasta: appDir },
  { arquivo: "apple-icon.png", tamanho: 180, pasta: appDir },
];

for (const alvo of alvos) {
  await gerarPng(alvo);
}

await gerarIco();

writeFileSync(
  resolve(raiz, "public/icon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0f172a"/>
  <text x="256" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="220" font-weight="700" fill="#ffffff">$</text>
</svg>`,
);
console.log("gerado icon.svg");
