import type { AtualizarLacoInput, Laco, NovoLacoInput } from '../contracts/laco';

const CHAVE_STORAGE = 'lembretes:lacos:v1';

function gerarId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `laco-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
    {
      id: gerarId(),
      titulo: 'Bem-vindo ao Lembretes!',
      modo: 'texto',
      texto:
        'Cada nota aqui é um laço amarrado para você não esquecer. Experimente clicar ou puxar a pontinha do laço ali em cima para ver ele se desfazendo!',
      itens: [],
      corFita: 'carmim',
      imagemUrl: criarIlustracaoExemploSvg(),
      imagemNome: 'exemplo-laco.svg',
      fixado: true,
      lembrarEm: null,
      notificadoEm: null,
      estado: 'ativo',
      desfeitoEm: null,
      createdAt: agora,
      updatedAt: agora,
      deletedAt: null,
      syncVersion: 1,
    },
    {
      id: gerarId(),
      titulo: 'Antes de sair de casa',
      modo: 'checklist',
      texto: '',
      itens: [
        { id: gerarId(), texto: 'Separar documento e carteira', concluido: true },
        { id: gerarId(), texto: 'Passar no correio com o pacote', concluido: false },
        { id: gerarId(), texto: 'Comprar café em grãos', concluido: false },
      ],
      corFita: 'ambar',
      imagemUrl: null,
      imagemNome: null,
      fixado: false,
      lembrarEm: null,
      notificadoEm: null,
      estado: 'ativo',
      desfeitoEm: null,
      createdAt: agora,
      updatedAt: agora,
      deletedAt: null,
      syncVersion: 1,
    },
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
    const parsed = JSON.parse(bruto) as Laco[];
    return Array.isArray(parsed) ? parsed : [];
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
    estado: 'ativo',
    desfeitoEm: null,
    createdAt: agora,
    updatedAt: agora,
    deletedAt: null,
    syncVersion: 1,
  };
  const todos = lerBancoLocal();
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
  const agora = new Date().toISOString();
  const atualizado: Laco = {
    ...todos[indice],
    estado: 'desfeito',
    desfeitoEm: agora,
    updatedAt: agora,
    syncVersion: todos[indice].syncVersion + 1,
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
