import { useState } from 'react';
import { Bell, Maximize2, Pencil, Pin, RotateCcw, Trash2 } from 'lucide-react';
import type { Laco } from '../../contracts/laco';
import { AnimacaoLacoCard } from '../arte/AnimacaoLacoCard';
import { Botao } from '../ui/Botao';
import { Insignia } from '../ui/Insignia';

interface CartaoLacoProps {
  laco: Laco;
  aoDesfazer: (id: string) => Promise<void>;
  aoReamarrar: (id: string) => Promise<void>;
  aoExcluir: (id: string) => Promise<void>;
  aoAlternarFixado: (laco: Laco) => Promise<void>;
  aoAlternarItemChecklist: (laco: Laco, itemId: string) => Promise<void>;
  aoEditar: (laco: Laco) => void;
  aoAmpliarImagem: (url: string, titulo: string) => void;
}

function formatarDataCurta(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(data);
}

export function CartaoLaco({
  laco,
  aoDesfazer,
  aoReamarrar,
  aoExcluir,
  aoAlternarFixado,
  aoAlternarItemChecklist,
  aoEditar,
  aoAmpliarImagem,
}: CartaoLacoProps) {
  const [saindo, setSaindo] = useState(false);

  const estaAtivo = laco.estado === 'ativo';
  const vencido =
    estaAtivo && Boolean(laco.lembrarEm && new Date(laco.lembrarEm).getTime() <= Date.now());

  const concluirComAnimacao = () => {
    setSaindo(true);
    setTimeout(() => {
      void aoDesfazer(laco.id);
    }, 180);
  };

  return (
    <article
      onClick={() => {
        if (estaAtivo && !saindo) aoEditar(laco);
      }}
      style={{
        backgroundColor: `var(--fita-${laco.corFita}-bg)`,
        borderColor: `var(--fita-${laco.corFita}-borda)`,
        boxShadow: 'var(--shadow-card)',
      }}
      className={`group relative flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden ${
        estaAtivo ? 'cursor-pointer hover:-translate-y-0.5' : 'opacity-85'
      } ${saindo ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
    >
      {/* Fita superior colorida */}
      <div
        style={{ backgroundColor: `var(--fita-${laco.corFita}-viva)` }}
        className={`h-1.5 w-full ${estaAtivo ? '' : 'opacity-45'}`}
      />

      {/* Imagem do lembrete */}
      {laco.imagemUrl && (
        <div
          onClick={(ev) => {
            ev.stopPropagation();
            aoAmpliarImagem(laco.imagemUrl!, laco.titulo || 'Imagem do laço');
          }}
          className="group/img relative max-h-48 w-full overflow-hidden border-b border-border-subtle/60 bg-subtle cursor-zoom-in"
        >
          <img
            src={laco.imagemUrl}
            alt={laco.titulo || 'Imagem anexada'}
            className="max-h-48 w-full object-cover transition-transform duration-300 group-hover/img:scale-103"
          />
          <span className="absolute bottom-2 right-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-panel/85 text-ink opacity-0 group-hover/img:opacity-100 transition-opacity">
            <Maximize2 className="h-3.5 w-3.5" />
          </span>
        </div>
      )}

      {/* Cabecalho com titulo + O Laco Interativo */}
      <div className="flex items-start justify-between gap-2 px-4 pt-3 pb-1">
        <div className="min-w-0 flex-1 pt-1">
          {laco.titulo ? (
            <h3
              className={`text-sm font-semibold leading-snug break-words ${
                estaAtivo ? 'text-ink' : 'line-through text-ink-muted'
              }`}
            >
              {laco.titulo}
            </h3>
          ) : (
            <span className="text-xs font-medium text-ink-muted">
              {estaAtivo ? 'Lembrança rápida' : 'Laço desfeito'}
            </span>
          )}
        </div>

        {estaAtivo && (
          <div className="-mt-1.5 -mr-2 shrink-0">
            <AnimacaoLacoCard
              corFita={laco.corFita}
              aoDesatarCompleto={concluirComAnimacao}
            />
          </div>
        )}
      </div>

      {/* Conteudo em texto ou checklist */}
      <div className="flex-1 px-4 pb-3 space-y-2">
        {laco.modo === 'texto' && laco.texto && (
          <p
            className={`whitespace-pre-wrap text-xs leading-relaxed break-words ${
              estaAtivo ? 'text-ink-secondary' : 'line-through text-ink-muted'
            }`}
          >
            {laco.texto}
          </p>
        )}

        {laco.modo === 'checklist' && laco.itens.length > 0 && (
          <ul className="space-y-1.5">
            {laco.itens.map((item) => (
              <li
                key={item.id}
                onClick={(ev) => {
                  ev.stopPropagation();
                  if (estaAtivo) void aoAlternarItemChecklist(laco, item.id);
                }}
                className="flex items-start gap-2 text-xs"
              >
                <input
                  type="checkbox"
                  checked={item.concluido}
                  onChange={() => {}}
                  disabled={!estaAtivo}
                  className="mt-0.5 h-3.5 w-3.5 rounded accent-brand cursor-pointer"
                />
                <span
                  className={`leading-snug break-words ${
                    item.concluido || !estaAtivo
                      ? 'line-through text-ink-muted'
                      : 'text-ink'
                  }`}
                >
                  {item.texto}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Rodape com insignia de horario e acoes rapidas */}
      <div
        onClick={(ev) => ev.stopPropagation()}
        className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border-subtle/50"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {laco.lembrarEm && estaAtivo && (
            <Insignia tom={vencido ? 'alerta' : 'neutro'}>
              <Bell className="h-3 w-3" />
              <span>{formatarDataCurta(laco.lembrarEm)}</span>
            </Insignia>
          )}
          {!estaAtivo && laco.desfeitoEm && (
            <Insignia tom="neutro">
              <span>Desfeito {formatarDataCurta(laco.desfeitoEm)}</span>
            </Insignia>
          )}
        </div>

        <div className="flex items-center gap-1">
          {estaAtivo ? (
            <>
              <Botao
                variante="fantasma"
                apenasIcone
                aria-label="Editar laço"
                title="Editar laço"
                onClick={() => aoEditar(laco)}
                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Botao>
              <Botao
                variante={laco.fixado ? 'primario' : 'fantasma'}
                apenasIcone
                aria-label={laco.fixado ? 'Desafixar' : 'Fixar no topo'}
                title={laco.fixado ? 'Fixado no topo' : 'Fixar no topo'}
                onClick={() => void aoAlternarFixado(laco)}
                className={
                  laco.fixado
                    ? ''
                    : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
                }
              >
                <Pin className="h-3.5 w-3.5" />
              </Botao>
            </>
          ) : (
            <>
              <Botao
                variante="suave"
                onClick={() => void aoReamarrar(laco.id)}
                title="Amarrar este laço novamente"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reamarrar</span>
              </Botao>
              <Botao
                variante="perigo"
                apenasIcone
                aria-label="Excluir definitivamente"
                title="Excluir definitivamente"
                onClick={() => void aoExcluir(laco.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Botao>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
