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


create or replace function public.apply_quest_event(
  p_character_id uuid,
  p_quest_key text,
  p_event_key text,
  p_target integer,
  p_reward_xp integer,
  p_reward_item_key text,
  p_reward_item_qty integer
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_quest public.character_quests%rowtype;
  v_event_id uuid;
  v_character public.characters%rowtype;
  v_xp integer;
  v_level integer;
  v_max_hp integer;
  v_hp integer;
  v_completed boolean := false;
begin
  if p_quest_key not in ('slime_hunt','herb_gathering')
     or p_target < 1 or p_target > 20
     or p_reward_xp < 0 or p_reward_xp > 500
     or p_reward_item_qty < 0 or p_reward_item_qty > 20
     or p_reward_item_key not in ('slime_essence','medicinal_herb') then
    raise exception 'Parâmetros de missão inválidos.';
  end if;

  select * into v_quest
  from public.character_quests
  where character_id = p_character_id and quest_key = p_quest_key
  for update;

  if not found or v_quest.status <> 'active' then
    return jsonb_build_object('ok', false, 'message', 'Esta missão não está ativa.');
  end if;

  if v_quest.progress + 1 >= p_target and p_reward_item_qty > 0
     and (select coalesce(sum(quantity),0) from public.character_inventory where character_id=p_character_id) + p_reward_item_qty > 20 then
    return jsonb_build_object('ok',false,'message','Sua bolsa está cheia. Libere espaço para receber a recompensa.');
  end if;

  insert into public.quest_event_log(character_id, quest_key, event_key)
  values (p_character_id, p_quest_key, p_event_key)
  on conflict (character_id, event_key) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return jsonb_build_object('ok', true, 'duplicate', true, 'progress', v_quest.progress, 'target', v_quest.target, 'status', v_quest.status);
  end if;

  update public.character_quests
  set progress = least(p_target, progress + 1),
      status = case when progress + 1 >= p_target then 'completed' else 'active' end,
      completed_at = case when progress + 1 >= p_target then now() else null end
  where character_id = p_character_id and quest_key = p_quest_key
  returning * into v_quest;

  v_completed := v_quest.status = 'completed' and v_quest.progress >= p_target;

  if v_completed then
    select * into v_character
    from public.characters
    where id = p_character_id
    for update;

    if not found then
      raise exception 'Personagem não encontrado.';
    end if;

    v_level := v_character.level;
    v_xp := v_character.xp + p_reward_xp;
    v_max_hp := v_character.max_hp;
    v_hp := v_character.hp;
    while v_xp >= v_level * 100 loop
      v_xp := v_xp - v_level * 100;
      v_level := v_level + 1;
      v_max_hp := v_max_hp + 10;
      v_hp := v_max_hp;
    end loop;

    update public.characters
    set level = v_level, xp = v_xp, max_hp = v_max_hp, hp = v_hp, updated_at = now()
    where id = p_character_id;

    insert into public.character_inventory(character_id, item_key, quantity, updated_at)
    values (p_character_id, p_reward_item_key, p_reward_item_qty, now())
    on conflict (character_id, item_key)
    do update set quantity = public.character_inventory.quantity + excluded.quantity,
                  updated_at = now();
  end if;

  return jsonb_build_object(
    'ok', true,
    'progress', v_quest.progress,
    'target', p_target,
    'status', v_quest.status,
    'completed_now', v_completed,
    'reward_xp', case when v_completed then p_reward_xp else 0 end,
    'reward_item_key', case when v_completed then p_reward_item_key else null end,
    'reward_item_qty', case when v_completed then p_reward_item_qty else 0 end,
    'character', case when v_completed then jsonb_build_object('level',v_level,'xp',v_xp,'hp',v_hp,'max_hp',v_max_hp) else null end
  );
end;
$$;

revoke all on function public.apply_quest_event(uuid,text,text,integer,integer,text,integer) from public, anon, authenticated;
grant execute on function public.apply_quest_event(uuid,text,text,integer,integer,text,integer) to service_role;
