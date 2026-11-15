"use client";

import { useEffect, useState } from "react";
import { ADMIN_SESSION_EXPIRED_MESSAGE } from "@/lib/admin-auth";
import { ArrowRight, LockKeyhole, UserRound } from "lucide-react";
import { Kids4SafeBrand } from "@/components/Kids4SafeBrand";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("reason") === "session-expired") {
      setError(ADMIN_SESSION_EXPIRED_MESSAGE);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Credenciales inválidas");
      }

      // Guardar token JWT y usuario
      sessionStorage.setItem("auth_token", data.token);
      sessionStorage.setItem("user", JSON.stringify(data.user));
      sessionStorage.setItem("admin_authenticated", "true");

      // Redirigir al panel movil de Kids4Safe
      router.push("/dashboard/sessions");
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="kids-auth-shell">
      <div className="kids-auth-orb" aria-hidden="true" />
      <section className="kids-auth-content" aria-labelledby="login-title">
        <Kids4SafeBrand stacked className="mx-auto" />
        <h1 id="login-title" className="sr-only">Iniciar sesión</h1>
        <div className="kids-auth-card">
          <form onSubmit={handleSubmit} className="space-y-6 text-left">
            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            <div>
              <label htmlFor="username" className="mb-2 flex items-center gap-2 text-sm font-medium"><UserRound size={20} />Usuario</label>
              <input id="username" type="text" required autoComplete="username" value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="kids-auth-input" placeholder="Ingresa tu usuario" disabled={loading} />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 flex items-center gap-2 text-sm font-medium"><LockKeyhole size={20} />Contraseña</label>
              <input id="password" type="password" required autoComplete="current-password" value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="kids-auth-input" placeholder="Tu contraseña" disabled={loading} />
            </div>
            <button type="submit" disabled={loading} className="kids-primary-button w-full" aria-busy={loading}>
              {loading ? <span role="status">Iniciando sesión…</span> : <>Iniciar sesión<span className="kids-button-arrow"><ArrowRight size={23} /></span></>}
            </button>
          </form>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">Tecnología que cuida lo que más importa</p>
      </section>
      <img src="/brand/family-landscape.png" alt="" className="kids-auth-scenery" />
      <p className="kids-auth-footer">FAMILIAS SEGURAS <span aria-hidden="true">•</span> FUTUROS BRILLANTES</p>
    </main>
  );
}
