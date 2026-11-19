# Lembretes · MVP Desktop (Windows)

## 1. Visão Geral e Problem Statement

### Problema e Job-to-be-Done (JTBD)
Quando surge algo rápido que não posso esquecer no meio do trabalho no computador (um recado, um print que preciso resolver hoje, uma compra rápida ou uma lista curta), abrir ferramentas completas de gestão de tarefas e projetos gera atrito excessivo, enquanto blocos de notas comuns somem no meio das janelas e não trazem prazer nenhum ao concluir.

**Frase-guia do produto:**
> Capturar lembranças visuais e rápidas em segundos por laços sempre à mão na tela do PC, com a recompensa sensorial do laço se desfazendo ao concluir, sem peso de projetos ou pomodoro.

### Público-Alvo e Fronteira
* **Público inicial:** Produto B2C indie, validado primeiro no uso diário do próprio criador no Windows.
* **Fronteira clara com gestores completos (ex.: Register Life):** O Lembretes é voltado exclusivamente para captura visual rápida e efêmera. Não possui projetos, subtarefas em árvore, cronômetro de foco nem relatórios de produtividade.

---

## 2. Solução Proposta e Metáfora Central

Inspirado na simplicidade do mural do Google Keep e na tradição lúdica de **amarrar um laço no dedo para não esquecer**:
1. **Identidade e Ícone:** Um dedo indicador com um lacinho amarrado.
2. **Unidade central ("Laço"):** Cada lembrança anotada é um laço colorido que guarda texto ou checklist rápida, imagem anexada e alerta opcional.
3. **Atalho Flutuante no Windows (Dedo com Lacinho):** Uma janelinha transparente, sem bordas e sempre visível (*always on top*) com o dedo e o lacinho, que o usuário pode arrastar livremente para qualquer canto da tela do Windows. Clicar nele abre imediatamente as lembranças anotadas (ou permite amarrar um novo laço na hora).
4. **Mural Principal + Bandeja + Atalho Global:** Janela principal em grade responsiva estilo Google Keep, acompanhada de ícone na bandeja do sistema (*system tray*) e atalho global de teclado para captura rápida de qualquer tela.
5. **A Cereja do Bolo (Desfazer o Laço):** Concluir uma lembrança aciona uma animação física fluida da fita se desatando (~600ms), acompanhada de efeito sonoro sutil opcional (desligável), movendo o card suavemente para **Desfeitos** com possibilidade de reamarrar.

---

## 3. Histórias de Usuário

1. **Como usuário no Windows**, quero ter um **dedo com lacinho flutuante** que posso arrastar para onde não atrapalhe na minha tela, para que com um clique eu abra minhas lembranças anotadas sem caçar janelas na barra de tarefas.
2. **Como usuário focado em outra tarefa**, quero acionar um atalho global de teclado ou clicar no ícone da bandeja para amarrar um novo laço em poucos segundos e voltar ao que estava fazendo.
3. **Como usuário visual**, quero criar um laço com título opcional, texto livre ou checklist rápida, escolher a cor da fita e colar uma imagem direto da área de transferência (`Ctrl+V`), arrastar um arquivo ou selecionar do disco, para lembrar visualmente do que precisa ser feito.
4. **Como usuário**, quero fixar laços importantes no topo do mural e pesquisar instantaneamente pelo texto para achar qualquer lembrança sem rolar listas longas.
5. **Como usuário**, quero definir opcionalmente uma data e hora num laço para receber uma notificação nativa do Windows e ver um sinal visual no dedo flutuante quando chegar o momento.
6. **Como usuário**, quero clicar ou puxar a pontinha do laço ao concluir a tarefa e assistir à fita se desfazendo com física fluida e som sutil opcional, sentindo prazer real ao limpar minhas pendências, podendo reamarrar o laço na aba **Desfeitos** caso tenha concluído por engano.

---

## 4. Regras de Negócio e Ciclo de Vida do Laço

* **RN-01 · Criação sem bloqueio:** Um laço pode ser salvo desde que tenha ao menos título, texto, item de checklist ou imagem anexada. Nenhum campo isolado trava o salvamento rápido.
* **RN-02 · Gatilho híbrido (Mural + Alerta opcional):** Por padrão o laço vive no mural visual sem exigir data. Quando o usuário informa data e hora, o aplicativo dispara notificação nativa do Windows no horário e sinaliza no widget flutuante até ser visto ou concluído.
* **RN-03 · Ciclo de conclusão e reversão:** Ao acionar a conclusão, a animação do laço desatando roda (~600ms) antes de o card sair da visão de ativos. O laço muda para o estado `desfeito` (guardando `desfeitoEm`), fica acessível na visão **Desfeitos** e oferece a ação **Reamarrar** (que restaura para ativo) e **Excluir definitivamente** (que apaga registro e imagem órfã do disco).
* **RN-04 · Persistência 100% local pronta para futuro mobile:** No MVP de PC, todos os dados ficam em SQLite local e as imagens em pasta local de dados do aplicativo, sem login e sem custo de nuvem. Todo registro já nasce com `id` (UUID v4), `createdAt`, `updatedAt`, `deletedAt` e `syncVersion` para viabilizar a futura sincronização com celular sem migração destrutiva.
* **RN-05 · Posição do Dedo Flutuante:** A posição `(x, y)` para onde o usuário arrastar o dedo flutuante na tela do Windows é preservada localmente, diferenciando gesto de arrastar de clique simples para não abrir o mural por acidente durante o movimento.

---

## 5. Critérios de Aceite do MVP (PC)

* [x] **CA-01 · Dedo Flutuante no Windows:** Janela transparente, sempre no topo e fora da barra de tarefas comum, exibindo o dedo com lacinho e contador discreto de laços ativos; arrastável pela tela e abrindo/alternando as lembranças anotadas ao clicar.
* [x] **CA-02 · Mural e Captura Estilo Keep:** Criação e edição de laços com título opcional, alternância texto/checklist, escolha entre cores semânticas de fita, fixação no topo (*pin*) e busca instantânea por termo.
* [x] **CA-03 · Entrada de Imagem:** Suporte a colar print/imagem via `Ctrl+V`, arrastar arquivo para o editor ou selecionar via explorador de arquivos, exibindo miniatura limpa no card e visualização ampliada ao clicar.
* [x] **CA-04 · Animação do Laço se Desfazendo:** Ao concluir (clicar ou puxar a ponta do laço), o laço vetorial executa animação fluida de desatar (~600ms) na cor da fita do card, toca feedback sonoro sutil quando o som estiver ativo e move o item para a aba **Desfeitos**, exibindo opção rápida de desfazer a ação ou reamarrar depois.
* [x] **CA-05 · Bandeja, Atalho Global e Notificação:** Ícone na bandeja do Windows com ações rápidas, atalho global funcional para abrir captura rápida e disparo de notificação nativa quando um lembrete agendado atinge o horário.
* [x] **CA-06 · Temas Claro e Escuro:** Interface construída sobre tokens semânticos do BoardUI re-tintados com rampa quente/lúdica, alternando entre claro e escuro sem nenhum valor hexadecimal solto em componente.

---

## 6. Requisitos Técnicos e de Design

* **Stack do MVP Desktop:** Tauri v2 (Rust) + React 19 + TypeScript + Tailwind CSS v4 + SQLite local. Instalador leve (< 15 MB), inicialização instantânea e caminho pavimentado para Tauri Mobile na fase 2.
* **Padrão Visual:** **BoardUI** re-tintado na rampa de accent (`color-accent-50` a `color-accent-950`) com identidade acolhedora de fita/papel, respeitando as regras do Livro Técnico (`services/` isolando o banco, controles padronizados em 32px em `components/ui/` e zero hex fora do tema).

---

## 7. Métricas de Sucesso (Gate PC para Celular)

* **Critério concreto de validação do MVP:** Uso real contínuo pelo próprio criador durante **14 dias seguidos no PC**, com pelo menos **30 laços criados e desfeitos** no fluxo diário sem precisar recorrer a blocos de notas soltos. Bater essa meta libera o início da versão mobile.

---

## 8. Impacto na Arquitetura e Pendências

### Impacto no Produto
Produto novo (`Lembretes`, ID no Hub `hDZh1N0VkYdxcpXrZQ5C`, repositório local em `C:\proj\producthub\produtos\lembretes`), sem acoplamento com bancos ou serviços dos demais produtos do workspace. Mapa de arquitetura inaugurado do zero nesta iniciativa.

### Pendências Declaradas
1. **Combinação padrão do atalho global configurável** (default inicial implementado `Ctrl+Alt+L`, futura tela de personalização) · **Decide:** PM / Designer.
2. **Curadoria fina da paleta das fitas e arte final do ícone na guardiã do DS** · **Decide:** Designer + `guardia-ds`.
3. **Preferência default de inicialização automática no login do Windows** · **Decide:** PM / Eng. Arquiteto.
4. **Arquitetura de sincronização nuvem entre PC e Celular (Fase 2)** · **Decide:** Eng. Arquiteto somente após atingir a meta de validação de 14 dias / 30 laços.
