-- Aetheria Online — Etapa 3.2: progressão persistente
-- XP fica abaixo do próximo limite de nível; HP e progressão são por personagem.

alter table public.characters
  add column if not exists xp integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'characters_xp_progress_limit'
      and conrelid = 'public.characters'::regclass
  ) then
    alter table public.characters
      add constraint characters_xp_progress_limit
      check (xp >= 0 and xp < level * 100);
  end if;
end $$;

-- Remova privilégios amplos herdados dos padrões do projeto.
-- O acesso real continua limitado pelas políticas RLS de propriedade.
revoke all privileges on table public.characters from anon;
revoke all privileges on table public.characters from authenticated;

grant select on table public.characters to authenticated;
grant insert (user_id, name) on table public.characters to authenticated;
grant update (x, y, updated_at, level, hp, max_hp, xp)
  on table public.characters to authenticated;
