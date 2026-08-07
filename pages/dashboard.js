import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useEscapeClose } from "../lib/useEscapeClose";
import { useToast } from "../lib/useToast";
import Toast from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";
import LogoMark from "../components/LogoMark";

const emptyForm = { nombre: "", sistema_usuario: "", sistema_password: "", notas: "", barrio_id: "" };

export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [misBarrios, setMisBarrios] = useState([]);
  const [jovenes, setJovenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visiblePw, setVisiblePw] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false });

  const { toast, showToast, clearToast } = useToast();

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

  useEscapeClose(modalOpen, () => setModalOpen(false));

  const authHeader = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    const headers = await authHeader();
    const [barriosRes, jovenesRes] = await Promise.all([
      fetch("/api/leader/barrios", { headers }),
      fetch("/api/jovenes", { headers }),
    ]);
    if (barriosRes.ok) setMisBarrios(await barriosRes.json());
    if (jovenesRes.ok) setJovenes(await jovenesRes.json());
    if (!barriosRes.ok || !jovenesRes.ok) setError("No se pudo cargar la información.");
    setLoading(false);
  }, [authHeader]);

  useEffect(() => {
    if (session) loadAll();
  }, [session, loadAll]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, barrio_id: misBarrios[0]?.id || "" });
    setModalOpen(true);
  }

  function openEdit(j) {
    setEditingId(j.id);
    setForm({
      nombre: j.nombre,
      sistema_usuario: j.sistema_usuario,
      sistema_password: j.sistema_password,
      notas: j.notas || "",
      barrio_id: j.barrio_id,
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
      loadAll();
      showToast(editingId ? "Cambios guardados." : "Joven agregado.");
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "No se pudo guardar.");
    }
  }

  function requestDelete(j) {
    setConfirmState({
      open: true,
      title: "Eliminar credenciales",
      message: `¿Eliminar las credenciales de ${j.nombre}? Esta acción no se puede deshacer.`,
      danger: true,
      onConfirm: async () => {
        const headers = await authHeader();
        const res = await fetch(`/api/jovenes/${j.id}`, { method: "DELETE", headers });
        if (res.ok) {
          setJovenes((prev) => prev.filter((x) => x.id !== j.id));
          showToast("Credenciales eliminadas.");
        } else {
          setError("No se pudo eliminar.");
        }
      },
    });
  }

  function closeConfirm() {
    setConfirmState({ open: false });
  }

  async function handleConfirm() {
    const action = confirmState.onConfirm;
    closeConfirm();
    if (action) await action();
  }

  function togglePw(id) {
    setVisiblePw((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  if (session === undefined) return null;

  const sinBarrio = !loading && misBarrios.length === 0;

  return (
    <>
      <a href="#main-content" className="skip-link">Saltar al contenido</a>
      <main id="main-content" className="container">
        <div className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LogoMark size={36} />
            <div>
              <h1>Credenciales de mis jóvenes</h1>
              <p className="subtitle" style={{ margin: 0 }}>
                {session.user.email}
                {misBarrios.length > 0 && ` · ${misBarrios.map((b) => b.nombre).join(", ")}`}
              </p>
            </div>
          </div>
          <div className="actions">
            <button className="btn-primary" onClick={openCreate} disabled={sinBarrio}>+ Agregar joven</button>
            <button className="btn-secondary" onClick={handleLogout}>Cerrar sesión</button>
          </div>
        </div>

        <div className="card">
          {error && <p className="error" role="alert">{error}</p>}

          {sinBarrio && (
            <p className="error" role="alert">
              Todavía no estás asignado a ningún Barrio. Pide al administrador que te asigne uno para
              poder registrar jóvenes.
            </p>
          )}

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
                        <button
                          className="btn-link"
                          onClick={() => togglePw(j.id)}
                          aria-label={visiblePw[j.id] ? `Ocultar contraseña de ${j.nombre}` : `Mostrar contraseña de ${j.nombre}`}
                        >
                          {visiblePw[j.id] ? "Ocultar" : "Ver"}
                        </button>
                      </div>
                    </td>
                    <td data-label="Notas">{j.notas || "—"}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-secondary" onClick={() => openEdit(j)}>Editar</button>
                        <button className="btn-danger" onClick={() => requestDelete(j)}>Eliminar</button>
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
            <div
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="joven-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="joven-modal-title">{editingId ? "Editar joven" : "Agregar joven"}</h2>
              <form onSubmit={handleSave} noValidate>
                {misBarrios.length > 1 && (
                  <>
                    <label htmlFor="joven-barrio">Barrio</label>
                    <select
                      id="joven-barrio"
                      required
                      value={form.barrio_id}
                      onChange={(e) => setForm({ ...form, barrio_id: e.target.value })}
                    >
                      {misBarrios.map((b) => (
                        <option key={b.id} value={b.id}>{b.nombre}</option>
                      ))}
                    </select>
                  </>
                )}
                <label htmlFor="joven-nombre">Nombre del joven</label>
                <input
                  id="joven-nombre"
                  required
                  autoFocus
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
                <label htmlFor="joven-usuario">Usuario (del sistema de jóvenes)</label>
                <input
                  id="joven-usuario"
                  required
                  value={form.sistema_usuario}
                  onChange={(e) => setForm({ ...form, sistema_usuario: e.target.value })}
                />
                <label htmlFor="joven-password">Contraseña (del sistema de jóvenes)</label>
                <input
                  id="joven-password"
                  required
                  value={form.sistema_password}
                  onChange={(e) => setForm({ ...form, sistema_password: e.target.value })}
                />
                <label htmlFor="joven-notas">Notas (opcional)</label>
                <textarea
                  id="joven-notas"
                  rows={2}
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                />
                {error && <p className="error" role="alert">{error}</p>}
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

        <ConfirmDialog
          open={confirmState.open}
          title={confirmState.title}
          message={confirmState.message}
          danger={confirmState.danger}
          onConfirm={handleConfirm}
          onCancel={closeConfirm}
        />

        <Toast toast={toast} onClose={clearToast} />
      </main>
    </>
  );
}
