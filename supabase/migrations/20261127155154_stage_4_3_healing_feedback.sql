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
  v_old_hp integer;
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
    v_old_hp := v_hp;
    update public.characters set hp=least(max_hp,hp+v_heal),updated_at=now()
    where id=p_character_id returning hp,max_hp into v_hp,v_max_hp;
    if v_quantity = 1 then
      delete from public.character_inventory where character_id=p_character_id and item_key=p_item_key;
    else
      update public.character_inventory set quantity=quantity-1,updated_at=now()
      where character_id=p_character_id and item_key=p_item_key;
    end if;
    return jsonb_build_object('ok',true,'action','use','healed',v_hp-v_old_hp,
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
    select coalesce(sum(quantity),0) into v_quantity
    from public.character_inventory where character_id=p_character_id;
    if v_quantity >= 20 then
      return jsonb_build_object('ok',false,'message','Sua bolsa está cheia. Libere um espaço antes de remover o equipamento.');
    end if;
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


