import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as api from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { DashboardResponse, Micronutrients, NutritionGoals } from "../types";
import { localDateString } from "../lib/date";
import { ProgressBar } from "../components/ProgressBar";

const GOAL_SLUGS = [
  { slug: "general", label: "General health / maintenance" },
  { slug: "fat_loss", label: "Fat loss" },
  { slug: "muscle_gain", label: "Muscle gain (lean bulk)" },
  { slug: "bulking", label: "Bulking" },
  { slug: "endurance", label: "Endurance training" },
  { slug: "athlete", label: "Athlete (mixed training)" },
  { slug: "strength", label: "Strength training" },
  { slug: "plant_based", label: "Plant-based eating" },
] as const;

function normalizeProfileGoalSlug(g: string): string {
  if (g === "regular") return "general";
  if (g === "powerlifter") return "strength";
  return GOAL_SLUGS.some((x) => x.slug === g) ? g : "general";
}

const MICRO_KEYS: { key: keyof Micronutrients; label: string; unit: string }[] = [
  { key: "vitamin_a_mcg", label: "Vitamin A (RAE)", unit: "µg" },
  { key: "vitamin_c_mg", label: "Vitamin C", unit: "mg" },
  { key: "vitamin_d_mcg", label: "Vitamin D", unit: "µg" },
  { key: "vitamin_e_mg", label: "Vitamin E", unit: "mg" },
  { key: "vitamin_k_mcg", label: "Vitamin K", unit: "µg" },
  { key: "thiamin_mg", label: "Thiamin (B1)", unit: "mg" },
  { key: "riboflavin_mg", label: "Riboflavin (B2)", unit: "mg" },
  { key: "niacin_mg", label: "Niacin (B3)", unit: "mg" },
  { key: "vitamin_b6_mg", label: "Vitamin B6", unit: "mg" },
  { key: "folate_mcg", label: "Folate", unit: "µg" },
  { key: "vitamin_b12_mcg", label: "Vitamin B12", unit: "µg" },
  { key: "calcium_mg", label: "Calcium", unit: "mg" },
  { key: "iron_mg", label: "Iron", unit: "mg" },
  { key: "magnesium_mg", label: "Magnesium", unit: "mg" },
  { key: "phosphorus_mg", label: "Phosphorus", unit: "mg" },
  { key: "potassium_mg", label: "Potassium", unit: "mg" },
  { key: "zinc_mg", label: "Zinc", unit: "mg" },
];

const riseIn = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.52, ease: [0.22, 1, 0.36, 1] as const } },
};

const willChange = { willChange: "transform, opacity" };

const panelClass = "rounded-xl border border-white/12 bg-[#06120d]/92 p-6 shadow-2xl shadow-black/20";
const fieldClass =
  "rounded-xl border border-white/12 bg-white/8 px-4 py-2 text-sm text-white outline-none ring-[#cdff64]/35 focus:ring-2";

export function Dashboard() {
  const { user, logout, refreshProfile } = useAuth();
  const [date, setDate] = useState(() => localDateString());
  const [dash, setDash] = useState<DashboardResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [manualText, setManualText] = useState("");
  const [logBusy, setLogBusy] = useState(false);
  const [logMsg, setLogMsg] = useState<string | null>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [pAge, setPAge] = useState(user?.age ?? 28);
  const [pGender, setPGender] = useState(user?.gender ?? "male");
  const [pGoal, setPGoal] = useState(normalizeProfileGoalSlug(user?.goal ?? "general"));
  const [pWeight, setPWeight] = useState(user?.weight_kg ?? 75);
  const [pHeight, setPHeight] = useState(user?.height_cm ?? 175);
  const [profileBusy, setProfileBusy] = useState(false);

  const [goalsOpen, setGoalsOpen] = useState(false);
  const [gDraft, setGDraft] = useState<NutritionGoals | null>(null);
  const [goalsBusy, setGoalsBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setPAge(user.age);
      setPGender(user.gender);
      setPGoal(normalizeProfileGoalSlug(user.goal));
      setPWeight(user.weight_kg);
      setPHeight(user.height_cm);
    }
  }, [user]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.fetchDashboard(date);
      setDash(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartData = useMemo(() => {
    if (!dash) return [];
    const { goals, consumed } = dash;
    return [
      { name: "Protein", consumed: consumed.protein_g, goal: goals.protein_g },
      { name: "Carbs", consumed: consumed.carbs_g, goal: goals.carbs_g },
      { name: "Fat", consumed: consumed.fat_g, goal: goals.fat_g },
      { name: "Fiber", consumed: consumed.fiber_g, goal: goals.fiber_g },
    ];
  }, [dash]);

  async function onManualLog(e: React.FormEvent) {
    e.preventDefault();
    setLogMsg(null);
    setLogBusy(true);
    try {
      await api.logManualFood(manualText.trim(), date);
      setManualText("");
      setLogMsg("Logged successfully.");
      await load();
    } catch (err) {
      setLogMsg(err instanceof Error ? err.message : "Could not log food");
    } finally {
      setLogBusy(false);
    }
  }

  async function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLogMsg(null);
    setLogBusy(true);
    try {
      await api.logImageFood(file, date);
      setLogMsg("Photo logged successfully.");
      await load();
    } catch (err) {
      setLogMsg(err instanceof Error ? err.message : "Could not analyze photo");
    } finally {
      setLogBusy(false);
    }
  }

  async function removeEntry(id: number) {
    try {
      await api.deleteFoodEntry(id);
      await load();
    } catch {
      /* ignore */
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileBusy(true);
    try {
      await api.patchProfile({
        age: pAge,
        gender: pGender,
        goal: pGoal,
        weight_kg: pWeight,
        height_cm: pHeight,
      });
      await refreshProfile();
      await load();
      setProfileOpen(false);
    } finally {
      setProfileBusy(false);
    }
  }

  function openGoalsEditor() {
    if (!dash) return;
    setGDraft(JSON.parse(JSON.stringify(dash.goals)) as NutritionGoals);
    setGoalsOpen(true);
  }

  async function saveCustomGoals(e: React.FormEvent) {
    e.preventDefault();
    if (!gDraft) return;
    setGoalsBusy(true);
    try {
      const { source: _s, ...rest } = gDraft;
      void _s;
      await api.patchGoals(rest);
      await refreshProfile();
      await load();
      setGoalsOpen(false);
    } finally {
      setGoalsBusy(false);
    }
  }

  async function resetGoalsFromProfile() {
    setGoalsBusy(true);
    try {
      await api.recomputeGoals();
      await refreshProfile();
      await load();
      setGoalsOpen(false);
    } finally {
      setGoalsBusy(false);
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-[100dvh] bg-[#06120d] text-white selection:bg-[#cdff64] selection:text-black">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute -left-[10%] -top-[10%] h-[600px] w-[600px] rounded-full bg-[#10b981]/10 blur-[150px]"
          style={{ transform: "translateZ(0)", willChange: "transform" }}
        />
        <div
          className="absolute -bottom-[10%] -right-[10%] h-[600px] w-[600px] rounded-full bg-[#cdff64]/10 blur-[150px]"
          style={{ transform: "translateZ(0)", willChange: "transform" }}
        />
      </div>
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#06120d]/86 backdrop-blur-md">
        <div className="mx-auto flex w-full flex-wrap items-center justify-between gap-4 px-6 py-4 lg:px-12">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#cdff64] text-sm font-black text-[#10130e]">
              N
            </span>
            <span className="font-display text-lg font-semibold text-white">NutraFlow</span>
            <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/58">
              @{user.username}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!dash}
              onClick={() => openGoalsEditor()}
              className="rounded-full border border-[#cdff64]/35 bg-[#cdff64]/12 px-4 py-2 text-sm font-bold text-[#cdff64] transition hover:bg-[#cdff64]/18 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Daily targets
            </button>
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-white/82 transition hover:bg-white/14"
            >
              Profile
            </button>
            <Link
              to="/"
              className="rounded-full px-4 py-2 text-sm font-semibold text-white/48 transition hover:text-[#cdff64]"
            >
              Home
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#10130e] transition hover:bg-[#cdff64]"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto w-full space-y-10 px-6 py-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
          style={willChange}
          className="relative overflow-hidden rounded-3xl border border-white/5 bg-[#06120d]/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl lg:p-10"
        >
          <img
            src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1800&q=82"
            alt="Prepared vegetables and whole-food ingredients"
            className="absolute inset-0 h-full w-full object-cover opacity-36"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,16,13,0.94),rgba(8,16,13,0.7),rgba(8,16,13,0.38))]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#cdff64]">Today's plate</p>
              <h1 className="mt-3 font-display text-4xl font-semibold text-white lg:text-5xl">Your day</h1>
              <p className="mt-3 max-w-2xl text-white/68">
                {dash?.goals.source === "custom"
                  ? "You are using custom daily targets (editable under Daily targets)."
                  : "Daily targets are computed from your profile; edit anytime or switch to fully custom numbers."}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="text-sm font-semibold text-white/62" htmlFor="dash-date">
                Date
              </label>
              <input
                id="dash-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={fieldClass}
              />
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setDate(localDateString())}
                className="rounded-full bg-[#cdff64] px-5 py-2 text-sm font-black text-[#10130e] transition hover:bg-white"
              >
                Today
              </motion.button>
            </div>
          </div>
        </motion.div>

        {loading && (
          <div className="flex items-center justify-center py-24 text-white/48">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#cdff64]/30 border-t-[#cdff64]" />
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-xl border border-[#ef6f5e]/40 bg-[#ef6f5e]/12 p-6 text-[#ffd3cc]">{loadError}</div>
        )}

        {!loading && dash && (
          <>
            <motion.section
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
              initial="hidden"
              animate="show"
              className="grid gap-6 lg:grid-cols-2"
            >
              <motion.div
                layout
                variants={riseIn}
                whileHover={{ y: -3 }}
                style={willChange}
                className={panelClass}
              >
                <h2 className="font-display text-lg font-semibold text-white">Energy & macros</h2>
                <p className="mt-1 text-sm text-white/50">Consumed versus daily targets</p>
                <div className="mt-6 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: "#06120d",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 8,
                          color: "#fff",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="goal" name="Goal (g)" fill="rgba(255,255,255,0.14)" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="consumed" name="Logged (g)" fill="#cdff64" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 grid gap-4">
                  <ProgressBar
                    label="Calories"
                    current={dash.consumed.calories}
                    goal={dash.goals.calories}
                    unit=" kcal"
                    accent="#cdff64"
                  />
                  <ProgressBar
                    label="Protein"
                    current={dash.consumed.protein_g}
                    goal={dash.goals.protein_g}
                    unit="g"
                    accent="#ef6f5e"
                  />
                  <ProgressBar
                    label="Carbs"
                    current={dash.consumed.carbs_g}
                    goal={dash.goals.carbs_g}
                    unit="g"
                    accent="#8ccf8a"
                  />
                  <ProgressBar
                    label="Fat"
                    current={dash.consumed.fat_g}
                    goal={dash.goals.fat_g}
                    unit="g"
                    accent="#86c5d8"
                  />
                </div>
              </motion.div>

              <motion.div variants={riseIn} className="space-y-6">
                <motion.div
                  layout
                  whileHover={{ y: -3 }}
                  className={panelClass}
                >
                  <h2 className="font-display text-lg font-semibold text-white">Log food</h2>
                  <form onSubmit={onManualLog} className="mt-4 space-y-3">
                    <textarea
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      placeholder={"e.g. 200g grilled chicken breast, 1 cup cooked rice, side salad"}
                      rows={4}
                      className="w-full resize-y rounded-xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none ring-[#cdff64]/35 placeholder:text-white/32 focus:ring-2"
                    />
                    <div className="flex flex-wrap gap-3">
                      <motion.button
                        whileHover={{ y: -2, scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={logBusy || !manualText.trim()}
                        className="rounded-full bg-[#cdff64] px-5 py-2.5 text-sm font-black text-[#10130e] transition enabled:hover:bg-white disabled:opacity-50"
                      >
                        {logBusy ? "Working..." : "Log foods"}
                      </motion.button>
                      <label className="cursor-pointer rounded-full border border-white/15 bg-white/8 px-5 py-2.5 text-sm font-bold text-white/82 transition hover:bg-white/14">
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onImageChange} />
                        Upload photo
                      </label>
                    </div>
                  </form>
                  <AnimatePresence>
                    {logMsg && (
                      <motion.p
                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="mt-3 rounded-xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-white/68"
                      >
                        {logMsg}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div
                  layout
                  whileHover={{ y: -3 }}
                  className={panelClass}
                >
                  <h2 className="font-display text-lg font-semibold text-white">Today&apos;s log</h2>
                  <ul className="mt-4 space-y-3">
                    <AnimatePresence initial={false}>
                      {dash.entries.length === 0 && (
                        <li className="rounded-xl border border-dashed border-white/12 bg-white/[0.04] px-4 py-8 text-center text-sm text-white/46">
                          Nothing logged yet for this date.
                        </li>
                      )}
                      {dash.entries.map((en) => (
                        <motion.li
                          key={en.id}
                          layout
                          initial={{ opacity: 0, y: 12, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, height: 0, scale: 0.98 }}
                          whileHover={{ x: 3 }}
                          className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.055] px-4 py-3"
                        >
                          <div className="text-left">
                            <div className="text-xs font-bold uppercase tracking-wide text-[#cdff64]/70">
                              {en.source}
                            </div>
                            <div className="mt-1 text-sm text-white/84">
                              {en.description ?? "Food entry"}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/46">
                              <span>{Math.round(en.nutrients.calories)} kcal</span>
                              <span>P {en.nutrients.protein_g.toFixed(0)}g</span>
                              <span>C {en.nutrients.carbs_g.toFixed(0)}g</span>
                              <span>F {en.nutrients.fat_g.toFixed(0)}g</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => void removeEntry(en.id)}
                            className="shrink-0 rounded-xl px-2 py-1 text-xs text-white/45 hover:bg-white/10 hover:text-white"
                          >
                            Remove
                          </button>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </motion.div>
              </motion.div>
            </motion.section>

            <motion.section
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.16 }}
              variants={riseIn}
              className={panelClass}
            >
              <h2 className="font-display text-lg font-semibold text-white">Micronutrients</h2>
              <p className="mt-1 text-sm text-white/50">
                Progress toward your daily targets. Logged micros come from USDA (or Edamam when configured) when you
                log food; if an item has no data for a nutrient, it stays at 0 until you log foods that contribute it.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {MICRO_KEYS.map(({ key, label, unit }) => (
                  <ProgressBar
                    key={key}
                    label={`${label} (${unit})`}
                    current={dash.consumed.micronutrients[key]}
                    goal={dash.goals.micronutrients[key]}
                    unit=""
                    accent="#8ccf8a"
                  />
                ))}
              </div>
            </motion.section>
          </>
        )}
      </main>

      <AnimatePresence>
        {profileOpen && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setProfileOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/12 bg-[#06120d] p-6 shadow-2xl"
            >
              <h2 className="font-display text-xl font-semibold text-white">Profile</h2>
              <p className="mt-1 text-sm text-white/50">
                Body stats and goal type update your account. If you use custom daily targets, they stay fixed until you
                reset them under Daily targets, then Recompute from profile.
              </p>
              <form onSubmit={saveProfile} className="mt-6 space-y-5">
                <div>
                  <label className="text-sm font-semibold text-white/65">Age</label>
                  <input
                    type="range"
                    min={13}
                    max={90}
                    value={pAge}
                    onChange={(e) => setPAge(Number(e.target.value))}
                    className="mt-2 w-full accent-[#cdff64]"
                  />
                  <div className="text-right text-sm text-white/70">{pAge} yrs</div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-white/65" htmlFor="p-gender">
                    Gender
                  </label>
                  <select
                    id="p-gender"
                    value={pGender}
                    onChange={(e) => setPGender(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#cdff64]/35"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-white/65" htmlFor="p-goal">
                    Goal
                  </label>
                  <select
                    id="p-goal"
                    value={GOAL_SLUGS.some((g) => g.slug === pGoal) ? pGoal : "general"}
                    onChange={(e) => setPGoal(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#cdff64]/35"
                  >
                    {GOAL_SLUGS.map((g) => (
                      <option key={g.slug} value={g.slug}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-white/65">Weight (kg)</label>
                  <input
                    type="range"
                    min={40}
                    max={180}
                    step={0.5}
                    value={pWeight}
                    onChange={(e) => setPWeight(Number(e.target.value))}
                    className="mt-2 w-full accent-[#ef6f5e]"
                  />
                  <div className="text-right text-sm text-white/70">{pWeight} kg</div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-white/65">Height (cm)</label>
                  <input
                    type="range"
                    min={120}
                    max={220}
                    step={0.5}
                    value={pHeight}
                    onChange={(e) => setPHeight(Number(e.target.value))}
                    className="mt-2 w-full accent-[#ef6f5e]"
                  />
                  <div className="text-right text-sm text-white/70">{pHeight} cm</div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setProfileOpen(false)}
                    className="flex-1 rounded-full border border-white/15 py-3 text-sm font-bold text-white/68 transition hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={profileBusy}
                    className="flex-1 rounded-full bg-[#cdff64] py-3 text-sm font-black text-[#10130e] transition hover:bg-white disabled:opacity-50"
                  >
                    {profileBusy ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {goalsOpen && gDraft && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setGoalsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/12 bg-[#06120d] p-6 shadow-2xl"
            >
              <h2 className="font-display text-xl font-semibold text-white">Daily nutrition targets</h2>
              <p className="mt-1 text-sm text-white/50">
                Edit any number and save to use fully custom targets. Recompute replaces everything with values derived
                from your profile and goal type (Mifflin–St Jeor + standard adult DV-style micro targets).
              </p>

              <form onSubmit={saveCustomGoals} className="mt-6 space-y-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["calories", "Calories (kcal)"],
                      ["protein_g", "Protein (g)"],
                      ["carbs_g", "Carbs (g)"],
                      ["fat_g", "Fat (g)"],
                      ["fiber_g", "Fiber (g)"],
                      ["sugar_g", "Sugar (g)"],
                      ["sodium_mg", "Sodium (mg)"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="block text-sm">
                      <span className="text-white/62">{label}</span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        className="mt-1 w-full rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#cdff64]/35"
                        value={gDraft[key]}
                        onChange={(e) =>
                          setGDraft({ ...gDraft, [key]: Number(e.target.value) } as NutritionGoals)
                        }
                      />
                    </label>
                  ))}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white/78">Micronutrient targets</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {MICRO_KEYS.map(({ key, label, unit }) => (
                      <label key={key} className="block text-sm">
                        <span className="text-white/62">
                          {label} ({unit})
                        </span>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          className="mt-1 w-full rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#cdff64]/35"
                          value={gDraft.micronutrients[key]}
                          onChange={(e) =>
                            setGDraft({
                              ...gDraft,
                              micronutrients: {
                                ...gDraft.micronutrients,
                                [key]: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={() => setGoalsOpen(false)}
                    className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-white/68 transition hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void resetGoalsFromProfile()}
                    disabled={goalsBusy}
                    className="rounded-full border border-[#cdff64]/40 bg-[#cdff64]/12 px-5 py-2.5 text-sm font-bold text-[#cdff64] disabled:opacity-50"
                  >
                    Recompute from profile
                  </button>
                  <button
                    type="submit"
                    disabled={goalsBusy}
                    className="rounded-full bg-[#cdff64] px-6 py-2.5 text-sm font-black text-[#10130e] transition hover:bg-white disabled:opacity-50"
                  >
                    {goalsBusy ? "Saving..." : "Save custom targets"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
