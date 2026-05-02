import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

const formReveal = {
  hidden: { opacity: 0, y: 22, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.52, ease: [0.22, 1, 0.36, 1] as const } },
};

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(username.trim(), password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#06120d] text-white selection:bg-[#cdff64] selection:text-black">
      {/* Background Orbs for Livliness */}
      <div 
        className="pointer-events-none absolute -left-[10%] -top-[10%] h-[500px] w-[500px] rounded-full bg-[#10b981]/15 blur-[120px]" 
        style={{ transform: "translateZ(0)", willChange: "transform" }}
      />
      <div 
        className="pointer-events-none absolute -bottom-[10%] -right-[10%] h-[600px] w-[600px] rounded-full bg-[#cdff64]/10 blur-[150px]" 
        style={{ transform: "translateZ(0)", willChange: "transform" }}
      />

      <img
        src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1800&q=82"
        alt="Meal prep containers with fruit, grains, and vegetables"
        className="absolute inset-0 h-full w-full object-cover opacity-10 saturate-[1.2]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#06120d]/95 via-[#06120d]/80 to-[#06120d]/50" />

      <div className="relative mx-auto grid min-h-[100dvh] max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-[0.85fr_1.15fr] lg:px-10">
        <motion.div
          initial={{ opacity: 0, x: -22 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:block"
        >
          <Link to="/" className="mb-12 inline-flex items-center gap-3 transition hover:opacity-80">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#cdff64] to-[#10b981] font-black text-[#06120d] shadow-lg shadow-[#cdff64]/20">
              N
            </span>
            <span className="font-display text-xl font-bold">NutraFlow</span>
          </Link>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#cdff64]">Welcome back</p>
          <h1 className="mt-4 max-w-md font-display text-5xl font-extrabold leading-tight tracking-tight">
            Pick up exactly where your last meal left off.
          </h1>
          <div className="mt-10 grid max-w-sm gap-4">
            {["Macro trends", "Photo meal logs", "Micronutrient progress"].map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.08, duration: 0.42 }}
                className="rounded-xl border border-white/5 bg-white/5 px-5 py-4 text-sm font-semibold backdrop-blur-md"
              >
                {item}
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          variants={formReveal}
          initial="hidden"
          animate="show"
          style={{ willChange: "transform, opacity" }}
          className="mx-auto w-full max-w-md rounded-3xl border border-white/5 bg-[#06120d]/60 p-8 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-10"
        >
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white/60 transition hover:text-[#cdff64]">
            &larr; Back home
          </Link>
          <h2 className="mt-8 font-display text-3xl font-bold tracking-tight text-white">Log in</h2>
          <p className="mt-2 text-white/60">Your dashboard is ready when you are.</p>

          <form onSubmit={onSubmit} className="mt-10 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/70" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white outline-none transition-colors placeholder:text-white/30 focus:border-[#cdff64]/50 focus:bg-white/10 focus:ring-1 focus:ring-[#cdff64]/50"
                placeholder="you"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/70" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white outline-none transition-colors placeholder:text-white/30 focus:border-[#cdff64]/50 focus:bg-white/10 focus:ring-1 focus:ring-[#cdff64]/50"
                placeholder="Password"
                required
                minLength={8}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={pending}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#cdff64] to-[#10b981] py-4 text-sm font-black text-[#06120d] shadow-lg shadow-[#cdff64]/20 transition-all enabled:hover:shadow-[#cdff64]/40 disabled:opacity-60"
            >
              {pending ? "Signing in..." : "Log in"}
            </motion.button>
          </form>

          <p className="mt-8 text-center text-sm text-white/60">
            New here?{" "}
            <Link className="font-bold text-[#cdff64] transition hover:text-[#10b981]" to="/register">
              Create an account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
