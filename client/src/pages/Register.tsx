import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

const GOAL_OPTIONS = [
  { slug: "general", label: "General health / maintenance" },
  { slug: "fat_loss", label: "Fat loss" },
  { slug: "muscle_gain", label: "Muscle gain (lean bulk)" },
  { slug: "bulking", label: "Bulking" },
  { slug: "endurance", label: "Endurance training" },
  { slug: "athlete", label: "Athlete (mixed training)" },
  { slug: "strength", label: "Strength training" },
  { slug: "plant_based", label: "Plant-based eating" },
] as const;

const fieldMotion = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState(28);
  const [gender, setGender] = useState("male");
  const [goalSlug, setGoalSlug] = useState<string>(GOAL_OPTIONS[0].slug);
  const [weight_kg, setWeightKg] = useState(75);
  const [height_cm, setHeightCm] = useState(175);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await register({
        username: username.trim(),
        password,
        age,
        gender,
        goal: goalSlug,
        weight_kg,
        height_cm,
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setPending(false);
    }
  }

  const fieldClass =
    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white outline-none transition-colors placeholder:text-white/30 focus:border-[#cdff64]/50 focus:bg-white/10 focus:ring-1 focus:ring-[#cdff64]/50";

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#06120d] text-white selection:bg-[#cdff64] selection:text-black">
      {/* Background Orbs */}
      <div 
        className="pointer-events-none absolute -left-[10%] -top-[10%] h-[500px] w-[500px] rounded-full bg-[#10b981]/15 blur-[120px]" 
        style={{ transform: "translateZ(0)", willChange: "transform" }}
      />
      <div 
        className="pointer-events-none absolute -bottom-[10%] -right-[10%] h-[600px] w-[600px] rounded-full bg-[#cdff64]/10 blur-[150px]" 
        style={{ transform: "translateZ(0)", willChange: "transform" }}
      />

      <img
        src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1800&q=82"
        alt="Prepared vegetables and whole-food ingredients"
        className="fixed inset-0 h-full w-full object-cover opacity-10 saturate-[1.2]"
      />
      <div className="fixed inset-0 bg-gradient-to-r from-[#06120d]/95 via-[#06120d]/80 to-[#06120d]/50" />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
        <motion.aside
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
          className="lg:sticky lg:top-8 lg:h-fit"
        >
          <Link to="/" className="inline-flex items-center gap-3 transition hover:opacity-80">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#cdff64] to-[#10b981] font-black text-[#06120d] shadow-lg shadow-[#cdff64]/20">
              N
            </span>
            <span className="font-display text-xl font-bold">NutraFlow</span>
          </Link>
          <p className="mt-12 text-xs font-bold uppercase tracking-[0.18em] text-[#cdff64]">Build your baseline</p>
          <h1 className="mt-4 max-w-md font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            A dashboard tuned to your body, goal, and daily meals.
          </h1>
          <div className="mt-10 grid gap-4">
            {["Targets from your profile", "Food photos into ingredient lines", "Micros visible beside macros"].map(
              (item, index) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.08, duration: 0.42 }}
                  className="max-w-sm rounded-xl border border-white/5 bg-white/5 px-5 py-4 text-sm font-semibold backdrop-blur-md"
                >
                  {item}
                </motion.div>
              )
            )}
          </div>
        </motion.aside>

        <motion.div
          initial={{ opacity: 0, y: 22, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{ willChange: "transform, opacity" }}
          className="rounded-3xl border border-white/5 bg-[#06120d]/60 p-8 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-10"
        >
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white/60 transition hover:text-[#cdff64]">
            &larr; Back home
          </Link>
          <h2 className="mt-8 font-display text-3xl font-bold tracking-tight text-white">Create your profile</h2>
          <p className="mt-2 max-w-2xl text-white/60">
            NutraFlow starts with a practical target set, then lets your real meals refine the picture.
          </p>

          <motion.form
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.055 } } }}
            initial="hidden"
            animate="show"
            onSubmit={onSubmit}
            className="mt-10 space-y-5"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <motion.div variants={fieldMotion} className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-white/70" htmlFor="reg-username">
                  Username
                </label>
                <input
                  id="reg-username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={fieldClass}
                  pattern="[a-zA-Z0-9_]{3,32}"
                  title="3-32 characters: letters, numbers, underscore"
                  required
                />
              </motion.div>
              <motion.div variants={fieldMotion} className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-white/70" htmlFor="reg-password">
                  Password
                </label>
                <input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={fieldClass}
                  minLength={8}
                  required
                />
              </motion.div>
              <motion.div variants={fieldMotion}>
                <label className="mb-2 block text-sm font-semibold text-white/70" htmlFor="age">
                  Age
                </label>
                <input
                  id="age"
                  type="number"
                  min={13}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className={fieldClass}
                  required
                />
              </motion.div>
              <motion.div variants={fieldMotion}>
                <label className="mb-2 block text-sm font-semibold text-white/70" htmlFor="gender">
                  Gender
                </label>
                <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)} className={fieldClass}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </motion.div>
              <motion.div variants={fieldMotion} className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-white/70" htmlFor="goal">
                  Primary goal
                </label>
                <select id="goal" value={goalSlug} onChange={(e) => setGoalSlug(e.target.value)} className={fieldClass}>
                  {GOAL_OPTIONS.map((g) => (
                    <option key={g.slug} value={g.slug}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </motion.div>
              <motion.div variants={fieldMotion}>
                <label className="mb-2 block text-sm font-semibold text-white/70" htmlFor="weight">
                  Weight (kg)
                </label>
                <input
                  id="weight"
                  type="number"
                  step="0.1"
                  min={20}
                  max={500}
                  value={weight_kg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className={fieldClass}
                  required
                />
              </motion.div>
              <motion.div variants={fieldMotion}>
                <label className="mb-2 block text-sm font-semibold text-white/70" htmlFor="height">
                  Height (cm)
                </label>
                <input
                  id="height"
                  type="number"
                  step="0.1"
                  min={50}
                  max={300}
                  value={height_cm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className={fieldClass}
                  required
                />
              </motion.div>
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
              {pending ? "Creating account..." : "Create account"}
            </motion.button>
          </motion.form>

          <p className="mt-8 text-center text-sm text-white/60">
            Already have an account?{" "}
            <Link className="font-bold text-[#cdff64] transition hover:text-[#10b981]" to="/login">
              Log in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
