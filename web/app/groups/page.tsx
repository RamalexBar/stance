"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { apiGet, apiPost } from "../../lib/api";

interface GroupSummary {
  id: string;
  name: string;
  schoolId: string;
  trainers: { userId: string; user: { email: string; firstName: string | null } }[];
  athletes: { userId: string; user: { email: string; firstName: string | null } }[];
}

export default function GroupsPage() {
  const { ready } = useRequireAuth();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    load();
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    try {
      const result = await apiGet<GroupSummary[]>("/api/v1/groups");
      setGroups(result);
    } catch (err) {
      console.error(err);
    }
  }

  async function createGroup() {
    if (!newName.trim()) return;
    setError(null);
    try {
      await apiPost("/api/v1/groups", { name: newName });
      setNewName("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el grupo.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: "40px 24px", maxWidth: 720, margin: "0 auto" }}>
      <p className="footer-link" style={{ textAlign: "left", marginBottom: 8 }}>
        <Link href="/profile">← Volver al perfil</Link>
      </p>
      <h1 style={{ color: "var(--color-turquoise)", marginBottom: 4 }}>Mis grupos</h1>
      <p className="subtitle">Escuelas, entrenadores y deportistas</p>

      <div className="field" style={{ maxWidth: 360 }}>
        <label>Crear nuevo grupo (solo cuentas Escuela)</label>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej. Escuela Kite Playa Norte" />
      </div>
      <button className="btn-primary" style={{ width: "auto", padding: "10px 18px", marginBottom: 12 }} onClick={createGroup}>
        Crear grupo
      </button>
      {error && <p className="error-text">{error}</p>}

      <h3 style={{ color: "var(--color-white)", fontSize: "1rem", marginTop: 24, marginBottom: 8 }}>
        Grupos donde participo
      </h3>
      {groups.length === 0 && <p style={{ color: "var(--color-muted)", fontSize: 13 }}>Sin grupos todavía.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {groups.map((g) => (
          <li key={g.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "10px 0" }}>
            <Link href={`/groups/${g.id}`} style={{ color: "var(--color-white)", fontWeight: 600 }}>
              {g.name}
            </Link>
            <p style={{ color: "var(--color-muted)", fontSize: 12, margin: "2px 0 0" }}>
              {g.trainers.length} entrenador(es) · {g.athletes.length} deportista(s)
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
