import { useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import type { TomBotaoAtalho } from '../../hooks/usePreferencias';
import { IconeLacinhoDiscreto } from '../arte/IconeLacinhoDiscreto';

interface DedoFlutuanteWidgetProps {
  modoJanelaNativa: boolean;
  tom: TomBotaoAtalho;
  totalAtivos: number;
  quantidadeVencidos: number;
  posicaoPreview?: { x: number; y: number };
  aoMoverPreview?: (x: number, y: number) => void;
  aoAbrirLembrancas: () => void;
  aoMenuContexto?: () => void;
  aoIniciarArrasteNativo: () => Promise<void>;
}

/**
 * Botao circular minimalista monoline (38x38px):
 * circulo suave plano com lacinho geometrico de linha fina no centro.
 * Clique esquerdo abre/recolhe as lembrancas; arrastar move; clique direito abre opcoes (enviar para barra).
 */
export function DedoFlutuanteWidget({
  modoJanelaNativa,
  tom,
  totalAtivos,
  quantidadeVencidos,
  posicaoPreview = { x: 24, y: 120 },
  aoMoverPreview,
  aoAbrirLembrancas,
  aoMenuContexto,
  aoIniciarArrasteNativo,
}: DedoFlutuanteWidgetProps) {
  const [arrastando, setArrastando] = useState(false);
  const pontoInicialRef = useRef<{
    clientX: number;
    clientY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const virouArrasteRef = useRef(false);

  const aoPressionar = (ev: PointerEvent<HTMLDivElement>) => {
    if (ev.button !== 0) return;
    virouArrasteRef.current = false;
    pontoInicialRef.current = {
      clientX: ev.clientX,
      clientY: ev.clientY,
      origX: posicaoPreview.x,
      origY: posicaoPreview.y,
    };
    if (!modoJanelaNativa) {
      ev.currentTarget.setPointerCapture(ev.pointerId);
    }
  };

  const aoMover = (ev: PointerEvent<HTMLDivElement>) => {
    const ini = pontoInicialRef.current;
    if (!ini) return;

    const dx = ev.clientX - ini.clientX;
    const dy = ev.clientY - ini.clientY;
    const distancia = Math.hypot(dx, dy);

    if (distancia > 4 && !virouArrasteRef.current) {
      virouArrasteRef.current = true;
      setArrastando(true);
      if (modoJanelaNativa) {
        pontoInicialRef.current = null;
        void aoIniciarArrasteNativo().finally(() => setArrastando(false));
        return;
      }
    }

    if (virouArrasteRef.current && !modoJanelaNativa && aoMoverPreview) {
      const maxX = Math.max(12, window.innerWidth - 48);
      const maxY = Math.max(12, window.innerHeight - 48);
      const novoX = Math.min(maxX, Math.max(8, ini.origX + dx));
      const novoY = Math.min(maxY, Math.max(8, ini.origY + dy));
      aoMoverPreview(novoX, novoY);
    }
  };

  const aoSoltar = (ev: PointerEvent<HTMLDivElement>) => {
    if (ev.button !== 0) return;
    const eraArraste = virouArrasteRef.current;
    pontoInicialRef.current = null;
    virouArrasteRef.current = false;
    setArrastando(false);

    if (!eraArraste) {
      aoAbrirLembrancas();
    }
  };

  const aoClicarDireito = (ev: MouseEvent<HTMLDivElement>) => {
    ev.preventDefault();
    if (aoMenuContexto) {
      aoMenuContexto();
    }
  };

  const temAlerta = quantidadeVencidos > 0;
  const dica =
    totalAtivos > 0
      ? `Lembretes (${totalAtivos} ativos) · Clique para abrir, arraste ou clique com o direito`
      : 'Lembretes · Clique para abrir, arraste ou clique com o direito';

  const circulo = (
    <div
      onPointerDown={aoPressionar}
      onPointerMove={aoMover}
      onPointerUp={aoSoltar}
      onContextMenu={aoClicarDireito}
      role="button"
      tabIndex={0}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          aoAbrirLembrancas();
        }
      }}
      aria-label={dica}
      title={dica}
      style={{
        backgroundColor: `var(--atalho-${tom}-bg)`,
      }}
      className={`flex h-9.5 w-9.5 items-center justify-center rounded-full transition-all duration-150 select-none ${
        arrastando
          ? 'scale-105 opacity-100 cursor-grabbing'
          : 'opacity-90 hover:opacity-100 hover:scale-105 cursor-grab'
      }`}
    >
      <IconeLacinhoDiscreto
        tamanho={18}
        corTracoCss={`var(--atalho-${tom}-traco)`}
        alertaAtivo={temAlerta}
      />
    </div>
  );

  if (modoJanelaNativa) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-transparent overflow-hidden">
        {circulo}
      </div>
    );
  }

  return (
    <div
      style={{
        left: `${posicaoPreview.x}px`,
        top: `${posicaoPreview.y}px`,
      }}
      className="fixed z-40"
    >
      {circulo}
    </div>
  );
}
