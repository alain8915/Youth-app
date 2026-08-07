-- Ejecutar esto en Supabase: Dashboard > SQL Editor > New query.
--
-- ADVERTENCIA: este script empieza con DROP TABLE de las tablas anteriores
-- (leader_id -> jovenes). Solo úsalo si tu base de datos es de prueba y
-- puedes perder lo que tengas cargado. Si ya tienes datos reales que
-- conservar, avísame y en vez de esto armamos un script de migración.

drop table if exists jovenes cascade;
drop table if exists leader_barrios cascade;
drop table if exists barrios cascade;

create extension if not exists "pgcrypto";

-- Un Barrio es la unidad local a la que pertenecen los jóvenes (por
-- ejemplo, una congregación o unidad organizativa). Es la unidad estable
-- en el tiempo: los líderes van y vienen, el Barrio y sus jóvenes
-- permanecen.
create table barrios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz not null default now()
);

-- Qué líder(es) están actualmente asignados a qué Barrio(s). Es una
-- relación muchos-a-muchos y es la ÚNICA tabla que hay que tocar cuando
-- cambia el liderazgo: se borra la fila del líder saliente y se agrega
-- la del entrante. Los jóvenes del Barrio no se tocan para nada.
create table leader_barrios (
  leader_id uuid not null references auth.users(id) on delete cascade,
  barrio_id uuid not null references barrios(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (leader_id, barrio_id)
);

-- Los jóvenes ahora pertenecen al Barrio, no a un líder en particular.
create table jovenes (
  id uuid primary key default gen_random_uuid(),
  barrio_id uuid not null references barrios(id) on delete restrict,
  nombre text not null,
  sistema_usuario text not null,
  sistema_password_encriptado text not null,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- on delete restrict: evita borrar un Barrio "por accidente" mientras
-- todavía tenga jóvenes asignados (hay que reasignarlos o borrarlos primero).

-- ============ Row Level Security ============

alter table barrios enable row level security;
alter table leader_barrios enable row level security;
alter table jovenes enable row level security;

-- Cualquier persona con sesión iniciada (líder o admin) puede leer la
-- lista de Barrios (son solo nombres, no hay datos sensibles). Solo el
-- admin puede crear/editar/borrar Barrios.
create policy "barrios_select_authenticated"
  on barrios for select
  using (auth.role() = 'authenticated');

create policy "barrios_admin_write"
  on barrios for all
  using ( (auth.jwt() -> 'app_metadata' ->> 'role') = any (array['admin', 'estaca']) )
  with check ( (auth.jwt() -> 'app_metadata' ->> 'role') = any (array['admin', 'estaca']) );

-- Un líder puede ver a qué Barrio(s) está asignado él mismo. Solo el
-- admin puede crear/borrar asignaciones (es decir, asignar o quitar
-- líderes de un Barrio).
create policy "leader_barrios_select_own"
  on leader_barrios for select
  using (auth.uid() = leader_id);

create policy "leader_barrios_admin_all"
  on leader_barrios for all
  using ( (auth.jwt() -> 'app_metadata' ->> 'role') = any (array['admin', 'estaca']) )
  with check ( (auth.jwt() -> 'app_metadata' ->> 'role') = any (array['admin', 'estaca']) );

-- Un líder ve/crea/edita/borra únicamente jóvenes de los Barrios a los
-- que está actualmente asignado (vía leader_barrios). Si cambia de
-- Barrio, o deja de ser líder, este acceso se ajusta automáticamente.
create policy "leaders_select_by_barrio"
  on jovenes for select
  using (
    barrio_id in (select barrio_id from leader_barrios where leader_id = auth.uid())
  );

create policy "leaders_insert_by_barrio"
  on jovenes for insert
  with check (
    barrio_id in (select barrio_id from leader_barrios where leader_id = auth.uid())
  );

create policy "leaders_update_by_barrio"
  on jovenes for update
  using (
    barrio_id in (select barrio_id from leader_barrios where leader_id = auth.uid())
  )
  with check (
    barrio_id in (select barrio_id from leader_barrios where leader_id = auth.uid())
  );

create policy "leaders_delete_by_barrio"
  on jovenes for delete
  using (
    barrio_id in (select barrio_id from leader_barrios where leader_id = auth.uid())
  );

-- El admin ve y administra todo, sin importar el Barrio.
create policy "admin_full_access_jovenes"
  on jovenes for all
  using ( (auth.jwt() -> 'app_metadata' ->> 'role') = any (array['admin', 'estaca']) )
  with check ( (auth.jwt() -> 'app_metadata' ->> 'role') = any (array['admin', 'estaca']) );

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
