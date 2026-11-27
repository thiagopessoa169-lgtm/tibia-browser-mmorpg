-- Etapa 6.3: consulta do estado global e reaparecimento do Guardião
create or replace function public.elyndor_boss_get_state()
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_boss public.elyndor_boss_state%rowtype;
begin
  select * into v_boss from public.elyndor_boss_state where id=true for update;
  if not found then
    insert into public.elyndor_boss_state(id,hp,max_hp) values(true,2400,2400) returning * into v_boss;
  end if;
  if v_boss.hp<=0 and v_boss.respawn_at is not null and v_boss.respawn_at<=now() then
    update public.elyndor_boss_state set hp=max_hp,defeated_at=null,respawn_at=null,updated_at=now()
    where id=true returning * into v_boss;
    delete from public.elyndor_boss_participants;
  end if;
  return jsonb_build_object('hp',v_boss.hp,'max_hp',v_boss.max_hp,
    'phase',case when v_boss.hp<=v_boss.max_hp/2 then 2 else 1 end,
    'defeated',v_boss.hp=0,'respawn_at',v_boss.respawn_at);
end;
$$;
revoke all on function public.elyndor_boss_get_state() from public,anon,authenticated;
grant execute on function public.elyndor_boss_get_state() to service_role;
