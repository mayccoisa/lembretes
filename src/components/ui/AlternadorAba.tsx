interface OpcaoAba<T extends string> {
  id: T;
  rotulo: string;
  contador?: number;
}

interface AlternadorAbaProps<T extends string> {
  opcoes: ReadonlyArray<OpcaoAba<T>>;
  valor: T;
  aoMudar: (novo: T) => void;
}

export function AlternadorAba<T extends string>({
  opcoes,
  valor,
  aoMudar,
}: AlternadorAbaProps<T>) {
  return (
    <div
      role="tablist"
      aria-label="Filtro de estado dos laços"
      className="inline-flex h-8 items-center gap-1 rounded-lg border border-border-subtle bg-subtle p-0.5"
    >
      {opcoes.map((op) => {
        const selecionado = op.id === valor;
        return (
          <button
            key={op.id}
            type="button"
            role="tab"
            aria-selected={selecionado}
            onClick={() => aoMudar(op.id)}
            className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors cursor-pointer ${
              selecionado
                ? 'bg-panel text-ink shadow-xs'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <span>{op.rotulo}</span>
            {op.contador !== undefined && (
              <span
                className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                  selecionado ? 'bg-brand-soft text-brand' : 'bg-hover text-ink-muted'
                }`}
              >
                {op.contador}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
