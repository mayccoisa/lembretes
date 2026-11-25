# Servidor MCP do Lembretes

Servidor MCP local (`stdio`) que permite a qualquer agente de IA (Claude Code, Antigravity, Codex, Cursor) entender o funcionamento do **Lembretes**, consultar o que vence hoje e criar ou atualizar lembretes recorrentes a partir da análise de canais externos (Slack, Jira, WhatsApp, e-mail, Product Hub).

## Como conectar na sua IA

Copie o bloco de [configuracao.exemplo.json](../mcp/configuracao.exemplo.json) para o seu arquivo de configuração de MCP:

```json
{
  "mcpServers": {
    "lembretes": {
      "command": "node",
      "args": [
        "--no-warnings",
        "D:/projetos/lembretes/mcp/iniciar.mjs"
      ]
    }
  }
}
```

* **Funciona com o app aberto ou fechado:** grava direto no banco SQLite oficial (`%APPDATA%\com.mayconrocha.lembretes\lembretes.db`) em modo `WAL`.
* **Atualização instantânea na tela:** se o Lembretes estiver aberto no Windows, o MCP envia o sinal local `RECARREGAR` e o card aparece na hora no seu Mural.

## Ferramentas disponíveis

| Ferramenta | Finalidade |
|---|---|
| `entender_lembretes` | Entrega à IA o guia completo do produto, semântica das cores de fita, tipos de recorrência e resumo atual do dia |
| `resumo_vencimentos_hoje` | Lista exatamente quantos e quais lembretes vencem hoje (incluindo atrasados visíveis) |
| `listar_lacos` | Filtra laços por visão (`ativos`, `agendados`, `desfeitos`, `todos`), busca, `canalOrigem` ou `somenteHoje` |
| `criar_ou_atualizar_laco` | Cria laço simples ou recorrente (`diaria`, `dias-uteis`, `semanal`, `mensal`, `intervalo-horas`, `intervalo-dias`), com `chaveExterna` anti-duplicata |
| `atualizar_laco` | Edita título, texto, cor, horário ou recorrência de um laço existente |
| `desfazer_laco` | Conclui o ciclo atual (se for recorrente, esconde hoje e reagenda automaticamente para o próximo ciclo) |
| `reamarrar_laco` | Traz um laço desfeito ou agendado de volta para os ativos de hoje |
| `excluir_laco` | Remove logicamente do mural preservando auditoria em `lacos_historico` |
