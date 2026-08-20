"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { firebaseAuthClient } from "../../lib/firebase";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { apiGet, apiPut } from "../../lib/api";

interface Profile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  level: string | null;
  dominance: string | null;
  disciplines: string[];
  roles: string[];
}

const DISCIPLINES = ["KITESURF", "WINGFOIL"];
const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "PRO"];
const DOMINANCE = ["REGULAR", "GOOFY"];

export default function ProfilePage() {
  const { ready } = useRequireAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    apiGet<Profile>("/api/v1/users/me").then(setProfile).catch(console.error);
  }, [ready]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await apiPut<Profile>("/api/v1/users/me", {
        firstName: profile.firstName || undefined,
        lastName: profile.lastName || undefined,
        age: profile.age || undefined,
        weightKg: profile.weightKg || undefined,
        heightCm: profile.heightCm || undefined,
        level: profile.level || undefined,
        dominance: profile.dominance || undefined,
        disciplines: profile.disciplines.length ? profile.disciplines : undefined,
      });
      setProfile(updated);
      setMessage("Perfil actualizado.");
    } catch (err) {
      setMessage("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  function toggleDiscipline(discipline: string) {
    if (!profile) return;
    const has = profile.disciplines.includes(discipline);
    setProfile({
      ...profile,
      disciplines: has
        ? profile.disciplines.filter((d) => d !== discipline)
        : [...profile.disciplines, discipline],
    });
  }

  if (!ready || !profile) {
    return (
      <div className="auth-shell">
        <p style={{ color: "var(--color-muted)" }}>Cargando perfil…</p>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <h1>Mi perfil</h1>
        <p className="subtitle">{profile.email} · Roles: {profile.roles.join(", ")}</p>

        <form onSubmit={handleSave}>
          <div className="field">
            <label>Nombre</label>
            <input
              value={profile.firstName ?? ""}
              onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Apellido</label>
            <input
              value={profile.lastName ?? ""}
              onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Edad</label>
            <input
              type="number"
              value={profile.age ?? ""}
              onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label>Peso (kg)</label>
            <input
              type="number"
              value={profile.weightKg ?? ""}
              onChange={(e) =>
                setProfile({ ...profile, weightKg: Number(e.target.value) })
              }
            />
          </div>
          <div className="field">
            <label>Altura (cm)</label>
            <input
              type="number"
              value={profile.heightCm ?? ""}
              onChange={(e) =>
                setProfile({ ...profile, heightCm: Number(e.target.value) })
              }
            />
          </div>
          <div className="field">
            <label>Nivel</label>
            <select
              value={profile.level ?? ""}
              onChange={(e) => setProfile({ ...profile, level: e.target.value })}
            >
              <option value="">Selecciona…</option>
              {LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Dominancia</label>
            <select
              value={profile.dominance ?? ""}
              onChange={(e) => setProfile({ ...profile, dominance: e.target.value })}
            >
              <option value="">Selecciona…</option>
              {DOMINANCE.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Disciplinas</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {DISCIPLINES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDiscipline(d)}
                  className="btn-secondary"
                  style={{
                    width: "auto",
                    padding: "8px 14px",
                    borderColor: profile.disciplines.includes(d)
                      ? "var(--color-turquoise)"
                      : "rgba(255,255,255,0.15)",
                    color: profile.disciplines.includes(d)
                      ? "var(--color-turquoise)"
                      : "var(--color-white)",
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {message && <p className="success-text">{message}</p>}

          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>

        <button
          className="btn-secondary"
          onClick={() => router.push("/subscription")}
        >
          Planes y suscripción
        </button>

        <button
          className="btn-secondary"
          onClick={() => router.push("/groups")}
        >
          Mis grupos
        </button>

        <button
          className="btn-secondary"
          onClick={() => router.push("/dashboard")}
        >
          Dashboard
        </button>

        <button
          className="btn-secondary"
          onClick={() => router.push("/videos")}
        >
          Mis videos
        </button>

        <button
          className="btn-secondary"
          onClick={() => signOut(firebaseAuthClient).then(() => router.push("/login"))}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
