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
