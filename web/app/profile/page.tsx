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
  gender: string | null;
  level: string | null;
  dominance: string | null;
  disciplines: string[];
  roles: string[];
  homeSpotName: string | null;
  homeSpotLat: number | null;
  homeSpotLon: number | null;
  homeSpotSeaDirectionDeg: number | null;
}

interface SpotSearchResult {
  name: string;
  admin1: string | null;
  country: string | null;
  lat: number;
  lon: number;
}

const DISCIPLINES = ["KITESURF", "WINGFOIL"];
const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "PRO"];
const DOMINANCE = ["REGULAR", "GOOFY"];
const GENDERS = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"];
const GENDER_LABEL: Record<string, string> = {
  MALE: "Masculino",
  FEMALE: "Femenino",
  OTHER: "Otro",
  PREFER_NOT_TO_SAY: "Prefiero no decir",
};

export default function ProfilePage() {
  const { ready } = useRequireAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [spotQuery, setSpotQuery] = useState("");
  const [spotResults, setSpotResults] = useState<SpotSearchResult[]>([]);
  const [searchingSpot, setSearchingSpot] = useState(false);
  const [spotError, setSpotError] = useState<string | null>(null);

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
        gender: profile.gender || undefined,
        level: profile.level || undefined,
        dominance: profile.dominance || undefined,
        disciplines: profile.disciplines.length ? profile.disciplines : undefined,
        homeSpotName: profile.homeSpotName || undefined,
        homeSpotLat: profile.homeSpotLat ?? undefined,
        homeSpotLon: profile.homeSpotLon ?? undefined,
        homeSpotSeaDirectionDeg: profile.homeSpotSeaDirectionDeg ?? undefined,
      });
      setProfile(updated);
      setMessage("Perfil actualizado.");
    } catch (err) {
      setMessage("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSpotSearch() {
    if (spotQuery.trim().length < 2) return;
    setSearchingSpot(true);
    setSpotError(null);
    try {
      const results = await apiGet<SpotSearchResult[]>(`/api/v1/wind/spots?q=${encodeURIComponent(spotQuery.trim())}`);
      setSpotResults(results);
      if (results.length === 0) setSpotError("Sin resultados. Prueba con otro nombre.");
    } catch (err) {
      setSpotError("No se pudo buscar el spot.");
    } finally {
      setSearchingSpot(false);
    }
  }

  function selectSpot(spot: SpotSearchResult) {
    if (!profile) return;
    const label = [spot.name, spot.admin1, spot.country].filter(Boolean).join(", ");
    setProfile({ ...profile, homeSpotName: label, homeSpotLat: spot.lat, homeSpotLon: spot.lon });
    setSpotResults([]);
    setSpotQuery("");
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
            <label>Sexo</label>
            <select
              value={profile.gender ?? ""}
              onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
            >
              <option value="">Selecciona…</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {GENDER_LABEL[g]}
                </option>
              ))}
            </select>
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

          <div className="field">
            <label>Spot habitual</label>
            {profile.homeSpotName && (
              <p style={{ color: "var(--color-turquoise)", fontSize: 13, marginBottom: 6 }}>
                📍 {profile.homeSpotName}
              </p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={spotQuery}
                onChange={(e) => setSpotQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSpotSearch();
                  }
                }}
                placeholder="Buscar spot (ej. Tarifa)"
              />
              <button type="button" className="btn-secondary" style={{ width: "auto", padding: "10px 16px" }} onClick={handleSpotSearch} disabled={searchingSpot}>
                {searchingSpot ? "…" : "Buscar"}
              </button>
            </div>
            {spotError && <p className="error-text" style={{ fontSize: 12, marginTop: 4 }}>{spotError}</p>}
            {spotResults.length > 0 && (
              <ul style={{ listStyle: "none", padding: 0, marginTop: 6, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}>
                {spotResults.map((r, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => selectSpot(r)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 10px",
                        background: "transparent",
                        border: "none",
                        color: "var(--color-white)",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      {[r.name, r.admin1, r.country].filter(Boolean).join(", ")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {profile.homeSpotLat != null && (
            <div className="field">
              <label>Orientación del mar (grados, 0=Norte, mirando desde la playa hacia mar abierto)</label>
              <input
                type="number"
                min={0}
                max={360}
                value={profile.homeSpotSeaDirectionDeg ?? ""}
                onChange={(e) => setProfile({ ...profile, homeSpotSeaDirectionDeg: Number(e.target.value) })}
                placeholder="Ej. 180 = mar hacia el Sur"
              />
              <p style={{ color: "var(--color-muted)", fontSize: 11, marginTop: 4 }}>
                Necesario para saber si el viento sopla hacia la playa (más seguro) o hacia el mar abierto (peligroso).
              </p>
            </div>
          )}

          {message && <p className="success-text">{message}</p>}

          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>

        <button
          className="btn-secondary"
          onClick={() => router.push("/wind")}
        >
          Viento y recomendación de hoy
        </button>

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
