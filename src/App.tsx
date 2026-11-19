import { useState } from 'react';
import {
  Moon,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { EstadoLaco, Laco } from './contracts/laco';
import { IconeLacinhoDiscreto } from './components/arte/IconeLacinhoDiscreto';
import { BarraDesfazerToast } from './components/mural/BarraDesfazerToast';
import { CartaoLaco } from './components/mural/CartaoLaco';
import { CompositorLaco } from './components/mural/CompositorLaco';
import { ModalConfigAtalho } from './components/mural/ModalConfigAtalho';
import { ModalConfirmarAtualizacao } from './components/mural/ModalConfirmarAtualizacao';
import { ModalEditarLaco } from './components/mural/ModalEditarLaco';
import { ModalImagem } from './components/mural/ModalImagem';
import { ModalMelhoriasVersao } from './components/mural/ModalMelhoriasVersao';
import { AlternadorAba } from './components/ui/AlternadorAba';
import { Botao } from './components/ui/Botao';
import { CampoTexto } from './components/ui/CampoTexto';
import { DedoFlutuanteWidget } from './components/widget/DedoFlutuanteWidget';
import { useAtualizacao } from './hooks/useAtualizacao';
import { useLacos } from './hooks/useLacos';
import { usePreferencias } from './hooks/usePreferencias';

interface TauriMetadataWindow {
  __TAURI_INTERNALS__?: {
    metadata?: {
      currentWindow?: {
        label?: string;
      };
    };
  };
}

function detectarModoJanelaWidget(): boolean {
  if (typeof window === 'undefined') return false;
  const labelTauri = (window as unknown as TauriMetadataWindow).__TAURI_INTERNALS__?.metadata
    ?.currentWindow?.label;
  const params = new URLSearchParams(window.location.search);
  const ehWidget = labelTauri === 'widget' || params.get('janela') === 'widget';
  if (ehWidget && typeof document !== 'undefined') {
    document.documentElement.classList.add('janela-widget');
  }
  return ehWidget;
}

export function App() {
  const modoJanelaWidget = detectarModoJanelaWidget();
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState<EstadoLaco>('ativo');
  const [lacoEditando, setLacoEditando] = useState<Laco | null>(null);
  const [imagemAmpliada, setImagemAmpliada] = useState<{ url: string; titulo: string } | null>(
    null
  );
  const [modalAtalhoAberto, setModalAtalhoAberto] = useState(false);

  const prefs = usePreferencias();
  const lacos = useLacos(busca);
  const atualizacao = useAtualizacao(!modoJanelaWidget);

  if (modoJanelaWidget) {
    return (
      <DedoFlutuanteWidget
        modoJanelaNativa
        tom={prefs.tomAtalho}
        totalAtivos={lacos.totalAtivos}
        quantidadeVencidos={lacos.quantidadeVencidos}
        aoAbrirLembrancas={() => void lacos.abrirMuralNativo(false)}
        aoMenuContexto={() => void prefs.mostrarMenuWidgetNativo()}
        aoIniciarArrasteNativo={lacos.iniciarArrasteJanela}
      />
    );
  }

  const temAtivosNaVisao =
    lacos.ativosFixados.length > 0 || lacos.ativosOutros.length > 0;

  return (
    <div className="min-h-screen bg-canvas text-ink transition-colors">
      {/* Simulacao no navegador quando fora do Tauri */}
      {!prefs.emTauri && prefs.modoAtalho === 'flutuante' && (
        <DedoFlutuanteWidget
          modoJanelaNativa={false}
          tom={prefs.tomAtalho}
          totalAtivos={lacos.totalAtivos}
          quantidadeVencidos={lacos.quantidadeVencidos}
          posicaoPreview={prefs.posicaoWidgetPreview}
          aoMoverPreview={prefs.moverWidgetPreview}
          aoAbrirLembrancas={() => setAba('ativo')}
          aoMenuContexto={() => setModalAtalhoAberto(true)}
          aoIniciarArrasteNativo={lacos.iniciarArrasteJanela}
        />
      )}

      {/* Barra superior fixa estilo Google Keep */}
      <header className="sticky top-0 z-30 border-b border-border-subtle bg-canvas/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          {/* Marca no estilo circular monoline */}
          <div className="flex items-center gap-2.5">
            <span
              style={{ backgroundColor: `var(--atalho-${prefs.tomAtalho}-bg)` }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full shrink-0"
            >
              <IconeLacinhoDiscreto
                tamanho={16}
                corTracoCss={`var(--atalho-${prefs.tomAtalho}-traco)`}
              />
            </span>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-ink leading-tight">Lembretes</h1>
              <p className="text-[11px] text-ink-muted leading-tight">
                Amarre um laço para não esquecer
              </p>
            </div>
          </div>

          {/* Busca rapida */}
          <div className="flex-1 min-w-52 max-w-md">
            <CampoTexto
              value={busca}
              onChange={(ev) => setBusca(ev.target.value)}
              placeholder="Pesquisar nos seus laços..."
              aria-label="Pesquisar nos laços"
              iconeEsquerda={<Search className="h-3.5 w-3.5" />}
              acaoDireita={
                busca ? (
                  <button
                    type="button"
                    onClick={() => setBusca('')}
                    aria-label="Limpar busca"
                    className="text-ink-muted hover:text-ink cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null
              }
            />
          </div>

          {/* Abas e controles globais */}
          <div className="flex flex-wrap items-center gap-2">
            <AlternadorAba
              valor={aba}
              aoMudar={setAba}
              opcoes={[
                { id: 'ativo', rotulo: 'Ativos', contador: lacos.totalAtivos },
                { id: 'desfeito', rotulo: 'Desfeitos', contador: lacos.totalDesfeitos },
              ]}
            />

            <Botao
              variante="suave"
              onClick={atualizacao.verificarAgora}
              disabled={atualizacao.verificando || atualizacao.instalando}
              title={`Versão atual v${atualizacao.versaoAtual} · Clique para procurar nova release`}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${atualizacao.verificando ? 'animate-spin' : ''}`}
              />
              <span>v{atualizacao.versaoAtual}</span>
            </Botao>

            <Botao
              variante="suave"
              onClick={() => setModalAtalhoAberto(true)}
              title="Escolher entre bolinha flutuante ou ícone na barra de ferramentas"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>
                {prefs.modoAtalho === 'barra' ? 'Atalho: na barra' : 'Atalho: flutuante'}
              </span>
            </Botao>

            <Botao
              variante="suave"
              apenasIcone
              onClick={prefs.alternarSom}
              aria-label={prefs.somAtivo ? 'Silenciar som da fita' : 'Ativar som da fita'}
              title={prefs.somAtivo ? 'Som da fita ligado' : 'Som da fita desligado'}
            >
              {prefs.somAtivo ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Botao>

            <Botao
              variante="suave"
              apenasIcone
              onClick={prefs.alternarTema}
              aria-label={
                prefs.tema === 'claro' ? 'Mudar para tema escuro' : 'Mudar para tema claro'
              }
              title={prefs.tema === 'claro' ? 'Tema escuro' : 'Tema claro'}
            >
              {prefs.tema === 'claro' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Botao>
          </div>
        </div>
      </header>

      {/* Conteudo principal */}
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-8">
        <div className={aba === 'ativo' ? 'block' : 'hidden'}>
          <CompositorLaco
            gatilhoFocoNovo={lacos.gatilhoFocoNovo}
            aoCriar={async (input) => {
              await lacos.criar(input, prefs.somAtivo);
            }}
            aoImportarImagem={lacos.importarImagem}
            aoSalvarRascunho={lacos.salvarRascunho}
            aoLimparRascunho={lacos.limparRascunho}
          />
        </div>

        {aba === 'ativo' ? (
          temAtivosNaVisao ? (
            <div className="space-y-7">
              {lacos.ativosFixados.length > 0 && (
                <section aria-label="Laços fixados" className="space-y-3">
                  <h2 className="px-1 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                    Fixados no topo
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start">
                    {lacos.ativosFixados.map((laco) => (
                      <CartaoLaco
                        key={laco.id}
                        laco={laco}
                        aoDesfazer={async (id) => {
                          await lacos.desfazer(id, prefs.somAtivo);
                        }}
                        aoReamarrar={async (id) => {
                          await lacos.reamarrar(id, prefs.somAtivo);
                        }}
                        aoExcluir={lacos.excluir}
                        aoAlternarFixado={lacos.alternarFixado}
                        aoAlternarItemChecklist={lacos.alternarItemChecklist}
                        aoEditar={setLacoEditando}
                        aoAmpliarImagem={(url, titulo) => setImagemAmpliada({ url, titulo })}
                      />
                    ))}
                  </div>
                </section>
              )}

              {lacos.ativosOutros.length > 0 && (
                <section aria-label="Outros laços" className="space-y-3">
                  {lacos.ativosFixados.length > 0 && (
                    <h2 className="px-1 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                      Outros laços
                    </h2>
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start">
                    {lacos.ativosOutros.map((laco) => (
                      <CartaoLaco
                        key={laco.id}
                        laco={laco}
                        aoDesfazer={async (id) => {
                          await lacos.desfazer(id, prefs.somAtivo);
                        }}
                        aoReamarrar={async (id) => {
                          await lacos.reamarrar(id, prefs.somAtivo);
                        }}
                        aoExcluir={lacos.excluir}
                        aoAlternarFixado={lacos.alternarFixado}
                        aoAlternarItemChecklist={lacos.alternarItemChecklist}
                        aoEditar={setLacoEditando}
                        aoAmpliarImagem={(url, titulo) => setImagemAmpliada({ url, titulo })}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <span
                style={{ backgroundColor: `var(--atalho-${prefs.tomAtalho}-bg)` }}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full"
              >
                <IconeLacinhoDiscreto
                  tamanho={22}
                  corTracoCss={`var(--atalho-${prefs.tomAtalho}-traco)`}
                />
              </span>
              <h2 className="text-base font-semibold text-ink">
                {busca ? 'Nenhum laço combina com essa busca' : 'Tudo em dia, mente leve!'}
              </h2>
              <p className="max-w-sm text-xs text-ink-muted leading-relaxed">
                {busca
                  ? 'Tente outro termo ou limpe o campo de pesquisa acima.'
                  : 'Amarre um laço rápido ali em cima com texto, checklist ou colando uma imagem (Ctrl+V).'}
              </p>
            </div>
          )
        ) : lacos.desfeitos.length > 0 ? (
          <section aria-label="Laços desfeitos" className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Laços já desfeitos ({lacos.desfeitos.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start">
              {lacos.desfeitos.map((laco) => (
                <CartaoLaco
                  key={laco.id}
                  laco={laco}
                  aoDesfazer={async (id) => {
                    await lacos.desfazer(id, prefs.somAtivo);
                  }}
                  aoReamarrar={async (id) => {
                    await lacos.reamarrar(id, prefs.somAtivo);
                  }}
                  aoExcluir={lacos.excluir}
                  aoAlternarFixado={lacos.alternarFixado}
                  aoAlternarItemChecklist={lacos.alternarItemChecklist}
                  aoEditar={setLacoEditando}
                  aoAmpliarImagem={(url, titulo) => setImagemAmpliada({ url, titulo })}
                />
              ))}
            </div>
          </section>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-subtle">
              <IconeLacinhoDiscreto tamanho={22} corTracoCss="var(--text-muted)" />
            </span>
            <h2 className="text-base font-semibold text-ink">Nenhum laço desfeito ainda</h2>
            <p className="max-w-sm text-xs text-ink-muted leading-relaxed">
              Quando você concluir uma lembrança puxando ou clicando no laço do card, ela vem
              descansar aqui caso queira reamarrar depois.
            </p>
          </div>
        )}
      </main>

      {/* Modal de configuracao do atalho (Flutuante vs Barra de ferramentas) */}
      {modalAtalhoAberto && (
        <ModalConfigAtalho
          modoAtual={prefs.modoAtalho}
          tomAtual={prefs.tomAtalho}
          emTauri={prefs.emTauri}
          aoEscolherModo={prefs.escolherModoAtalho}
          aoEscolherTom={prefs.escolherTomAtalho}
          aoAbrirConfigBarraWindows={prefs.abrirConfigBarraWindows}
          aoFechar={() => setModalAtalhoAberto(false)}
        />
      )}

      {/* Modal de edicao */}
      {lacoEditando && (
        <ModalEditarLaco
          laco={lacoEditando}
          aoSalvar={async (input) => {
            await lacos.atualizar(input);
          }}
          aoImportarImagem={lacos.importarImagem}
          aoFechar={() => setLacoEditando(null)}
        />
      )}

      {/* Visualizador ampliado de imagem */}
      {imagemAmpliada && (
        <ModalImagem
          url={imagemAmpliada.url}
          titulo={imagemAmpliada.titulo}
          aoFechar={() => setImagemAmpliada(null)}
        />
      )}

      {/* Aviso rapido de laco desfeito com opcao de reamarrar na hora */}
      {lacos.ultimoDesfeito && (
        <BarraDesfazerToast
          laco={lacos.ultimoDesfeito}
          aoReamarrar={() => void lacos.reamarrar(lacos.ultimoDesfeito!.id, prefs.somAtivo)}
          aoDispensar={lacos.dispensarAvisoDesfeito}
        />
      )}

      {/* Aviso de status quando clica manualmente em buscar atualizacao */}
      {atualizacao.mensagemStatus && !lacos.ultimoDesfeito && (
        <div
          role="status"
          style={{ boxShadow: 'var(--shadow-elevated)' }}
          className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2.5 rounded-xl border border-border-strong bg-elevated px-4 py-2"
        >
          <span className="text-xs font-medium text-ink">{atualizacao.mensagemStatus}</span>
          <Botao variante="suave" onClick={atualizacao.abrirMelhoriasVersaoAtual}>
            <Sparkles className="h-3.5 w-3.5" />
            <span>Ver melhorias</span>
          </Botao>
          <Botao
            variante="fantasma"
            apenasIcone
            aria-label="Fechar aviso"
            onClick={atualizacao.dispensarMensagemStatus}
          >
            <X className="h-3.5 w-3.5" />
          </Botao>
        </div>
      )}

      {/* Modal de confirmacao e progresso da atualizacao automatica */}
      {atualizacao.infoPendente && (
        <ModalConfirmarAtualizacao
          info={atualizacao.infoPendente}
          instalando={atualizacao.instalando}
          progresso={atualizacao.progresso}
          erro={atualizacao.erroInstalacao}
          aoConfirmar={atualizacao.confirmarEInstalar}
          aoRecusar={atualizacao.recusarPorAgora}
        />
      )}

      {/* Modal de melhorias exibida logo apos reiniciar na versao nova */}
      {atualizacao.novidadesPosUpdate && (
        <ModalMelhoriasVersao
          novidades={atualizacao.novidadesPosUpdate}
          aoFechar={atualizacao.fecharModalMelhorias}
        />
      )}
    </div>
  );
}
