import { useEffect, useState } from 'react';
import { FirebaseError } from 'firebase/app';
import {
  criarConta,
  entrarNaConta,
  observarConta,
  redefinirSenha,
  sairDaConta,
  type ContaLembretes,
} from '../services/contaService';

type Acao = 'entrar' | 'criar' | 'redefinir';

function mensagemDeErro(erro: unknown) {
  if (erro instanceof FirebaseError) {
    switch (erro.code) {
      case 'auth/invalid-credential': return 'Confira o e-mail e a senha e tente de novo.';
      case 'auth/email-already-in-use': return 'Já existe uma conta com esse e-mail. Use Entrar.';
      case 'auth/weak-password': return 'Escolha uma senha mais forte.';
      case 'auth/too-many-requests': return 'Muitas tentativas. Aguarde e tente novamente.';
      case 'auth/network-request-failed': return 'Falha de conexão. Confira a internet e tente de novo.';
    }
  }
  return 'Não foi possível concluir. Tente de novo.';
}

export function useConta() {
  const [conta, setConta] = useState<ContaLembretes | null>(null);
  const [iniciando, setIniciando] = useState(true);
  const [indisponivel, setIndisponivel] = useState(false);
  const [acao, setAcao] = useState<Acao>('entrar');
  const [email, setEmail] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    try {
      return observarConta((atual) => {
        setConta(atual);
        setIniciando(false);
      });
    } catch {
      setIndisponivel(true);
      setIniciando(false);
    }
  }, []);

  function mudarAcao(novaAcao: Acao) {
    setAcao(novaAcao);
    setErro('');
    setAviso('');
  }

  async function executar(operacao: () => Promise<void>) {
    setOcupado(true);
    setErro('');
    setAviso('');
    try {
      await operacao();
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setOcupado(false);
    }
  }

  async function enviarSenha(senha: string) {
    const endereco = email.trim();
    await executar(async () => {
      if (acao === 'redefinir') {
        await redefinirSenha(endereco);
        setAviso('Se houver uma conta para esse e-mail, você receberá o link de redefinição.');
      } else {
        const autenticar = acao === 'criar' ? criarConta : entrarNaConta;
        await autenticar(endereco, senha);
      }
    });
  }

  function sair() {
    return executar(async () => {
      await sairDaConta();
      mudarAcao('entrar');
    });
  }

  return { conta, iniciando, indisponivel, acao, email, setEmail, ocupado, erro, aviso, mudarAcao, enviarSenha, sair };
}
