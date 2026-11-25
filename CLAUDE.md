# Lembretes · instruções para agentes de IA

> Capturar lembranças visuais e rápidas em segundos por laços sempre à mão na tela do PC, com a recompensa sensorial do laço se desfazendo ao concluir, sem peso de projetos ou pomodoro.

Esta frase é o critério de desempate técnico: decisão que facilita outra coisa e piora essa frase está errada.

## Regras herdadas

Valem aqui todas as regras do **Livro de Decisões Técnico** do Product Hub (`C:\proj\producthub\hub\.claude\decisoes\tecnicas.md`), com seus níveis A/B/C. Este arquivo guarda apenas o que é específico do **Lembretes**.

## Mapa do repositório

| Camada | Caminho | Responsabilidade |
|---|---|---|
| Produto no Hub | `hDZh1N0VkYdxcpXrZQ5C` | Cadastro oficial em `RxDqVhbV3FGfZPcSW92f` |
| PRD | `docs/PRD.md` | Escopo vigente do MVP Desktop e gate para mobile |
| Tema e tokens (BoardUI) | `src/theme/tokens.css` | Único lugar com cores literais: rampa de accent re-tintada e fitas em claro e escuro |
| Contratos | `src/contracts/laco.ts` | Tipos e validação pura de `Laco`, cores de fita e filtros |
| Serviços (fronteira de dados) | `src/services/` | Única porta que fala com Tauri IPC / SQLite ou persistência local |
| Cache e leitura reativa | `src/hooks/useLacos.ts` | Loja reativa com `useSyncExternalStore` e sincronização entre janelas |
| Primitivos de interface (32px) | `src/components/ui/` | Botão, campo de texto, seletor de cor, abas e insígnia reutilizáveis |
| Arte vetorial e animação | `src/components/arte/` | Lacinho discreto e animação física do laço se desfazendo |
| Mural estilo Keep | `src/components/mural/` | Compositor, cartão do laço, modal de edição, lightbox e aviso de desfazer |
| Atalho flutuante do Windows | `src/components/widget/` | Janela transparente arrastável do lacinho discreto (`?janela=widget`) |
| Servidor MCP oficial | `mcp/` | Servidor `stdio` autoexplicativo sobre SQLite `WAL` com anti-duplicata (`chaveExterna`) e sincronia ao vivo |
| Shell nativo e SQLite | `src-tauri/src/` | Tauri v2, `rusqlite` sem `SELECT *`, bandeja do sistema, atalho global `Ctrl+Alt+L`, auto-updater e janelas |

## Fronteiras invioláveis

1. **Componente nunca fala com banco nem com `@tauri-apps/*` direto (T-01):** toda leitura e escrita passa por `src/services/`, consumida via `src/hooks/useLacos.ts`. Régua: `npm run check:fronteiras`.
2. **Valor visual vive somente em `src/theme/` (T-21):** zero hexadecimal (`#...`) em `src/components/`, `src/hooks/` ou `src/services/`. Claro e escuro trocam apenas pelas variáveis semânticas. Régua: `npm run check:visual`.
3. **Altura única de controle interativo em 32px (`h-8`) (T-05 / T-19):** botões, campos e abas vêm de `src/components/ui/`.
4. **Zero `SELECT *` (T-03):** tanto no SQLite em Rust (`src-tauri/src/db.rs`) quanto nos testes, toda consulta lista colunas explícitas.
5. **Zero traço como conectivo (T-08):** proibido usar `—` ou ` - ` ligando orações em código, interface, testes ou documentação. Régua: `npm run check:traco`.
6. **Zero dado em digitação preso apenas em RAM:** o compositor grava rascunho a cada tecla e salva automaticamente ao clicar fora ou pressionar `Esc` (padrão Google Keep), o modal de edição salva ao clicar fora, e o SQLite opera em `WAL` + `synchronous = FULL` com histórico imutável (`lacos_historico` via triggers) e backup automático em `backups/lembretes-ultimo.db`.

## Stack e justificativa (Passo 5 · T-04)

* **Tauri v2 + Rust + `rusqlite` (`bundled`):** entrega binário nativo Windows leve (< 15 MB), janela transparente *always on top* real para o dedo flutuante, bandeja do sistema, atalho global e banco SQLite local sem precisar empacotar Chromium nem Node inteiro, pavimentando o Tauri Mobile na fase 2.
* **React 19 + TypeScript + Vite + Tailwind CSS v4 (padrão BoardUI):** velocidade máxima de UI, tokens semânticos em CSS nativo e zero biblioteca pesada de animação (a física do laço roda em SVG + CSS/WAAPI puro e o áudio usa Web Audio API nativa).
* **Lucide React (importado seletivamente):** ícones nítidos de apoio ao mural sem inflar o bundle inicial graças ao tree-shaking do Vite.

## Comandos de verificação (Passo 8)

```bash
npm run check          # Régua completa: typecheck + vitest + fronteiras + traço + visual + build + medir:boot
npm run typecheck      # tsc --noEmit
npm run test           # vitest run (serviços, regras de negócio, cache e ciclo de vida do laço)
npm run build          # Build de produção do frontend
npm run medir:boot     # Mede o peso gzipped real do boot em dist/index.html
npm run dev            # Servidor Vite local para desenvolvimento rápido
npm run tauri:dev      # Abre o app nativo Windows completo (Mural + Dedo Flutuante + Bandeja)
npm run tauri:build    # Gera o instalador nativo do Windows (.msi / .exe)
```

## Orçamento de performance (Passo 7 · T-09)

* **Base medida no boot (`dist/index.html` gzipped):** **102,0 KB gzip** (`94,9 KB` JS + `6,9 KB` CSS + `0,3 KB` HTML, medido por `npm run medir:boot` em 25/11/2026 na `v0.4.0`).
* **Teto declarado:** **120 KB gzip**. Fatia que ultrapassar o teto bloqueia até ser otimizada ou ter aumento aprovado pelo dono.
