-- Corrige a lista de itens permitidos no inventário para as recompensas de Elyndor.
-- A migração 6.5 adicionou os itens aos sistemas de recompensa, mas a CHECK
-- constraint da tabela ainda aceitava apenas os itens da etapa 4.3.

alter table public.character_inventory
  drop constraint if exists character_inventory_item_key_check;

alter table public.character_inventory
  add constraint character_inventory_item_key_check
  check (item_key in (
    'medicinal_herb',
    'slime_essence',
    'traveler_tunic',
    'trail_boots',
    'copper_charm',
    'rune_crystal',
    'guardian_core',
    'runic_mantle',
    'stoneguard_boots',
    'elyndor_sigil'
  ));
