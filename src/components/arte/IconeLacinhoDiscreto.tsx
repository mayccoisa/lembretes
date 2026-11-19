import type { CorFita } from '../../contracts/laco';

interface IconeLacinhoDiscretoProps {
  tamanho?: number;
  corFita?: CorFita;
  corTracoCss?: string;
  alertaAtivo?: boolean;
  className?: string;
}

/**
 * Icone monoline geometrico fino (traco 1.4px sem preenchimento),
 * no mesmo peso visual dos botoes circulares de sistema da referencia.
 * Consome apenas variaveis semanticas de src/theme/tokens.css (T-21).
 */
export function IconeLacinhoDiscreto({
  tamanho = 18,
  corFita = 'carmim',
  corTracoCss,
  alertaAtivo = false,
  className = '',
}: IconeLacinhoDiscretoProps) {
  const traco = corTracoCss ?? `var(--fita-${corFita}-viva)`;

  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Laco esquerdo simetrico em linha fina */}
      <path
        d="M10.2 10.6C7.5 7.2 3.4 8.2 3.4 11.4C3.4 14.6 7.5 15.6 10.2 12.2"
        stroke={traco}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Laco direito simetrico em linha fina */}
      <path
        d="M13.8 10.6C16.5 7.2 20.6 8.2 20.6 11.4C20.6 14.6 16.5 15.6 13.8 12.2"
        stroke={traco}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Duas perninhas finas e retas */}
      <path
        d="M10.8 13.2L7.8 18.8"
        stroke={traco}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M13.2 13.2L16.2 18.8"
        stroke={traco}
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      {/* No central fino */}
      <circle
        cx="12"
        cy="11.4"
        r="1.95"
        stroke={traco}
        strokeWidth="1.4"
      />

      {alertaAtivo && (
        <circle
          cx="19.5"
          cy="5.5"
          r="2.1"
          fill="var(--brand-primary)"
          className="animar-pulso-lembrete"
        />
      )}
    </svg>
  );
}
