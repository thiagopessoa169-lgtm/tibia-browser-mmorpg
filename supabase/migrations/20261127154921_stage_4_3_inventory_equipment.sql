-- Aetheria Online — Etapa 4.3: bolsa e equipamentos persistentes
create table if not exists public.character_inventory (
  character_id uuid not null references public.characters(id) on delete cascade,
  item_key text not null check (item_key in (
    'medicinal_herb','slime_essence','traveler_tunic','trail_boots','copper_charm'
  )),
  quantity integer not null check (quantity > 0 and quantity <= 999),
  updated_at timestamptz not null default now(),
  primary key (character_id,item_key)
);
create table if not exists public.character_equipment (
  character_id uuid not null references public.characters(id) on delete cascade,
  slot text not null check (slot in ('body','feet','amulet')),
  item_key text not null check (item_key in ('traveler_tunic','trail_boots','copper_charm')),
  updated_at timestamptz not null default now(),
  primary key (character_id,slot),
  unique (character_id,item_key)
);
alter table public.character_inventory enable row level security;
alter table public.character_equipment enable row level security;
revoke all on public.character_inventory from anon, authenticated;
revoke all on public.character_equipment from anon, authenticated;
grant all on public.character_inventory to service_role;
grant all on public.character_equipment to service_role;

-- Migra as recompensas já existentes das missões para a bolsa.
insert into public.character_inventory(character_id,item_key,quantity,updated_at)
select character_id,item_key,quantity,now()
from public.character_quest_items
where quantity > 0
on conflict(character_id,item_key) do update
set quantity = public.character_inventory.quantity + excluded.quantity,
    updated_at = now();

create or replace function public.apply_inventory_action(
  p_character_id uuid,
  p_action text,
  p_item_key text default null,
  p_slot text default null
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_quantity integer;
  v_old_item text;
  v_hp integer;
  v_max_hp integer;
  v_heal integer := 25;
  v_slot text;
begin
  if p_action = 'initialize' then
    insert into public.character_inventory(character_id,item_key,quantity)
    values
      (p_character_id,'traveler_tunic',1),
      (p_character_id,'trail_boots',1),
      (p_character_id,'copper_charm',1)
    on conflict(character_id,item_key) do nothing;
    return jsonb_build_object('ok',true,'action','initialize');
  end if;

  if p_action = 'use' then
    if p_item_key <> 'medicinal_herb' then
      return jsonb_build_object('ok',false,'message','Este item não pode ser usado.');
    end if;
    select quantity into v_quantity from public.character_inventory
    where character_id=p_character_id and item_key=p_item_key for update;
    if not found or v_quantity < 1 then
      return jsonb_build_object('ok',false,'message','Você não possui esse item.');
    end if;
    select hp,max_hp into v_hp,v_max_hp from public.characters
    where id=p_character_id for update;
    if not found then return jsonb_build_object('ok',false,'message','Personagem não encontrado.'); end if;
    if v_hp >= v_max_hp then return jsonb_build_object('ok',false,'message','Sua vida já está completa.'); end if;
    update public.characters set hp=least(max_hp,hp+v_heal),updated_at=now()
    where id=p_character_id returning hp,max_hp into v_hp,v_max_hp;
    if v_quantity = 1 then
      delete from public.character_inventory where character_id=p_character_id and item_key=p_item_key;
    else
      update public.character_inventory set quantity=quantity-1,updated_at=now()
      where character_id=p_character_id and item_key=p_item_key;
    end if;
    return jsonb_build_object('ok',true,'action','use','healed',v_heal,
      'character',jsonb_build_object('hp',v_hp,'max_hp',v_max_hp));
  end if;

  if p_action = 'equip' then
    v_slot := case p_item_key
      when 'traveler_tunic' then 'body'
      when 'trail_boots' then 'feet'
      when 'copper_charm' then 'amulet'
      else null end;
    if v_slot is null then return jsonb_build_object('ok',false,'message','Equipamento inválido.'); end if;
    select quantity into v_quantity from public.character_inventory
    where character_id=p_character_id and item_key=p_item_key for update;
    if not found or v_quantity < 1 then
      return jsonb_build_object('ok',false,'message','Esse equipamento não está na bolsa.');
    end if;
    select item_key into v_old_item from public.character_equipment
    where character_id=p_character_id and slot=v_slot for update;
    if v_old_item = p_item_key then
      return jsonb_build_object('ok',false,'message','Esse item já está equipado.');
    end if;
    if v_quantity = 1 then
      delete from public.character_inventory where character_id=p_character_id and item_key=p_item_key;
    else
      update public.character_inventory set quantity=quantity-1,updated_at=now()
      where character_id=p_character_id and item_key=p_item_key;
    end if;
    if v_old_item is not null then
      insert into public.character_inventory(character_id,item_key,quantity,updated_at)
      values(p_character_id,v_old_item,1,now())
      on conflict(character_id,item_key) do update
      set quantity=public.character_inventory.quantity+1,updated_at=now();
    end if;
    insert into public.character_equipment(character_id,slot,item_key,updated_at)
    values(p_character_id,v_slot,p_item_key,now())
    on conflict(character_id,slot) do update set item_key=excluded.item_key,updated_at=now();
    return jsonb_build_object('ok',true,'action','equip','slot',v_slot);
  end if;

  if p_action = 'unequip' then
    if p_slot not in ('body','feet','amulet') then
      return jsonb_build_object('ok',false,'message','Espaço de equipamento inválido.');
    end if;
    select item_key into v_old_item from public.character_equipment
    where character_id=p_character_id and slot=p_slot for update;
    if not found then return jsonb_build_object('ok',false,'message','Esse espaço já está vazio.'); end if;
    delete from public.character_equipment where character_id=p_character_id and slot=p_slot;
    insert into public.character_inventory(character_id,item_key,quantity,updated_at)
    values(p_character_id,v_old_item,1,now())
    on conflict(character_id,item_key) do update
    set quantity=public.character_inventory.quantity+1,updated_at=now();
    return jsonb_build_object('ok',true,'action','unequip','slot',p_slot);
  end if;

  return jsonb_build_object('ok',false,'message','Ação de inventário desconhecida.');
end;
$$;
revoke all on function public.apply_inventory_action(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.apply_inventory_action(uuid,text,text,text) to service_role;
