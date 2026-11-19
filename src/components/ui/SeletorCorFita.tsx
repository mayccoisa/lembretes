import { CORES_FITA, type CorFita } from '../../contracts/laco';

interface SeletorCorFitaProps {
  valor: CorFita;
  aoMudar: (cor: CorFita) => void;
}

export function SeletorCorFita({ valor, aoMudar }: SeletorCorFitaProps) {
  return (
    <div className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-subtle bg-subtle px-2" role="radiogroup" aria-label="Cor da fita do laço">
      {CORES_FITA.map((cor) => {
        const ativo = cor.id === valor;
        return (
          <button
            key={cor.id}
            type="button"
            role="radio"
            aria-checked={ativo}
            aria-label={cor.rotulo}
            title={cor.rotulo}
            onClick={() => aoMudar(cor.id)}
            style={{ backgroundColor: `var(--fita-${cor.id}-viva)` }}
            className={`h-4 w-4 rounded-full transition-transform cursor-pointer focus-visible:outline-2 focus-visible:outline-brand ${
              ativo ? 'scale-125 ring-2 ring-ink' : 'opacity-75 hover:opacity-100 hover:scale-110'
            }`}
          />
        );
      })}
    </div>
  );
}
