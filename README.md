# Lembretes

Aplicativo nativo de PC (Windows) inspirado na leveza do Google Keep e na ideia lúdica de **amarrar um laço no dedo para não esquecer**.

## O que ele faz

1. **Dedo com Lacinho Flutuante no Windows:** Uma janela transparente, sem bordas e sempre no topo que você arrasta livremente para qualquer canto da tela. Um clique abre suas lembranças anotadas; o botão rápido `+ Laço` cria um lembrete na hora.
2. **Mural Estilo Google Keep:** Crie laços em segundos com título opcional, texto livre ou checklist rápida, escolha a cor da fita, fixe os importantes no topo e pesquise em tempo real.
3. **Imagens por `Ctrl+V` ou Arrastar:** Cole prints da área de transferência direto no criador de laços, arraste arquivos ou escolha do computador.
4. **A Cereja do Bolo (Desfazer o Laço):** Clique ou puxe a ponta do laço no canto do card para assistir à fita se desfazendo com física fluida e som sutil opcional. O laço vai para **Desfeitos**, onde você pode reamarrar quando quiser.
5. **Bandeja do Sistema, Atalho Global (`Ctrl+Alt+L`) e Alertas:** Fica vivo na bandeja do Windows mesmo ao fechar o mural e dispara notificações nativas nos laços com data e hora.

## Como rodar

```bash
# Instalar dependências
npm install

# Rodar a régua completa (typecheck, testes, fronteiras, visual, build e peso de boot)
npm run check

# Abrir o aplicativo nativo completo no Windows (Mural + Dedo Flutuante + Bandeja)
npm run tauri:dev

# Ou apenas o servidor web rápido de desenvolvimento em http://localhost:1420
npm run dev

# Gerar o instalador nativo do Windows (.msi / .exe)
npm run tauri:build
```
