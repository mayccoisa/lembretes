import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type VarianteBotao = 'primario' | 'suave' | 'fantasma' | 'perigo';

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao;
  apenasIcone?: boolean;
  children: ReactNode;
}

const ESTILOS_VARIANTE: Record<VarianteBotao, string> = {
  primario:
    'bg-brand text-ink-on-accent hover:bg-brand-hover border border-transparent font-semibold shadow-xs',
  suave:
    'bg-subtle text-ink hover:bg-hover border border-border-subtle font-medium',
  fantasma:
    'bg-transparent text-ink-secondary hover:bg-hover hover:text-ink border border-transparent font-medium',
  perigo:
    'bg-danger-soft text-danger hover:opacity-90 border border-transparent font-medium',
};

/**
 * Primitivo unico de botao do Lembretes.
 * Altura travada em 32px (h-8) conforme regra T-05 do Livro Tecnico.
 */
export function Botao({
  variante = 'suave',
  apenasIcone = false,
  className = '',
  type = 'button',
  children,
  ...resto
}: BotaoProps) {
  const larguraPadrao = apenasIcone ? 'w-8 px-0 justify-center' : 'px-3 gap-1.5';
  return (
    <button
      type={type}
      className={`inline-flex h-8 shrink-0 items-center rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-brand ${larguraPadrao} ${ESTILOS_VARIANTE[variante]} ${className}`}
      {...resto}
    >
      {children}
    </button>
  );
}
