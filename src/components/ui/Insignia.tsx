import type { ReactNode } from 'react';

interface InsigniaProps {
  tom?: 'neutro' | 'alerta' | 'destaque';
  children: ReactNode;
}

const ESTILO_TOM = {
  neutro: 'bg-subtle text-ink-secondary border-border-subtle',
  alerta: 'bg-warning-bg text-warning-ink border-transparent',
  destaque: 'bg-brand-soft text-brand border-transparent',
};

/**
 * Selo informativo sem clique (altura 24px / h-6, distinto de controle de 32px).
 */
export function Insignia({ tom = 'neutro', children }: InsigniaProps) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-medium ${ESTILO_TOM[tom]}`}
    >
      {children}
    </span>
  );
}
