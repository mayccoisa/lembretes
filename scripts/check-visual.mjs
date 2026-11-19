#!/usr/bin/env node
/**
 * Garante que cores literais vivam apenas em src/theme/ (T-21).
 * Uso: node scripts/check-visual.mjs
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = process.cwd();
const erros = [];
const REGEX_HEX = /#[0-9a-fA-F]{3,8}\b/;
const REGEX_TAILWIND_CRUA = /\b(bg|text|border|ring)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;

function varrer(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name === 'theme') continue;
      varrer(completo);
    } else if (/\.(ts|tsx|css)$/.test(entrada.name)) {
      const linhas = fs.readFileSync(completo, 'utf8').split(/\r?\n/);
      linhas.forEach((linha, idx) => {
        if (REGEX_HEX.test(linha)) {
          erros.push(`${path.relative(ROOT, completo)}:${idx + 1}: hex fora de src/theme/ (T-21)`);
        }
        if (REGEX_TAILWIND_CRUA.test(linha)) {
          erros.push(`${path.relative(ROOT, completo)}:${idx + 1}: classe de cor crua do Tailwind fora de token (T-21)`);
        }
      });
    }
  }
}

varrer(path.join(ROOT, 'src'));

if (erros.length > 0) {
  console.error('Falha em check:visual:');
  for (const e of erros) console.error(`  * ${e}`);
  process.exit(1);
}
console.log('OK check:visual: todos os componentes consomem apenas tokens semanticos.');
