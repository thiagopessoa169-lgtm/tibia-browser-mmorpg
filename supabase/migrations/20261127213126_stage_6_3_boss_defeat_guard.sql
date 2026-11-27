-- Impede que o chefe cause dano depois de derrotado.
create or replace function public.elyndor_boss_strike(p_character_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_character public.characters%rowtype;
  v_boss public.elyndor_boss_state%rowtype;
  v_last timestamptz;
  v_damage integer;
  v_hp integer;
begin
  select * into v_character from public.characters where id=p_character_id for update;
  if not found or v_character.map_id <> 'ruinas-elyndor' or v_character.hp <= 0 then
    return jsonb_build_object('ok',false,'message','Personagem fora da região do chefe.');
  end if;
  select * into v_boss from public.elyndor_boss_state where id=true for update;
  if not found or v_boss.hp<=0 then
    return jsonb_build_object('ok',false,'message','O Guardião já foi derrotado.');
  end if;
  if power(v_character.x-(36*32+16),2)+power(v_character.y-(24*32+16),2) > power(155,2) then
    return jsonb_build_object('ok',false,'message','Você escapou do alcance do ataque.');
  end if;
  insert into public.elyndor_boss_cooldowns(character_id,last_strike_at) values(p_character_id,null)
  on conflict(character_id) do nothing;
  select last_strike_at into v_last from public.elyndor_boss_cooldowns where character_id=p_character_id for update;
  if v_last is not null and v_last > now()-interval '2 seconds' then
    return jsonb_build_object('ok',false,'cooldown',true);
  end if;
  update public.elyndor_boss_cooldowns set last_strike_at=now() where character_id=p_character_id;
  v_damage:=case when v_boss.hp<=v_boss.max_hp/2 then 18 else 12 end;
  v_hp:=greatest(0,v_character.hp-v_damage);
  update public.characters set hp=v_hp,updated_at=now() where id=p_character_id;
  return jsonb_build_object('ok',true,'damage',v_damage,
    'character',jsonb_build_object('hp',v_hp,'max_hp',v_character.max_hp,'level',v_character.level,'xp',v_character.xp));
end;
$$;
revoke all on function public.elyndor_boss_strike(uuid) from public,anon,authenticated;
grant execute on function public.elyndor_boss_strike(uuid) to service_role;
