import { CheckCircle2, Sparkles } from 'lucide-react';
import { parsearNotasRelease, type NovidadesPosAtualizacao } from '../../contracts/atualizacao';
import { Botao } from '../ui/Botao';

interface ModalMelhoriasVersaoProps {
  novidades: NovidadesPosAtualizacao;
  aoFechar: () => Promise<void>;
}

export function ModalMelhoriasVersao({ novidades, aoFechar }: ModalMelhoriasVersaoProps) {
  const secoes = parsearNotasRelease(novidades.notas);

  return (
    <div
      onClick={() => void aoFechar()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={`Melhorias da versão ${novidades.versao}`}
    >
      <div
        onClick={(ev) => ev.stopPropagation()}
        style={{ boxShadow: 'var(--shadow-elevated)' }}
        className="w-full max-w-lg rounded-2xl border border-border-strong bg-panel overflow-hidden"
      >
        <div className="h-1.5 w-full bg-brand" />

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink">
                O que há de novo na versão v{novidades.versao}
              </h2>
              <p className="text-xs text-ink-muted">
                Atualização aplicada com sucesso · Confira as melhorias desta entrega
              </p>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-3.5 rounded-xl border border-border-subtle bg-subtle/50 p-4">
            {secoes.map((bloco, idx) => (
              <div key={idx} className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                  {bloco.secao}
                </h3>
                <ul className="space-y-1.5">
                  {bloco.itens.map((item, itemIdx) => (
                    <li
                      key={itemIdx}
                      className="flex items-start gap-2 text-xs text-ink-secondary leading-relaxed"
                    >
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-1">
            <Botao variante="primario" onClick={() => void aoFechar()}>
              Fechar e continuar
            </Botao>
          </div>
        </div>
      </div>
    </div>
  );
}
