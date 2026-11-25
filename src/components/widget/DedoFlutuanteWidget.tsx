import { useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import type { TomBotaoAtalho } from '../../hooks/usePreferencias';
import { IconeLacinhoDiscreto } from '../arte/IconeLacinhoDiscreto';
import { coresBolinhaVidro, type Rgb } from '../../theme/corAdaptativa';

interface DedoFlutuanteWidgetProps {
  modoJanelaNativa: boolean;
  tom: TomBotaoAtalho;
  totalAtivos: number;
  /** Lacos de hoje somados aos vencidos, sem duplicata: e o numero da insignia. */
  quantidadePendentes: number;
  /** Quantos ja passaram do horario: pinta a insignia de vermelho. */
  quantidadeVencidos: number;
  posicaoPreview?: { x: number; y: number };
  aoMoverPreview?: (x: number, y: number) => void;
  aoAbrirLembrancas: () => void;
  aoMenuContexto?: () => void;
  aoIniciarArrasteNativo: () => Promise<void>;
  /** Cor lida atras da bolinha (Windows nativo). Com ela a bolinha vira Vidro; sem ela usa o tom fixo. */
  corFundoTela?: Rgb | null;
}

/**
 * Bolinha flutuante de 40px com o lacinho monoline no centro, no estilo Vidro:
 * com a cor lida atras dela, fica um passo mais clara ou mais escura que a tela e o lacinho contrasta.
 * Borda fina no lugar de sombra, para ler em qualquer papel de parede sem halo.
 * Estado por fundo: hover escurece, clique aperta, arraste cresce um pouco.
 * Insignia numerica no canto: vermelha quando ha laco vencido, neutra quando so ha laco do dia.
 * Clique esquerdo abre ou recolhe o mural; arrastar move; clique direito abre as opcoes.
 */
export function DedoFlutuanteWidget({
  modoJanelaNativa,
  tom,
  totalAtivos,
  quantidadePendentes,
  quantidadeVencidos,
  posicaoPreview = { x: 24, y: 120 },
  aoMoverPreview,
  aoAbrirLembrancas,
  aoMenuContexto,
  aoIniciarArrasteNativo,
  corFundoTela = null,
}: DedoFlutuanteWidgetProps) {
  const [arrastando, setArrastando] = useState(false);
  const [pressionado, setPressionado] = useState(false);
  const [sobre, setSobre] = useState(false);
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
    setPressionado(true);
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
      setPressionado(false);
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

  const aoSoltar = (ev: PointerEvent<HTMLDivElement>) => {
    if (ev.button !== 0) return;
    const eraArraste = virouArrasteRef.current;
    pontoInicialRef.current = null;
    virouArrasteRef.current = false;
    setArrastando(false);
    setPressionado(false);

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

  const temVencido = quantidadeVencidos > 0;
  const temPendente = quantidadePendentes > 0;
  const textoInsignia = quantidadePendentes > 9 ? '9+' : String(quantidadePendentes);

  const partesDica = [`Lembretes · ${totalAtivos} ${totalAtivos === 1 ? 'ativo' : 'ativos'}`];
  if (temVencido) {
    partesDica.push(`${quantidadeVencidos} ${quantidadeVencidos === 1 ? 'vencido' : 'vencidos'}`);
  } else if (temPendente) {
    partesDica.push(`${quantidadePendentes} para hoje`);
  }
  const dica = `${partesDica.join(' · ')}. Clique para abrir, arraste para mover, botão direito para opções`;

  const vidro = corFundoTela ? coresBolinhaVidro(corFundoTela, sobre || arrastando) : null;
  const fundo = vidro
    ? vidro.fundo
    : sobre || arrastando
      ? `var(--atalho-${tom}-bg-hover)`
      : `var(--atalho-${tom}-bg)`;
  const borda = vidro ? vidro.borda : `var(--atalho-${tom}-borda)`;
  const traco = vidro ? vidro.traco : `var(--atalho-${tom}-traco)`;
  const insigniaHojeBg = vidro ? vidro.insigniaHojeBg : 'var(--atalho-insignia-hoje-bg)';
  const insigniaHojeTexto = vidro ? vidro.insigniaHojeTexto : 'var(--atalho-insignia-hoje-texto)';
  const foco = vidro ? vidro.traco : 'var(--atalho-foco)';
  const escala = arrastando ? 'scale-105' : pressionado ? 'scale-95' : 'scale-100';

  const circulo = (
    <div className="relative h-10 w-10">
      <div
        onPointerDown={aoPressionar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerEnter={() => setSobre(true)}
        onPointerLeave={() => {
          setSobre(false);
          setPressionado(false);
        }}
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
          backgroundColor: fundo,
          borderColor: borda,
          outlineColor: foco,
        }}
        className={`flex h-10 w-10 items-center justify-center rounded-full border select-none transition-[transform,background-color,border-color] duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 ${escala} ${
          arrastando ? 'cursor-grabbing' : 'cursor-pointer'
        }`}
      >
        <IconeLacinhoDiscreto tamanho={20} corTracoCss={traco} />
      </div>

      {temPendente && (
        <span
          aria-hidden="true"
          style={{
            backgroundColor: temVencido
              ? 'var(--atalho-insignia-alerta-bg)'
              : insigniaHojeBg,
            color: temVencido
              ? 'var(--atalho-insignia-alerta-texto)'
              : insigniaHojeTexto,
          }}
          className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold tabular-nums"
        >
          {textoInsignia}
        </span>
      )}
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
