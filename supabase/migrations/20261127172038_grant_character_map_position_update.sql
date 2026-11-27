-- Allow signed-in players to persist only map and position fields.
-- Row ownership remains enforced by the existing characters UPDATE RLS policy.
GRANT UPDATE (map_id, x, y, updated_at) ON TABLE public.characters TO authenticated;
