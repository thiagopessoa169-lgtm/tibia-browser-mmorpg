# Etapa 5 — Polimento visual, performance e deploy

## Status geral
**Planejamento aprovado pelo usuário em 2026-11-27.** As subetapas 5.1, 5.2 e 5.3 foram implementadas, publicadas e aprovadas. A subetapa 5.4 — Revisão e deploy — está em andamento e aguarda teste do usuário.

## Objetivo
Refinar a apresentação e a experiência de Aetheria Online, preservar as funções aprovadas e revisar a publicação, integração Supabase, permissões e acesso.

## Decisões técnicas
- Manter Phaser 3.80.1, JavaScript clássico e hospedagem estática.
- Preservar as APIs e integrações atuais com Supabase.
- Não alterar regras de jogo nem dados persistidos sem necessidade e validação.
- Manter responsividade e acessibilidade por teclado.

## 5.1 — Polimento visual
**Status: aprovada pelo usuário em 2026-11-27.**

Implementado e publicado:
- Refinamento da paleta, contraste, profundidade, bordas e hierarquia visual.
- Melhorias no cabeçalho, cartões, HUD, diário de missões, diálogos e inventário.
- Estados de interação mais perceptíveis e ajustes responsivos.

## 5.2 — Performance e estabilidade
**Status: aprovada pelo usuário em 2026-11-27.**

Implementado:
- IA dos monstros executada em intervalos de 100 ms.
- Barras de vida e nomes acompanham os sprites em todos os frames; a barra só é redesenhada quando o HP muda.
- Listeners globais de foco removidos no encerramento da cena.
- Broadcast (100 ms em movimento) e persistência de posição (1.000 ms fora da arena e 300 ms na arena) revisados e mantidos.

Critérios testados e aprovados: inicialização, troca de região, IA, barras de vida, movimento, combate, multiplayer e salvamento.

## 5.3 — Experiência do jogador
**Status: aprovada pelo usuário em 2026-11-27.**

Implementado e publicado:
- Legenda de controles com teclas destacadas e layout responsivo.
- Mensagens temporárias de feedback sem apagar a legenda de controles.
- Estado de conexão e contagem de jogadores com anúncios acessíveis.
- Atributos de acessibilidade para regiões de status e botão da bolsa.
- Identificação da versão 5.3 no cabeçalho.

O usuário testou e aprovou a subetapa.

## 5.4 — Revisão e deploy
**Status: em andamento — correção de progressão publicada para teste.**

### Auditoria inicial
- Vercel: deployment anterior de produção em estado `READY`; domínio público sem proteção por senha, SSO ou restrição de IP.
- Supabase: projeto `ACTIVE_HEALTHY`, PostgreSQL 17.12.
- A auditoria inicial identificou que `authenticated` podia atualizar diretamente `level`, `hp`, `max_hp` e `xp` na tabela `characters`.
- A proteção contra senhas comprometidas continua desativada no Supabase Auth e permanece como melhoria pendente.
- Tabelas internas sem políticas RLS específicas são intencionais quando não concedem privilégios diretos a `anon` ou `authenticated`; o padrão é negar acesso direto, com operações mediadas por Edge Functions.

### Correção de progressão implementada em 2026-11-27
- Migração `20261127204141_secure_character_progression` aplicada e registrada.
- Revogados de `authenticated` os privilégios de atualização direta de `level`, `hp`, `max_hp` e `xp`; o cliente mantém atualização apenas de posição, mapa e data de atualização.
- Criada a tabela privada `character_combat_cooldowns`, com RLS habilitada e acesso somente para `service_role`.
- Criadas funções SQL `apply_monster_reward`, `apply_monster_damage` e `respawn_character`, em modo `SECURITY INVOKER`, com execução somente para `service_role`.
- Nova Edge Function `progress-action` publicada e ativa, com verificação JWT habilitada. Ela valida a sessão e a propriedade do personagem, determina as recompensas/danos no servidor e aplica cooldowns por surgimento.
- `src/backend.js` agora chama a Edge Function para recompensas, dano e renascimento; não grava mais os campos de progressão diretamente.
- `src/game.js` aplica os valores confirmados pelo servidor. O modo local sem conta continua usando progressão local.
- As recompensas de missões continuam usando a rotina de servidor já existente.

### Verificações técnicas após a correção
- Banco registra 10 migrações.
- Quatro Edge Functions ativas: `arena-attack`, `quest-action`, `inventory-action` e `progress-action`; todas com verificação JWT habilitada.
- Consulta de privilégios confirmou que `authenticated` não tem UPDATE em `level`, `hp`, `max_hp` ou `xp`.
- A tabela de cooldowns não concede privilégios a `anon` ou `authenticated`.
- As três funções SQL novas não são executáveis por `authenticated`; apenas `service_role` tem EXECUTE.
- As funções SQL novas usam `SECURITY INVOKER`, não `SECURITY DEFINER`.

### Limitação conhecida
O cálculo de XP/nível, o HP persistido e o renascimento agora são controlados pelo servidor, e os eventos de recompensa têm validação de região/posição persistida e cooldown. Porém, a movimentação e a simulação de combate ainda ocorrem no cliente; como a posição também é enviada pelo navegador, isso não equivale a um sistema antitrapaça totalmente autoritativo. Uma simulação completa no servidor exigiria uma etapa arquitetural maior.

### Pendências para concluir 5.4
- Publicar e confirmar o novo deployment Vercel após os commits da correção.
- Testar no jogo: derrotar monstros na Vila e no Bosque, receber XP, subir de nível, receber dano, morrer/renascer, completar a missão de caça e verificar persistência após sair e entrar novamente.
- Testar login e troca de região no domínio público, preferencialmente em outro computador/rede.
- Avaliar a proteção contra senhas comprometidas no Auth. A documentação do Supabase informa que esse recurso depende do plano Pro ou superior; não foi alterado nesta correção.
- Após os testes, submeter a 5.4 à aprovação do usuário.

## Regra de avanço
Cada subetapa será implementada, publicada para teste, validada pelo usuário e só então marcada como aprovada. Não declarar a Etapa 5 concluída enquanto os testes finais não forem aprovados ou as limitações restantes não forem explicitamente aceitas.
