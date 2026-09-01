import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { DEMO_USERS } from "@/data/demoUsers";
import { RESEARCH_DISCLAIMER } from "@/constants/drClasses";
import Button from "@/components/common/Button";
import Logo from "@/components/layout/Logo";

export default function LoginPage() {
  const { signIn, isAuthenticated, user, initializing } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    if (!initializing && isAuthenticated) {
      navigate({ to: user?.role === "admin" ? "/dashboard" : "/hospital" });
    }
  }, [initializing, isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const next = await signIn({ email, password, remember });
      navigate({ to: next.user.role === "admin" ? "/dashboard" : "/hospital" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const useDemoAccount = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError("");
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r border-border bg-surface p-10 lg:flex">
        <Logo />
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground">
            Federated intelligence for privacy-preserving retinal screening
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Four participating hospitals train diabetic retinopathy models on their own retinal fundus images. Only
            model updates travel to the global server, where they are aggregated into an improved shared model.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
            {[
              "Raw patient images never leave the hospital network",
              "FedAvg and FedProx experiments across IID and Non-IID splits",
              "Class-imbalance analysis for minority DR stages",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">{RESEARCH_DISCLAIMER}</p>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden">
            <Logo />
          </div>

          <h1 className="mt-8 text-2xl font-semibold tracking-tight text-foreground">Sign in to FedRetina AI</h1>
          <p className="mt-1 text-sm text-muted-foreground">Secure Federated Research Network</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-foreground">
                Work email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@fedretina.ai"
                  className="h-11 w-full rounded-lg border border-border bg-surface pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-lg border border-border bg-surface pl-10 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="size-4 rounded border-border bg-surface accent-[var(--color-primary)]"
              />
              Remember me on this device
            </label>

            {error ? (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 rounded-xl border border-border bg-surface p-4">
            <button
              type="button"
              onClick={() => setShowDemo((v) => !v)}
              aria-expanded={showDemo}
              className="flex w-full items-center justify-between text-xs font-semibold text-foreground"
            >
              Use a demo account
              <span className="text-muted-foreground">{showDemo ? "Hide" : "Show"}</span>
            </button>
            {showDemo ? (
              <ul className="mt-3 space-y-2">
                {DEMO_USERS.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => useDemoAccount(u)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left text-xs transition-colors hover:border-primary/50 hover:bg-muted"
                    >
                      <span>
                        <span className="block font-medium text-foreground">{u.roleLabel}</span>
                        <span className="block text-muted-foreground">{u.email}</span>
                      </span>
                      <span className="text-primary">Fill</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
            Patient data stays within your hospital. FedRetina AI only exchanges model parameters between clients and
            the global server.
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{RESEARCH_DISCLAIMER}</p>
        </div>
      </section>
    </div>
  );
}
