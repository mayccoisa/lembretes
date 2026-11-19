import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (process.env.LEMBRETES_DB_PATH) {
  process.env.LEMBRETES_DB_PATH = resolve(process.env.LEMBRETES_DB_PATH);
}
process.chdir(raiz);

const { tsImport } = await import('tsx/esm/api');
const { iniciarServidorMcp } = await tsImport('./servidor.ts', import.meta.url);
iniciarServidorMcp();
