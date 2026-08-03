import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

const emptyLeaderForm = { nombre: "", email: "", password: "" };
const emptyJovenForm = { nombre: "", sistema_usuario: "", sistema_password: "", notas: "", leader_id: "" };

export default function Admin() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [leaders, setLeaders] = useState([]);
  const [jovenes, setJovenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visiblePw, setVisiblePw] = useState({});

  const [leaderModalOpen, setLeaderModalOpen] = useState(false);
  const [editingLeaderId, setEditingLeaderId] = useState(null);
  const [leaderForm, setLeaderForm] = useState(emptyLeaderForm);
  const [savingLeader, setSavingLeader] = useState(false);

  const [jovenModalOpen, setJovenModalOpen] = useState(false);
  const [editingJovenId, setEditingJovenId] = useState(null);
  const [jovenForm, setJovenForm] = useState(emptyJovenForm);
  const [savingJoven, setSavingJoven] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
      } else if (session.user.app_metadata?.role !== "admin") {
        router.replace("/dashboard");
      } else {
        setSession(session);
      }
    });
  }, [router]);

  const authHeader = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    const headers = await authHeader();
    const [leadersRes, jovenesRes] = await Promise.all([
      fetch("/api/admin/leaders", { headers }),
      fetch("/api/jovenes", { headers }),
    ]);
    if (leadersRes.ok) setLeaders(await leadersRes.json());
    if (jovenesRes.ok) setJovenes(await jovenesRes.json());
    if (!leadersRes.ok || !jovenesRes.ok) setError("No se pudo cargar toda la información.");
    setLoading(false);
  }, [authHeader]);

  useEffect(() => {
    if (session) loadAll();
  }, [session, loadAll]);

  const leaderMap = useMemo(() => {
    const map = {};
    leaders.forEach((l) => (map[l.id] = l));
    return map;
  }, [leaders]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // ---- Líderes ----

  function openCreateLeader() {
    setEditingLeaderId(null);
    setLeaderForm(emptyLeaderForm);
    setLeaderModalOpen(true);
  }

  function openEditLeader(l) {
    setEditingLeaderId(l.id);
    setLeaderForm({ nombre: l.nombre, email: l.email, password: "" });
    setLeaderModalOpen(true);
  }

  async function handleSaveLeader(e) {
    e.preventDefault();
    setSavingLeader(true);
    setError("");
    const headers = await authHeader();

    let res;
    if (editingLeaderId) {
      res = await fetch(`/api/admin/leaders/${editingLeaderId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ nombre: leaderForm.nombre, password: leaderForm.password || undefined }),
      });
    } else {
      res = await fetch("/api/admin/leaders", {
        method: "POST",
        headers,
        body: JSON.stringify(leaderForm),
      });
    }
    setSavingLeader(false);
    if (res.ok) {
      setLeaderModalOpen(false);
      loadAll();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "No se pudo guardar el líder.");
    }
  }

  async function handleDeleteLeader(l) {
    const tieneJovenes = jovenes.some((j) => j.leader_id === l.id);
    const aviso = tieneJovenes
      ? `${l.nombre} tiene jóvenes registrados. Al eliminarlo, SUS CREDENCIALES TAMBIÉN SE BORRARÁN. ¿Continuar?`
      : `¿Eliminar al líder ${l.nombre}?`;
    if (!confirm(aviso)) return;

    const headers = await authHeader();
    const res = await fetch(`/api/admin/leaders/${l.id}`, { method: "DELETE", headers });
    if (res.ok) {
      loadAll();
    } else {
      setError("No se pudo eliminar al líder.");
    }
  }

  // ---- Jóvenes ----

  function openCreateJoven() {
    setEditingJovenId(null);
    setJovenForm({ ...emptyJovenForm, leader_id: leaders[0]?.id || "" });
    setJovenModalOpen(true);
  }

  function openEditJoven(j) {
    setEditingJovenId(j.id);
    setJovenForm({
      nombre: j.nombre,
      sistema_usuario: j.sistema_usuario,
      sistema_password: j.sistema_password,
      notas: j.notas || "",
      leader_id: j.leader_id,
    });
    setJovenModalOpen(true);
  }

  async function handleSaveJoven(e) {
    e.preventDefault();
    setSavingJoven(true);
    setError("");
    const headers = await authHeader();
    const url = editingJovenId ? `/api/jovenes/${editingJovenId}` : "/api/jovenes";
    const method = editingJovenId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers, body: JSON.stringify(jovenForm) });
    setSavingJoven(false);
    if (res.ok) {
      setJovenModalOpen(false);
      loadAll();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "No se pudo guardar.");
    }
  }

  async function handleDeleteJoven(id) {
    if (!confirm("¿Eliminar estas credenciales?")) return;
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
          <h1>Panel de administración</h1>
          <p className="subtitle" style={{ margin: 0 }}>{session.user.email}</p>
        </div>
        <button className="btn-secondary" onClick={handleLogout}>Cerrar sesión</button>
      </div>

      {error && <p className="error">{error}</p>}

      {/* ---- Líderes ---- */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="topbar" style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Líderes</h2>
          <button className="btn-primary" onClick={openCreateLeader}>+ Agregar líder</button>
        </div>

        {loading ? (
          <p>Cargando...</p>
        ) : leaders.length === 0 ? (
          <div className="empty-state">Aún no hay líderes registrados.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th># Jóvenes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((l) => (
                <tr key={l.id}>
                  <td data-label="Nombre">{l.nombre}</td>
                  <td data-label="Correo">{l.email}</td>
                  <td data-label="# Jóvenes">{jovenes.filter((j) => j.leader_id === l.id).length}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-secondary" onClick={() => openEditLeader(l)}>Editar</button>
                      <button className="btn-danger" onClick={() => handleDeleteLeader(l)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ---- Jóvenes ---- */}
      <div className="card">
        <div className="topbar" style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Todos los jóvenes</h2>
          <button className="btn-primary" onClick={openCreateJoven} disabled={leaders.length === 0}>
            + Agregar joven
          </button>
        </div>

        {loading ? (
          <p>Cargando...</p>
        ) : jovenes.length === 0 ? (
          <div className="empty-state">Aún no hay jóvenes registrados.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Líder</th>
                <th>Usuario</th>
                <th>Contraseña</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {jovenes.map((j) => (
                <tr key={j.id}>
                  <td data-label="Nombre">{j.nombre}</td>
                  <td data-label="Líder">{leaderMap[j.leader_id]?.nombre || "—"}</td>
                  <td data-label="Usuario">{j.sistema_usuario}</td>
                  <td data-label="Contraseña">
                    <div className="pw-cell">
                      <span>{visiblePw[j.id] ? j.sistema_password : "••••••••"}</span>
                      <button className="btn-link" onClick={() => togglePw(j.id)}>
                        {visiblePw[j.id] ? "Ocultar" : "Ver"}
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-secondary" onClick={() => openEditJoven(j)}>Editar</button>
                      <button className="btn-danger" onClick={() => handleDeleteJoven(j.id)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ---- Modal líder ---- */}
      {leaderModalOpen && (
        <div className="modal-backdrop" onClick={() => setLeaderModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingLeaderId ? "Editar líder" : "Agregar líder"}</h2>
            <form onSubmit={handleSaveLeader}>
              <label>Nombre</label>
              <input
                required
                value={leaderForm.nombre}
                onChange={(e) => setLeaderForm({ ...leaderForm, nombre: e.target.value })}
              />
              <label>Correo</label>
              <input
                type="email"
                required
                disabled={!!editingLeaderId}
                value={leaderForm.email}
                onChange={(e) => setLeaderForm({ ...leaderForm, email: e.target.value })}
              />
              <label>{editingLeaderId ? "Nueva contraseña (opcional)" : "Contraseña"}</label>
              <input
                type="text"
                required={!editingLeaderId}
                value={leaderForm.password}
                onChange={(e) => setLeaderForm({ ...leaderForm, password: e.target.value })}
                placeholder={editingLeaderId ? "Dejar vacío para no cambiarla" : ""}
              />
              {error && <p className="error">{error}</p>}
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setLeaderModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={savingLeader}>
                  {savingLeader ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Modal joven ---- */}
      {jovenModalOpen && (
        <div className="modal-backdrop" onClick={() => setJovenModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingJovenId ? "Editar joven" : "Agregar joven"}</h2>
            <form onSubmit={handleSaveJoven}>
              <label>Líder responsable</label>
              <select
                required
                value={jovenForm.leader_id}
                onChange={(e) => setJovenForm({ ...jovenForm, leader_id: e.target.value })}
              >
                <option value="" disabled>Selecciona un líder</option>
                {leaders.map((l) => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </select>
              <label>Nombre del joven</label>
              <input
                required
                value={jovenForm.nombre}
                onChange={(e) => setJovenForm({ ...jovenForm, nombre: e.target.value })}
              />
              <label>Usuario (del sistema de jóvenes)</label>
              <input
                required
                value={jovenForm.sistema_usuario}
                onChange={(e) => setJovenForm({ ...jovenForm, sistema_usuario: e.target.value })}
              />
              <label>Contraseña (del sistema de jóvenes)</label>
              <input
                required
                value={jovenForm.sistema_password}
                onChange={(e) => setJovenForm({ ...jovenForm, sistema_password: e.target.value })}
              />
              <label>Notas (opcional)</label>
              <textarea
                rows={2}
                value={jovenForm.notas}
                onChange={(e) => setJovenForm({ ...jovenForm, notas: e.target.value })}
              />
              {error && <p className="error">{error}</p>}
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setJovenModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={savingJoven}>
                  {savingJoven ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
