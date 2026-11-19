#!/usr/bin/env node
/**
 * Mede o peso gzipped dos recursos carregados no boot por dist/index.html (T-09).
 * Uso: node scripts/medir-boot.mjs
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';

const TETO_KB = 120;
const distDir = path.join(process.cwd(), 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error('dist/index.html ausente. Rode npm run build antes.');
  process.exit(1);
}

const html = fs.readFileSync(indexHtmlPath, 'utf8');
const refs = new Set();
for (const m of html.matchAll(/(?:src|href)=["']\/?([^"']+\.(?:js|css))["']/g)) {
  refs.add(m[1]);
}

let totalGzipBytes = zlib.gzipSync(Buffer.from(html)).length;
console.log('Recursos medidos no boot (dist/index.html):');
for (const rel of refs) {
  const arq = path.join(distDir, rel);
  if (!fs.existsSync(arq)) continue;
  const buf = fs.readFileSync(arq);
  const gz = zlib.gzipSync(buf).length;
  totalGzipBytes += gz;
  console.log(`  * ${rel}: ${(gz / 1024).toFixed(1)} KB gzip`);
}

const totalKb = totalGzipBytes / 1024;
console.log(`Total no boot: ${totalKb.toFixed(1)} KB gzip (teto: ${TETO_KB} KB gzip)`);

if (totalKb > TETO_KB) {
  console.error(`ESTOURO DE ORCAMENTO (T-09): ${totalKb.toFixed(1)} KB > ${TETO_KB} KB`);
  process.exit(1);
}
