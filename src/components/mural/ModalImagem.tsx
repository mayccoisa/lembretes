import { X } from 'lucide-react';
import { Botao } from '../ui/Botao';

interface ModalImagemProps {
  url: string;
  titulo: string;
  aoFechar: () => void;
}

export function ModalImagem({ url, titulo, aoFechar }: ModalImagemProps) {
  return (
    <div
      onClick={aoFechar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-6 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div
        onClick={(ev) => ev.stopPropagation()}
        style={{ boxShadow: 'var(--shadow-elevated)' }}
        className="relative max-h-[88vh] max-w-4xl overflow-hidden rounded-2xl border border-border-strong bg-panel"
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2.5">
          <span className="text-xs font-semibold text-ink truncate">{titulo}</span>
          <Botao variante="fantasma" apenasIcone aria-label="Fechar visualização" onClick={aoFechar}>
            <X className="h-4 w-4" />
          </Botao>
        </div>
        <img src={url} alt={titulo} className="max-h-[80vh] w-auto object-contain" />
      </div>
    </div>
  );
}
