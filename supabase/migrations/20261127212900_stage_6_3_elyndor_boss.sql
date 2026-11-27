-- Etapa 6.3: chefe regional compartilhado das Ruínas de Elyndor
create table if not exists public.elyndor_boss_state (
  id boolean primary key default true check (id),
  hp integer not null default 2400 check (hp >= 0),
  max_hp integer not null default 2400 check (max_hp > 0),
  defeated_at timestamptz,
  respawn_at timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.elyndor_boss_state(id,hp,max_hp)
values(true,2400,2400) on conflict(id) do nothing;

create table if not exists public.elyndor_boss_participants (
  character_id uuid primary key references public.characters(id) on delete cascade,
  user_id uuid not null,
  damage integer not null default 0 check (damage >= 0),
  last_hit_at timestamptz not null default now()
);
create table if not exists public.elyndor_boss_cooldowns (
  character_id uuid primary key references public.characters(id) on delete cascade,
  last_hit_at timestamptz,
  last_strike_at timestamptz
);
alter table public.elyndor_boss_state enable row level security;
alter table public.elyndor_boss_participants enable row level security;
alter table public.elyndor_boss_cooldowns enable row level security;
revoke all on public.elyndor_boss_state,public.elyndor_boss_participants,public.elyndor_boss_cooldowns from anon,authenticated;
grant all on public.elyndor_boss_state,public.elyndor_boss_participants,public.elyndor_boss_cooldowns to service_role;

create or replace function public.elyndor_boss_hit(p_character_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
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
begin
  select * into v_character from public.characters where id=p_character_id for update;
  if not found or v_character.map_id <> 'ruinas-elyndor' or v_character.hp <= 0
     or power(v_character.x-(36*32+16),2)+power(v_character.y-(24*32+16),2) > power(105,2) then
    return jsonb_build_object('ok',false,'message','Aproxime-se do Guardião de Elyndor para participar.');
  end if;
  select * into v_boss from public.elyndor_boss_state where id=true for update;
  if not found then
    insert into public.elyndor_boss_state(id,hp,max_hp) values(true,2400,2400) returning * into v_boss;
  end if;
  if v_boss.hp <= 0 and v_boss.respawn_at > now() then
    return jsonb_build_object('ok',false,'defeated',true,'message','O Guardião está se recompondo.');
  end if;
  if v_boss.hp <= 0 then
    update public.elyndor_boss_state set hp=2400,max_hp=2400,defeated_at=null,respawn_at=null,updated_at=now()
    where id=true returning * into v_boss;
    delete from public.elyndor_boss_participants;
  end if;
  insert into public.elyndor_boss_cooldowns(character_id,last_hit_at) values(p_character_id,null)
  on conflict(character_id) do nothing;
  select last_hit_at into v_last from public.elyndor_boss_cooldowns where character_id=p_character_id for update;
  if v_last is not null and v_last > now()-interval '500 milliseconds' then
    return jsonb_build_object('ok',false,'cooldown',true,'message','Aguarde para realizar outra ação.');
  end if;
  update public.elyndor_boss_cooldowns set last_hit_at=now() where character_id=p_character_id;
  update public.elyndor_boss_participants set damage=damage+v_damage,last_hit_at=now(),user_id=v_character.user_id
  where character_id=p_character_id;
  if not found then
    insert into public.elyndor_boss_participants(character_id,user_id,damage,last_hit_at)
    values(p_character_id,v_character.user_id,v_damage,now());
  end if;
  update public.elyndor_boss_state set hp=greatest(0,hp-v_damage),updated_at=now()
  where id=true returning * into v_boss;
  if v_boss.hp=0 then
    update public.elyndor_boss_state set defeated_at=now(),respawn_at=now()+interval '5 minutes',updated_at=now()
    where id=true returning * into v_boss;
    for v_participant in
      select p.character_id from public.elyndor_boss_participants p
      join public.characters c on c.id=p.character_id
      where p.last_hit_at > now()-interval '3 minutes' and c.map_id='ruinas-elyndor' and c.hp>0
    loop
      select * into v_character from public.characters where id=v_participant.character_id for update;
      if found then
        v_new_xp:=v_character.xp+v_reward;v_level:=v_character.level;v_max_hp:=v_character.max_hp;v_hp:=v_character.hp;
        while v_new_xp >= v_level*100 loop
          v_new_xp:=v_new_xp-v_level*100;v_level:=v_level+1;v_max_hp:=v_max_hp+10;v_hp:=v_max_hp;
        end loop;
        update public.characters set xp=v_new_xp,level=v_level,max_hp=v_max_hp,hp=v_hp,updated_at=now()
        where id=v_participant.character_id;
        if v_participant.character_id=p_character_id then v_my_reward:=v_reward; end if;
      end if;
    end loop;
  end if;
  return jsonb_build_object('ok',true,'damage',v_damage,'reward_xp',v_my_reward,
    'boss',jsonb_build_object('hp',v_boss.hp,'max_hp',v_boss.max_hp,
      'phase',case when v_boss.hp<=v_boss.max_hp/2 then 2 else 1 end,
      'defeated',v_boss.hp=0,'respawn_at',v_boss.respawn_at));
end;
$$;

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
  if not found or v_boss.hp<=0 then return jsonb_build_object('ok',false,'message','O chefe não está atacando.'); end if;
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

revoke all on function public.elyndor_boss_hit(uuid) from public,anon,authenticated;
revoke all on function public.elyndor_boss_strike(uuid) from public,anon,authenticated;
grant execute on function public.elyndor_boss_hit(uuid) to service_role;
grant execute on function public.elyndor_boss_strike(uuid) to service_role;
