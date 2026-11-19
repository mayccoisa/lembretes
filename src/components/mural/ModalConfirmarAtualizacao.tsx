import { Download, RefreshCw } from 'lucide-react';
import type { InfoAtualizacao, ProgressoAtualizacao } from '../../contracts/atualizacao';
import { Botao } from '../ui/Botao';

interface ModalConfirmarAtualizacaoProps {
  info: InfoAtualizacao;
  instalando: boolean;
  progresso: ProgressoAtualizacao | null;
  erro: string | null;
  aoConfirmar: () => Promise<void>;
  aoRecusar: () => void;
}

function textoEtapa(progresso: ProgressoAtualizacao | null): string {
  if (!progresso) return 'Preparando download...';
  if (progresso.etapa === 'instalando') return 'Instalando a nova versão...';
  if (progresso.etapa === 'reiniciando') return 'Tudo pronto! Reiniciando o Lembretes...';
  return `Baixando nova versão (${progresso.percentual}%)...`;
}

export function ModalConfirmarAtualizacao({
  info,
  instalando,
  progresso,
  erro,
  aoConfirmar,
  aoRecusar,
}: ModalConfirmarAtualizacaoProps) {
  const percentual = progresso?.percentual ?? 0;

  return (
    <div
      onClick={() => {
        if (!instalando) aoRecusar();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Nova versão disponível"
    >
      <div
        onClick={(ev) => ev.stopPropagation()}
        style={{ boxShadow: 'var(--shadow-elevated)' }}
        className="w-full max-w-md rounded-2xl border border-border-strong bg-panel overflow-hidden"
      >
        <div className="h-1.5 w-full bg-brand" />

        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              {instalando ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Download className="h-5 w-5" />
              )}
            </span>

            <div className="space-y-1">
              <h2 className="text-sm font-bold text-ink">
                {instalando
                  ? `Atualizando para v${info.novaVersao}`
                  : `Nova versão v${info.novaVersao} disponível`}
              </h2>
              <p className="text-xs text-ink-secondary leading-relaxed">
                {instalando
                  ? 'Aguarde alguns instantes. O aplicativo reiniciará automaticamente assim que concluir.'
                  : `Deseja baixar e instalar a versão v${info.novaVersao} agora? (versão atual: v${info.versaoAtual}). Todos os seus laços permanecem salvos.`}
              </p>
            </div>
          </div>

          {instalando && (
            <div className="space-y-2 rounded-xl border border-border-subtle bg-subtle/60 p-3.5">
              <div className="flex items-center justify-between text-xs font-medium text-ink">
                <span>{textoEtapa(progresso)}</span>
                <span>{percentual}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-hover">
                <div
                  style={{ width: `${percentual}%` }}
                  className="h-full rounded-full bg-brand transition-all duration-200"
                />
              </div>
            </div>
          )}

          {erro && (
            <div className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-xs font-medium text-danger">
              {erro}
            </div>
          )}

          {!instalando && (
            <div className="flex items-center justify-end gap-2 pt-1">
              <Botao variante="fantasma" onClick={aoRecusar}>
                Agora não
              </Botao>
              <Botao variante="primario" onClick={() => void aoConfirmar()}>
                Sim, instalar agora
              </Botao>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
