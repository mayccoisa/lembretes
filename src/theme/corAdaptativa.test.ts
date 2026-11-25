import { describe, expect, it } from 'vitest';
import { coresBolinhaVidro, corMudouOBastante, luminancia } from './corAdaptativa';

describe('coresBolinhaVidro', () => {
  it('sobre tela escura clareia a bolinha e usa lacinho claro', () => {
    const cores = coresBolinhaVidro([30, 31, 36], false);
    expect(cores.escuro).toBe(true);
    expect(cores.fundo).toBe('rgb(57, 58, 62)');
    const traco = cores.traco.match(/\d+/g)!.map(Number);
    expect(luminancia([traco[0], traco[1], traco[2]])).toBeGreaterThan(0.6);
  });

  it('sobre tela clara escurece a bolinha e usa lacinho escuro', () => {
    const cores = coresBolinhaVidro([246, 244, 239], false);
    expect(cores.escuro).toBe(false);
    const traco = cores.traco.match(/\d+/g)!.map(Number);
    expect(luminancia([traco[0], traco[1], traco[2]])).toBeLessThan(0.1);
  });

  it('no hover o fundo se afasta mais da cor da tela', () => {
    const parado = coresBolinhaVidro([30, 31, 36], false).fundo;
    const sobre = coresBolinhaVidro([30, 31, 36], true).fundo;
    expect(sobre).not.toBe(parado);
  });
});

describe('corMudouOBastante', () => {
  it('ignora ruido pequeno e aceita troca real', () => {
    expect(corMudouOBastante([100, 100, 100], [103, 102, 101])).toBe(false);
    expect(corMudouOBastante([100, 100, 100], [30, 30, 30])).toBe(true);
    expect(corMudouOBastante(null, [30, 30, 30])).toBe(true);
  });
});
