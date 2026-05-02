import { motion } from "framer-motion";

type Props = {
  label: string;
  current: number;
  goal: number;
  unit?: string;
  accent?: string;
};

export function ProgressBar({ label, current, goal, unit = "", accent = "#22d3ee" }: Props) {
  const noTarget = !Number.isFinite(goal) || goal <= 0;
  const pct = noTarget ? 0 : Math.min(100, (current / goal) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-white/82">{label}</span>
        <span className="tabular-nums text-white/45">
          {current.toFixed(0)}
          {unit}
          {noTarget ? (
            <span className="text-white/30"> / no target</span>
          ) : (
            <>
              {" "}
              / {goal.toFixed(0)}
              {unit}
            </>
          )}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        {noTarget ? (
          <div className="h-full w-full bg-white/[0.04]" />
        ) : (
          <motion.div
            className="h-full origin-left rounded-full"
            style={{ backgroundColor: accent, width: "100%", willChange: "transform" }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: pct / 100 }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        )}
      </div>
    </div>
  );
}
