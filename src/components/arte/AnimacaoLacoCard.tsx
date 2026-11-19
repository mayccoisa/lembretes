import { useRef, useState, type PointerEvent } from 'react';
import type { CorFita } from '../../contracts/laco';

interface AnimacaoLacoCardProps {
  corFita: CorFita;
  aoDesatarCompleto: () => void;
  desabilitado?: boolean;
}

const DURACAO_DESATE_MS = 640;

const PARTICULAS = [
  { angulo: -145, dist: 24 },
  { angulo: -110, dist: 27 },
  { angulo: -70, dist: 25 },
  { angulo: -35, dist: 23 },
  { angulo: 25, dist: 22 },
  { angulo: 65, dist: 25 },
  { angulo: 115, dist: 23 },
  { angulo: 155, dist: 21 },
];

/**
 * A cereja do bolo com traco leve e delicado:
 * clique ou puxe a fita do lacinho no canto do card para ver o no se desfazer!
 */
export function AnimacaoLacoCard({
  corFita,
  aoDesatarCompleto,
  desabilitado = false,
}: AnimacaoLacoCardProps) {
  const [puxao, setPuxao] = useState(0);
  const [progressoDesate, setProgressoDesate] = useState<number | null>(null);
  const inicioYRef = useRef<number | null>(null);
  const moveuRef = useRef(false);
  const animandoRef = useRef(false);

  const corViva = `var(--fita-${corFita}-viva)`;
  const corNo = `var(--fita-${corFita}-no)`;

  const dispararAnimacaoDesate = () => {
    if (animandoRef.current || desabilitado) return;
    animandoRef.current = true;
    setPuxao(0);

    const inicio = performance.now();
    const passo = (agora: number) => {
      const decorrido = agora - inicio;
      const t = Math.min(1, decorrido / DURACAO_DESATE_MS);
      setProgressoDesate(t);
      if (t < 1) {
        requestAnimationFrame(passo);
      } else {
        animandoRef.current = false;
        aoDesatarCompleto();
      }
    };
    requestAnimationFrame(passo);
  };

  const aoPressionar = (ev: PointerEvent<HTMLButtonElement>) => {
    ev.stopPropagation();
    if (animandoRef.current || desabilitado) return;
    inicioYRef.current = ev.clientY;
    moveuRef.current = false;
    ev.currentTarget.setPointerCapture(ev.pointerId);
  };

  const aoMover = (ev: PointerEvent<HTMLButtonElement>) => {
    if (inicioYRef.current === null || animandoRef.current) return;
    const deltaY = Math.max(0, ev.clientY - inicioYRef.current);
    if (deltaY > 4) moveuRef.current = true;
    const normalizado = Math.min(1, deltaY / 32);
    setPuxao(normalizado);
    if (deltaY >= 30) {
      inicioYRef.current = null;
      dispararAnimacaoDesate();
    }
  };

  const aoSoltar = (ev: PointerEvent<HTMLButtonElement>) => {
    ev.stopPropagation();
    if (animandoRef.current) return;
    const clicouDireto = !moveuRef.current || puxao > 0.55;
    inicioYRef.current = null;
    setPuxao(0);
    if (clicouDireto) {
      dispararAnimacaoDesate();
    }
  };

  const t = progressoDesate ?? 0;
  const emDesate = progressoDesate !== null;

  const escalaOrelhas = emDesate
    ? Math.max(0, 1 - t / 0.36)
    : Math.max(0.45, 1 - puxao * 0.45);
  const alongamentoPonta = emDesate ? Math.min(12, t * 32) : puxao * 12;

  const tOnda = emDesate ? Math.max(0, Math.min(1, (t - 0.3) / 0.7)) : 0;
  const opacidadeNo = emDesate ? Math.max(0, 1 - Math.max(0, (t - 0.28) / 0.25)) : 1;
  const tParticulas = emDesate ? Math.max(0, Math.min(1, (t - 0.26) / 0.62)) : 0;

  return (
    <button
      type="button"
      onClick={(ev) => ev.stopPropagation()}
      onPointerDown={aoPressionar}
      onPointerMove={aoMover}
      onPointerUp={aoSoltar}
      onPointerCancel={() => {
        inicioYRef.current = null;
        setPuxao(0);
      }}
      disabled={desabilitado}
      aria-label="Desfazer este laço e marcar como concluído"
      title="Clique ou puxe a pontinha para desfazer o laço!"
      className="group relative inline-flex h-9 w-12 items-center justify-center rounded-xl transition-transform hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-brand"
    >
      <svg
        width="46"
        height="36"
        viewBox="0 0 60 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        {/* Onda leve da fita solta quando o no abre */}
        {emDesate && t > 0.28 && (
          <path
            d={`M ${6 + tOnda * 14} 20 C ${18 + tOnda * 10} ${8 + tOnda * 10}, ${34 + tOnda * 10} ${32 - tOnda * 10}, ${54 + tOnda * 12} ${18 + tOnda * 6}`}
            stroke={corViva}
            strokeWidth={Math.max(1.2, 3.2 * (1 - tOnda * 0.6))}
            strokeLinecap="round"
            strokeDasharray="74"
            strokeDashoffset={tOnda * 56}
            opacity={Math.max(0, 1 - tOnda * 0.85)}
          />
        )}

        {/* Particulas sutis na cor da fita */}
        {emDesate &&
          tParticulas > 0 &&
          tParticulas < 1 &&
          PARTICULAS.map((p, idx) => {
            const rad = (p.angulo * Math.PI) / 180;
            const raioAtual = p.dist * (0.25 + tParticulas * 0.95);
            const cx = 30 + Math.cos(rad) * raioAtual;
            const cy = 19 + Math.sin(rad) * raioAtual;
            return (
              <circle
                key={idx}
                cx={cx}
                cy={cy}
                r={Math.max(0.6, 2.3 * (1 - tParticulas))}
                fill={idx % 2 === 0 ? corViva : corNo}
                opacity={1 - tParticulas}
              />
            );
          })}

        {/* Orelhas leves do lacinho */}
        {escalaOrelhas > 0.02 && (
          <g
            style={{
              transform: `translate(30px, 19px) scale(${escalaOrelhas}) translate(-30px, -19px)`,
              transformOrigin: '30px 19px',
            }}
          >
            <path
              d="M28 18.8C21.5 10.5 10.5 11.2 11 18.6C11.5 25.8 21.8 24.2 28 19.6"
              fill={corViva}
              fillOpacity="0.2"
              stroke={corViva}
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M32 18.8C38.5 10.5 49.5 11.2 49 18.6C48.5 25.8 38.2 24.2 32 19.6"
              fill={corViva}
              fillOpacity="0.2"
              stroke={corViva}
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* Fitas soltas finas e no central */}
        {opacidadeNo > 0.05 && (
          <g opacity={opacidadeNo}>
            <path
              d="M28.5 21C26 26.2 22.8 30.8 19.8 34.5"
              stroke={corViva}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d={`M31.5 21 C ${34 + alongamentoPonta * 0.15} ${26.2 + alongamentoPonta * 0.55}, ${37.2 + alongamentoPonta * 0.25} ${30.8 + alongamentoPonta * 0.8}, ${40.2 + alongamentoPonta * 0.3} ${34.5 + alongamentoPonta}`}
              stroke={corViva}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle
              cx="30"
              cy="19.2"
              r="3"
              fill={corViva}
              stroke={corNo}
              strokeWidth="1.3"
            />
          </g>
        )}
      </svg>
    </button>
  );
}
