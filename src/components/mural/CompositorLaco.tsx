import {
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import {
  AlignLeft,
  Bell,
  CheckSquare,
  ImagePlus,
  Pin,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { CorFita, ItemChecklist, ModoConteudo, NovoLacoInput } from '../../contracts/laco';
import { lacoTemConteudoValido } from '../../contracts/laco';
import { Botao } from '../ui/Botao';
import { SeletorCorFita } from '../ui/SeletorCorFita';

interface CompositorLacoProps {
  gatilhoFocoNovo: number;
  aoCriar: (input: NovoLacoInput) => Promise<void>;
  aoImportarImagem: (arquivo: File) => Promise<{ url: string; nome: string }>;
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
  const [mostrarCampoData, setMostrarCampoData] = useState(false);
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [imagemNome, setImagemNome] = useState<string | null>(null);
  const [arrastandoArquivo, setArrastandoArquivo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const inputArquivoRef = useRef<HTMLInputElement | null>(null);

  if (gatilhoFocoNovo !== ultimoGatilho) {
    setUltimoGatilho(gatilhoFocoNovo);
    if (!expandido) {
      setExpandido(true);
    }
  }

  const limparFormulario = () => {
    setTitulo('');
    setModo('texto');
    setTexto('');
    setItens([{ id: novoIdItem(), texto: '', concluido: false }]);
    setCorFita('carmim');
    setFixado(false);
    setLembrarEm('');
    setMostrarCampoData(false);
    setImagemUrl(null);
    setImagemNome(null);
    setExpandido(false);
  };

  const anexarArquivo = async (arquivo: File | undefined) => {
    if (!arquivo || !arquivo.type.startsWith('image/')) return;
    const resultado = await aoImportarImagem(arquivo);
    setImagemUrl(resultado.url);
    setImagemNome(resultado.nome);
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
      setItens(
        linhas.length > 0
          ? linhas.map((l) => ({ id: novoIdItem(), texto: l, concluido: false }))
          : [{ id: novoIdItem(), texto: '', concluido: false }]
      );
      setModo('checklist');
    } else {
      const juntado = itens
        .map((i) => i.texto.trim())
        .filter(Boolean)
        .join('\n');
      setTexto(juntado);
      setModo('texto');
    }
  };

  const rascunhoAtual: NovoLacoInput = {
    titulo,
    modo,
    texto,
    itens,
    corFita,
    imagemUrl,
    imagemNome,
    fixado,
    lembrarEm: lembrarEm ? new Date(lembrarEm).toISOString() : null,
  };

  const podeSalvar = lacoTemConteudoValido(rascunhoAtual) && !salvando;

  const salvarLaco = async () => {
    if (!podeSalvar) return;
    setSalvando(true);
    try {
      await aoCriar(rascunhoAtual);
      limparFormulario();
    } finally {
      setSalvando(false);
    }
  };

  const aoTeclarNoCompositor = (ev: KeyboardEvent<HTMLDivElement>) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter' && podeSalvar) {
      ev.preventDefault();
      void salvarLaco();
    } else if (ev.key === 'Escape') {
      limparFormulario();
    }
  };

  return (
    <div
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
            Amarrar um novo laço... (ou cole um print com Ctrl+V)
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
              onClick={() => inputArquivoRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
            </Botao>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Faixa superior na cor viva da fita */}
          <div
            style={{ backgroundColor: `var(--fita-${corFita}-viva)` }}
            className="h-1.5 w-full transition-colors"
          />

          {/* Pre-visualizacao da imagem anexada */}
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
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Botao>
              </div>
            </div>
          )}

          <div className="p-4 space-y-3">
            {/* Cabecalho com titulo opcional e botao de fixar */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={titulo}
                onChange={(ev) => setTitulo(ev.target.value)}
                placeholder="Título (opcional)"
                className="w-full bg-transparent text-sm font-semibold text-ink placeholder:text-ink-muted focus:outline-none"
              />
              <Botao
                variante={fixado ? 'primario' : 'fantasma'}
                apenasIcone
                aria-label={fixado ? 'Desafixar do topo' : 'Fixar laço no topo'}
                title={fixado ? 'Fixado no topo' : 'Fixar no topo'}
                onClick={() => setFixado(!fixado)}
              >
                <Pin className="h-4 w-4" />
              </Botao>
            </div>

            {/* Corpo: texto livre ou checklist */}
            {modo === 'texto' ? (
              <textarea
                autoFocus
                rows={3}
                value={texto}
                onChange={(ev) => setTexto(ev.target.value)}
                placeholder="O que você não quer esquecer? (Ctrl+V cola print direto aqui)"
                className="w-full resize-none bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none leading-relaxed"
              />
            ) : (
              <div className="space-y-1.5">
                {itens.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.concluido}
                      onChange={() =>
                        setItens(
                          itens.map((it) =>
                            it.id === item.id ? { ...it, concluido: !it.concluido } : it
                          )
                        )
                      }
                      className="h-4 w-4 rounded accent-brand cursor-pointer"
                    />
                    <input
                      autoFocus={idx === itens.length - 1}
                      type="text"
                      value={item.texto}
                      onChange={(ev) =>
                        setItens(
                          itens.map((it) =>
                            it.id === item.id ? { ...it, texto: ev.target.value } : it
                          )
                        )
                      }
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
                          setItens(itens.filter((it) => it.id !== item.id));
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
                        onClick={() => setItens(itens.filter((it) => it.id !== item.id))}
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

            {/* Campo opcional de data e hora para notificacao nativa */}
            {mostrarCampoData && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border-subtle bg-panel/80 px-3 py-2">
                <Bell className="h-3.5 w-3.5 text-brand" />
                <span className="text-xs font-medium text-ink-secondary">Avisar em:</span>
                <input
                  type="datetime-local"
                  value={lembrarEm}
                  onChange={(ev) => setLembrarEm(ev.target.value)}
                  className="h-8 rounded-lg border border-border-subtle bg-panel px-2 text-xs text-ink focus:outline-none focus:border-brand"
                />
                {lembrarEm && (
                  <Botao
                    variante="fantasma"
                    apenasIcone
                    aria-label="Limpar lembrete de horário"
                    onClick={() => {
                      setLembrarEm('');
                      setMostrarCampoData(false);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Botao>
                )}
              </div>
            )}

            {/* Barra de ferramentas inferior */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border-subtle/70">
              <div className="flex flex-wrap items-center gap-1.5">
                <SeletorCorFita valor={corFita} aoMudar={setCorFita} />

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
                  onClick={() => inputArquivoRef.current?.click()}
                  title="Anexar imagem ou foto"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  <span>Imagem</span>
                </Botao>

                <Botao
                  variante={lembrarEm ? 'primario' : 'suave'}
                  onClick={() => setMostrarCampoData(!mostrarCampoData)}
                  title="Definir alerta com data e hora"
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span>Horário</span>
                </Botao>
              </div>

              <div className="flex items-center gap-1.5">
                <Botao variante="fantasma" onClick={limparFormulario}>
                  Cancelar
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
