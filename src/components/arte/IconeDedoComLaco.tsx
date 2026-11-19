import type { CorFita } from '../../contracts/laco';

interface IconeDedoComLacoProps {
  tamanho?: number;
  corFita?: CorFita;
  animarFita?: boolean;
  alertaAtivo?: boolean;
  className?: string;
}

/**
 * Ilustracao vetorial proprietaria do Lembretes:
 * um dedo indicador erguido com um lacinho amarrado na falange media.
 * Consome apenas variaveis semanticas de src/theme/tokens.css (T-21).
 */
export function IconeDedoComLaco({
  tamanho = 64,
  corFita = 'carmim',
  animarFita = false,
  alertaAtivo = false,
  className = '',
}: IconeDedoComLacoProps) {
  const corViva = `var(--fita-${corFita}-viva)`;
  const corNo = `var(--fita-${corFita}-no)`;

  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {alertaAtivo && (
        <circle
          cx="48"
          cy="48"
          r="42"
          fill="var(--brand-soft)"
          className="animar-pulso-lembrete"
        />
      )}

      {/* Corpo do dedo indicador */}
      <path
        d="M35 82V29C35 20.7157 40.8203 14 48 14C55.1797 14 61 20.7157 61 29V82C61 85.3137 58.3137 88 55 88H41C37.6863 88 35 85.3137 35 82Z"
        fill="var(--dedo-pele)"
        stroke="var(--dedo-contorno)"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />

      {/* Sombra lateral suave para dar volume tatil ao dedo */}
      <path
        d="M54 16.5C57.8 19.2 59.5 23.8 59.5 29V82C59.5 84.5 57.5 86.5 55 86.5H51.5C54 84 55 80 55 75V28C55 23.2 54.6 19.4 54 16.5Z"
        fill="var(--dedo-sombra)"
      />

      {/* Unha arredondada no topo */}
      <path
        d="M40.5 28C40.5 22.8 43.8579 19 48 19C52.1421 19 55.5 22.8 55.5 28V33.5C55.5 35.433 53.933 37 52 37H44C42.067 37 40.5 35.433 40.5 33.5V28Z"
        fill="var(--dedo-unha)"
        stroke="var(--dedo-contorno)"
        strokeWidth="1.8"
      />

      {/* Dobrinhas sutis da articulacao */}
      <path
        d="M41 67C45 68.4 51 68.4 55 67"
        stroke="var(--dedo-contorno)"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* Lacinho amarrado ao redor do dedo */}
      <g className={animarFita ? 'animar-balanco-fita' : ''}>
        {/* Volta da fita abracando o dedo */}
        <rect
          x="33"
          y="48"
          width="30"
          height="7.5"
          rx="3.5"
          fill={corViva}
          stroke={corNo}
          strokeWidth="1.8"
        />

        {/* Orelha esquerda do laco */}
        <path
          d="M45 51.5C36 41 18 42.5 18.5 52C19 61.5 36.5 59.5 45 52.5Z"
          fill={corViva}
          stroke={corNo}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M39 51.5C33.5 47.5 25.5 48.2 25.8 52C26 55.5 33.5 54.8 39 52"
          stroke="var(--bg-canvas)"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.55"
        />

        {/* Orelha direita do laco */}
        <path
          d="M51 51.5C60 41 78 42.5 77.5 52C77 61.5 59.5 59.5 51 52.5Z"
          fill={corViva}
          stroke={corNo}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M57 51.5C62.5 47.5 70.5 48.2 70.2 52C70 55.5 62.5 54.8 57 52"
          stroke="var(--bg-canvas)"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.55"
        />

        {/* Pontas soltas caindo abaixo do no */}
        <path
          d="M45.5 55L34 73L40.5 71.5L43 76.5L48 56"
          fill={corViva}
          stroke={corNo}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M50.5 55L62.5 73L56 71.5L53.5 76.5L48 56"
          fill={corViva}
          stroke={corNo}
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* No central gordinho */}
        <rect
          x="42.5"
          y="46.5"
          width="11"
          height="10.5"
          rx="4.5"
          fill={corNo}
          stroke="var(--dedo-contorno)"
          strokeWidth="1.6"
        />
        <path
          d="M45.5 49.5H50.5"
          stroke="var(--bg-canvas)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.45"
        />
      </g>
    </svg>
  );
}
