-- Aetheria Online — Etapa 3.3: PvP da arena
-- A tabela de recarga só é acessível pelo backend (service role).
create table if not exists public.pvp_cooldowns (
  attacker_character_id uuid primary key
    references public.characters(id) on delete cascade,
  last_attack_at timestamptz not null default '1970-01-01T00:00:00Z'
);

alter table public.pvp_cooldowns enable row level security;
revoke all privileges on table public.pvp_cooldowns from public, anon, authenticated;
grant all privileges on table public.pvp_cooldowns to service_role;

-- Permite que cada jogador receba atualizações apenas do próprio personagem.
-- A política RLS existente em characters continua restringindo as linhas.
alter table public.characters replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'characters'
     ) then
    alter publication supabase_realtime add table public.characters;
  end if;
end $$;
