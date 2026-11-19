import type { CorFita } from '../../contracts/laco';

interface IconeLacinhoDiscretoProps {
  tamanho?: number;
  corFita?: CorFita;
  animarFita?: boolean;
  alertaAtivo?: boolean;
  className?: string;
}

/**
 * Ilustracao vetorial minimalista, leve e delicada de apenas um lacinho de fita.
 * Traco fino e organico, sem fundo pesado e sem dedo, pensado para ficar super discreto.
 * Consome apenas variaveis semanticas de src/theme/tokens.css (T-21).
 */
export function IconeLacinhoDiscreto({
  tamanho = 28,
  corFita = 'carmim',
  animarFita = false,
  alertaAtivo = false,
  className = '',
}: IconeLacinhoDiscretoProps) {
  const corViva = `var(--fita-${corFita}-viva)`;
  const corNo = `var(--fita-${corFita}-no)`;

  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <g className={animarFita ? 'animar-balanco-fita' : ''}>
        {/* Orelha esquerda leve e vazada com preenchimento suave */}
        <path
          d="M22.5 22.5C17.2 14.2 6.5 14.8 7 22.2C7.4 29.2 17.5 27.6 22.5 23.2"
          fill={corViva}
          fillOpacity="0.18"
          stroke={corViva}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Orelha direita leve e vazada com preenchimento suave */}
        <path
          d="M25.5 22.5C30.8 14.2 41.5 14.8 41 22.2C40.6 29.2 30.5 27.6 25.5 23.2"
          fill={corViva}
          fillOpacity="0.18"
          stroke={corViva}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Fitas finas caindo suavemente */}
        <path
          d="M22.8 24.5C20.5 29.5 17.2 33.8 14.5 37.5"
          stroke={corViva}
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        <path
          d="M25.2 24.5C27.5 29.5 30.8 33.8 33.5 37.5"
          stroke={corViva}
          strokeWidth="1.9"
          strokeLinecap="round"
        />

        {/* No central pequeno e delicado */}
        <circle
          cx="24"
          cy="22.8"
          r="3.2"
          fill={corViva}
          stroke={corNo}
          strokeWidth="1.4"
        />
      </g>

      {/* Pontinho minimo apenas quando existe lembrete vencido */}
      {alertaAtivo && (
        <circle
          cx="37"
          cy="12"
          r="3.5"
          fill="var(--brand-primary)"
          className="animar-pulso-lembrete"
        />
      )}
    </svg>
  );
}
