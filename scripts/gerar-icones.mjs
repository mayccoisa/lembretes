#!/usr/bin/env node
/**
 * Gera os icones PNG e ICO oficiais (apenas um lacinho leve e delicado) para o Tauri v2 e web.
 * Uso: node scripts/gerar-icones.mjs
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(tipo, dados) {
  const tipoBuf = Buffer.from(tipo, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(dados.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([tipoBuf, dados])), 0);
  return Buffer.concat([lenBuf, tipoBuf, dados, crcBuf]);
}

function distanciaSegmento(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(px - ax, py - ay);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(px - bx, py - by);
  const b = c1 / c2;
  return Math.hypot(px - (ax + b * vx), py - (ay + b * vy));
}

function desenharIconeRgba(tamanho) {
  const dados = Buffer.alloc((tamanho * 4 + 1) * tamanho);
  const s = tamanho;
  const espessura = Math.max(0.038, 1.8 / s);

  for (let y = 0; y < s; y++) {
    const offsetLinha = y * (s * 4 + 1);
    dados[offsetLinha] = 0;
    const ny = (y + 0.5) / s;
    for (let x = 0; x < s; x++) {
      const nx = (x + 0.5) / s;
      const p = offsetLinha + 1 + x * 4;

      let r = 0, g = 0, b = 0, a = 0;

      // Orelha esquerda (anel eliptico inclinado leve)
      const ex = nx - 0.31;
      const ey = ny - 0.44;
      const rotEsqX = ex * 0.94 + ey * 0.34;
      const rotEsqY = -ex * 0.34 + ey * 0.94;
      const distElipseEsq = Math.hypot(rotEsqX / 0.17, rotEsqY / 0.105);
      const bordaOrelhaEsq = Math.abs(distElipseEsq - 1.0) * 0.13 < espessura;
      const fundoOrelhaEsq = distElipseEsq < 1.0;

      // Orelha direita (anel eliptico espelhado)
      const dx = nx - 0.69;
      const dy = ny - 0.44;
      const rotDirX = dx * 0.94 - dy * 0.34;
      const rotDirY = dx * 0.34 + dy * 0.94;
      const distElipseDir = Math.hypot(rotDirX / 0.17, rotDirY / 0.105);
      const bordaOrelhaDir = Math.abs(distElipseDir - 1.0) * 0.13 < espessura;
      const fundoOrelhaDir = distElipseDir < 1.0;

      // Pontas finas da fita
      const distPontaEsq = distanciaSegmento(nx, ny, 0.47, 0.49, 0.32, 0.78);
      const distPontaDir = distanciaSegmento(nx, ny, 0.53, 0.49, 0.68, 0.78);
      const emPonta = distPontaEsq < espessura * 0.95 || distPontaDir < espessura * 0.95;

      // No central pequeno
      const distNo = Math.hypot(nx - 0.5, ny - 0.46);

      if (fundoOrelhaEsq || fundoOrelhaDir) {
        r = 235; g = 54; b = 80; a = 56;
      }
      if (bordaOrelhaEsq || bordaOrelhaDir || emPonta) {
        r = 224; g = 49; b = 75; a = 255;
      }
      if (distNo <= 0.075) {
        r = 186; g = 29; b = 55; a = 255;
      }

      dados[p] = r;
      dados[p + 1] = g;
      dados[p + 2] = b;
      dados[p + 3] = a;
    }
  }

  const assinatura = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(s, 0);
  ihdr.writeUInt32BE(s, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const idat = zlib.deflateSync(dados);
  return Buffer.concat([
    assinatura,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function criarIcoDePng(pngBuf, tamanho) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const dir = Buffer.alloc(16);
  dir[0] = tamanho >= 256 ? 0 : tamanho;
  dir[1] = tamanho >= 256 ? 0 : tamanho;
  dir[2] = 0;
  dir[3] = 0;
  dir.writeUInt16LE(1, 4);
  dir.writeUInt16LE(32, 6);
  dir.writeUInt32LE(pngBuf.length, 8);
  dir.writeUInt32LE(22, 12);

  return Buffer.concat([header, dir, pngBuf]);
}

const iconsDir = path.join(process.cwd(), 'src-tauri', 'icons');
const publicDir = path.join(process.cwd(), 'public');
fs.mkdirSync(iconsDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });

const png32 = desenharIconeRgba(32);
const png128 = desenharIconeRgba(128);
const png256 = desenharIconeRgba(256);

fs.writeFileSync(path.join(iconsDir, '32x32.png'), png32);
fs.writeFileSync(path.join(iconsDir, '128x128.png'), png128);
fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), png256);
fs.writeFileSync(path.join(iconsDir, 'icon.png'), png256);
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), criarIcoDePng(png256, 256));
fs.writeFileSync(path.join(publicDir, 'favicon.png'), png128);

console.log('Icones leves do lacinho gerados em src-tauri/icons/ e public/favicon.png.');
