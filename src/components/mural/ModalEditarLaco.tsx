import { useRef, useState, type ClipboardEvent } from 'react';
import { AlignLeft, Bell, CheckSquare, ImagePlus, Pin, Plus, Trash2, X } from 'lucide-react';
import type { AtualizarLacoInput, CorFita, ItemChecklist, Laco, ModoConteudo } from '../../contracts/laco';
import { Botao } from '../ui/Botao';
import { SeletorCorFita } from '../ui/SeletorCorFita';

interface ModalEditarLacoProps {
  laco: Laco;
  aoSalvar: (input: AtualizarLacoInput) => Promise<void>;
  aoImportarImagem: (arquivo: File) => Promise<{ url: string; nome: string }>;
  aoFechar: () => void;
}

function paraDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function novoIdItem(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function ModalEditarLaco({
  laco,
  aoSalvar,
  aoImportarImagem,
  aoFechar,
}: ModalEditarLacoProps) {
  const [titulo, setTitulo] = useState(laco.titulo);
  const [modo, setModo] = useState<ModoConteudo>(laco.modo);
  const [texto, setTexto] = useState(laco.texto);
  const [itens, setItens] = useState<ItemChecklist[]>(
    laco.itens.length > 0 ? laco.itens : [{ id: novoIdItem(), texto: '', concluido: false }]
  );
  const [corFita, setCorFita] = useState<CorFita>(laco.corFita);
  const [fixado, setFixado] = useState(laco.fixado);
  const [lembrarEm, setLembrarEm] = useState(paraDatetimeLocal(laco.lembrarEm));
  const [imagemUrl, setImagemUrl] = useState<string | null>(laco.imagemUrl);
  const [imagemNome, setImagemNome] = useState<string | null>(laco.imagemNome);
  const inputArquivoRef = useRef<HTMLInputElement | null>(null);

  const anexarArquivo = async (arquivo: File | undefined) => {
    if (!arquivo || !arquivo.type.startsWith('image/')) return;
    const res = await aoImportarImagem(arquivo);
    setImagemUrl(res.url);
    setImagemNome(res.nome);
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

  const salvarFechar = async () => {
    await aoSalvar({
      id: laco.id,
      titulo,
      modo,
      texto,
      itens: itens.filter((i) => i.texto.trim().length > 0),
      corFita,
      fixado,
      imagemUrl,
      imagemNome,
      lembrarEm: lembrarEm ? new Date(lembrarEm).toISOString() : null,
    });
    aoFechar();
  };

  return (
    <div
      onClick={aoFechar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Editar laço"
    >
      <div
        onClick={(ev) => ev.stopPropagation()}
        onPaste={aoColar}
        style={{
          backgroundColor: `var(--fita-${corFita}-bg)`,
          borderColor: `var(--fita-${corFita}-borda)`,
          boxShadow: 'var(--shadow-elevated)',
        }}
        className="w-full max-w-xl rounded-2xl border overflow-hidden"
      >
        <div style={{ backgroundColor: `var(--fita-${corFita}-viva)` }} className="h-2 w-full" />

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

        {imagemUrl && (
          <div className="relative border-b border-border-subtle bg-subtle">
            <img
              src={imagemUrl}
              alt={imagemNome ?? 'Imagem do laço'}
              className="max-h-64 w-full object-cover"
            />
            <div className="absolute top-2.5 right-2.5">
              <Botao
                variante="suave"
                apenasIcone
                aria-label="Remover imagem"
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

        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={titulo}
              onChange={(ev) => setTitulo(ev.target.value)}
              placeholder="Título da lembrança"
              className="w-full bg-transparent text-base font-semibold text-ink placeholder:text-ink-muted focus:outline-none"
            />
            <Botao
              variante={fixado ? 'primario' : 'fantasma'}
              apenasIcone
              aria-label="Fixar no topo"
              onClick={() => setFixado(!fixado)}
            >
              <Pin className="h-4 w-4" />
            </Botao>
          </div>

          {modo === 'texto' ? (
            <textarea
              rows={5}
              value={texto}
              onChange={(ev) => setTexto(ev.target.value)}
              placeholder="Escreva sua lembrança..."
              className="w-full resize-none bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none leading-relaxed"
            />
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {itens.map((item) => (
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
                    type="text"
                    value={item.texto}
                    onChange={(ev) =>
                      setItens(
                        itens.map((it) =>
                          it.id === item.id ? { ...it, texto: ev.target.value } : it
                        )
                      )
                    }
                    placeholder="Item..."
                    className={`w-full bg-transparent text-sm focus:outline-none ${
                      item.concluido ? 'line-through text-ink-muted' : 'text-ink'
                    }`}
                  />
                  <Botao
                    variante="fantasma"
                    apenasIcone
                    aria-label="Remover item"
                    onClick={() => setItens(itens.filter((it) => it.id !== item.id))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Botao>
                </div>
              ))}
              <Botao
                variante="fantasma"
                onClick={() =>
                  setItens([...itens, { id: novoIdItem(), texto: '', concluido: false }])
                }
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Novo item</span>
              </Botao>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border-subtle bg-panel/75 px-3 py-2">
            <Bell className="h-3.5 w-3.5 text-brand" />
            <span className="text-xs font-medium text-ink-secondary">Lembrar em:</span>
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
                aria-label="Limpar data"
                onClick={() => setLembrarEm('')}
              >
                <X className="h-3.5 w-3.5" />
              </Botao>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-subtle/70">
            <div className="flex flex-wrap items-center gap-1.5">
              <SeletorCorFita valor={corFita} aoMudar={setCorFita} />
              <Botao
                variante="suave"
                onClick={() => setModo(modo === 'texto' ? 'checklist' : 'texto')}
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
              <Botao variante="suave" onClick={() => inputArquivoRef.current?.click()}>
                <ImagePlus className="h-3.5 w-3.5" />
                <span>Imagem</span>
              </Botao>
            </div>

            <div className="flex items-center gap-1.5">
              <Botao variante="fantasma" onClick={aoFechar}>
                Cancelar
              </Botao>
              <Botao variante="primario" onClick={() => void salvarFechar()}>
                Salvar laço
              </Botao>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
