#!/usr/bin/env node
/**
 * Gera os icones oficiais do Lembretes com supersampling 4x (anti-aliasing suave):
 * 1) icon.ico / icon.png: circulo lavanda suave + lacinho monoline azul-marinho (estilo referencia 1)
 * 2) tray-icon.png: lacinho monoline escuro em fundo transparente para a bandeja do Windows 11 (referencia 2)
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

function distSegmento(px, py, ax, ay, bx, by) {
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

function pertenceTracoLacinho(nx, ny, escala, larguraTraco) {
  const x = (nx - 0.5) / escala + 0.5;
  const y = (ny - 0.5) / escala + 0.5;

  // No central (anel)
  const dNo = Math.abs(Math.hypot(x - 0.5, y - 0.46) - 0.088);
  if (dNo <= larguraTraco) return true;

  // Orelha esquerda (arco externo fora do no)
  if (x <= 0.45) {
    const ex = (x - 0.305) / 0.165;
    const ey = (y - 0.46) / 0.135;
    const dEsq = Math.abs(Math.hypot(ex, ey) - 1.0) * 0.148;
    if (dEsq <= larguraTraco) return true;
  }

  // Orelha direita (arco simetrico)
  if (x >= 0.55) {
    const dx = (x - 0.695) / 0.165;
    const dy = (y - 0.46) / 0.135;
    const dDir = Math.abs(Math.hypot(dx, dy) - 1.0) * 0.148;
    if (dDir <= larguraTraco) return true;
  }

  // Perninhas retas inferiores
  const dPernaEsq = distSegmento(x, y, 0.445, 0.535, 0.315, 0.785);
  const dPernaDir = distSegmento(x, y, 0.555, 0.535, 0.685, 0.785);
  return dPernaEsq <= larguraTraco || dPernaDir <= larguraTraco;
}

function renderizarPng(tamanho, comCirculoFundo) {
  const dados = Buffer.alloc((tamanho * 4 + 1) * tamanho);
  const amostras = 4;
  const escalaLaco = comCirculoFundo ? 0.50 : 0.84;
  const larguraTraco = comCirculoFundo ? 0.015 : 0.025;

  for (let y = 0; y < tamanho; y++) {
    const offsetLinha = y * (tamanho * 4 + 1);
    dados[offsetLinha] = 0;
    for (let x = 0; x < tamanho; x++) {
      let somaR = 0, somaG = 0, somaB = 0, somaA = 0;

      for (let sy = 0; sy < amostras; sy++) {
        for (let sx = 0; sx < amostras; sx++) {
          const nx = (x + (sx + 0.5) / amostras) / tamanho;
          const ny = (y + (sy + 0.5) / amostras) / tamanho;

          let r = 0, g = 0, b = 0, a = 0;

          if (comCirculoFundo) {
            const dCentro = Math.hypot(nx - 0.5, ny - 0.5);
            if (dCentro <= 0.46) {
              // Circulo lavanda-azulado identico a referencia 1
              r = 195; g = 206; b = 251; a = 255;
            }
          }

          if (pertenceTracoLacinho(nx, ny, escalaLaco, larguraTraco)) {
            if (comCirculoFundo) {
              // Traco marinho escuro sobre o circulo lavanda
              r = 39; g = 50; b = 92; a = 255;
            } else {
              // Traco grafite nitido para a barra de tarefas clara do Windows 11
              r = 32; g = 34; b = 38; a = 255;
            }
          }

          somaR += r * (a / 255);
          somaG += g * (a / 255);
          somaB += b * (a / 255);
          somaA += a;
        }
      }

      const total = amostras * amostras;
      const alphaFinal = Math.round(somaA / total);
      const p = offsetLinha + 1 + x * 4;
      if (alphaFinal > 0) {
        const peso = somaA / 255;
        dados[p] = Math.min(255, Math.round(somaR / peso));
        dados[p + 1] = Math.min(255, Math.round(somaG / peso));
        dados[p + 2] = Math.min(255, Math.round(somaB / peso));
        dados[p + 3] = alphaFinal;
      }
    }
  }

  const assinatura = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(tamanho, 0);
  ihdr.writeUInt32BE(tamanho, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const idat = zlib.deflateSync(dados);
  return {
    png: Buffer.concat([
      assinatura,
      pngChunk('IHDR', ihdr),
      pngChunk('IDAT', idat),
      pngChunk('IEND', Buffer.alloc(0)),
    ]),
    dadosFiltro: dados,
  };
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

const png32 = renderizarPng(32, true).png;
const png128 = renderizarPng(128, true).png;
const png256 = renderizarPng(256, true).png;
const trayRes = renderizarPng(32, false);

const rgbaPuro = Buffer.alloc(32 * 32 * 4);
for (let y = 0; y < 32; y++) {
  trayRes.dadosFiltro.copy(rgbaPuro, y * 32 * 4, y * (32 * 4 + 1) + 1, (y + 1) * (32 * 4 + 1));
}

fs.writeFileSync(path.join(iconsDir, '32x32.png'), png32);
fs.writeFileSync(path.join(iconsDir, '128x128.png'), png128);
fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), png256);
fs.writeFileSync(path.join(iconsDir, 'icon.png'), png256);
fs.writeFileSync(path.join(iconsDir, 'tray-icon.png'), trayRes.png);
fs.writeFileSync(path.join(iconsDir, 'tray-icon.rgba'), rgbaPuro);
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), criarIcoDePng(png256, 256));
fs.writeFileSync(path.join(publicDir, 'favicon.png'), png128);

console.log('Icones circulares monoline e tray-icon gerados com sucesso.');
