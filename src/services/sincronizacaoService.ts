import {
  collection, connectFirestoreEmulator, doc, getDocsFromServer, getFirestore, onSnapshot, runTransaction,
} from 'firebase/firestore';
import { connectStorageEmulator, deleteObject, getBytes, getStorage, ref, uploadBytes } from 'firebase/storage';
import { z } from 'zod';
import type { Laco } from '../contracts/laco';
import { obterAppDaConta, usarEmulador } from './contaService';
import {
  tauriAplicarLacoRemoto, tauriLerImagemSincronizacao, tauriListarParaSincronizar, tauriSalvarImagem,
} from './tauriBridge';

const imagemSchema = z.object({
  id: z.uuid(), hash: z.string().regex(/^[a-f0-9]{64}$/), extensao: z.string().regex(/^[a-z0-9]{1,16}$/),
});
const dataIso = z.string().refine((valor) => Number.isFinite(Date.parse(valor)));
const remotoSchema = z.object({
  id: z.uuid(), revisao: z.uuid(), imagem: imagemSchema.nullable(),
  titulo: z.string(), modo: z.enum(['texto', 'checklist']), texto: z.string(),
  itens: z.array(z.object({ id: z.string(), texto: z.string(), concluido: z.boolean() })),
  corFita: z.enum(['carmim', 'ambar', 'salvia', 'ceu', 'lavanda', 'pessego']),
  imagemNome: z.string().nullable(), fixado: z.boolean(), lembrarEm: dataIso.nullable(),
  recorrencia: z.enum(['diaria', 'dias-uteis', 'semanal', 'mensal', 'intervalo-horas', 'intervalo-dias']).nullable(),
  intervaloRecorrencia: z.number().int().positive(), ocultoAte: dataIso.nullable(),
  chaveExterna: z.string().nullable(), canalOrigem: z.string().nullable(),
  estado: z.enum(['ativo', 'desfeito']), desfeitoEm: dataIso.nullable(),
  createdAt: dataIso, updatedAt: dataIso, deletedAt: dataIso.nullable(), syncVersion: z.number().int().positive(),
});
type Remoto = z.infer<typeof remotoSchema>;
type ImagemRemota = z.infer<typeof imagemSchema>;

const tiposImagem: Readonly<Record<string, string>> = {
  png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
  bmp: 'image/bmp', ico: 'image/x-icon', avif: 'image/avif', svg: 'image/svg+xml',
  tif: 'image/tiff', tiff: 'image/tiff', jfif: 'image/jpeg', apng: 'image/apng', heic: 'image/heic',
};
let emuladoresConectados = false;

function recursos(uid: string) {
  const app = obterAppDaConta(uid);
  const banco = getFirestore(app);
  const storage = getStorage(app);
  if (usarEmulador && !emuladoresConectados) {
    connectFirestoreEmulator(banco, '127.0.0.1', 8080);
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    emuladoresConectados = true;
  }
  return { banco, storage };
}

export function acompanharRemotos(uid: string, aoMudar: () => void, aoFalhar: (erro: unknown) => void) {
  const { banco } = recursos(uid);
  return onSnapshot(collection(banco, 'usuarios', uid, 'lembretes'), { includeMetadataChanges: true }, (snapshot) => {
    if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites && snapshot.docChanges().length > 0) aoMudar();
  }, aoFalhar);
}

function deveEnviar(local: Laco, remoto?: Remoto): boolean {
  if (!remoto) return true;
  if (Boolean(local.deletedAt) !== Boolean(remoto.deletedAt)) return Boolean(local.deletedAt);
  if (local.deletedAt && remoto.deletedAt) return false;
  const tempo = Date.parse(local.updatedAt) - Date.parse(remoto.updatedAt);
  return tempo > 0 || (tempo === 0 && local.syncVersion > remoto.syncVersion);
}

function paraRemoto(local: Laco, imagem: ImagemRemota | null): Remoto {
  const conteudo = local.deletedAt ? {
    ...local, titulo: '', texto: '', itens: [], imagemNome: null, chaveExterna: null, canalOrigem: null,
    lembrarEm: null, ocultoAte: null, recorrencia: null,
  } : local;
  return remotoSchema.parse({ ...conteudo, imagem, revisao: crypto.randomUUID() });
}

function lerRemoto(id: string, dados: unknown): Remoto {
  const remoto = remotoSchema.parse(dados);
  if (remoto.id !== id) throw new Error('Identificador do lembrete remoto inválido.');
  return remoto;
}

function referenciaImagem(storage: ReturnType<typeof getStorage>, uid: string, id: string, imagem: ImagemRemota) {
  return ref(storage, `usuarios/${uid}/lembretes/${id}/imagens/${imagem.id}`);
}

async function imagemParaEnviar(local: Laco, anterior?: ImagemRemota | null) {
  if (!local.imagemUrl || local.deletedAt) return { imagem: null, arquivo: null };
  const caminho = decodeURIComponent(new URL(local.imagemUrl).pathname).replaceAll('\\', '/');
  const nome = caminho.split('/').at(-1) ?? '';
  const extensao = nome.split('.').at(-1)?.toLowerCase() ?? '';
  const tipo = tiposImagem[extensao];
  if (!tipo) throw new Error(`Formato de imagem não reconhecido: ${extensao}`);
  const base64 = await tauriLerImagemSincronizacao(nome);
  const bytes = Uint8Array.from(atob(base64), (caractere) => caractere.charCodeAt(0));
  const resumo = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(resumo), (byte) => byte.toString(16).padStart(2, '0')).join('');
  if (anterior?.hash === hash) return { imagem: anterior, arquivo: null };
  return { imagem: { id: crypto.randomUUID(), hash, extensao }, arquivo: { bytes, tipo } };
}

async function salvarImagemBaixada(arquivo: ArrayBuffer, extensao: string): Promise<string> {
  const bytes = new Uint8Array(arquivo);
  let binario = '';
  for (let inicio = 0; inicio < bytes.length; inicio += 8192) {
    binario += String.fromCharCode(...bytes.subarray(inicio, inicio + 8192));
  }
  return tauriSalvarImagem(`anexo.${extensao}`, `data:${tiposImagem[extensao]};base64,${btoa(binario)}`);
}

export async function sincronizarLembretes(uid: string, signal: AbortSignal) {
  const { banco, storage } = recursos(uid);
  const colecao = collection(banco, 'usuarios', uid, 'lembretes');
  const [locais, resultado] = await Promise.all([tauriListarParaSincronizar(uid), getDocsFromServer(colecao)]);
  const remotos = new Map(resultado.docs.map((item) => [item.id, lerRemoto(item.id, item.data())]));
  const porId = new Map(locais.map((laco) => [laco.id, laco]));
  let precisaRepetir = false;
  let falhas = 0;
  for (const id of new Set([...porId.keys(), ...remotos.keys()])) {
    signal.throwIfAborted();
    obterAppDaConta(uid);
    const local = porId.get(id);
    const remoto = remotos.get(id);
    try {
      if (local && deveEnviar(local, remoto)) {
        const { imagem, arquivo } = await imagemParaEnviar(local, remoto?.imagem);
        const paraGravar = paraRemoto(local, imagem);
        const novoAnexo = imagem && arquivo ? referenciaImagem(storage, uid, id, imagem) : null;
        signal.throwIfAborted();
        if (novoAnexo && arquivo) await uploadBytes(novoAnexo, arquivo.bytes, { contentType: arquivo.tipo });
        const documento = doc(colecao, id);
        const gravou = await runTransaction(banco, async (transacao) => {
          signal.throwIfAborted();
          obterAppDaConta(uid);
          const atual = await transacao.get(documento);
          if (atual.data()?.revisao !== remoto?.revisao) return false;
          transacao.set(documento, paraGravar);
          return true;
        });
        const remover = gravou && remoto?.imagem && remoto.imagem.id !== imagem?.id
          ? referenciaImagem(storage, uid, id, remoto.imagem)
          : !gravou ? novoAnexo : null;
        if (remover) await deleteObject(remover).catch((erro: unknown) => console.warn('Falha na limpeza do anexo sincronizado', erro));
        precisaRepetir ||= !gravou;
      } else if (remoto && (!local || (!local.deletedAt && remoto.deletedAt)
        || (local.updatedAt !== remoto.updatedAt || local.syncVersion !== remoto.syncVersion) && !local.deletedAt)) {
        const { imagem, revisao: _revisao, ...dados } = remoto;
        const imagemUrl = imagem && !remoto.deletedAt
          ? await salvarImagemBaixada(await getBytes(referenciaImagem(storage, uid, id, imagem)), imagem.extensao)
          : null;
        signal.throwIfAborted();
        obterAppDaConta(uid);
        const aplicou = await tauriAplicarLacoRemoto(uid, { ...dados, imagemUrl, notificadoEm: null }, local);
        precisaRepetir ||= !aplicou;
      }
    } catch (erro) {
      signal.throwIfAborted();
      falhas++;
      console.warn('Não foi possível sincronizar um lembrete', erro);
    }
  }
  return { precisaRepetir, falhas };
}
