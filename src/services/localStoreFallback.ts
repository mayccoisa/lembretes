import {
  calcularProximoCicloRecorrente,
  type AtualizarLacoInput,
  type Laco,
  type NovoLacoInput,
} from '../contracts/laco';

const CHAVE_STORAGE = 'lembretes:lacos:v1';

function gerarId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `laco-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizarLacoLegado(parcial: Partial<Laco> & { id: string }): Laco {
  const agora = new Date().toISOString();
  return {
    id: parcial.id,
    titulo: parcial.titulo ?? '',
    modo: parcial.modo ?? 'texto',
    texto: parcial.texto ?? '',
    itens: parcial.itens ?? [],
    corFita: parcial.corFita ?? 'carmim',
    imagemUrl: parcial.imagemUrl ?? null,
    imagemNome: parcial.imagemNome ?? null,
    fixado: Boolean(parcial.fixado),
    lembrarEm: parcial.lembrarEm ?? null,
    notificadoEm: parcial.notificadoEm ?? null,
    recorrencia: parcial.recorrencia ?? null,
    intervaloRecorrencia: parcial.intervaloRecorrencia ?? 1,
    ocultoAte: parcial.ocultoAte ?? null,
    chaveExterna: parcial.chaveExterna ?? null,
    canalOrigem: parcial.canalOrigem ?? null,
    estado: parcial.estado ?? 'ativo',
    desfeitoEm: parcial.desfeitoEm ?? null,
    createdAt: parcial.createdAt ?? agora,
    updatedAt: parcial.updatedAt ?? agora,
    deletedAt: parcial.deletedAt ?? null,
    syncVersion: parcial.syncVersion ?? 1,
  };
}

function criarIlustracaoExemploSvg(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="240" viewBox="0 0 480 240">
    <rect width="480" height="240" rx="16" fill="hsl(32, 75%, 94%)"/>
    <circle cx="96" cy="120" r="46" fill="hsl(352, 78%, 90%)"/>
    <path d="M74 122 C74 102, 118 102, 118 122 C118 138, 74 138, 74 122 Z" fill="none" stroke="hsl(350, 74%, 52%)" stroke-width="6"/>
    <circle cx="96" cy="122" r="7" fill="hsl(350, 76%, 42%)"/>
    <text x="166" y="106" font-family="Segoe UI, sans-serif" font-size="20" font-weight="700" fill="hsl(24, 24%, 18%)">Print ou foto rápida</text>
    <text x="166" y="136" font-family="Segoe UI, sans-serif" font-size="14" fill="hsl(26, 14%, 40%)">Cole com Ctrl+V direto no criador de laços</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function semearExemplosIniciais(): Laco[] {
  const agora = new Date().toISOString();
  return [
    normalizarLacoLegado({
      id: gerarId(),
      titulo: 'Bem-vindo ao Lembretes!',
      modo: 'texto',
      texto:
        'Cada nota aqui é um laço amarrado para você não esquecer. Experimente clicar ou puxar a pontinha do laço ali em cima para ver ele se desfazendo!',
      corFita: 'carmim',
      imagemUrl: criarIlustracaoExemploSvg(),
      imagemNome: 'exemplo-laco.svg',
      fixado: true,
      createdAt: agora,
      updatedAt: agora,
    }),
  ];
}

function lerBancoLocal(): Laco[] {
  if (typeof localStorage === 'undefined') return [];
  const bruto = localStorage.getItem(CHAVE_STORAGE);
  if (!bruto) {
    const iniciais = semearExemplosIniciais();
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(iniciais));
    return iniciais;
  }
  try {
    const parsed = JSON.parse(bruto) as Array<Partial<Laco> & { id: string }>;
    return Array.isArray(parsed) ? parsed.map(normalizarLacoLegado) : [];
  } catch {
    return [];
  }
}

function gravarBancoLocal(lacos: Laco[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(CHAVE_STORAGE, JSON.stringify(lacos));
}

export function fallbackResetarParaTeste(vazio = true): void {
  if (typeof localStorage === 'undefined') return;
  if (vazio) {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify([]));
  } else {
    localStorage.removeItem(CHAVE_STORAGE);
  }
}

export function fallbackListarLacos(): Laco[] {
  return lerBancoLocal().filter((l) => l.deletedAt === null);
}

export function fallbackCriarLaco(input: NovoLacoInput): Laco {
  const todos = lerBancoLocal();
  const chave = input.chaveExterna?.trim() || null;

  if (chave) {
    const existente = todos.find(
      (l) => l.chaveExterna === chave && l.deletedAt === null && l.estado === 'ativo'
    );
    if (existente) {
      return fallbackAtualizarLaco({
        id: existente.id,
        titulo: input.titulo,
        modo: input.modo,
        texto: input.texto,
        itens: input.itens,
        corFita: input.corFita,
        imagemUrl: input.imagemUrl,
        imagemNome: input.imagemNome,
        fixado: input.fixado,
        lembrarEm: input.lembrarEm,
        recorrencia: input.recorrencia,
        intervaloRecorrencia: input.intervaloRecorrencia,
        canalOrigem: input.canalOrigem,
      });
    }
  }

  const agora = new Date().toISOString();
  const laco: Laco = {
    id: gerarId(),
    titulo: (input.titulo ?? '').trim(),
    modo: input.modo ?? 'texto',
    texto: input.texto ?? '',
    itens: (input.itens ?? []).filter((item) => item.texto.trim().length > 0),
    corFita: input.corFita ?? 'carmim',
    imagemUrl: input.imagemUrl ?? null,
    imagemNome: input.imagemNome ?? null,
    fixado: Boolean(input.fixado),
    lembrarEm: input.lembrarEm ?? null,
    notificadoEm: null,
    recorrencia: input.recorrencia ?? null,
    intervaloRecorrencia: Math.max(1, input.intervaloRecorrencia ?? 1),
    ocultoAte: null,
    chaveExterna: chave,
    canalOrigem: input.canalOrigem?.trim() || null,
    estado: 'ativo',
    desfeitoEm: null,
    createdAt: agora,
    updatedAt: agora,
    deletedAt: null,
    syncVersion: 1,
  };
  gravarBancoLocal([laco, ...todos]);
  return laco;
}

export function fallbackAtualizarLaco(input: AtualizarLacoInput): Laco {
  const todos = lerBancoLocal();
  const indice = todos.findIndex((l) => l.id === input.id && l.deletedAt === null);
  if (indice < 0) {
    throw new Error(`Laco nao encontrado: ${input.id}`);
  }
  const atual = todos[indice];
  const atualizado: Laco = {
    ...atual,
    titulo: input.titulo !== undefined ? input.titulo.trim() : atual.titulo,
    modo: input.modo ?? atual.modo,
    texto: input.texto !== undefined ? input.texto : atual.texto,
    itens: input.itens !== undefined ? input.itens : atual.itens,
    corFita: input.corFita ?? atual.corFita,
    imagemUrl: input.imagemUrl !== undefined ? input.imagemUrl : atual.imagemUrl,
    imagemNome: input.imagemNome !== undefined ? input.imagemNome : atual.imagemNome,
    fixado: input.fixado !== undefined ? input.fixado : atual.fixado,
    lembrarEm: input.lembrarEm !== undefined ? input.lembrarEm : atual.lembrarEm,
    notificadoEm:
      input.lembrarEm !== undefined && input.lembrarEm !== atual.lembrarEm
        ? null
        : input.notificadoEm !== undefined
          ? input.notificadoEm
          : atual.notificadoEm,
    recorrencia: input.recorrencia !== undefined ? input.recorrencia : atual.recorrencia,
    intervaloRecorrencia:
      input.intervaloRecorrencia !== undefined
        ? Math.max(1, input.intervaloRecorrencia)
        : atual.intervaloRecorrencia,
    ocultoAte: input.ocultoAte !== undefined ? input.ocultoAte : atual.ocultoAte,
    chaveExterna: input.chaveExterna !== undefined ? input.chaveExterna : atual.chaveExterna,
    canalOrigem: input.canalOrigem !== undefined ? input.canalOrigem : atual.canalOrigem,
    updatedAt: new Date().toISOString(),
    syncVersion: atual.syncVersion + 1,
  };
  todos[indice] = atualizado;
  gravarBancoLocal(todos);
  return atualizado;
}

export function fallbackDesfazerLaco(id: string): Laco {
  const todos = lerBancoLocal();
  const indice = todos.findIndex((l) => l.id === id && l.deletedAt === null);
  if (indice < 0) {
    throw new Error(`Laco nao encontrado: ${id}`);
  }
  const atual = todos[indice];
  const agora = new Date();
  const agoraIso = agora.toISOString();

  // Opcao recomendada: se for recorrente, reagenda e esconde ate o proximo ciclo!
  if (atual.recorrencia) {
    const ciclo = calcularProximoCicloRecorrente(
      atual.recorrencia,
      atual.intervaloRecorrencia,
      atual.lembrarEm,
      agora
    );
    const itensResetados = atual.itens.map((it) => ({ ...it, concluido: false }));
    const reagendado: Laco = {
      ...atual,
      itens: itensResetados,
      lembrarEm: ciclo.proximoLembrarEm,
      ocultoAte: ciclo.ocultoAte,
      notificadoEm: null,
      estado: 'ativo',
      desfeitoEm: agoraIso,
      updatedAt: agoraIso,
      syncVersion: atual.syncVersion + 1,
    };
    todos[indice] = reagendado;
    gravarBancoLocal(todos);
    return reagendado;
  }

  const atualizado: Laco = {
    ...atual,
    estado: 'desfeito',
    desfeitoEm: agoraIso,
    updatedAt: agoraIso,
    syncVersion: atual.syncVersion + 1,
  };
  todos[indice] = atualizado;
  gravarBancoLocal(todos);
  return atualizado;
}

export function fallbackReamarrarLaco(id: string): Laco {
  const todos = lerBancoLocal();
  const indice = todos.findIndex((l) => l.id === id && l.deletedAt === null);
  if (indice < 0) {
    throw new Error(`Laco nao encontrado: ${id}`);
  }
  const agora = new Date().toISOString();
  const atualizado: Laco = {
    ...todos[indice],
    estado: 'ativo',
    ocultoAte: null,
    desfeitoEm: null,
    updatedAt: agora,
    syncVersion: todos[indice].syncVersion + 1,
  };
  todos[indice] = atualizado;
  gravarBancoLocal(todos);
  return atualizado;
}

export function fallbackExcluirLaco(id: string): void {
  const todos = lerBancoLocal();
  const agora = new Date().toISOString();
  const proximo = todos.map((l) =>
    l.id === id
      ? {
          ...l,
          deletedAt: agora,
          updatedAt: agora,
          syncVersion: l.syncVersion + 1,
        }
      : l
  );
  gravarBancoLocal(proximo);
}
