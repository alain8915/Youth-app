import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useEscapeClose } from "../lib/useEscapeClose";
import { useToast } from "../lib/useToast";
import Toast from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";
import LogoMark from "../components/LogoMark";
import { isStaffRole } from "../lib/roles";

const emptyLeaderForm = { nombre: "", email: "", password: "", barrio_id: "", esEstaca: false };
const emptyBarrioForm = { nombre: "" };
const emptyJovenForm = { nombre: "", sistema_usuario: "", sistema_password: "", notas: "", barrio_id: "" };

export default function Admin() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [leaders, setLeaders] = useState([]);
  const [barrios, setBarrios] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [jovenes, setJovenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visiblePw, setVisiblePw] = useState({});
  const [confirmState, setConfirmState] = useState({ open: false });

  const { toast, showToast, clearToast } = useToast();

  const [leaderModalOpen, setLeaderModalOpen] = useState(false);
  const [editingLeaderId, setEditingLeaderId] = useState(null);
  const [leaderForm, setLeaderForm] = useState(emptyLeaderForm);
  const [savingLeader, setSavingLeader] = useState(false);

  const [barrioModalOpen, setBarrioModalOpen] = useState(false);
  const [editingBarrioId, setEditingBarrioId] = useState(null);
  const [barrioForm, setBarrioForm] = useState(emptyBarrioForm);
  const [savingBarrio, setSavingBarrio] = useState(false);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningLeader, setAssigningLeader] = useState(null);
  const [assignBarrioId, setAssignBarrioId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const [jovenModalOpen, setJovenModalOpen] = useState(false);
  const [editingJovenId, setEditingJovenId] = useState(null);
  const [jovenForm, setJovenForm] = useState(emptyJovenForm);
  const [savingJoven, setSavingJoven] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
      } else if (!isStaffRole(session.user.app_metadata?.role)) {
        router.replace("/dashboard");
      } else {
        setSession(session);
      }
    });
  }, [router]);

  useEscapeClose(leaderModalOpen, () => setLeaderModalOpen(false));
  useEscapeClose(barrioModalOpen, () => setBarrioModalOpen(false));
  useEscapeClose(assignModalOpen, () => setAssignModalOpen(false));
  useEscapeClose(jovenModalOpen, () => setJovenModalOpen(false));

  const authHeader = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    const headers = await authHeader();
    const [leadersRes, barriosRes, asignacionesRes, jovenesRes] = await Promise.all([
      fetch("/api/admin/leaders", { headers }),
      fetch("/api/admin/barrios", { headers }),
      fetch("/api/admin/asignaciones", { headers }),
      fetch("/api/jovenes", { headers }),
    ]);
    if (leadersRes.ok) setLeaders(await leadersRes.json());
    if (barriosRes.ok) setBarrios(await barriosRes.json());
    if (asignacionesRes.ok) setAsignaciones(await asignacionesRes.json());
    if (jovenesRes.ok) setJovenes(await jovenesRes.json());
    if (!leadersRes.ok || !barriosRes.ok || !asignacionesRes.ok || !jovenesRes.ok) {
      setError("No se pudo cargar toda la información.");
    }
    setLoading(false);
  }, [authHeader]);

  useEffect(() => {
    if (session) loadAll();
  }, [session, loadAll]);

  const barrioMap = useMemo(() => {
    const map = {};
    barrios.forEach((b) => (map[b.id] = b));
    return map;
  }, [barrios]);

  const leaderBarriosMap = useMemo(() => {
    const map = {};
    asignaciones.forEach((a) => {
      if (!map[a.leader_id]) map[a.leader_id] = [];
      map[a.leader_id].push({ barrio_id: a.barrio_id, nombre: a.barrio_nombre });
    });
    return map;
  }, [asignaciones]);

  function closeConfirm() {
    setConfirmState({ open: false });
  }

  async function handleConfirm() {
    const action = confirmState.onConfirm;
    closeConfirm();
    if (action) await action();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // ---- Barrios ----

  function openCreateBarrio() {
    setEditingBarrioId(null);
    setBarrioForm(emptyBarrioForm);
    setBarrioModalOpen(true);
  }

  function openEditBarrio(b) {
    setEditingBarrioId(b.id);
    setBarrioForm({ nombre: b.nombre });
    setBarrioModalOpen(true);
  }

  async function handleSaveBarrio(e) {
    e.preventDefault();
    setSavingBarrio(true);
    setError("");
    const headers = await authHeader();
    const url = editingBarrioId ? `/api/admin/barrios/${editingBarrioId}` : "/api/admin/barrios";
    const method = editingBarrioId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers, body: JSON.stringify(barrioForm) });
    setSavingBarrio(false);
    if (res.ok) {
      setBarrioModalOpen(false);
      loadAll();
      showToast(editingBarrioId ? "Barrio actualizado." : "Barrio creado.");
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "No se pudo guardar el Barrio.");
    }
  }

  function requestDeleteBarrio(b) {
    setConfirmState({
      open: true,
      title: "Eliminar Barrio",
      message: `¿Eliminar el Barrio "${b.nombre}"? Esto solo funciona si ya no tiene jóvenes asignados.`,
      danger: true,
      onConfirm: async () => {
        const headers = await authHeader();
        const res = await fetch(`/api/admin/barrios/${b.id}`, { method: "DELETE", headers });
        if (res.ok) {
          loadAll();
          showToast("Barrio eliminado.");
        } else {
          const body = await res.json().catch(() => ({}));
          setError(body.error || "No se pudo eliminar el Barrio.");
        }
      },
    });
  }

  // ---- Líderes ----

  function openCreateLeader() {
    setEditingLeaderId(null);
    setLeaderForm({ ...emptyLeaderForm, barrio_id: barrios[0]?.id || "" });
    setLeaderModalOpen(true);
  }

  function openEditLeader(l) {
    setEditingLeaderId(l.id);
    setLeaderForm({ nombre: l.nombre, email: l.email, password: "", barrio_id: "", esEstaca: l.role === "estaca" });
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
        body: JSON.stringify({
          nombre: leaderForm.nombre,
          password: leaderForm.password || undefined,
          esEstaca: leaderForm.esEstaca,
        }),
      });
    } else {
      res = await fetch("/api/admin/leaders", {
        method: "POST",
        headers,
        body: JSON.stringify(leaderForm),
      });
    }

    if (!res.ok) {
      setSavingLeader(false);
      const body = await res.json().catch(() => ({}));
      setError(body.error || "No se pudo guardar el líder.");
      return;
    }

    if (!editingLeaderId && !leaderForm.esEstaca && leaderForm.barrio_id) {
      const created = await res.json();
      await fetch("/api/admin/asignaciones", {
        method: "POST",
        headers,
        body: JSON.stringify({ leader_id: created.id, barrio_id: leaderForm.barrio_id }),
      });
    }

    setSavingLeader(false);
    setLeaderModalOpen(false);
    loadAll();
    showToast(editingLeaderId ? "Líder actualizado." : "Líder creado.");
  }

  function requestDeleteLeader(l) {
    setConfirmState({
      open: true,
      title: "Eliminar líder",
      message: `¿Eliminar al líder ${l.nombre}? Perderá acceso de inmediato. Los jóvenes de sus Barrios NO se eliminan, siguen intactos.`,
      danger: true,
      onConfirm: async () => {
        const headers = await authHeader();
        const res = await fetch(`/api/admin/leaders/${l.id}`, { method: "DELETE", headers });
        if (res.ok) {
          loadAll();
          showToast("Líder eliminado.");
        } else {
          setError("No se pudo eliminar al líder.");
        }
      },
    });
  }

  function openAssignModal(leader) {
    setAssigningLeader(leader);
    const yaAsignados = new Set((leaderBarriosMap[leader.id] || []).map((b) => b.barrio_id));
    const disponible = barrios.find((b) => !yaAsignados.has(b.id));
    setAssignBarrioId(disponible?.id || "");
    setAssignModalOpen(true);
  }

  async function handleAssign(e) {
    e.preventDefault();
    if (!assignBarrioId) return;
    setAssigning(true);
    setError("");
    const headers = await authHeader();
    const res = await fetch("/api/admin/asignaciones", {
      method: "POST",
      headers,
      body: JSON.stringify({ leader_id: assigningLeader.id, barrio_id: assignBarrioId }),
    });
    setAssigning(false);
    if (res.ok) {
      setAssignModalOpen(false);
      loadAll();
      showToast(`Barrio asignado a ${assigningLeader.nombre}.`);
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "No se pudo asignar el Barrio.");
    }
  }

  function requestUnassign(leader, barrio) {
    setConfirmState({
      open: true,
      title: "Quitar asignación",
      message: `¿Quitar a ${leader.nombre} del Barrio "${barrio.nombre}"? Dejará de ver a esos jóvenes de inmediato.`,
      danger: true,
      onConfirm: async () => {
        const headers = await authHeader();
        const res = await fetch(
          `/api/admin/asignaciones?leader_id=${leader.id}&barrio_id=${barrio.barrio_id}`,
          { method: "DELETE", headers }
        );
        if (res.ok) {
          loadAll();
          showToast("Asignación eliminada.");
        } else {
          setError("No se pudo quitar la asignación.");
        }
      },
    });
  }

  // ---- Jóvenes ----

  function openCreateJoven() {
    setEditingJovenId(null);
    setJovenForm({ ...emptyJovenForm, barrio_id: barrios[0]?.id || "" });
    setJovenModalOpen(true);
  }

  function openEditJoven(j) {
    setEditingJovenId(j.id);
    setJovenForm({
      nombre: j.nombre,
      sistema_usuario: j.sistema_usuario,
      sistema_password: j.sistema_password,
      notas: j.notas || "",
      barrio_id: j.barrio_id,
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
      showToast(editingJovenId ? "Cambios guardados." : "Joven agregado.");
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "No se pudo guardar.");
    }
  }

  function requestDeleteJoven(j) {
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

  function togglePw(id) {
    setVisiblePw((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  if (session === undefined) return null;

  return (
    <>
      <a href="#main-content" className="skip-link">Saltar al contenido</a>
      <main id="main-content" className="container">
        <div className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LogoMark size={36} />
            <div>
              <h1>{session.user.app_metadata?.role === "estaca" ? "Panel de Estaca" : "Panel de administración"}</h1>
              <p className="subtitle" style={{ margin: 0 }}>{session.user.email}</p>
            </div>
          </div>
          <button className="btn-secondary" onClick={handleLogout}>Cerrar sesión</button>
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        {/* ---- Barrios ---- */}
        <section className="card" style={{ marginBottom: 24 }} aria-labelledby="barrios-heading">
          <div className="topbar" style={{ marginBottom: 8 }}>
            <h2 id="barrios-heading" style={{ margin: 0 }}>Barrios</h2>
            <button className="btn-primary" onClick={openCreateBarrio}>+ Agregar Barrio</button>
          </div>

          {loading ? (
            <p>Cargando...</p>
          ) : barrios.length === 0 ? (
            <div className="empty-state">
              Aún no hay Barrios. Crea el primero para poder registrar líderes y jóvenes.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th># Jóvenes</th>
                  <th># Líderes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {barrios.map((b) => (
                  <tr key={b.id}>
                    <td data-label="Nombre">{b.nombre}</td>
                    <td data-label="# Jóvenes">{jovenes.filter((j) => j.barrio_id === b.id).length}</td>
                    <td data-label="# Líderes">
                      {asignaciones.filter((a) => a.barrio_id === b.id).length}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-secondary" onClick={() => openEditBarrio(b)}>Editar</button>
                        <button className="btn-danger" onClick={() => requestDeleteBarrio(b)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* ---- Líderes ---- */}
        <section className="card" style={{ marginBottom: 24 }} aria-labelledby="lideres-heading">
          <div className="topbar" style={{ marginBottom: 8 }}>
            <h2 id="lideres-heading" style={{ margin: 0 }}>Líderes</h2>
            <button className="btn-primary" onClick={openCreateLeader} disabled={barrios.length === 0}>
              + Agregar líder
            </button>
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
                  <th>Barrios asignados</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((l) => (
                  <tr key={l.id}>
                    <td data-label="Nombre">
                      {l.nombre}
                      {l.role === "estaca" && <span className="badge badge-estaca">Estaca</span>}
                    </td>
                    <td data-label="Correo">{l.email}</td>
                    <td data-label="Barrios asignados">
                      {l.role === "estaca" ? (
                        <span className="subtitle" style={{ margin: 0 }}>Todos los Barrios</span>
                      ) : (
                        <div className="badge-list">
                          {(leaderBarriosMap[l.id] || []).map((b) => (
                            <span key={b.barrio_id} className="badge">
                              {b.nombre}
                              <button
                                type="button"
                                className="badge-remove"
                                onClick={() => requestUnassign(l, b)}
                                aria-label={`Quitar a ${l.nombre} del Barrio ${b.nombre}`}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <button className="btn-link" onClick={() => openAssignModal(l)}>+ Asignar Barrio</button>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-secondary" onClick={() => openEditLeader(l)}>Editar</button>
                        <button className="btn-danger" onClick={() => requestDeleteLeader(l)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* ---- Jóvenes ---- */}
        <section className="card" aria-labelledby="jovenes-heading">
          <div className="topbar" style={{ marginBottom: 8 }}>
            <h2 id="jovenes-heading" style={{ margin: 0 }}>Todos los jóvenes</h2>
            <button className="btn-primary" onClick={openCreateJoven} disabled={barrios.length === 0}>
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
                  <th>Barrio</th>
                  <th>Usuario</th>
                  <th>Contraseña</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {jovenes.map((j) => (
                  <tr key={j.id}>
                    <td data-label="Nombre">{j.nombre}</td>
                    <td data-label="Barrio">{barrioMap[j.barrio_id]?.nombre || "—"}</td>
                    <td data-label="Usuario">{j.sistema_usuario}</td>
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
                    <td>
                      <div className="row-actions">
                        <button className="btn-secondary" onClick={() => openEditJoven(j)}>Editar</button>
                        <button className="btn-danger" onClick={() => requestDeleteJoven(j)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* ---- Modal Barrio ---- */}
        {barrioModalOpen && (
          <div className="modal-backdrop" onClick={() => setBarrioModalOpen(false)}>
            <div
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="barrio-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="barrio-modal-title">{editingBarrioId ? "Editar Barrio" : "Agregar Barrio"}</h2>
              <form onSubmit={handleSaveBarrio} noValidate>
                <label htmlFor="barrio-nombre">Nombre del Barrio</label>
                <input
                  id="barrio-nombre"
                  required
                  autoFocus
                  value={barrioForm.nombre}
                  onChange={(e) => setBarrioForm({ nombre: e.target.value })}
                />
                {error && <p className="error" role="alert">{error}</p>}
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setBarrioModalOpen(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" disabled={savingBarrio}>
                    {savingBarrio ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ---- Modal líder ---- */}
        {leaderModalOpen && (
          <div className="modal-backdrop" onClick={() => setLeaderModalOpen(false)}>
            <div
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="leader-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="leader-modal-title">{editingLeaderId ? "Editar líder" : "Agregar líder"}</h2>
              <form onSubmit={handleSaveLeader} noValidate>
                <label htmlFor="leader-nombre">Nombre</label>
                <input
                  id="leader-nombre"
                  required
                  autoFocus
                  value={leaderForm.nombre}
                  onChange={(e) => setLeaderForm({ ...leaderForm, nombre: e.target.value })}
                />
                <label htmlFor="leader-email">Correo</label>
                <input
                  id="leader-email"
                  type="email"
                  required
                  disabled={!!editingLeaderId}
                  value={leaderForm.email}
                  onChange={(e) => setLeaderForm({ ...leaderForm, email: e.target.value })}
                />
                <label htmlFor="leader-password">
                  {editingLeaderId ? "Nueva contraseña (opcional)" : "Contraseña"}
                </label>
                <input
                  id="leader-password"
                  type="text"
                  required={!editingLeaderId}
                  value={leaderForm.password}
                  onChange={(e) => setLeaderForm({ ...leaderForm, password: e.target.value })}
                  placeholder={editingLeaderId ? "Dejar vacío para no cambiarla" : ""}
                />
                <label className="checkbox-label" htmlFor="leader-es-estaca">
                  <input
                    id="leader-es-estaca"
                    type="checkbox"
                    checked={leaderForm.esEstaca}
                    onChange={(e) => setLeaderForm({ ...leaderForm, esEstaca: e.target.checked, barrio_id: "" })}
                  />
                  Es líder de Estaca (ve y administra todos los Barrios)
                </label>
                {editingLeaderId && leaderForm.esEstaca && (
                  <p className="subtitle" style={{ margin: "4px 0 0", fontSize: 12 }}>
                    Ya no necesita Barrios asignados individualmente — ve todos automáticamente.
                  </p>
                )}
                {editingLeaderId && !leaderForm.esEstaca && (
                  <p className="subtitle" style={{ margin: "4px 0 0", fontSize: 12 }}>
                    Al quitarle Estaca, solo verá los Barrios que tenga asignados en la tabla de Líderes
                    (asígnale uno si todavía no tiene ninguno).
                  </p>
                )}
                {!editingLeaderId && !leaderForm.esEstaca && (
                  <>
                    <label htmlFor="leader-barrio">Barrio inicial (opcional)</label>
                    <select
                      id="leader-barrio"
                      value={leaderForm.barrio_id}
                      onChange={(e) => setLeaderForm({ ...leaderForm, barrio_id: e.target.value })}
                    >
                      <option value="">Sin asignar por ahora</option>
                      {barrios.map((b) => (
                        <option key={b.id} value={b.id}>{b.nombre}</option>
                      ))}
                    </select>
                  </>
                )}
                {error && <p className="error" role="alert">{error}</p>}
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

        {/* ---- Modal asignar Barrio a líder ---- */}
        {assignModalOpen && (
          <div className="modal-backdrop" onClick={() => setAssignModalOpen(false)}>
            <div
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="assign-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="assign-modal-title">Asignar Barrio a {assigningLeader?.nombre}</h2>
              <form onSubmit={handleAssign} noValidate>
                <label htmlFor="assign-barrio">Barrio</label>
                <select
                  id="assign-barrio"
                  required
                  autoFocus
                  value={assignBarrioId}
                  onChange={(e) => setAssignBarrioId(e.target.value)}
                >
                  <option value="" disabled>Selecciona un Barrio</option>
                  {barrios
                    .filter((b) => !(leaderBarriosMap[assigningLeader?.id] || []).some((x) => x.barrio_id === b.id))
                    .map((b) => (
                      <option key={b.id} value={b.id}>{b.nombre}</option>
                    ))}
                </select>
                {error && <p className="error" role="alert">{error}</p>}
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setAssignModalOpen(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" disabled={assigning}>
                    {assigning ? "Asignando..." : "Asignar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ---- Modal joven ---- */}
        {jovenModalOpen && (
          <div className="modal-backdrop" onClick={() => setJovenModalOpen(false)}>
            <div
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="joven-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="joven-modal-title">{editingJovenId ? "Editar joven" : "Agregar joven"}</h2>
              <form onSubmit={handleSaveJoven} noValidate>
                <label htmlFor="joven-admin-barrio">Barrio</label>
                <select
                  id="joven-admin-barrio"
                  required
                  autoFocus
                  value={jovenForm.barrio_id}
                  onChange={(e) => setJovenForm({ ...jovenForm, barrio_id: e.target.value })}
                >
                  <option value="" disabled>Selecciona un Barrio</option>
                  {barrios.map((b) => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
                <label htmlFor="joven-admin-nombre">Nombre del joven</label>
                <input
                  id="joven-admin-nombre"
                  required
                  value={jovenForm.nombre}
                  onChange={(e) => setJovenForm({ ...jovenForm, nombre: e.target.value })}
                />
                <label htmlFor="joven-admin-usuario">Usuario (del sistema de jóvenes)</label>
                <input
                  id="joven-admin-usuario"
                  required
                  value={jovenForm.sistema_usuario}
                  onChange={(e) => setJovenForm({ ...jovenForm, sistema_usuario: e.target.value })}
                />
                <label htmlFor="joven-admin-password">Contraseña (del sistema de jóvenes)</label>
                <input
                  id="joven-admin-password"
                  required
                  value={jovenForm.sistema_password}
                  onChange={(e) => setJovenForm({ ...jovenForm, sistema_password: e.target.value })}
                />
                <label htmlFor="joven-admin-notas">Notas (opcional)</label>
                <textarea
                  id="joven-admin-notas"
                  rows={2}
                  value={jovenForm.notas}
                  onChange={(e) => setJovenForm({ ...jovenForm, notas: e.target.value })}
                />
                {error && <p className="error" role="alert">{error}</p>}
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
