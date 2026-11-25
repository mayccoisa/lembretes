import { useEffect, useState } from 'react';
import { acoesJanela } from '../services/lacosService';
import { corMudouOBastante, type Rgb } from '../theme/corAdaptativa';

/** Intervalo entre leituras da cor atras da bolinha. Le so 8 pixels, entao o custo e desprezivel. */
const INTERVALO_MS = 1200;

/**
 * Cor media do que esta atras da bolinha flutuante, lida pelo shell nativo.
 * Devolve null fora do Windows nativo ou quando a leitura falha: a bolinha usa o tom fixo das preferencias.
 */
export function useCorFundoWidget(ativo: boolean): Rgb | null {
  const [cor, setCor] = useState<Rgb | null>(null);

  useEffect(() => {
    if (!ativo || !acoesJanela.emTauri()) return;
    let cancelado = false;

    const ler = async () => {
      try {
        const lida = await acoesJanela.amostrarCorFundoWidget();
        if (cancelado || !lida) return;
        setCor((anterior) => (corMudouOBastante(anterior, lida) ? lida : anterior));
      } catch {
        // Sem leitura: mantem a ultima cor conhecida.
      }
    };

    void ler();
    const id = window.setInterval(() => void ler(), INTERVALO_MS);
    return () => {
      cancelado = true;
      window.clearInterval(id);
    };
  }, [ativo]);

  return cor;
}
