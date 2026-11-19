# Lembretes

Aplicativo nativo de PC (Windows) leve e divertido, inspirado na simplicidade do Google Keep, onde cada lembrança é um **laço** que você amarra para não esquecer e desfaz com uma animação fluida ao concluir.

## Download rápido (Windows)

Baixe o executável mais recente direto em [**Releases › Latest (`lembretes.exe`)**](https://github.com/mayccoisa/lembretes/releases/latest).
A partir da primeira instalação, o próprio aplicativo avisa quando sair versão nova, baixa, atualiza sozinho e reinicia mostrando as novidades!

## Principais recursos

* **Mural estilo Google Keep:** crie laços rápidos com título opcional, texto livre ou checklist marcável direto no card, 6 cores de fita, fixação no topo (*pin*), busca instantânea e temas claro e escuro.
* **Auto-save contínuo e blindagem local:** clicar fora ou apertar `Esc` salva automaticamente; rascunhos são gravados a cada tecla e os dados vivem 100% locais em SQLite (`WAL` + histórico imutável de versões).
* **Imagens por `Ctrl+V` ou arrastar:** cole prints direto da área de transferência no criador de laços, arraste arquivos ou selecione do computador.
* **A cereja do bolo:** clique ou puxe a ponta do laço no canto do card para ver a fita se desfazendo com física fluida e som sutil opcional, movendo para **Desfeitos** com opção de **Reamarrar**.
* **Atalho flexível no Windows:** escolha entre a **bolinha flutuante minimalista** (arrastável para qualquer canto da tela) ou deixar o ícone monocromático **apenas dentro da barra de ferramentas do Windows**, além do atalho global `Ctrl+Alt+L` e alertas nativos por horário.
* **Atualização automática integrada:** sincroniza na abertura e pelo botão de versão no topo, instalando novas releases do GitHub com 1 clique e exibindo o resumo de melhorias após reiniciar.

## Stack técnica

* **Shell nativo e banco:** Tauri v2 (Rust) + `rusqlite` (`bundled`)
* **Interface:** React 19 + TypeScript + Vite + Tailwind CSS v4 (tokens semânticos BoardUI)

## Desenvolvimento local

```bash
# Instalar dependências
npm install

# Rodar a régua completa (typecheck, testes, fronteiras, visual, build e orçamento de boot)
npm run check

# Abrir em modo nativo de desenvolvimento
npm run tauri:dev

# Gerar o executável nativo do Windows
npx tauri build --no-bundle
```
