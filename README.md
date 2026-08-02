# Panel de Líderes — Administrador de Credenciales

Sistema para que los 5 líderes administren, sin pasar por recuperación de
cuenta, las credenciales de acceso de sus jóvenes al otro sistema. Incluye
una cuenta de **administrador** que gestiona tanto a los líderes como a
todos los jóvenes.

- Cada líder inicia sesión con su propio correo/contraseña y solo ve y
  administra los jóvenes que él mismo registró (aislamiento garantizado por
  Row Level Security en la base de datos, no solo por la interfaz).
- El **administrador** inicia sesión con su propia cuenta y desde `/admin`
  puede: crear, editar (nombre/contraseña) y eliminar cuentas de líder, y
  ver/crear/editar/eliminar/reasignar los jóvenes de **cualquier** líder.
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
   ejecútalo. Esto crea la tabla `jovenes` y las políticas de seguridad.
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
3. En **Environment Variables**, agrega las cuatro variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ENCRYPTION_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Project Settings > API > "service_role"
     en Supabase — dale un vistazo especial a mantenerla fuera de
     repositorios públicos y nunca como variable `NEXT_PUBLIC_*`)
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

**Como líder:**
1. Entra a la URL, inicia sesión con su correo/contraseña → va a `/dashboard`.
2. Da clic en "+ Agregar joven", escribe el nombre del joven y el
   usuario/contraseña que ese joven usa en el otro sistema.
3. Cuando el joven olvida su contraseña, el líder solo entra a este panel,
   busca al joven y le muestra (o comparte) su usuario y contraseña —
   sin pasar por el proceso de recuperación de cuenta.
4. Puede editar o eliminar los registros de sus propios jóvenes en
   cualquier momento.

**Como administrador:**
1. Inicia sesión con su cuenta → va automáticamente a `/admin`.
2. En la sección "Líderes": crea nuevas cuentas de líder (nombre, correo,
   contraseña inicial), edita su nombre/contraseña, o elimina un líder.
3. En la sección "Todos los jóvenes": ve el listado completo de todos los
   jóvenes de todos los líderes, con la opción de crear uno nuevo
   (eligiendo a qué líder pertenece), editarlo o reasignarlo a otro líder,
   o eliminarlo.

## Notas de seguridad importantes

- Cada líder solo ve a sus propios jóvenes (por diseño de la base de
  datos vía Row Level Security, no solo de la interfaz). El admin sí ve
  todo, también reforzado a nivel de base de datos.
- `SUPABASE_SERVICE_ROLE_KEY` tiene acceso total a tu proyecto de
  Supabase. Solo se usa dentro de las rutas `/api/admin/*` (código de
  servidor) y nunca se envía al navegador. No la compartas ni la subas a
  un repositorio público.
- Al eliminar a un líder se eliminan también, en cascada, todas las
  credenciales de jóvenes que tenía a su cargo (la app te lo advierte
  antes de confirmar). Si prefieres que en ese caso los jóvenes se
  reasignen a otro líder en vez de borrarse, dímelo y lo ajustamos.
- Considera exigir contraseñas robustas tanto para el admin como para los
  líderes, ya que quien entra a estos paneles puede ver contraseñas reales
  del otro sistema.
- Si algún día cambias `ENCRYPTION_KEY`, las contraseñas ya guardadas
  quedarán ilegibles (tendrías que volver a capturarlas).
