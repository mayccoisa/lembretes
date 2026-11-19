import { ExternalLink, LayoutPanelTop, PanelBottom, X } from 'lucide-react';
import type { TomBotaoAtalho } from '../../hooks/usePreferencias';
import { IconeLacinhoDiscreto } from '../arte/IconeLacinhoDiscreto';
import { Botao } from '../ui/Botao';

interface ModalConfigAtalhoProps {
  modoAtual: 'flutuante' | 'barra';
  tomAtual: TomBotaoAtalho;
  emTauri: boolean;
  aoEscolherModo: (modo: 'flutuante' | 'barra') => Promise<void>;
  aoEscolherTom: (tom: TomBotaoAtalho) => void;
  aoAbrirConfigBarraWindows: () => Promise<void>;
  aoFechar: () => void;
}

const OPCOES_TOM: ReadonlyArray<{ id: TomBotaoAtalho; rotulo: string }> = [
  { id: 'lavanda', rotulo: 'Lavanda suave' },
  { id: 'neutro', rotulo: 'Neutro discreto' },
  { id: 'carmim', rotulo: 'Rosa fita' },
];

export function ModalConfigAtalho({
  modoAtual,
  tomAtual,
  emTauri,
  aoEscolherModo,
  aoEscolherTom,
  aoAbrirConfigBarraWindows,
  aoFechar,
}: ModalConfigAtalhoProps) {
  return (
    <div
      onClick={aoFechar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Configurar atalho do Lembretes"
    >
      <div
        onClick={(ev) => ev.stopPropagation()}
        style={{ boxShadow: 'var(--shadow-elevated)' }}
        className="w-full max-w-md rounded-2xl border border-border-strong bg-panel overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3.5">
          <div>
            <h2 className="text-sm font-bold text-ink">Onde deixar o atalho do Lembretes</h2>
            <p className="text-[11px] text-ink-muted">
              Escolha entre a bolinha flutuante ou apenas dentro da barra de ferramentas
            </p>
          </div>
          <Botao variante="fantasma" apenasIcone aria-label="Fechar configurações" onClick={aoFechar}>
            <X className="h-4 w-4" />
          </Botao>
        </div>

        <div className="p-5 space-y-4">
          {/* Escolha entre Flutuante e Barra de ferramentas */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void aoEscolherModo('flutuante')}
              className={`flex flex-col items-start gap-2.5 rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                modoAtual === 'flutuante'
                  ? 'border-brand bg-brand-soft/45'
                  : 'border-border-subtle bg-subtle/50 hover:bg-hover'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span
                  style={{ backgroundColor: `var(--atalho-${tomAtual}-bg)` }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full"
                >
                  <IconeLacinhoDiscreto
                    tamanho={18}
                    corTracoCss={`var(--atalho-${tomAtual}-traco)`}
                  />
                </span>
                <LayoutPanelTop className="h-4 w-4 text-ink-muted" />
              </div>
              <div>
                <p className="text-xs font-semibold text-ink">Bolinha flutuante</p>
                <p className="text-[11px] text-ink-secondary leading-snug mt-0.5">
                  Círculo minimalista que você arrasta para qualquer canto da tela.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => void aoEscolherModo('barra')}
              className={`flex flex-col items-start gap-2.5 rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                modoAtual === 'barra'
                  ? 'border-brand bg-brand-soft/45'
                  : 'border-border-subtle bg-subtle/50 hover:bg-hover'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-panel">
                  <IconeLacinhoDiscreto tamanho={18} corTracoCss="var(--text-primary)" />
                </span>
                <PanelBottom className="h-4 w-4 text-ink-muted" />
              </div>
              <div>
                <p className="text-xs font-semibold text-ink">Dentro da barra</p>
                <p className="text-[11px] text-ink-secondary leading-snug mt-0.5">
                  Oculta a bolinha da tela e deixa o lacinho junto ao Wi-Fi, som e relógio.
                </p>
              </div>
            </button>
          </div>

          {/* Tom da bolinha quando estiver flutuante */}
          {modoAtual === 'flutuante' && (
            <div className="rounded-xl border border-border-subtle bg-subtle/50 p-3.5 space-y-2.5">
              <p className="text-xs font-semibold text-ink">Cor do círculo flutuante</p>
              <div className="flex flex-wrap items-center gap-2">
                {OPCOES_TOM.map((op) => {
                  const ativo = op.id === tomAtual;
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => aoEscolherTom(op.id)}
                      className={`inline-flex h-8 items-center gap-2 rounded-lg border px-2.5 text-xs font-medium transition-colors cursor-pointer ${
                        ativo
                          ? 'border-brand bg-panel text-ink'
                          : 'border-border-subtle bg-transparent text-ink-secondary hover:text-ink'
                      }`}
                    >
                      <span
                        style={{ backgroundColor: `var(--atalho-${op.id}-bg)` }}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full"
                      >
                        <IconeLacinhoDiscreto
                          tamanho={12}
                          corTracoCss={`var(--atalho-${op.id}-traco)`}
                        />
                      </span>
                      <span>{op.rotulo}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dica rapida para fixar visivel fora do ^ na barra do Windows 11 */}
          <div className="rounded-xl border border-border-subtle bg-subtle/60 p-3.5 space-y-2">
            <p className="text-xs font-semibold text-ink">
              Como deixar sempre visível ao lado de POR / Wi-Fi / Bateria
            </p>
            <p className="text-[11px] text-ink-secondary leading-relaxed">
              No Windows 11, ícones novos entram primeiro na setinha <strong>^</strong> da barra de
              tarefas. Basta arrastar o lacinho de dentro do <strong>^</strong> para o lado do{' '}
              <strong>Wi-Fi</strong> (ou ativar em Outros ícones da bandeja do sistema).
            </p>
            {emTauri && (
              <Botao
                variante="suave"
                onClick={() => void aoAbrirConfigBarraWindows()}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Abrir configurações da barra do Windows</span>
              </Botao>
            )}
          </div>

          <div className="flex justify-end pt-1">
            <Botao variante="primario" onClick={aoFechar}>
              Concluído
            </Botao>
          </div>
        </div>
      </div>
    </div>
  );
}
