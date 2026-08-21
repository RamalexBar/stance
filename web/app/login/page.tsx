"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { firebaseAuthClient } from "../../lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(firebaseAuthClient, email, password);
      router.push("/profile");
    } catch (err) {
      setError("Email o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    try {
      await signInWithPopup(firebaseAuthClient, new GoogleAuthProvider());
      router.push("/profile");
    } catch (err) {
      setError("No se pudo iniciar sesión con Google.");
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>Stance</h1>
        <p className="subtitle">Inicia sesión para analizar tu técnica</p>

        <form onSubmit={handleEmailLogin}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </form>

        <button className="btn-secondary" onClick={handleGoogleLogin} type="button">
          Continuar con Google
        </button>

        <p className="footer-link">
          ¿Olvidaste tu contraseña? <Link href="/forgot-password">Recupérala aquí</Link>
        </p>
        <p className="footer-link">
          ¿No tienes cuenta? <Link href="/register">Regístrate</Link>
        </p>
      </div>
    </div>
  );
}
