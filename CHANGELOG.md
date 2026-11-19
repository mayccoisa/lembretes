# Changelog

Todas as mudanças relevantes para quem usa o **Lembretes** ficam registradas aqui.

## [0.1.0] · 2026-11-19

### Adicionado
* **Mural estilo Google Keep no Windows:** criação rápida de laços com título opcional, texto livre ou checklist marcável direto no card, 6 cores semânticas de fita, fixação no topo (*pin*), busca instantânea e temas claro e escuro.
* **Anexo rápido de imagem:** colagem direta de prints da área de transferência (`Ctrl+V`), arrastar e soltar arquivo ou seleção pelo explorador, com visualização ampliada.
* **Animação do laço se desfazendo:** conclusão interativa clicando ou puxando a ponta da fita no canto do card, com física fluida, partículas na cor da fita, som sutil opcional (desligável) e aba **Desfeitos** com opção de **Reamarrar**.
* **Lacinho flutuante discreto no Windows:** janela transparente e leve (`52x48px`) apenas com o lacinho, arrastável para qualquer canto da tela, alternando a abertura das lembranças com um clique.
* **Bandeja do sistema, atalho global e alertas:** ícone na bandeja do Windows, atalho global `Ctrl+Alt+L` para amarrar novo laço e notificação nativa para lembretes com data e hora.
* **Armazenamento 100% local:** banco SQLite local (`rusqlite`) + pasta local de imagens, com versionamento de sincronização pronto para a futura versão mobile.

### Corrigido
* **Trava de instância única e transparência:** bloqueio contra abertura duplicada do widget flutuante e remoção do fundo branco e do corte de sombra na janela transparente do Windows.
