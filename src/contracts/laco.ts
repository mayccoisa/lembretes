export type CorFita = 'carmim' | 'ambar' | 'salvia' | 'ceu' | 'lavanda' | 'pessego';

export type ModoConteudo = 'texto' | 'checklist';

export type EstadoLaco = 'ativo' | 'desfeito';

export interface ItemChecklist {
  id: string;
  texto: string;
  concluido: boolean;
}

export interface Laco {
  id: string;
  titulo: string;
  modo: ModoConteudo;
  texto: string;
  itens: ItemChecklist[];
  corFita: CorFita;
  imagemUrl: string | null;
  imagemNome: string | null;
  fixado: boolean;
  lembrarEm: string | null;
  notificadoEm: string | null;
  estado: EstadoLaco;
  desfeitoEm: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncVersion: number;
}

export interface NovoLacoInput {
  titulo?: string;
  modo?: ModoConteudo;
  texto?: string;
  itens?: ItemChecklist[];
  corFita?: CorFita;
  imagemUrl?: string | null;
  imagemNome?: string | null;
  fixado?: boolean;
  lembrarEm?: string | null;
}

export interface AtualizarLacoInput {
  id: string;
  titulo?: string;
  modo?: ModoConteudo;
  texto?: string;
  itens?: ItemChecklist[];
  corFita?: CorFita;
  imagemUrl?: string | null;
  imagemNome?: string | null;
  fixado?: boolean;
  lembrarEm?: string | null;
  notificadoEm?: string | null;
}

export const CORES_FITA: ReadonlyArray<{ id: CorFita; rotulo: string }> = [
  { id: 'carmim', rotulo: 'Carmim tradicional' },
  { id: 'ambar', rotulo: 'Âmbar solar' },
  { id: 'salvia', rotulo: 'Verde sálvia' },
  { id: 'ceu', rotulo: 'Azul céu' },
  { id: 'lavanda', rotulo: 'Lavanda suave' },
  { id: 'pessego', rotulo: 'Pêssego quente' },
];

export function lacoTemConteudoValido(input: NovoLacoInput): boolean {
  const temTitulo = Boolean(input.titulo && input.titulo.trim().length > 0);
  const temTexto = Boolean(input.texto && input.texto.trim().length > 0);
  const temItens = Boolean(
    input.itens && input.itens.some((item) => item.texto.trim().length > 0)
  );
  const temImagem = Boolean(input.imagemUrl && input.imagemUrl.trim().length > 0);
  return temTitulo || temTexto || temItens || temImagem;
}
