#!/usr/bin/env node
/**
 * Verifica as fronteiras arquiteturais do Lembretes (T-01 e T-03).
 * Uso: node scripts/check-fronteiras.mjs
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = process.cwd();
const erros = [];

function listarArquivos(dir) {
  if (!fs.existsSync(dir)) return [];
  const saida = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      saida.push(...listarArquivos(completo));
    } else if (/\.(ts|tsx|rs)$/.test(entrada.name)) {
      saida.push(completo);
    }
  }
  return saida;
}

for (const arq of listarArquivos(path.join(ROOT, 'src', 'components'))) {
  const rel = path.relative(ROOT, arq);
  const conteudo = fs.readFileSync(arq, 'utf8');
  if (/from\s+['"][^'"]*services\//.test(conteudo)) {
    erros.push(`${rel}: componente importa src/services direto (viola T-01, use src/hooks)`);
  }
  if (/from\s+['"]@tauri-apps\//.test(conteudo)) {
    erros.push(`${rel}: componente importa @tauri-apps direto (viola T-01, isole em src/services)`);
  }
}

for (const arq of [
  ...listarArquivos(path.join(ROOT, 'src')),
  ...listarArquivos(path.join(ROOT, 'mcp')),
  ...listarArquivos(path.join(ROOT, 'src-tauri', 'src')),
]) {
  const rel = path.relative(ROOT, arq);
  const conteudo = fs.readFileSync(arq, 'utf8');
  if (/select\s+\*/i.test(conteudo)) {
    erros.push(`${rel}: uso de SELECT * proibido (viola T-03)`);
  }
}

if (erros.length > 0) {
  console.error('Falha em check:fronteiras:');
  for (const e of erros) console.error(`  * ${e}`);
  process.exit(1);
}
console.log('OK check:fronteiras: zero violacoes.');
