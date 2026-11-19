import { RotateCcw, X } from 'lucide-react';
import type { Laco } from '../../contracts/laco';
import { Botao } from '../ui/Botao';

interface BarraDesfazerToastProps {
  laco: Laco;
  aoReamarrar: () => void;
  aoDispensar: () => void;
}

export function BarraDesfazerToast({
  laco,
  aoReamarrar,
  aoDispensar,
}: BarraDesfazerToastProps) {
  return (
    <div
      role="status"
      style={{ boxShadow: 'var(--shadow-elevated)' }}
      className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-border-strong bg-elevated px-4 py-2.5"
    >
      <span
        style={{ backgroundColor: `var(--fita-${laco.corFita}-viva)` }}
        className="h-2.5 w-2.5 rounded-full shrink-0"
      />
      <span className="text-xs font-medium text-ink">
        Laço desfeito: <strong>{laco.titulo || 'Lembrança concluída'}</strong>
      </span>
      <Botao variante="primario" onClick={aoReamarrar}>
        <RotateCcw className="h-3.5 w-3.5" />
        <span>Reamarrar</span>
      </Botao>
      <Botao variante="fantasma" apenasIcone aria-label="Fechar aviso" onClick={aoDispensar}>
        <X className="h-3.5 w-3.5" />
      </Botao>
    </div>
  );
}
