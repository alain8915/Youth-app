import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import LogoMark from "../components/LogoMark";
import { isStaffRole } from "../lib/roles";

const emptySignup = { nombre: "", email: "", password: "", codigo: "", barrio_id: "" };

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // "login" | "signup"

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [signupForm, setSignupForm] = useState(emptySignup);
  const [barrios, setBarrios] = useState([]);
  const [barriosLoaded, setBarriosLoaded] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const role = session.user.app_metadata?.role;
      router.replace(isStaffRole(role) ? "/admin" : "/dashboard");
    });
  }, [router]);

  function switchMode(newMode) {
    setMode(newMode);
    setError("");
    if (newMode === "signup" && !barriosLoaded) {
      fetch("/api/public/barrios")
        .then((r) => r.json())
        .then((data) => {
          setBarrios(data);
          setBarriosLoaded(true);
          if (data.length === 1) {
            setSignupForm((f) => ({ ...f, barrio_id: data[0].id }));
          }
        })
        .catch(() => setBarriosLoaded(true));
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }
    const role = data.session.user.app_metadata?.role;
    router.replace(isStaffRole(role) ? "/admin" : "/dashboard");
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/signup-leader", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signupForm),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setLoading(false);
      setError(body.error || "No se pudo crear la cuenta.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: signupForm.email,
      password: signupForm.password,
    });
    setLoading(false);

    if (signInError) {
      setMode("login");
      setEmail(signupForm.email);
      return;
    }
    router.replace("/dashboard");
  }

  return (
    <main className="login-wrapper">
      <div className="card login-card">
        <div className="login-card-header">
          <LogoMark variant="onDark" />
        </div>
        <div className="login-card-body">
        <div className="tabs" role="tablist" aria-label="Modo de acceso">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={`tab ${mode === "login" ? "tab-active" : ""}`}
            onClick={() => switchMode("login")}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={`tab ${mode === "signup" ? "tab-active" : ""}`}
            onClick={() => switchMode("signup")}
          >
            Crear cuenta
          </button>
        </div>

        {mode === "login" ? (
          <>
            <h1>Panel de líderes</h1>
            <p className="subtitle">Inicia sesión para administrar las credenciales de tus jóvenes.</p>
            <form onSubmit={handleLogin} noValidate>
              <label htmlFor="login-email">Correo</label>
              <input
                id="login-email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
              <label htmlFor="login-password">Contraseña</label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              {error && <p className="error" role="alert">{error}</p>}
              <div className="form-actions" style={{ justifyContent: "stretch", marginTop: 20 }}>
                <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
                  {loading ? "Entrando..." : "Entrar"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h1>Crear cuenta de líder</h1>
            <p className="subtitle">
              Regístrate para administrar las credenciales de los jóvenes de tu Barrio.
            </p>
            <form onSubmit={handleSignup} noValidate>
              <label htmlFor="signup-nombre">Nombre</label>
              <input
                id="signup-nombre"
                required
                autoFocus
                value={signupForm.nombre}
                onChange={(e) => setSignupForm({ ...signupForm, nombre: e.target.value })}
              />
              <label htmlFor="signup-email">Correo</label>
              <input
                id="signup-email"
                type="email"
                required
                value={signupForm.email}
                onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                autoComplete="username"
              />
              <label htmlFor="signup-password">Contraseña</label>
              <input
                id="signup-password"
                type="password"
                required
                value={signupForm.password}
                onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                autoComplete="new-password"
              />
              <label htmlFor="signup-barrio">Barrio</label>
              {barriosLoaded && barrios.length === 0 ? (
                <p className="error" style={{ marginTop: 4 }}>
                  Todavía no hay Barrios creados. Pide al administrador que cree uno primero.
                </p>
              ) : (
                <select
                  id="signup-barrio"
                  required
                  value={signupForm.barrio_id}
                  onChange={(e) => setSignupForm({ ...signupForm, barrio_id: e.target.value })}
                >
                  <option value="" disabled>
                    {barriosLoaded ? "Selecciona tu Barrio" : "Cargando Barrios..."}
                  </option>
                  {barrios.map((b) => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
              )}
              <label htmlFor="signup-codigo">Código de registro</label>
              <input
                id="signup-codigo"
                required
                value={signupForm.codigo}
                onChange={(e) => setSignupForm({ ...signupForm, codigo: e.target.value })}
                placeholder="Te lo proporciona tu administrador"
              />
              {error && <p className="error" role="alert">{error}</p>}
              <div className="form-actions" style={{ justifyContent: "stretch", marginTop: 20 }}>
                <button
                  className="btn-primary"
                  type="submit"
                  disabled={loading || barrios.length === 0}
                  style={{ width: "100%" }}
                >
                  {loading ? "Creando cuenta..." : "Crear cuenta"}
                </button>
              </div>
            </form>
          </>
        )}
        </div>
      </div>
    </main>
  );
}
