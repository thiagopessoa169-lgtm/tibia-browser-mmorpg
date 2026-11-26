# Etapa 2 — Configuração do Supabase

A Etapa 2 adiciona autenticação, personagens persistentes e presença/movimento em tempo real. O jogo continua abrindo em modo local enquanto as credenciais não forem configuradas.

## 1. Criar o projeto

1. Crie um projeto no Supabase.
2. No painel do projeto, abra **Connect** e copie a Project URL e a chave **Publishable** (prefixo `sb_publishable_`).
3. Nunca use uma chave `secret` ou `service_role` no navegador.

## 2. Configurar o jogo

Edite `src/supabase-config.js`:

```js
window.AETHERIA_SUPABASE_CONFIG = {
  url: "https://SEU-PROJETO.supabase.co",
  publishableKey: "sb_publishable_SUA_CHAVE"
};
```

A URL e a chave publishable são próprias para uso no cliente quando as tabelas estão protegidas por RLS.

## 3. Criar as tabelas e políticas

No Supabase, abra **SQL Editor**, cole o conteúdo de `supabase/migrations/20261126000000_stage_2_characters.sql` e execute.

A migração cria a tabela `characters`, ativa RLS, limita cada conta aos próprios personagens e autoriza apenas usuários autenticados no canal privado `aetheria:world`.

Como as tabelas novas podem não ser expostas automaticamente pela Data API em projetos recentes, a migração também concede explicitamente os privilégios mínimos para o papel `authenticated`.

## 4. Realtime

Em **Realtime → Settings**, desative **Allow public access** para exigir canais privados. O código usa presença para a lista de jogadores conectados e Broadcast para enviar posições, limitado a 10 atualizações por segundo. A posição é salva no banco no máximo uma vez a cada 3 segundos.

## 5. Teste

1. Abra o site em duas janelas ou navegadores.
2. Crie duas contas diferentes e confirme os e-mails, caso a confirmação esteja ativada.
3. Crie um personagem em cada conta.
4. Entre no mundo. A lista de jogadores online deve refletir as conexões e os personagens devem aparecer um para o outro.

## Limites desta etapa

- A posição é enviada pelo cliente; ainda não há simulação autoritativa no servidor nem validação anti-cheat completa.
- A presença e o Broadcast são efêmeros; a posição persistente é salva na tabela de personagens.
- O mundo continua sendo um mapa de protótipo. Combate, monstros e progressão ficam para a Etapa 3.
