CREATE OR REPLACE FUNCTION public.apply_inventory_action(p_character_id uuid, p_action text, p_item_key text DEFAULT NULL::text, p_slot text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
      when 'runic_mantle' then 'body'
      when 'trail_boots' then 'feet'
      when 'stoneguard_boots' then 'feet'
      when 'copper_charm' then 'amulet'
      when 'elyndor_sigil' then 'amulet'
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
$function$


CREATE OR REPLACE FUNCTION public.apply_quest_event(p_character_id uuid, p_quest_key text, p_event_key text, p_target integer, p_reward_xp integer, p_reward_item_key text, p_reward_item_qty integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_quest public.character_quests%rowtype;
  v_event_id uuid;
  v_character public.characters%rowtype;
  v_xp integer;
  v_level integer;
  v_max_hp integer;
  v_hp integer;
  v_completed boolean := false;
  v_bonus_item_key text := null;
  v_bonus_item_qty integer := 0;
begin
  if p_quest_key not in ('slime_hunt','herb_gathering','rune_research','ruins_clearance')
     or p_target < 1 or p_target > 20
     or p_reward_xp < 0 or p_reward_xp > 500
     or p_reward_item_qty < 0 or p_reward_item_qty > 20
     or p_reward_item_key not in ('slime_essence','medicinal_herb','runic_mantle','stoneguard_boots') then
    raise exception 'Parâmetros de missão inválidos.';
  end if;

  if p_quest_key='rune_research' then
    v_bonus_item_key:='rune_crystal';
    v_bonus_item_qty:=3;
  elsif p_quest_key='ruins_clearance' then
    v_bonus_item_key:='guardian_core';
    v_bonus_item_qty:=1;
  end if;

  select * into v_quest from public.character_quests
  where character_id=p_character_id and quest_key=p_quest_key for update;
  if not found or v_quest.status<>'active' then
    return jsonb_build_object('ok',false,'message','Esta missão não está ativa.');
  end if;

  if v_quest.progress+1>=p_target and p_reward_item_qty+v_bonus_item_qty>0
     and (select coalesce(sum(quantity),0) from public.character_inventory where character_id=p_character_id)
       +p_reward_item_qty+v_bonus_item_qty>20 then
    return jsonb_build_object('ok',false,'message','Sua bolsa está cheia. Libere espaço para receber a recompensa.');
  end if;

  insert into public.quest_event_log(character_id,quest_key,event_key)
  values(p_character_id,p_quest_key,p_event_key)
  on conflict(character_id,event_key) do nothing returning id into v_event_id;
  if v_event_id is null then
    return jsonb_build_object('ok',true,'duplicate',true,'progress',v_quest.progress,'target',v_quest.target,'status',v_quest.status);
  end if;

  update public.character_quests
  set progress=least(p_target,progress+1),
      status=case when progress+1>=p_target then 'completed' else 'active' end,
      completed_at=case when progress+1>=p_target then now() else null end
  where character_id=p_character_id and quest_key=p_quest_key returning * into v_quest;
  v_completed:=v_quest.status='completed' and v_quest.progress>=p_target;

  if v_completed then
    select * into v_character from public.characters where id=p_character_id for update;
    if not found then raise exception 'Personagem não encontrado.'; end if;
    v_level:=v_character.level;
    v_xp:=v_character.xp+p_reward_xp;
    v_max_hp:=v_character.max_hp;
    v_hp:=v_character.hp;
    while v_xp>=v_level*100 loop
      v_xp:=v_xp-v_level*100;
      v_level:=v_level+1;
      v_max_hp:=v_max_hp+10;
      v_hp:=v_max_hp;
    end loop;
    update public.characters set level=v_level,xp=v_xp,max_hp=v_max_hp,hp=v_hp,updated_at=now()
    where id=p_character_id;

    insert into public.character_inventory(character_id,item_key,quantity,updated_at)
    values(p_character_id,p_reward_item_key,p_reward_item_qty,now())
    on conflict(character_id,item_key) do update
    set quantity=public.character_inventory.quantity+excluded.quantity,updated_at=now();

    if v_bonus_item_key is not null and v_bonus_item_qty>0 then
      insert into public.character_inventory(character_id,item_key,quantity,updated_at)
      values(p_character_id,v_bonus_item_key,v_bonus_item_qty,now())
      on conflict(character_id,item_key) do update
      set quantity=public.character_inventory.quantity+excluded.quantity,updated_at=now();
    end if;
  end if;

  return jsonb_build_object(
    'ok',true,'progress',v_quest.progress,'target',p_target,'status',v_quest.status,
    'completed_now',v_completed,'reward_xp',case when v_completed then p_reward_xp else 0 end,
    'reward_item_key',case when v_completed then p_reward_item_key else null end,
    'reward_item_qty',case when v_completed then p_reward_item_qty else 0 end,
    'bonus_item_key',case when v_completed then v_bonus_item_key else null end,
    'bonus_item_qty',case when v_completed then v_bonus_item_qty else 0 end,
    'character',case when v_completed then jsonb_build_object('level',v_level,'xp',v_xp,'hp',v_hp,'max_hp',v_max_hp) else null end
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.elyndor_boss_hit(p_character_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_character public.characters%rowtype;
  v_boss public.elyndor_boss_state%rowtype;
  v_last timestamptz;
  v_damage integer := 35;
  v_new_xp integer;
  v_level integer;
  v_max_hp integer;
  v_hp integer;
  v_participant record;
  v_reward integer := 220;
  v_my_reward integer := 0;
  v_inventory_count integer;
  v_my_item_qty integer := 0;
begin
  select * into v_character from public.characters where id=p_character_id for update;
  if not found or v_character.map_id <> 'ruinas-elyndor' or v_character.hp <= 0
     or power(v_character.x-(36*32+16),2)+power(v_character.y-(24*32+16),2) > power(105,2) then
    return jsonb_build_object('ok',false,'message','Aproxime-se do Guardião de Elyndor para participar.');
  end if;

  select * into v_boss from public.elyndor_boss_state where id=true for update;
  if not found then
    insert into public.elyndor_boss_state(id,hp,max_hp) values(true,2400,2400)
    returning * into v_boss;
  end if;
  if v_boss.hp <= 0 and v_boss.respawn_at > now() then
    return jsonb_build_object('ok',false,'defeated',true,'message','O Guardião está se recompondo.');
  end if;
  if v_boss.hp <= 0 then
    update public.elyndor_boss_state set hp=2400,max_hp=2400,defeated_at=null,respawn_at=null,updated_at=now()
    where id=true returning * into v_boss;
    delete from public.elyndor_boss_participants;
  end if;

  insert into public.elyndor_boss_cooldowns(character_id,last_hit_at)
  values(p_character_id,null) on conflict(character_id) do nothing;
  select last_hit_at into v_last from public.elyndor_boss_cooldowns
  where character_id=p_character_id for update;
  if v_last is not null and v_last > now()-interval '500 milliseconds' then
    return jsonb_build_object('ok',false,'cooldown',true,'message','Aguarde para realizar outra ação.');
  end if;
  update public.elyndor_boss_cooldowns set last_hit_at=now() where character_id=p_character_id;

  update public.elyndor_boss_participants
  set damage=damage+v_damage,last_hit_at=now(),user_id=v_character.user_id
  where character_id=p_character_id;
  if not found then
    insert into public.elyndor_boss_participants(character_id,user_id,damage,last_hit_at)
    values(p_character_id,v_character.user_id,v_damage,now());
  end if;

  update public.elyndor_boss_state
  set hp=greatest(0,hp-v_damage),updated_at=now()
  where id=true returning * into v_boss;

  if v_boss.hp=0 then
    update public.elyndor_boss_state set defeated_at=now(),respawn_at=now()+interval '5 minutes',updated_at=now()
    where id=true returning * into v_boss;
    for v_participant in
      select p.character_id from public.elyndor_boss_participants p
      join public.characters c on c.id=p.character_id
      where p.last_hit_at > now()-interval '3 minutes'
        and c.map_id='ruinas-elyndor' and c.hp>0
    loop
      select * into v_character from public.characters where id=v_participant.character_id for update;
      if found then
        v_new_xp:=v_character.xp+v_reward;
        v_level:=v_character.level;
        v_max_hp:=v_character.max_hp;
        v_hp:=v_character.hp;
        while v_new_xp >= v_level*100 loop
          v_new_xp:=v_new_xp-v_level*100;
          v_level:=v_level+1;
          v_max_hp:=v_max_hp+10;
          v_hp:=v_max_hp;
        end loop;
        update public.characters set xp=v_new_xp,level=v_level,max_hp=v_max_hp,hp=v_hp,updated_at=now()
        where id=v_participant.character_id;

        select coalesce(sum(quantity),0) into v_inventory_count
        from public.character_inventory where character_id=v_participant.character_id;
        if v_inventory_count < 20 then
          insert into public.character_inventory(character_id,item_key,quantity,updated_at)
          values(v_participant.character_id,'elyndor_sigil',1,now())
          on conflict(character_id,item_key) do update
          set quantity=public.character_inventory.quantity+1,updated_at=now();
          if v_participant.character_id=p_character_id then v_my_item_qty:=1; end if;
        end if;
        if v_participant.character_id=p_character_id then v_my_reward:=v_reward; end if;
      end if;
    end loop;
  end if;

  return jsonb_build_object(
    'ok',true,'damage',v_damage,'reward_xp',v_my_reward,
    'reward_item_key',case when v_my_item_qty>0 then 'elyndor_sigil' else null end,
    'reward_item_qty',v_my_item_qty,
    'boss',jsonb_build_object('hp',v_boss.hp,'max_hp',v_boss.max_hp,'phase',case when v_boss.hp<=v_boss.max_hp/2 then 2 else 1 end,'defeated',v_boss.hp=0,'respawn_at',v_boss.respawn_at)
  );
end;
$function$


REVOKE ALL ON FUNCTION public.apply_inventory_action(uuid,text,text,text) FROM PUBLIC,anon,authenticated;

GRANT EXECUTE ON FUNCTION public.apply_inventory_action(uuid,text,text,text) TO service_role;

REVOKE ALL ON FUNCTION public.apply_quest_event(uuid,text,text,integer,integer,text,integer) FROM PUBLIC,anon,authenticated;

GRANT EXECUTE ON FUNCTION public.apply_quest_event(uuid,text,text,integer,integer,text,integer) TO service_role;

REVOKE ALL ON FUNCTION public.elyndor_boss_hit(uuid) FROM PUBLIC,anon,authenticated;

GRANT EXECUTE ON FUNCTION public.elyndor_boss_hit(uuid) TO service_role;
