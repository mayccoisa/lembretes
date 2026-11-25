import type { FormEvent } from 'react';
import { useConta } from '../../hooks/useConta';
import { useSincronizacao } from '../../hooks/useSincronizacao';
import { Botao } from '../ui/Botao';
import { CampoTexto } from '../ui/CampoTexto';

type Acao = 'entrar' | 'criar' | 'redefinir';

const rotulos: Record<Acao, string> = {
  entrar: 'Entrar',
  criar: 'Criar conta',
  redefinir: 'Enviar link de redefinição',
};

export default function PainelConta({ sincronizacaoDisponivel }: { sincronizacaoDisponivel: boolean }) {
  const {
    conta, iniciando, indisponivel, acao, email, setEmail,
    ocupado, erro, aviso, mudarAcao, enviarSenha, sair,
  } = useConta();
  const sincronizacao = useSincronizacao();

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    void enviarSenha(String(dados.get('senha') ?? ''));
  }

  if (iniciando) return <p role="status" className="text-xs text-ink-muted">Abrindo conta…</p>;
  if (indisponivel) return <p className="text-xs text-ink-muted">A conexão de conta ainda não está disponível nesta versão.</p>;

  return (
    <section aria-label="Conta dos Lembretes" aria-busy={ocupado} className="space-y-3">
      {conta ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-ink">Conectado como {conta.email}</p>
          <Botao disabled={ocupado} onClick={() => void sair()}>Sair da conta</Botao>
        </div>
      ) : (
        <form onSubmit={enviar} className="max-w-sm space-y-3">
          <label className="block space-y-1 text-xs text-ink">
            <span>E-mail</span>
            <CampoTexto name="email" type="email" autoComplete="username" required value={email}
              onChange={(ev) => setEmail(ev.target.value)} aria-describedby={erro ? 'conta-erro' : undefined} />
          </label>
          {acao !== 'redefinir' && (
            <label className="block space-y-1 text-xs text-ink">
              <span>Senha</span>
              <CampoTexto key={acao} name="senha" type="password" required minLength={acao === 'criar' ? 6 : undefined}
                autoComplete={acao === 'criar' ? 'new-password' : 'current-password'}
                aria-describedby={erro ? 'conta-erro' : undefined} />
            </label>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Botao type="submit" variante="primario" disabled={ocupado}>{ocupado ? 'Aguarde…' : rotulos[acao]}</Botao>
            {acao === 'entrar' ? (
              <>
                <Botao variante="fantasma" disabled={ocupado} onClick={() => mudarAcao('criar')}>Criar conta</Botao>
                <Botao variante="fantasma" disabled={ocupado} onClick={() => mudarAcao('redefinir')}>Esqueci a senha</Botao>
              </>
            ) : (
              <Botao variante="fantasma" disabled={ocupado} onClick={() => mudarAcao('entrar')}>Voltar para entrar</Botao>
            )}
          </div>
        </form>
      )}
      {conta && sincronizacaoDisponivel && sincronizacao.uid === conta.uid && (
        <div className="space-y-2 text-xs text-ink-muted" role="status">
          {sincronizacao.fase === 'desligada' && (
            <>
              <p>Vincule este computador para reunir seus lembretes e imagens nesta conta.</p>
              <Botao variante="primario" onClick={() => void sincronizacao.ativar()}>Ativar sincronização neste computador</Botao>
            </>
          )}
          {sincronizacao.fase === 'outra-conta' && <p>Entre com a conta vinculada aos lembretes deste computador.</p>}
          {sincronizacao.fase === 'sincronizando' && <p>Sincronizando lembretes e imagens…</p>}
          {sincronizacao.fase === 'em-dia' && <p>Lembretes e imagens em dia.</p>}
          {sincronizacao.fase === 'erro' && (
            <>
              <p>A sincronização encontrou um problema. Seus lembretes continuam disponíveis neste computador.</p>
              <Botao onClick={sincronizacao.tentarNovamente}>Tentar novamente</Botao>
            </>
          )}
        </div>
      )}
      {erro && <p role="alert" id="conta-erro" className="text-xs text-danger">{erro}</p>}
      {aviso && <p role="status" className="text-xs text-ink-muted">{aviso}</p>}
    </section>
  );
}
