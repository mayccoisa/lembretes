/**
 * Bolinha Vidro: cores da bolinha flutuante derivadas da cor que esta atras dela na tela.
 * Fica um passo mais clara (fundo escuro) ou mais escura (fundo claro) que o fundo, com borda fina
 * e lacinho em contraste. Unico lugar com os valores dessa mistura (T-21).
 */

export type Rgb = readonly [number, number, number];

export interface CoresBolinhaVidro {
  fundo: string;
  borda: string;
  traco: string;
  insigniaHojeBg: string;
  insigniaHojeTexto: string;
  escuro: boolean;
}

const BRANCO: Rgb = [255, 255, 255];
const PRETO: Rgb = [0, 0, 0];

/** Abaixo desta luminancia relativa o fundo conta como escuro. */
const LIMIAR_ESCURO = 0.25;

function misturar(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function css(c: Rgb): string {
  return `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`;
}

export function luminancia(c: Rgb): number {
  const canal = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(c[0]) + 0.7152 * canal(c[1]) + 0.0722 * canal(c[2]);
}

export function coresBolinhaVidro(fundoTela: Rgb, sobre: boolean): CoresBolinhaVidro {
  const escuro = luminancia(fundoTela) < LIMIAR_ESCURO;
  const alvo = escuro ? BRANCO : PRETO;

  const fundo = misturar(fundoTela, alvo, escuro ? (sobre ? 0.2 : 0.12) : sobre ? 0.1 : 0.055);
  const borda = misturar(fundoTela, alvo, escuro ? 0.24 : 0.16);
  const traco = misturar(fundoTela, alvo, escuro ? 0.88 : 0.74);

  return {
    fundo: css(fundo),
    borda: css(borda),
    traco: css(traco),
    insigniaHojeBg: css(traco),
    insigniaHojeTexto: css(fundo),
    escuro,
  };
}

/** Diferenca minima entre duas leituras para valer a troca de cor (evita piscar com ruido). */
export function corMudouOBastante(a: Rgb | null, b: Rgb | null): boolean {
  if (!a || !b) return a !== b;
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > 18;
}
