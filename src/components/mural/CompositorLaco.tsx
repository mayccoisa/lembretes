import {
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';
import {
  AlignLeft,
  Bell,
  CheckSquare,
  ImagePlus,
  Pin,
  Plus,
  Repeat,
  Trash2,
  X,
} from 'lucide-react';
import {
  lacoTemConteudoValido,
  OPCOES_RECORRENCIA,
  type CorFita,
  type ItemChecklist,
  type ModoConteudo,
  type NovoLacoInput,
  type RecorrenciaLaco,
} from '../../contracts/laco';
import { Botao } from '../ui/Botao';
import { SeletorCorFita } from '../ui/SeletorCorFita';

interface CompositorLacoProps {
  gatilhoFocoNovo: number;
  aoCriar: (input: NovoLacoInput) => Promise<void>;
  aoImportarImagem: (arquivo: File) => Promise<{ url: string; nome: string }>;
  aoSalvarRascunho: (input: NovoLacoInput) => void;
  aoLimparRascunho: () => void;
}

function novoIdItem(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function CompositorLaco({
  gatilhoFocoNovo,
  aoCriar,
  aoImportarImagem,
  aoSalvarRascunho,
  aoLimparRascunho,
}: CompositorLacoProps) {
  const [expandido, setExpandido] = useState(false);
  const [ultimoGatilho, setUltimoGatilho] = useState(gatilhoFocoNovo);
  const [titulo, setTitulo] = useState('');
  const [modo, setModo] = useState<ModoConteudo>('texto');
  const [texto, setTexto] = useState('');
  const [itens, setItens] = useState<ItemChecklist[]>([
    { id: novoIdItem(), texto: '', concluido: false },
  ]);
  const [corFita, setCorFita] = useState<CorFita>('carmim');
  const [fixado, setFixado] = useState(false);
  const [lembrarEm, setLembrarEm] = useState('');
  const [recorrencia, setRecorrencia] = useState<RecorrenciaLaco | null>(null);
  const [intervaloRecorrencia, setIntervaloRecorrencia] = useState(1);
  const [mostrarCampoData, setMostrarCampoData] = useState(false);
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [imagemNome, setImagemNome] = useState<string | null>(null);
  const [arrastandoArquivo, setArrastandoArquivo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputArquivoRef = useRef<HTMLInputElement | null>(null);
  const abrindoSeletorArquivoRef = useRef(false);

  if (gatilhoFocoNovo !== ultimoGatilho) {
    setUltimoGatilho(gatilhoFocoNovo);
    if (!expandido) {
      setExpandido(true);
    }
  }

  const montarRascunho = (parcial?: Partial<NovoLacoInput>): NovoLacoInput => {
    const dataIso =
      parcial?.lembrarEm !== undefined
        ? parcial.lembrarEm
        : lembrarEm
          ? new Date(lembrarEm).toISOString()
          : null;
    return {
      titulo,
      modo,
      texto,
      itens,
      corFita,
      imagemUrl,
      imagemNome,
      fixado,
      lembrarEm: dataIso,
      recorrencia,
      intervaloRecorrencia,
      ...parcial,
    };
  };

  const limparFormulario = () => {
    aoLimparRascunho();
    setTitulo('');
    setModo('texto');
    setTexto('');
    setItens([{ id: novoIdItem(), texto: '', concluido: false }]);
    setCorFita('carmim');
    setFixado(false);
    setLembrarEm('');
    setRecorrencia(null);
    setIntervaloRecorrencia(1);
    setMostrarCampoData(false);
    setImagemUrl(null);
    setImagemNome(null);
    setExpandido(false);
  };

  const rascunhoAtual = montarRascunho();
  const podeSalvar = lacoTemConteudoValido(rascunhoAtual) && !salvando;

  const salvarLaco = async () => {
    if (!lacoTemConteudoValido(rascunhoAtual) || salvando) {
      if (!lacoTemConteudoValido(rascunhoAtual)) {
        limparFormulario();
      }
      return;
    }
    setSalvando(true);
    try {
      await aoCriar(rascunhoAtual);
      limparFormulario();
    } finally {
      setSalvando(false);
    }
  };

  const anexarArquivo = async (arquivo: File | undefined) => {
    abrindoSeletorArquivoRef.current = false;
    if (!arquivo || !arquivo.type.startsWith('image/')) return;
    const resultado = await aoImportarImagem(arquivo);
    setImagemUrl(resultado.url);
    setImagemNome(resultado.nome);
    aoSalvarRascunho(montarRascunho({ imagemUrl: resultado.url, imagemNome: resultado.nome }));
    if (!expandido) setExpandido(true);
  };

  const aoColar = (ev: ClipboardEvent<HTMLDivElement>) => {
    const lista = ev.clipboardData?.items;
    if (!lista) return;
    for (const item of Array.from(lista)) {
      if (item.type.startsWith('image/')) {
        const arq = item.getAsFile();
        if (arq) {
          ev.preventDefault();
          void anexarArquivo(arq);
          return;
        }
      }
    }
  };

  const aoSoltarArquivo = (ev: DragEvent<HTMLDivElement>) => {
    ev.preventDefault();
    setArrastandoArquivo(false);
    const arq = ev.dataTransfer.files?.[0];
    if (arq && arq.type.startsWith('image/')) {
      void anexarArquivo(arq);
    }
  };

  const alternarModoConteudo = () => {
    if (modo === 'texto') {
      const linhas = texto
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const novosItens =
        linhas.length > 0
          ? linhas.map((l) => ({ id: novoIdItem(), texto: l, concluido: false }))
          : [{ id: novoIdItem(), texto: '', concluido: false }];
      setItens(novosItens);
      setModo('checklist');
      aoSalvarRascunho(montarRascunho({ modo: 'checklist', itens: novosItens }));
    } else {
      const juntado = itens
        .map((i) => i.texto.trim())
        .filter(Boolean)
        .join('\n');
      setTexto(juntado);
      setModo('texto');
      aoSalvarRascunho(montarRascunho({ modo: 'texto', texto: juntado }));
    }
  };

  // Padrao Google Keep: clicar fora do compositor salva automaticamente se houver conteudo!
  const aoPerderFocoContainer = (ev: FocusEvent<HTMLDivElement>) => {
    if (abrindoSeletorArquivoRef.current || salvando) return;
    const proximoAlvo = ev.relatedTarget as Node | null;
    if (proximoAlvo && containerRef.current?.contains(proximoAlvo)) {
      return;
    }
    setTimeout(() => {
      if (abrindoSeletorArquivoRef.current) return;
      const ativoAgora = typeof document !== 'undefined' ? document.activeElement : null;
      if (ativoAgora && containerRef.current?.contains(ativoAgora)) {
        return;
      }
      if (lacoTemConteudoValido(rascunhoAtual)) {
        void salvarLaco();
      } else {
        setExpandido(false);
      }
    }, 120);
  };

  const aoTeclarNoCompositor = (ev: KeyboardEvent<HTMLDivElement>) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter' && podeSalvar) {
      ev.preventDefault();
      void salvarLaco();
    } else if (ev.key === 'Escape') {
      // Padrao Google Keep: Esc fecha e salva o que foi digitado (nunca descarta!)
      ev.preventDefault();
      void salvarLaco();
    }
  };

  return (
    <div
      ref={containerRef}
      onBlur={aoPerderFocoContainer}
      onPaste={aoColar}
      onDragOver={(ev) => {
        ev.preventDefault();
        setArrastandoArquivo(true);
      }}
      onDragLeave={() => setArrastandoArquivo(false)}
      onDrop={aoSoltarArquivo}
      onKeyDown={aoTeclarNoCompositor}
      style={{
        backgroundColor: expandido ? `var(--fita-${corFita}-bg)` : 'var(--bg-panel)',
        borderColor: arrastandoArquivo
          ? 'var(--brand-primary)'
          : expandido
            ? `var(--fita-${corFita}-borda)`
            : 'var(--border-subtle)',
        boxShadow: expandido ? 'var(--shadow-elevated)' : 'var(--shadow-card)',
      }}
      className="mx-auto w-full max-w-2xl rounded-2xl border transition-all overflow-hidden"
    >
      <input
        ref={inputArquivoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(ev) => {
          void anexarArquivo(ev.target.files?.[0]);
          ev.target.value = '';
        }}
      />

      {!expandido ? (
        <div className="flex h-13 items-center justify-between px-4 gap-2">
          <button
            type="button"
            onClick={() => setExpandido(true)}
            className="flex h-full flex-1 items-center text-left text-sm font-medium text-ink-muted hover:text-ink cursor-text"
          >
            Amarrar um novo laço... (salva sozinho ao clicar fora)
          </button>
          <div className="flex items-center gap-1">
            <Botao
              variante="fantasma"
              apenasIcone
              title="Nova lista de itens"
              aria-label="Nova lista de itens"
              onClick={() => {
                setModo('checklist');
                setExpandido(true);
              }}
            >
              <CheckSquare className="h-4 w-4" />
            </Botao>
            <Botao
              variante="fantasma"
              apenasIcone
              title="Criar laço com imagem"
              aria-label="Criar laço com imagem"
              onClick={() => {
                abrindoSeletorArquivoRef.current = true;
                inputArquivoRef.current?.click();
              }}
            >
              <ImagePlus className="h-4 w-4" />
            </Botao>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <div
            style={{ backgroundColor: `var(--fita-${corFita}-viva)` }}
            className="h-1.5 w-full transition-colors"
          />

          {imagemUrl && (
            <div className="relative border-b border-border-subtle bg-subtle/50">
              <img
                src={imagemUrl}
                alt={imagemNome ?? 'Imagem anexada ao laço'}
                className="max-h-60 w-full object-cover"
              />
              <div className="absolute top-2.5 right-2.5">
                <Botao
                  variante="suave"
                  apenasIcone
                  aria-label="Remover imagem"
                  title="Remover imagem"
                  onClick={() => {
                    setImagemUrl(null);
                    setImagemNome(null);
                    aoSalvarRascunho(montarRascunho({ imagemUrl: null, imagemNome: null }));
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Botao>
              </div>
            </div>
          )}

          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={titulo}
                onChange={(ev) => {
                  const v = ev.target.value;
                  setTitulo(v);
                  aoSalvarRascunho(montarRascunho({ titulo: v }));
                }}
                placeholder="Título (opcional)"
                className="w-full bg-transparent text-sm font-semibold text-ink placeholder:text-ink-muted focus:outline-none"
              />
              <Botao
                variante={fixado ? 'primario' : 'fantasma'}
                apenasIcone
                aria-label={fixado ? 'Desafixar do topo' : 'Fixar laço no topo'}
                title={fixado ? 'Fixado no topo' : 'Fixar no topo'}
                onClick={() => {
                  const prox = !fixado;
                  setFixado(prox);
                  aoSalvarRascunho(montarRascunho({ fixado: prox }));
                }}
              >
                <Pin className="h-4 w-4" />
              </Botao>
            </div>

            {modo === 'texto' ? (
              <textarea
                autoFocus
                rows={3}
                value={texto}
                onChange={(ev) => {
                  const v = ev.target.value;
                  setTexto(v);
                  aoSalvarRascunho(montarRascunho({ texto: v }));
                }}
                placeholder="O que você não quer esquecer? (Ctrl+V cola print · salva automático)"
                className="w-full resize-none bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none leading-relaxed"
              />
            ) : (
              <div className="space-y-1.5">
                {itens.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.concluido}
                      onChange={() => {
                        const prox = itens.map((it) =>
                          it.id === item.id ? { ...it, concluido: !it.concluido } : it
                        );
                        setItens(prox);
                        aoSalvarRascunho(montarRascunho({ itens: prox }));
                      }}
                      className="h-4 w-4 rounded accent-brand cursor-pointer"
                    />
                    <input
                      autoFocus={idx === itens.length - 1}
                      type="text"
                      value={item.texto}
                      onChange={(ev) => {
                        const prox = itens.map((it) =>
                          it.id === item.id ? { ...it, texto: ev.target.value } : it
                        );
                        setItens(prox);
                        aoSalvarRascunho(montarRascunho({ itens: prox }));
                      }}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter') {
                          ev.preventDefault();
                          const novo = { id: novoIdItem(), texto: '', concluido: false };
                          const copia = [...itens];
                          copia.splice(idx + 1, 0, novo);
                          setItens(copia);
                        } else if (
                          ev.key === 'Backspace' &&
                          item.texto === '' &&
                          itens.length > 1
                        ) {
                          ev.preventDefault();
                          const prox = itens.filter((it) => it.id !== item.id);
                          setItens(prox);
                          aoSalvarRascunho(montarRascunho({ itens: prox }));
                        }
                      }}
                      placeholder="Item da lista..."
                      className={`w-full bg-transparent text-sm focus:outline-none ${
                        item.concluido ? 'line-through text-ink-muted' : 'text-ink'
                      }`}
                    />
                    {itens.length > 1 && (
                      <Botao
                        variante="fantasma"
                        apenasIcone
                        aria-label="Remover item"
                        onClick={() => {
                          const prox = itens.filter((it) => it.id !== item.id);
                          setItens(prox);
                          aoSalvarRascunho(montarRascunho({ itens: prox }));
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Botao>
                    )}
                  </div>
                ))}
                <Botao
                  variante="fantasma"
                  onClick={() =>
                    setItens([...itens, { id: novoIdItem(), texto: '', concluido: false }])
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Adicionar item</span>
                </Botao>
              </div>
            )}

            {mostrarCampoData && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border-subtle bg-panel/80 px-3 py-2">
                <Bell className="h-3.5 w-3.5 text-brand" />
                <span className="text-xs font-medium text-ink-secondary">Avisar em:</span>
                <input
                  type="datetime-local"
                  value={lembrarEm}
                  onChange={(ev) => {
                    const v = ev.target.value;
                    setLembrarEm(v);
                    aoSalvarRascunho(
                      montarRascunho({ lembrarEm: v ? new Date(v).toISOString() : null })
                    );
                  }}
                  className="h-8 rounded-lg border border-border-subtle bg-panel px-2 text-xs text-ink focus:outline-none focus:border-brand"
                />

                <Repeat className="ml-1 h-3.5 w-3.5 text-ink-muted" />
                <select
                  aria-label="Frequência de repetição"
                  value={recorrencia ?? ''}
                  onChange={(ev) => {
                    const nova = (ev.target.value || null) as RecorrenciaLaco | null;
                    setRecorrencia(nova);
                    aoSalvarRascunho(montarRascunho({ recorrencia: nova }));
                  }}
                  className="h-8 rounded-lg border border-border-subtle bg-panel px-2 text-xs text-ink focus:outline-none focus:border-brand"
                >
                  <option value="">Sem repetição</option>
                  {OPCOES_RECORRENCIA.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.rotulo}
                    </option>
                  ))}
                </select>

                {(recorrencia === 'intervalo-horas' || recorrencia === 'intervalo-dias') && (
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={intervaloRecorrencia}
                    onChange={(ev) => {
                      const num = Math.max(1, Number.parseInt(ev.target.value, 10) || 1);
                      setIntervaloRecorrencia(num);
                      aoSalvarRascunho(montarRascunho({ intervaloRecorrencia: num }));
                    }}
                    aria-label="Intervalo da recorrência"
                    className="h-8 w-16 rounded-lg border border-border-subtle bg-panel px-2 text-xs text-ink focus:outline-none focus:border-brand"
                  />
                )}

                {(lembrarEm || recorrencia) && (
                  <Botao
                    variante="fantasma"
                    apenasIcone
                    aria-label="Limpar lembrete e recorrência"
                    onClick={() => {
                      setLembrarEm('');
                      setRecorrencia(null);
                      setIntervaloRecorrencia(1);
                      setMostrarCampoData(false);
                      aoSalvarRascunho(
                        montarRascunho({
                          lembrarEm: null,
                          recorrencia: null,
                          intervaloRecorrencia: 1,
                        })
                      );
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Botao>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border-subtle/70">
              <div className="flex flex-wrap items-center gap-1.5">
                <SeletorCorFita
                  valor={corFita}
                  aoMudar={(novaCor) => {
                    setCorFita(novaCor);
                    aoSalvarRascunho(montarRascunho({ corFita: novaCor }));
                  }}
                />

                <Botao
                  variante="suave"
                  onClick={alternarModoConteudo}
                  title={modo === 'texto' ? 'Converter em checklist' : 'Converter em texto'}
                >
                  {modo === 'texto' ? (
                    <>
                      <CheckSquare className="h-3.5 w-3.5" />
                      <span>Checklist</span>
                    </>
                  ) : (
                    <>
                      <AlignLeft className="h-3.5 w-3.5" />
                      <span>Texto</span>
                    </>
                  )}
                </Botao>

                <Botao
                  variante="suave"
                  onClick={() => {
                    abrindoSeletorArquivoRef.current = true;
                    inputArquivoRef.current?.click();
                  }}
                  title="Anexar imagem ou foto"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  <span>Imagem</span>
                </Botao>

                <Botao
                  variante={lembrarEm || recorrencia ? 'primario' : 'suave'}
                  onClick={() => setMostrarCampoData(!mostrarCampoData)}
                  title="Definir horário ou repetição automática"
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span>Horário / Repetir</span>
                </Botao>
              </div>

              <div className="flex items-center gap-1.5">
                <Botao variante="fantasma" onClick={limparFormulario}>
                  Descartar
                </Botao>
                <Botao variante="primario" disabled={!podeSalvar} onClick={() => void salvarLaco()}>
                  Amarrar laço
                </Botao>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
