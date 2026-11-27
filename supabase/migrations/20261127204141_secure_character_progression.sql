-- Aetheria Online — Etapa 5.4: progressão protegida pelo servidor

create table if not exists public.character_combat_cooldowns (
  character_id uuid not null references public.characters(id) on delete cascade,
  map_id text not null check (map_id in ('aetheria-village','bosque-antigo')),
  spawn_index integer not null check (spawn_index between 0 and 3),
  last_defeated_at timestamptz not null default 'epoch'::timestamptz,
  last_attacked_at timestamptz not null default 'epoch'::timestamptz,
  primary key (character_id, map_id, spawn_index)
);

alter table public.character_combat_cooldowns enable row level security;
revoke all on public.character_combat_cooldowns from public, anon, authenticated;
grant all on public.character_combat_cooldowns to service_role;

revoke update (level, hp, max_hp, xp) on public.characters from authenticated;
grant update (x, y, map_id, updated_at) on public.characters to authenticated;
grant update (level, hp, max_hp, xp) on public.characters to service_role;

create or replace function public.apply_monster_reward(
  p_character_id uuid,
  p_map_id text,
  p_spawn_index integer
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_character public.characters%rowtype;
  v_last timestamptz;
  v_xp integer;
  v_level integer;
  v_max_hp integer;
  v_hp integer;
  v_reward integer;
begin
  if p_map_id not in ('aetheria-village','bosque-antigo')
     or p_spawn_index < 0 or p_spawn_index > 3 then
    return jsonb_build_object('ok',false,'message','Monstro inválido.');
  end if;

  select * into v_character
  from public.characters where id=p_character_id
  for update;

  if not found or v_character.map_id <> p_map_id or v_character.hp <= 0 then
    return jsonb_build_object('ok',false,'message','Personagem indisponível para receber experiência.');
  end if;

  insert into public.character_combat_cooldowns(character_id,map_id,spawn_index)
  values(p_character_id,p_map_id,p_spawn_index)
  on conflict(character_id,map_id,spawn_index) do nothing;

  select last_defeated_at into v_last
  from public.character_combat_cooldowns
  where character_id=p_character_id and map_id=p_map_id and spawn_index=p_spawn_index
  for update;

  if v_last > now() - interval '7 seconds' then
    return jsonb_build_object('ok',false,'cooldown',true,'message','Aguarde o próximo surgimento desse monstro.');
  end if;

  update public.character_combat_cooldowns
  set last_defeated_at=now()
  where character_id=p_character_id and map_id=p_map_id and spawn_index=p_spawn_index;

  v_reward := case when p_map_id='bosque-antigo' then 40 else 25 end;
  v_xp := v_character.xp + v_reward;
  v_level := v_character.level;
  v_max_hp := v_character.max_hp;
  v_hp := v_character.hp;

  while v_xp >= v_level * 100 loop
    v_xp := v_xp - v_level * 100;
    v_level := v_level + 1;
    v_max_hp := v_max_hp + 10;
    v_hp := v_max_hp;
  end loop;

  update public.characters
  set level=v_level, xp=v_xp, max_hp=v_max_hp, hp=v_hp, updated_at=now()
  where id=p_character_id;

  return jsonb_build_object(
    'ok',true,'reward_xp',v_reward,
    'character',jsonb_build_object('level',v_level,'xp',v_xp,'hp',v_hp,'max_hp',v_max_hp)
  );
end;
$$;

create or replace function public.apply_monster_damage(
  p_character_id uuid,
  p_map_id text,
  p_spawn_index integer,
  p_damage integer
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_character public.characters%rowtype;
  v_last timestamptz;
  v_hp integer;
begin
  if p_map_id not in ('aetheria-village','bosque-antigo')
     or p_spawn_index < 0 or p_spawn_index > 3
     or p_damage not in (7,10) then
    return jsonb_build_object('ok',false,'message','Ataque de monstro inválido.');
  end if;

  select * into v_character
  from public.characters where id=p_character_id
  for update;

  if not found or v_character.map_id <> p_map_id or v_character.hp <= 0 then
    return jsonb_build_object('ok',false,'message','Personagem indisponível.');
  end if;

  insert into public.character_combat_cooldowns(character_id,map_id,spawn_index)
  values(p_character_id,p_map_id,p_spawn_index)
  on conflict(character_id,map_id,spawn_index) do nothing;

  select last_attacked_at into v_last
  from public.character_combat_cooldowns
  where character_id=p_character_id and map_id=p_map_id and spawn_index=p_spawn_index
  for update;

  if v_last > now() - interval '1050 milliseconds' then
    return jsonb_build_object('ok',false,'cooldown',true);
  end if;

  update public.character_combat_cooldowns
  set last_attacked_at=now()
  where character_id=p_character_id and map_id=p_map_id and spawn_index=p_spawn_index;

  v_hp := greatest(0,v_character.hp-p_damage);
  update public.characters set hp=v_hp,updated_at=now() where id=p_character_id;

  return jsonb_build_object(
    'ok',true,'damage',p_damage,
    'character',jsonb_build_object('level',v_character.level,'xp',v_character.xp,'hp',v_hp,'max_hp',v_character.max_hp)
  );
end;
$$;

create or replace function public.respawn_character(
  p_character_id uuid
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_character public.characters%rowtype;
begin
  select * into v_character
  from public.characters where id=p_character_id
  for update;

  if not found then
    return jsonb_build_object('ok',false,'message','Personagem não encontrado.');
  end if;
  if v_character.hp > 0 then
    return jsonb_build_object('ok',false,'message','Seu personagem ainda está vivo.');
  end if;

  update public.characters set hp=max_hp,updated_at=now()
  where id=p_character_id
  returning * into v_character;

  return jsonb_build_object(
    'ok',true,
    'character',jsonb_build_object('level',v_character.level,'xp',v_character.xp,'hp',v_character.hp,'max_hp',v_character.max_hp)
  );
end;
$$;

revoke all on function public.apply_monster_reward(uuid,text,integer) from public,anon,authenticated;
revoke all on function public.apply_monster_damage(uuid,text,integer,integer) from public,anon,authenticated;
revoke all on function public.respawn_character(uuid) from public,anon,authenticated;
grant execute on function public.apply_monster_reward(uuid,text,integer) to service_role;
grant execute on function public.apply_monster_damage(uuid,text,integer,integer) to service_role;
grant execute on function public.respawn_character(uuid) to service_role;
