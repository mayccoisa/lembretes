# Changelog

Todas as mudanças relevantes para quem usa o **Lembretes** ficam registradas aqui.

## [0.3.0] · 2026-11-19

### Adicionado
* **Servidor MCP oficial (`mcp/iniciar.mjs`):** integração direta via `stdio` para que agentes de IA entendam o produto sozinhos (`entender_lembretes`), analisem canais externos e criem ou atualizem lembretes recorrentes com proteção anti-duplicata (`chaveExterna` + `canalOrigem`) e atualização em tempo real na tela aberta.
* **Lembretes recorrentes inteligentes:** suporte a repetição diária, seg a sex (dias úteis), semanal, mensal ou a cada `N` horas/dias. Ao desfazer um laço recorrente hoje, ele sai da visão de hoje (ficando consultável na aba **Próximos**) e retorna automaticamente para **Ativos** quando o próximo ciclo chega.
* **Notificações de vencimentos do dia:** botão **Hoje (N)** no topo com painel dedicado, faixa de foco rápido (*Filtrar só hoje*) e notificação nativa do Windows avisando quantos lembretes vencem hoje.

## [0.2.0] · 2026-11-19

### Adicionado
* **Atualização automática integrada:** verifica novas releases automaticamente ao abrir o app e também pelo botão de versão no topo. Ao encontrar nova versão, pede confirmação, baixa com barra de progresso real, instala sozinho, reinicia e exibe a modal com as melhorias da versão.
* **Escolha entre bolinha flutuante e barra de ferramentas:** novo ícone circular lavanda com traço fino monoline (`1.4px`) e seletor para manter o atalho flutuando na tela ou recolhido apenas dentro da barra de ferramentas do Windows 11.
* **Auto-save estilo Google Keep:** digitar um laço ou editar um existente salva automaticamente ao clicar fora ou pressionar `Esc`.

### Melhorado
* **Blindagem total contra perda de dados:** persistência de rascunho a cada tecla com resgate automático na abertura, SQLite em modo `WAL` + `synchronous = FULL`, histórico imutável `lacos_historico` via triggers e backup automático em `backups/lembretes-ultimo.db`.

## [0.1.0] · 2026-11-19

### Adicionado
* **Mural estilo Google Keep no Windows:** criação rápida de laços com título opcional, texto livre ou checklist marcável direto no card, 6 cores semânticas de fita, fixação no topo (*pin*), busca instantânea e temas claro e escuro.
* **Anexo rápido de imagem:** colagem direta de prints da área de transferência (`Ctrl+V`), arrastar e soltar arquivo ou seleção pelo explorador, com visualização ampliada.
* **Animação do laço se desfazendo:** conclusão interativa clicando ou puxando a ponta da fita no canto do card, com física fluida, partículas na cor da fita, som sutil opcional (desligável) e aba **Desfeitos** com opção de **Reamarrar**.
* **Bandeja do sistema, atalho global e alertas:** ícone na bandeja do Windows, atalho global `Ctrl+Alt+L` para amarrar novo laço e notificação nativa para lembretes com data e hora.
* **Armazenamento 100% local:** banco SQLite local (`rusqlite`) + pasta local de imagens, com versionamento de sincronização pronto para a futura versão mobile.
