-- Permite que os equipamentos adicionados na Etapa 6.5 sejam salvos
-- no espaço correto sem remover os equipamentos anteriores.
alter table public.character_equipment
  drop constraint if exists character_equipment_item_key_check;

alter table public.character_equipment
  add constraint character_equipment_item_key_check
  check (item_key in (
    'traveler_tunic',
    'trail_boots',
    'copper_charm',
    'runic_mantle',
    'stoneguard_boots',
    'elyndor_sigil'
  ));
