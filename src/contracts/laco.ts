export type CorFita = 'carmim' | 'ambar' | 'salvia' | 'ceu' | 'lavanda' | 'pessego';

export type ModoConteudo = 'texto' | 'checklist';

export type EstadoLaco = 'ativo' | 'desfeito';

export type RecorrenciaLaco =
  | 'diaria'
  | 'dias-uteis'
  | 'semanal'
  | 'mensal'
  | 'intervalo-horas'
  | 'intervalo-dias';

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
  recorrencia: RecorrenciaLaco | null;
  intervaloRecorrencia: number;
  ocultoAte: string | null;
  chaveExterna: string | null;
  canalOrigem: string | null;
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
  recorrencia?: RecorrenciaLaco | null;
  intervaloRecorrencia?: number;
  chaveExterna?: string | null;
  canalOrigem?: string | null;
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
  recorrencia?: RecorrenciaLaco | null;
  intervaloRecorrencia?: number;
  ocultoAte?: string | null;
  chaveExterna?: string | null;
  canalOrigem?: string | null;
}

export const CORES_FITA: ReadonlyArray<{ id: CorFita; rotulo: string }> = [
  { id: 'carmim', rotulo: 'Carmim tradicional' },
  { id: 'ambar', rotulo: 'Âmbar solar' },
  { id: 'salvia', rotulo: 'Verde sálvia' },
  { id: 'ceu', rotulo: 'Azul céu' },
  { id: 'lavanda', rotulo: 'Lavanda suave' },
  { id: 'pessego', rotulo: 'Pêssego quente' },
];

export const OPCOES_RECORRENCIA: ReadonlyArray<{ id: RecorrenciaLaco; rotulo: string }> = [
  { id: 'diaria', rotulo: 'Todo dia' },
  { id: 'dias-uteis', rotulo: 'Seg a Sex' },
  { id: 'semanal', rotulo: 'Toda semana' },
  { id: 'mensal', rotulo: 'Todo mês' },
  { id: 'intervalo-horas', rotulo: 'A cada N horas' },
  { id: 'intervalo-dias', rotulo: 'A cada N dias' },
];

export function rotuloRecorrencia(
  recorrencia: RecorrenciaLaco | null | undefined,
  intervalo = 1
): string | null {
  if (!recorrencia) return null;
  switch (recorrencia) {
    case 'diaria':
      return 'Diário';
    case 'dias-uteis':
      return 'Dias úteis';
    case 'semanal':
      return 'Semanal';
    case 'mensal':
      return 'Mensal';
    case 'intervalo-horas':
      return `A cada ${Math.max(1, intervalo)}h`;
    case 'intervalo-dias':
      return `A cada ${Math.max(1, intervalo)}d`;
  }
}

export function lacoTemConteudoValido(input: NovoLacoInput): boolean {
  const temTitulo = Boolean(input.titulo && input.titulo.trim().length > 0);
  const temTexto = Boolean(input.texto && input.texto.trim().length > 0);
  const temItens = Boolean(
    input.itens && input.itens.some((item) => item.texto.trim().length > 0)
  );
  const temImagem = Boolean(input.imagemUrl && input.imagemUrl.trim().length > 0);
  return temTitulo || temTexto || temItens || temImagem;
}

/**
 * Calcula o proximo horario e ate quando o card permanece oculto apos ser desfeito hoje.
 * Para ciclos diarios/semanais/mensais, esconde hoje e reaparece no inicio do dia do proximo ciclo.
 */
export function calcularProximoCicloRecorrente(
  recorrencia: RecorrenciaLaco,
  intervalo = 1,
  lembrarEmAtual: string | null = null,
  referencia = new Date()
): { proximoLembrarEm: string; ocultoAte: string } {
  const passo = Math.max(1, Math.floor(intervalo || 1));
  const baseAtual = lembrarEmAtual ? new Date(lembrarEmAtual) : null;
  const baseValida =
    baseAtual && !Number.isNaN(baseAtual.getTime()) && baseAtual.getTime() > referencia.getTime()
      ? new Date(baseAtual.getTime())
      : new Date(referencia.getTime());

  // Preserva a hora/minuto original se havia lembrarEm configurado; senao usa 09:00 local
  if (recorrencia !== 'intervalo-horas') {
    if (baseAtual && !Number.isNaN(baseAtual.getTime())) {
      baseValida.setHours(baseAtual.getHours(), baseAtual.getMinutes(), 0, 0);
    } else {
      baseValida.setHours(9, 0, 0, 0);
    }
  }

  const proximo = new Date(baseValida.getTime());

  switch (recorrencia) {
    case 'diaria':
      proximo.setDate(proximo.getDate() + 1);
      break;
    case 'dias-uteis':
      do {
        proximo.setDate(proximo.getDate() + 1);
      } while (proximo.getDay() === 0 || proximo.getDay() === 6);
      break;
    case 'semanal':
      proximo.setDate(proximo.getDate() + 7);
      break;
    case 'mensal':
      proximo.setMonth(proximo.getMonth() + 1);
      break;
    case 'intervalo-dias':
      proximo.setDate(proximo.getDate() + passo);
      break;
    case 'intervalo-horas':
      proximo.setTime(referencia.getTime() + passo * 3_600_000);
      return {
        proximoLembrarEm: proximo.toISOString(),
        ocultoAte: proximo.toISOString(),
      };
  }

  // Garante que sempre cai no futuro em relacao a referencia
  while (proximo.getTime() <= referencia.getTime()) {
    proximo.setDate(proximo.getDate() + 1);
  }

  const inicioDiaProximo = new Date(proximo.getTime());
  inicioDiaProximo.setHours(0, 0, 0, 0);
  const oculto =
    inicioDiaProximo.getTime() > referencia.getTime() ? inicioDiaProximo : proximo;

  return {
    proximoLembrarEm: proximo.toISOString(),
    ocultoAte: oculto.toISOString(),
  };
}

export function lacoEstaOcultoAteProximoCiclo(laco: Laco, agoraMs = Date.now()): boolean {
  if (laco.estado !== 'ativo' || !laco.ocultoAte) return false;
  const alvo = new Date(laco.ocultoAte).getTime();
  return !Number.isNaN(alvo) && alvo > agoraMs;
}

/**
 * Retorna true quando um laco ativo vence hoje (ou esta atrasado de dias anteriores e visivel hoje).
 */
export function lacoVenceHoje(laco: Laco, referencia = new Date()): boolean {
  if (laco.estado !== 'ativo' || laco.deletedAt !== null || !laco.lembrarEm) return false;
  if (lacoEstaOcultoAteProximoCiclo(laco, referencia.getTime())) return false;

  const alvo = new Date(laco.lembrarEm);
  if (Number.isNaN(alvo.getTime())) return false;

  const fimDeHoje = new Date(referencia.getTime());
  fimDeHoje.setHours(23, 59, 59, 999);
  return alvo.getTime() <= fimDeHoje.getTime();
}
