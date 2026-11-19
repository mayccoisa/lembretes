#!/usr/bin/env node
/**
 * Garante ausencia de travessao como conectivo (T-08).
 * Uso: node scripts/check-traco.mjs
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = process.cwd();
const erros = [];

function varrer(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      varrer(completo);
    } else if (/\.(ts|tsx|md|css|rs)$/.test(entrada.name)) {
      const linhas = fs.readFileSync(completo, 'utf8').split(/\r?\n/);
      linhas.forEach((linha, idx) => {
        if (linha.includes('\u2014')) {
          erros.push(`${path.relative(ROOT, completo)}:${idx + 1}: travessao proibido (T-08)`);
        }
      });
    }
  }
}

varrer(path.join(ROOT, 'src'));
varrer(path.join(ROOT, 'mcp'));
varrer(path.join(ROOT, 'docs'));

if (erros.length > 0) {
  console.error('Falha em check:traco:');
  for (const e of erros) console.error(`  * ${e}`);
  process.exit(1);
}
console.log('OK check:traco: zero travessoes encontrados.');
