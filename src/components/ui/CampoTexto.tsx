import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

interface CampoTextoProps extends InputHTMLAttributes<HTMLInputElement> {
  iconeEsquerda?: ReactNode;
  acaoDireita?: ReactNode;
}

/**
 * Campo de entrada padrao de 32px (h-8) conforme regra T-05.
 */
export const CampoTexto = forwardRef<HTMLInputElement, CampoTextoProps>(function CampoTexto(
  { iconeEsquerda, acaoDireita, className = '', ...resto },
  ref
) {
  return (
    <div
      className={`flex h-8 items-center gap-2 rounded-lg border border-border-subtle bg-panel px-2.5 text-xs text-ink focus-within:border-brand transition-colors ${className}`}
    >
      {iconeEsquerda && <span className="text-ink-muted shrink-0">{iconeEsquerda}</span>}
      <input
        ref={ref}
        className="h-full w-full bg-transparent text-xs text-ink placeholder:text-ink-muted focus:outline-none"
        {...resto}
      />
      {acaoDireita && <span className="shrink-0">{acaoDireita}</span>}
    </div>
  );
});
