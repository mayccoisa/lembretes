export const VERSAO_ATUAL_APP = '0.4.0';
export const REPOSITORIO_GITHUB = 'mayccoisa/lembretes';

export interface InfoAtualizacao {
  disponivel: boolean;
  versaoAtual: string;
  novaVersao: string | null;
  notas: string;
  downloadUrl: string | null;
  tamanhoBytes: number;
}

export interface ProgressoAtualizacao {
  etapa: 'baixando' | 'instalando' | 'reiniciando';
  percentual: number;
}

export interface NovidadesPosAtualizacao {
  versao: string;
  notas: string;
  instaladoEm: string;
}

export function extrairVersaoLimpa(tagOuVersao: string): string {
  return tagOuVersao.trim().replace(/^[vV]/, '').split('-')[0];
}

/**
 * Compara duas versoes semver (retorna 1 se a > b, -1 se a < b, 0 se iguais).
 */
export function compararSemver(a: string, b: string): number {
  const partesA = extrairVersaoLimpa(a)
    .split('.')
    .map((n) => Number.parseInt(n, 10) || 0);
  const partesB = extrairVersaoLimpa(b)
    .split('.')
    .map((n) => Number.parseInt(n, 10) || 0);

  const tamanho = Math.max(partesA.length, partesB.length, 3);
  for (let i = 0; i < tamanho; i++) {
    const va = partesA[i] ?? 0;
    const vb = partesB[i] ?? 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

/**
 * Converte o Markdown simples de uma GitHub Release em blocos legiveis para a modal de melhorias.
 */
export function parsearNotasRelease(markdown: string): Array<{ secao: string; itens: string[] }> {
  const linhas = markdown.split(/\r?\n/);
  const grupos: Array<{ secao: string; itens: string[] }> = [];
  let atual: { secao: string; itens: string[] } = { secao: 'Melhorias desta versão', itens: [] };

  for (const bruta of linhas) {
    const linha = bruta.trim();
    if (!linha) continue;

    if (linha.startsWith('### ') || linha.startsWith('## ')) {
      if (atual.itens.length > 0) {
        grupos.push(atual);
      }
      atual = {
        secao: linha.replace(/^#{2,3}\s+/, '').trim(),
        itens: [],
      };
      continue;
    }

    if (linha.startsWith('* ') || linha.startsWith('- ')) {
      atual.itens.push(linha.slice(2).replace(/\*\*/g, '').trim());
    } else if (!linha.startsWith('#')) {
      atual.itens.push(linha.replace(/\*\*/g, '').trim());
    }
  }

  if (atual.itens.length > 0) {
    grupos.push(atual);
  }

  if (grupos.length === 0) {
    return [
      {
        secao: 'Melhorias desta versão',
        itens: ['Melhorias de estabilidade, desempenho e acabamento visual.'],
      },
    ];
  }

  return grupos;
}
