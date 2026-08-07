-- Ejecutar esto en Supabase: Dashboard > SQL Editor > New query.
--
-- Este script es INCREMENTAL: agrega el rol "estaca" a las políticas que
-- ya existen (creadas por schema.sql). No borra nada ni afecta los datos
-- actuales. Un líder de estaca tiene el mismo nivel de acceso que el
-- admin sobre Barrios, asignaciones y jóvenes — ve y administra TODO,
-- sin importar el Barrio.
--
-- Nota: esto NO crea ninguna cuenta de estaca. Para eso, usa el botón
-- "Agregar líder" en /admin y marca la casilla "Es líder de Estaca".

-- ---- barrios ----
drop policy if exists "barrios_admin_write" on barrios;
create policy "barrios_admin_write"
  on barrios for all
  using ( (auth.jwt() -> 'app_metadata' ->> 'role') = any (array['admin', 'estaca']) )
  with check ( (auth.jwt() -> 'app_metadata' ->> 'role') = any (array['admin', 'estaca']) );

-- ---- leader_barrios ----
drop policy if exists "leader_barrios_admin_all" on leader_barrios;
create policy "leader_barrios_admin_all"
  on leader_barrios for all
  using ( (auth.jwt() -> 'app_metadata' ->> 'role') = any (array['admin', 'estaca']) )
  with check ( (auth.jwt() -> 'app_metadata' ->> 'role') = any (array['admin', 'estaca']) );

-- ---- jovenes ----
drop policy if exists "admin_full_access_jovenes" on jovenes;
create policy "admin_full_access_jovenes"
  on jovenes for all
  using ( (auth.jwt() -> 'app_metadata' ->> 'role') = any (array['admin', 'estaca']) )
  with check ( (auth.jwt() -> 'app_metadata' ->> 'role') = any (array['admin', 'estaca']) );
