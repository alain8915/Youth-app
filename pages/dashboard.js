import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

const emptyForm = { nombre: "", sistema_usuario: "", sistema_password: "", notas: "" };

export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState(undefined); // undefined = cargando
  const [jovenes, setJovenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visiblePw, setVisiblePw] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
      } else if (session.user.app_metadata?.role === "admin") {
        router.replace("/admin");
      } else {
        setSession(session);
      }
    });
  }, [router]);

  const authHeader = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };
  }, []);

  const loadJovenes = useCallback(async () => {
    setLoading(true);
    setError("");
    const headers = await authHeader();
    const res = await fetch("/api/jovenes", { headers });
    if (res.ok) {
      setJovenes(await res.json());
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "No se pudo cargar la lista.");
    }
    setLoading(false);
  }, [authHeader]);

  useEffect(() => {
    if (session) loadJovenes();
  }, [session, loadJovenes]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(j) {
    setEditingId(j.id);
    setForm({
      nombre: j.nombre,
      sistema_usuario: j.sistema_usuario,
      sistema_password: j.sistema_password,
      notas: j.notas || "",
    });
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const headers = await authHeader();
    const url = editingId ? `/api/jovenes/${editingId}` : "/api/jovenes";
    const method = editingId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
    setSaving(false);
    if (res.ok) {
      setModalOpen(false);
      loadJovenes();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "No se pudo guardar.");
    }
  }

  async function handleDelete(id) {
    if (!confirm("¿Eliminar estas credenciales? Esta acción no se puede deshacer.")) return;
    const headers = await authHeader();
    const res = await fetch(`/api/jovenes/${id}`, { method: "DELETE", headers });
    if (res.ok) {
      setJovenes((prev) => prev.filter((j) => j.id !== id));
    } else {
      setError("No se pudo eliminar.");
    }
  }

  function togglePw(id) {
    setVisiblePw((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  if (session === undefined) return null;

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>Credenciales de mis jóvenes</h1>
          <p className="subtitle" style={{ margin: 0 }}>{session.user.email}</p>
        </div>
        <div className="actions">
          <button className="btn-primary" onClick={openCreate}>+ Agregar joven</button>
          <button className="btn-secondary" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </div>

      <div className="card">
        {error && <p className="error">{error}</p>}

        {loading ? (
          <p>Cargando...</p>
        ) : jovenes.length === 0 ? (
          <div className="empty-state">
            Aún no has registrado credenciales. Usa &quot;+ Agregar joven&quot; para empezar.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Usuario del sistema</th>
                <th>Contraseña</th>
                <th>Notas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {jovenes.map((j) => (
                <tr key={j.id}>
                  <td data-label="Nombre">{j.nombre}</td>
                  <td data-label="Usuario del sistema">{j.sistema_usuario}</td>
                  <td data-label="Contraseña">
                    <div className="pw-cell">
                      <span>{visiblePw[j.id] ? j.sistema_password : "••••••••"}</span>
                      <button className="btn-link" onClick={() => togglePw(j.id)}>
                        {visiblePw[j.id] ? "Ocultar" : "Ver"}
                      </button>
                    </div>
                  </td>
                  <td data-label="Notas">{j.notas || "—"}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-secondary" onClick={() => openEdit(j)}>Editar</button>
                      <button className="btn-danger" onClick={() => handleDelete(j.id)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? "Editar joven" : "Agregar joven"}</h2>
            <form onSubmit={handleSave}>
              <label>Nombre del joven</label>
              <input
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
              <label>Usuario (del sistema de jóvenes)</label>
              <input
                required
                value={form.sistema_usuario}
                onChange={(e) => setForm({ ...form, sistema_usuario: e.target.value })}
              />
              <label>Contraseña (del sistema de jóvenes)</label>
              <input
                required
                value={form.sistema_password}
                onChange={(e) => setForm({ ...form, sistema_password: e.target.value })}
              />
              <label>Notas (opcional)</label>
              <textarea
                rows={2}
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
              />
              {error && <p className="error">{error}</p>}
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
