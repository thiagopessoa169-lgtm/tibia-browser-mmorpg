-- Aetheria Online — Etapa 2
-- Execute este arquivo no SQL Editor do seu projeto Supabase.

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 16),
  level integer not null default 1 check (level >= 1),
  hp integer not null default 100 check (hp >= 0),
  max_hp integer not null default 100 check (max_hp >= 1),
  x double precision not null default 1168 check (x between 0 and 2304),
  y double precision not null default 784 check (y between 0 and 1536),
  map_id text not null default 'aetheria-village',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint characters_hp_limit check (hp <= max_hp),
  constraint characters_name_format check (name ~ '^[A-Za-z0-9_]+$')
);

create unique index if not exists characters_name_unique_ci
  on public.characters (lower(name));

create index if not exists characters_user_id_idx
  on public.characters (user_id);

alter table public.characters enable row level security;

grant select, insert, update, delete on public.characters to authenticated;

drop policy if exists "Players can read their own characters" on public.characters;
create policy "Players can read their own characters"
  on public.characters for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Players can create their own characters" on public.characters;
create policy "Players can create their own characters"
  on public.characters for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Players can update their own characters" on public.characters;
create policy "Players can update their own characters"
  on public.characters for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Players can delete their own characters" on public.characters;
create policy "Players can delete their own characters"
  on public.characters for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Canal privado compartilhado: somente usuários autenticados podem entrar,
-- receber presença e enviar atualizações de posição.
drop policy if exists "Authenticated players can receive world messages" on realtime.messages;
create policy "Authenticated players can receive world messages"
  on realtime.messages for select to authenticated
  using (
    (select realtime.topic()) = 'aetheria:world'
    and extension in ('broadcast', 'presence')
  );

drop policy if exists "Authenticated players can send world messages" on realtime.messages;
create policy "Authenticated players can send world messages"
  on realtime.messages for insert to authenticated
  with check (
    (select realtime.topic()) = 'aetheria:world'
    and extension in ('broadcast', 'presence')
  );