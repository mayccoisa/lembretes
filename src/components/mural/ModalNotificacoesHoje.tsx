import { Bell, BellRing, Filter, Repeat, Sparkles, X } from 'lucide-react';
import { rotuloRecorrencia, type Laco } from '../../contracts/laco';
import { Botao } from '../ui/Botao';
import { Insignia } from '../ui/Insignia';

interface ModalNotificacoesHojeProps {
  vencendoHoje: Laco[];
  filtroHojeAtivo: boolean;
  aoAlternarFiltroHoje: () => void;
  aoSelecionarLaco: (laco: Laco) => void;
  aoTestarAlertaWindows: () => Promise<void>;
  aoFechar: () => void;
}

function formatarHora(iso: string | null): string {
  if (!iso) return 'Hoje';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Hoje';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function ModalNotificacoesHoje({
  vencendoHoje,
  filtroHojeAtivo,
  aoAlternarFiltroHoje,
  aoSelecionarLaco,
  aoTestarAlertaWindows,
  aoFechar,
}: ModalNotificacoesHojeProps) {
  const agoraMs = Date.now();
  const qtd = vencendoHoje.length;

  return (
    <div
      onClick={aoFechar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Lembretes que vencem hoje"
    >
      <div
        onClick={(ev) => ev.stopPropagation()}
        style={{ boxShadow: 'var(--shadow-elevated)' }}
        className="w-full max-w-md rounded-2xl border border-border-strong bg-panel overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <BellRing className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink">
                {qtd === 0
                  ? 'Nenhum lembrete vence hoje'
                  : qtd === 1
                    ? '1 lembrete vence hoje'
                    : `${qtd} lembretes vencem hoje`}
              </h2>
              <p className="text-[11px] text-ink-muted">
                Resumo diário de vencimentos e alertas agendados
              </p>
            </div>
          </div>

          <Botao variante="fantasma" apenasIcone aria-label="Fechar notificações" onClick={aoFechar}>
            <X className="h-4 w-4" />
          </Botao>
        </div>

        <div className="p-5 space-y-4">
          {qtd === 0 ? (
            <div className="rounded-xl border border-border-subtle bg-subtle/50 p-5 text-center space-y-1.5">
              <Bell className="mx-auto h-6 w-6 text-ink-muted" />
              <p className="text-xs font-semibold text-ink">Seu dia está livre de prazos!</p>
              <p className="text-[11px] text-ink-secondary">
                Quando um laço com horário ou recorrência vencer hoje, você verá o resumo aqui e na
                notificação do Windows.
              </p>
            </div>
          ) : (
            <ul className="max-h-68 overflow-y-auto space-y-2 pr-1">
              {vencendoHoje.map((laco) => {
                const atrasado = Boolean(
                  laco.lembrarEm && new Date(laco.lembrarEm).getTime() <= agoraMs
                );
                const recTxt = rotuloRecorrencia(laco.recorrencia, laco.intervaloRecorrencia);

                return (
                  <li key={laco.id}>
                    <button
                      type="button"
                      onClick={() => {
                        aoFechar();
                        aoSelecionarLaco(laco);
                      }}
                      className="flex w-full items-start justify-between gap-3 rounded-xl border border-border-subtle bg-subtle/45 p-3 text-left hover:bg-hover transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            style={{ backgroundColor: `var(--fita-${laco.corFita}-viva)` }}
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                          />
                          <p className="text-xs font-semibold text-ink truncate">
                            {laco.titulo || laco.texto || 'Lembrança com imagem'}
                          </p>
                        </div>

                        {laco.titulo && laco.texto && (
                          <p className="text-[11px] text-ink-secondary line-clamp-1">
                            {laco.texto}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <Insignia tom={atrasado ? 'alerta' : 'neutro'}>
                            <span>{formatarHora(laco.lembrarEm)}</span>
                          </Insignia>
                          {recTxt && (
                            <Insignia tom="neutro">
                              <Repeat className="h-2.5 w-2.5" />
                              <span>{recTxt}</span>
                            </Insignia>
                          )}
                          {laco.canalOrigem && (
                            <Insignia tom="destaque">
                              <Sparkles className="h-2.5 w-2.5" />
                              <span>{laco.canalOrigem}</span>
                            </Insignia>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-subtle">
            {qtd > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <Botao
                  variante={filtroHojeAtivo ? 'primario' : 'suave'}
                  onClick={() => {
                    aoAlternarFiltroHoje();
                    aoFechar();
                  }}
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span>{filtroHojeAtivo ? 'Mostrar todos' : 'Filtrar só hoje'}</span>
                </Botao>

                <Botao variante="suave" onClick={() => void aoTestarAlertaWindows()}>
                  <BellRing className="h-3.5 w-3.5" />
                  <span>Avisar no Windows</span>
                </Botao>
              </div>
            ) : (
              <span />
            )}

            <Botao variante="primario" onClick={aoFechar}>
              Fechar
            </Botao>
          </div>
        </div>
      </div>
    </div>
  );
}
