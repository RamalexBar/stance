"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRequireAuth } from "../../../hooks/useRequireAuth";
import { apiGet, apiPost } from "../../../lib/api";

interface Member {
  userId: string;
  user: { email: string; firstName: string | null; lastName: string | null };
}

interface GroupDetail {
  id: string;
  name: string;
  schoolId: string;
  trainers: Member[];
  athletes: Member[];
}

interface RankingEntry {
  userId: string;
  name: string;
  averageScore: number | null;
  videosConsidered: number;
}

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { ready } = useRequireAuth();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[] | null>(null);
  const [newTrainerId, setNewTrainerId] = useState("");
  const [newAthleteId, setNewAthleteId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!ready) return;
    load();
  }, [id, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoadError(null);
    try {
      const groups = await apiGet<GroupDetail[]>("/api/v1/groups");
      const found = groups.find((g) => g.id === id) ?? null;
      if (!found) {
        setNotFound(true);
        return;
      }
      setGroup(found);
      const rankingResult = await apiGet<RankingEntry[]>(`/api/v1/groups/${id}/ranking`);
      setRanking(rankingResult);
    } catch (err) {
      console.error(err);
      setLoadError(err instanceof Error ? err.message : "No se pudo cargar el grupo.");
    }
  }

  async function addTrainer() {
    if (!newTrainerId.trim()) return;
    setError(null);
    try {
      await apiPost(`/api/v1/groups/${id}/trainers`, { userId: newTrainerId });
      setNewTrainerId("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo asignar el entrenador.");
    }
  }

  async function addAthlete() {
    if (!newAthleteId.trim()) return;
    setError(null);
    try {
      await apiPost(`/api/v1/groups/${id}/athletes`, { userId: newAthleteId });
      setNewAthleteId("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo asignar el deportista.");
    }
  }

  if (!group) {
    return (
      <div style={{ minHeight: "100vh", padding: "40px 24px", maxWidth: 720, margin: "0 auto" }}>
        <p className="footer-link" style={{ textAlign: "left", marginBottom: 8 }}>
          <Link href="/groups">← Volver a mis grupos</Link>
        </p>
        {notFound && <p className="error-text">Ese grupo no existe o no tienes acceso a él.</p>}
        {loadError && (
          <>
            <p className="error-text">{loadError}</p>
            <button className="btn-secondary" style={{ width: "auto", padding: "10px 18px", marginTop: 12 }} onClick={load}>
              Reintentar
            </button>
          </>
        )}
        {!notFound && !loadError && <p style={{ color: "var(--color-muted)" }}>Cargando…</p>}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: "40px 24px", maxWidth: 720, margin: "0 auto" }}>
      <p className="footer-link" style={{ textAlign: "left", marginBottom: 8 }}>
        <Link href="/groups">← Volver a mis grupos</Link>
      </p>
      <h1 style={{ color: "var(--color-turquoise)", marginBottom: 4 }}>{group.name}</h1>
      <p className="subtitle">Ranking, entrenadores y deportistas</p>

      {error && <p className="error-text">{error}</p>}

      <h3 style={{ color: "var(--color-white)", fontSize: "1rem", marginTop: 20, marginBottom: 8 }}>
        Ranking del grupo
      </h3>
      <p style={{ color: "var(--color-muted)", fontSize: 12, marginBottom: 10 }}>
        Basado en el promedio de la puntuación técnica (Fase 7) de las últimas 5 sesiones de cada deportista.
      </p>
      {ranking && ranking.length === 0 && <p style={{ color: "var(--color-muted)", fontSize: 13 }}>Sin deportistas todavía.</p>}
      <ol style={{ paddingLeft: 20 }}>
        {ranking?.map((r) => (
          <li key={r.userId} style={{ marginBottom: 6, fontSize: 13 }}>
            <span style={{ color: "var(--color-white)" }}>{r.name}</span>{" "}
            <span style={{ color: "var(--color-muted)" }}>
              — {r.averageScore != null ? `${r.averageScore.toFixed(0)} pts` : "sin videos analizados"} ({r.videosConsidered} sesiones)
            </span>
          </li>
        ))}
      </ol>

      <h3 style={{ color: "var(--color-white)", fontSize: "1rem", marginTop: 24, marginBottom: 8 }}>Entrenadores</h3>
      <ul style={{ listStyle: "none", padding: 0, marginBottom: 8 }}>
        {group.trainers.map((t) => (
          <li key={t.userId} style={{ color: "var(--color-muted)", fontSize: 13 }}>{t.user.email}</li>
        ))}
      </ul>
      <div style={{ display: "flex", gap: 8, maxWidth: 420 }}>
        <input
          value={newTrainerId}
          onChange={(e) => setNewTrainerId(e.target.value)}
          placeholder="userId del entrenador a asignar"
          style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: "var(--color-white)" }}
        />
        <button className="btn-secondary" style={{ width: "auto", padding: "10px 16px" }} onClick={addTrainer}>
          Asignar
        </button>
      </div>

      <h3 style={{ color: "var(--color-white)", fontSize: "1rem", marginTop: 24, marginBottom: 8 }}>Deportistas</h3>
      <ul style={{ listStyle: "none", padding: 0, marginBottom: 8 }}>
        {group.athletes.map((a) => (
          <li key={a.userId} style={{ color: "var(--color-muted)", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
            <span>{a.user.email}</span>
            <Link href={`/groups/${id}/athletes/${a.userId}`} style={{ color: "var(--color-turquoise)", fontSize: 12 }}>
              Ver progreso
            </Link>
          </li>
        ))}
      </ul>
      <div style={{ display: "flex", gap: 8, maxWidth: 420 }}>
        <input
          value={newAthleteId}
          onChange={(e) => setNewAthleteId(e.target.value)}
          placeholder="userId del deportista a asignar"
          style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: "var(--color-white)" }}
        />
        <button className="btn-secondary" style={{ width: "auto", padding: "10px 16px" }} onClick={addAthlete}>
          Asignar
        </button>
      </div>

      <p style={{ color: "var(--color-muted)", fontSize: 11, marginTop: 20 }}>
        Nota: por ahora se asigna por userId directo (sin buscador de usuarios) — un buscador por email queda como mejora de UX futura.
      </p>
    </div>
  );
}
