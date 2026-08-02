import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const role = session.user.app_metadata?.role;
      router.replace(role === "admin" ? "/admin" : "/dashboard");
    });
  }, [router]);

  async function handleSubmit(e) {
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
    router.replace(role === "admin" ? "/admin" : "/dashboard");
  }

  return (
    <div className="login-wrapper">
      <div className="card login-card">
        <h1>Panel de líderes</h1>
        <p className="subtitle">Inicia sesión para administrar las credenciales de tus jóvenes.</p>
        <form onSubmit={handleSubmit}>
          <label>Correo</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
          <label>Contraseña</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {error && <p className="error">{error}</p>}
          <div className="form-actions" style={{ justifyContent: "stretch", marginTop: 20 }}>
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
