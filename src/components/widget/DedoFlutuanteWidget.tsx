import { useRef, useState, type PointerEvent } from 'react';
import { IconeLacinhoDiscreto } from '../arte/IconeLacinhoDiscreto';

interface DedoFlutuanteWidgetProps {
  modoJanelaNativa: boolean;
  totalAtivos: number;
  quantidadeVencidos: number;
  posicaoPreview?: { x: number; y: number };
  aoMoverPreview?: (x: number, y: number) => void;
  aoAbrirLembrancas: () => void;
  aoIniciarArrasteNativo: () => Promise<void>;
}

/**
 * Atalho flutuante discreto no Windows: apenas um lacinho leve e pequeno,
 * sem caixa de fundo nem poluicao visual, que flutua pela tela e abre as lembrancas ao clicar.
 */
export function DedoFlutuanteWidget({
  modoJanelaNativa,
  totalAtivos,
  quantidadeVencidos,
  posicaoPreview = { x: 24, y: 120 },
  aoMoverPreview,
  aoAbrirLembrancas,
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
      const maxX = Math.max(12, window.innerWidth - 52);
      const maxY = Math.max(12, window.innerHeight - 52);
      const novoX = Math.min(maxX, Math.max(8, ini.origX + dx));
      const novoY = Math.min(maxY, Math.max(8, ini.origY + dy));
      aoMoverPreview(novoX, novoY);
    }
  };

  const aoSoltar = () => {
    const eraArraste = virouArrasteRef.current;
    pontoInicialRef.current = null;
    virouArrasteRef.current = false;
    setArrastando(false);

    if (!eraArraste) {
      aoAbrirLembrancas();
    }
  };

  const temAlerta = quantidadeVencidos > 0;
  const dica =
    totalAtivos > 0
      ? `Lembretes (${totalAtivos} ativos) · Clique para abrir ou arraste`
      : 'Lembretes · Clique para abrir ou arraste';

  const lacinho = (
    <div
      onPointerDown={aoPressionar}
      onPointerMove={aoMover}
      onPointerUp={aoSoltar}
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
        filter: 'drop-shadow(0 2px 5px rgba(0, 0, 0, 0.22))',
      }}
      className={`group flex h-10 w-10 items-center justify-center rounded-full bg-transparent transition-all duration-200 select-none ${
        arrastando
          ? 'scale-110 opacity-100 cursor-grabbing'
          : 'opacity-75 hover:opacity-100 hover:scale-110 cursor-grab'
      }`}
    >
      <IconeLacinhoDiscreto
        tamanho={30}
        corFita={temAlerta ? 'ambar' : 'carmim'}
        animarFita
        alertaAtivo={temAlerta}
      />
    </div>
  );

  if (modoJanelaNativa) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-transparent overflow-hidden">
        {lacinho}
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
      {lacinho}
    </div>
  );
}
