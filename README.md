# Panel de Líderes — Administrador de Credenciales

Sistema para administrar, sin pasar por recuperación de cuenta, las
credenciales de acceso de los jóvenes al otro sistema. El modelo central
es **Barrio → Joven**: cada joven pertenece a un Barrio (la unidad local
estable en el tiempo), y los líderes se **asignan** a uno o varios
Barrios — cuando el liderazgo cambia, el admin solo reasigna al líder,
sin tocar ni un dato de los jóvenes.

- Cada líder inicia sesión con su propio correo/contraseña y ve/administra
  los jóvenes de los Barrios a los que está **actualmente** asignado
  (aislamiento garantizado por Row Level Security en la base de datos).
- **Los líderes pueden crear su propia cuenta** desde la pestaña "Crear
  cuenta" en la pantalla de login, eligiendo su Barrio y usando un código
  de registro que solo conocen las personas autorizadas.
- El **administrador** gestiona tres cosas desde `/admin`: los **Barrios**
  (crear/renombrar/eliminar), los **líderes** (crear/editar/eliminar), y
  las **asignaciones** entre ambos (quién es líder de qué Barrio ahora
  mismo) — así como ver/crear/editar/eliminar/reasignar los jóvenes de
  **cualquier** Barrio.
- **Líder de Estaca:** un rol adicional con el mismo nivel de acceso que
  el administrador (ve y administra todos los Barrios, líderes y jóvenes),
  pensado para quien supervisa varios Barrios a la vez. Se crea marcando
  la casilla correspondiente al agregar un líder desde `/admin`.
- Las contraseñas del sistema externo se guardan **cifradas** (AES-256-GCM)
  en la base de datos; nunca en texto plano.
- El rol de cada cuenta (`admin` o `leader`) se guarda en los metadatos de
  autenticación de Supabase, no en una tabla aparte: solo se puede cambiar
  con la Service Role Key (es decir, solo desde el backend/el propio admin),
  nunca desde el navegador del usuario.

## Arquitectura (100% gratuita)

| Capa | Servicio | Por qué |
|---|---|---|
| Frontend + Backend | **Next.js en Vercel** | Un solo proyecto, despliegue automático al hacer push, plan gratuito generoso |
| Base de datos + Autenticación | **Supabase** (Postgres) | Auth de usuarios incluida (así creamos a los 5 líderes), plan gratuito, Row Level Security nativo |

No necesitas administrar servidores, contenedores ni bases de datos por tu cuenta.

---

## Paso 1: Crear el proyecto en Supabase

1. Entra a https://supabase.com y crea una cuenta gratis.
2. "New Project" → elige nombre, contraseña de base de datos (guárdala) y región.
3. Cuando el proyecto esté listo, ve a **SQL Editor** → **New query**, pega
   el contenido de `supabase/schema.sql` (incluido en este proyecto) y
   ejecútalo. Esto crea las tablas `barrios`, `leader_barrios` y `jovenes`,
   junto con las políticas de seguridad.

   ⚠️ **Si ya habías corrido una versión anterior de este script**, esta
   versión empieza con `DROP TABLE` de las tablas viejas — es decir,
   **borra los datos existentes** para poder recrear el esquema con el
   nuevo modelo de Barrios. Solo corre esta versión si tu proyecto es de
   prueba (como en tu caso). Si algún día ya tienes datos reales que
   proteger, avísame y preparamos un script de migración en vez de esto.
4. Ve a **Project Settings > API** y copia:
   - `Project URL` → será `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → será `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Paso 2: Crear la cuenta de administrador (una sola vez)

1. En Supabase: **Authentication > Users > Add user**. Crea el usuario del
   administrador (correo + contraseña).
2. Ve a **SQL Editor** y ejecuta lo siguiente, reemplazando el correo por
   el que acabas de crear. Esto marca esa cuenta como `admin` (los líderes
   NO necesitan este paso; ellos se crean directamente desde el panel del
   admin en el Paso 5):

   ```sql
   update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"role":"admin","nombre":"Nombre del admin"}'::jsonb
   where email = 'admin@ejemplo.com';
   ```

Con esto, cuando ese usuario inicie sesión será enviado automáticamente a
`/admin` en vez de al panel de un líder normal.

⚠️ **Si tu proyecto de Supabase ya existía antes de que se agregara el rol
de "líder de Estaca"**, además del paso anterior necesitas correr una vez
el script `supabase/migrations/002_rol_estaca.sql` en el SQL Editor — solo
actualiza las políticas de seguridad para reconocer el nuevo rol, no borra
nada. Si estás partiendo de cero con el `schema.sql` más reciente, ya lo
incluye y no necesitas este paso aparte.

Los **líderes de Estaca** (acceso igual al admin, pero pensado para quien
supervisa varios Barrios) no requieren SQL — se crean desde `/admin`,
marcando la casilla "Es líder de Estaca" al agregar un líder nuevo.

## Paso 3: Generar la clave de cifrado

En tu computadora (o en cualquier terminal), ejecuta:

```
openssl rand -hex 32
```

Copia el resultado (64 caracteres). Esa será tu `ENCRYPTION_KEY`.
Guárdala en un lugar seguro: si la pierdes, las contraseñas guardadas ya
no se podrán descifrar.

## Paso 4: Desplegar en Vercel

1. Sube esta carpeta a un repositorio de GitHub (puede ser privado).
2. Entra a https://vercel.com, "Add New Project" e importa el repositorio.
3. En **Environment Variables**, agrega las cinco variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ENCRYPTION_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Project Settings > API > "service_role"
     en Supabase — dale un vistazo especial a mantenerla fuera de
     repositorios públicos y nunca como variable `NEXT_PUBLIC_*`)
   - `LEADER_SIGNUP_CODE` (invéntalo tú, ej. una frase corta) — es lo que
     tus líderes deben escribir en `/registro` para poder crear su cuenta
4. Deploy. En un par de minutos tendrás una URL pública
   (ej. `https://tu-proyecto.vercel.app`) que puedes compartir con los 5 líderes.

## Desarrollo local (opcional)

```
cp .env.local.example .env.local
# edita .env.local con tus valores reales
npm install
npm run dev
```

Abre http://localhost:3000

---

## Cómo se ve el flujo de uso

**Como administrador (primeros pasos):**
1. Inicia sesión con su cuenta → va automáticamente a `/admin`.
2. En "Barrios": crea al menos un Barrio (ej. "Barrio Centro").
3. En "Líderes": crea líderes manualmente (con Barrio inicial opcional) o
   simplemente comparte la URL + el código de registro para que se
   registren solos y elijan su Barrio.
4. En cualquier momento puede asignar/quitar Barrios a un líder desde la
   columna "Barrios asignados" — así se maneja el cambio de liderazgo:
   quita al saliente, asigna al entrante, listo.
5. En "Todos los jóvenes" ve y administra el listado completo, de
   cualquier Barrio.

**Como líder:**
1. Entra a la URL, pestaña "Crear cuenta" (o inicia sesión si ya tiene
   cuenta) → va a `/dashboard`.
2. Ve el nombre de su Barrio junto a su correo, en la parte superior.
3. Da clic en "+ Agregar joven" para registrar el usuario/contraseña que
   ese joven usa en el otro sistema.
4. Cuando el joven olvida su contraseña, el líder solo entra a este panel,
   lo busca y le muestra (o comparte) su usuario y contraseña — sin pasar
   por el proceso de recuperación de cuenta.
5. Si el liderazgo cambia, el líder saliente simplemente deja de tener
   acceso (el admin lo desasigna del Barrio) y el entrante ve exactamente
   la misma lista de jóvenes en cuanto es asignado — nada se pierde.

## Notas de seguridad importantes

- Cada líder solo ve a los jóvenes de los Barrios a los que está
  actualmente asignado (por diseño de la base de datos vía Row Level
  Security, no solo de la interfaz). El admin sí ve todo, también
  reforzado a nivel de base de datos.
- Un Barrio con jóvenes asignados **no se puede eliminar** hasta que se
  reasignen o eliminen esos jóvenes (protección para no perder datos por
  accidente).
- `LEADER_SIGNUP_CODE` es la única barrera para que alguien pueda crear una
  cuenta de líder por su cuenta. Compártelo solo con las personas que
  deban serlo (no lo publiques en un grupo abierto). Si se te "escapó" o
  quieres renovarlo, cámbialo en Vercel y vuelve a desplegar — no afecta
  a las cuentas que ya existen.
- `SUPABASE_SERVICE_ROLE_KEY` tiene acceso total a tu proyecto de
  Supabase. Solo se usa dentro de las rutas `/api/admin/*` y
  `/api/auth/signup-leader` (código de servidor) y nunca se envía al
  navegador. No la compartas ni la subas a un repositorio público.
- Al eliminar a un líder se eliminan sus asignaciones de Barrio (deja de
  tener acceso), pero **los jóvenes se quedan intactos** en su Barrio —
  ya no dependen de ninguna cuenta de líder en particular.
- Considera exigir contraseñas robustas tanto para el admin como para los
  líderes, ya que quien entra a estos paneles puede ver contraseñas reales
  del otro sistema.
- Si algún día cambias `ENCRYPTION_KEY`, las contraseñas ya guardadas
  quedarán ilegibles (tendrías que volver a capturarlas).
