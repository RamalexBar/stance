"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { firebaseAuthClient } from "../../lib/firebase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(firebaseAuthClient, email);
      setSent(true);
    } catch (err) {
      setError("No pudimos enviar el correo. Verifica el email ingresado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>Recuperar contraseña</h1>
        <p className="subtitle">Te enviaremos un enlace para restablecerla</p>

        {sent ? (
          <p className="success-text">
            Listo. Revisa tu bandeja de entrada ({email}) para continuar.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
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

            {error && <p className="error-text">{error}</p>}

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Enviando…" : "Enviar enlace"}
            </button>
          </form>
        )}

        <p className="footer-link">
          <Link href="/login">Volver a iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
