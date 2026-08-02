-- Ejecutar esto en Supabase: Dashboard > SQL Editor > New query

create extension if not exists "pgcrypto";

create table if not exists jovenes (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  sistema_usuario text not null,
  sistema_password_encriptado text not null,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Activa seguridad a nivel de fila: sin políticas, nadie puede leer nada.
alter table jovenes enable row level security;

-- Cada líder solo puede ver, crear, editar y borrar SUS propios jóvenes.
create policy "leaders_select_own"
  on jovenes for select
  using (auth.uid() = leader_id);

create policy "leaders_insert_own"
  on jovenes for insert
  with check (auth.uid() = leader_id);

create policy "leaders_update_own"
  on jovenes for update
  using (auth.uid() = leader_id)
  with check (auth.uid() = leader_id);

create policy "leaders_delete_own"
  on jovenes for delete
  using (auth.uid() = leader_id);

-- El rol del usuario (admin/leader) vive en app_metadata dentro de su JWT
-- (se asigna con la API administrativa de Supabase, nunca lo puede cambiar
-- el propio usuario). Esta política le da al admin acceso total, sin
-- necesidad de una tabla extra ni de políticas recursivas.
create policy "admin_full_access"
  on jovenes for all
  using ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' )
  with check ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' );

-- Mantiene updated_at al día automáticamente
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_jovenes_updated_at
before update on jovenes
for each row execute function set_updated_at();
