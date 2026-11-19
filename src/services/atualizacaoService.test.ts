import { describe, expect, it } from 'vitest';
import { compararSemver, parsearNotasRelease } from '../contracts/atualizacao';
import { avaliarPayloadReleaseGithub } from './atualizacaoService';

describe('atualizacaoService · comparacao de versao e notas de melhorias', () => {
  it('compara versoes semver com e sem prefixo v', () => {
    expect(compararSemver('v0.3.0', '0.2.0')).toBe(1);
    expect(compararSemver('0.2.1', '0.2.0')).toBe(1);
    expect(compararSemver('v0.2.0', '0.2.0')).toBe(0);
    expect(compararSemver('0.1.9', '0.2.0')).toBe(-1);
    expect(compararSemver('0.10.0', '0.2.0')).toBe(1);
  });

  it('identifica nova release disponivel quando tag e maior e possui asset .exe', () => {
    const info = avaliarPayloadReleaseGithub(
      {
        tag_name: 'v0.3.0',
        body: '### Adicionado\n* Novo filtro por cor',
        assets: [
          {
            name: 'lembretes.exe',
            browser_download_url:
              'https://github.com/mayccoisa/lembretes/releases/download/v0.3.0/lembretes.exe',
            size: 17100000,
          },
        ],
      },
      '0.2.0'
    );

    expect(info.disponivel).toBe(true);
    expect(info.novaVersao).toBe('0.3.0');
    expect(info.downloadUrl).toContain('lembretes.exe');
  });

  it('retorna indisponivel quando ja esta na mesma versao', () => {
    const info = avaliarPayloadReleaseGithub(
      {
        tag_name: 'v0.2.0',
        body: 'Mesma versao',
        assets: [
          {
            name: 'lembretes.exe',
            browser_download_url: 'https://example.com/lembretes.exe',
            size: 17100000,
          },
        ],
      },
      '0.2.0'
    );

    expect(info.disponivel).toBe(false);
    expect(info.novaVersao).toBeNull();
  });

  it('organiza markdown de release em secoes legiveis para a modal de melhorias', () => {
    const secoes = parsearNotasRelease('### Adicionado\n* **Auto-update** rapido\n### Corrigido\n* Ajuste de foco');
    expect(secoes).toHaveLength(2);
    expect(secoes[0].secao).toBe('Adicionado');
    expect(secoes[0].itens[0]).toBe('Auto-update rapido');
    expect(secoes[1].secao).toBe('Corrigido');
  });
});
