import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const OTHER = "__other__";

export function OptionGrid({
  options,
  value,
  onChange,
  otherLabel = "Other — type your own",
  otherPlaceholder = "Type your answer…",
  columns = 2,
}) {
  const known = options.some((o) => o.value === value);
  const isOther = value !== "" && !known;
  const [otherText, setOtherText] = useState(isOther ? value : "");

  useEffect(() => {
    if (!value) setOtherText("");
  }, [value]);

  return (
    <div className={cn("grid gap-3", columns === 2 ? "sm:grid-cols-2" : "grid-cols-1")}>
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <motion.button
            key={o.value}
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => onChange(o.value)}
            className={cn(
              "group relative flex items-center gap-3 rounded-2xl border px-5 py-4 text-left text-[15px] font-medium transition-all",
              "glass-chip hover:shadow-soft",
              selected
                ? "border-primary/80 bg-gradient-primary-soft text-foreground shadow-glow ring-1 ring-primary/30"
                : "text-foreground/85 hover:border-primary/40",
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
              )}
            >
              {selected && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span>{o.label}</span>
          </motion.button>
        );
      })}
      <button
        type="button"
        onClick={() => onChange(isOther ? value : otherText || " ")}
        className={cn(
          "group relative flex items-center gap-3 rounded-2xl border px-5 py-4 text-left text-[15px] font-medium transition-all sm:col-span-full",
          "hover:-translate-y-0.5 hover:shadow-soft",
          isOther
            ? "border-primary/80 bg-gradient-primary-soft shadow-glow ring-1 ring-primary/30"
            : "border-dashed border-border/80 bg-white/40 text-foreground/70 hover:border-primary/50",
        )}
      >
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
            isOther ? "border-primary bg-primary text-primary-foreground" : "border-border",
          )}
        >
          {isOther && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
        <span>{otherLabel}</span>
      </button>
      <AnimatePresence initial={false}>
        {isOther && (
          <motion.div
            key="other"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden sm:col-span-full"
          >
            <input
              autoFocus
              value={otherText}
              onChange={(e) => {
                setOtherText(e.target.value);
                onChange(e.target.value || " ");
              }}
              placeholder={otherPlaceholder}
              className="mt-1 w-full rounded-2xl border border-border bg-white/80 px-4 py-3.5 text-[15px] outline-none transition-all placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15 focus:bg-white"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function QuestionCard({ question, explainer, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <h3 className="text-[22px] leading-tight font-bold text-foreground sm:text-2xl">
          {question}
        </h3>
        {explainer && (
          <p className="text-[15px] text-muted-foreground leading-relaxed">{explainer}</p>
        )}
      </div>
      {children}
    </motion.div>
  );
}

export function TextField({ value, onChange, placeholder, multiline, rows = 5, autoFocus }) {
  const cls =
    "w-full rounded-2xl border border-border bg-white/80 px-4 py-3.5 text-[15px] outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:ring-primary/15 focus:bg-white shadow-soft";
  if (multiline) {
    return (
      <textarea
        autoFocus={autoFocus}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(cls, "resize-none leading-relaxed")}
      />
    );
  }
  return (
    <input
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cls}
    />
  );
}

/**
 * Premium animated progress bar with per-step indicators and glow.
 */
export function ProgressBar({ current, total, titles }) {
  const pct = ((current + 1) / total) * 100;
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Step {current + 1} of {total}
          </span>
          <span className="text-xs font-semibold text-primary">
            · {Math.round(pct)}%
          </span>
        </div>
        {titles?.[current] && (
          <span className="text-xs font-semibold text-foreground/80">{titles[current]}</span>
        )}
      </div>

      {/* Animated fill bar */}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary/70">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-primary"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 left-0 rounded-full opacity-60"
          style={{
            width: `${pct}%`,
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
            backgroundSize: "200% 100%",
            animation: "shimmer 2.2s linear infinite",
          }}
        />
      </div>

      {/* Step dots */}
      {titles && titles.length > 0 && (
        <div className="flex items-center justify-between">
          {titles.map((t, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <div key={t + i} className="flex flex-1 flex-col items-center gap-1.5">
                <motion.div
                  layout
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
                    done && "bg-gradient-primary text-primary-foreground shadow-soft",
                    active && "bg-white text-primary ring-2 ring-primary shadow-glow pulse-ring",
                    !done && !active && "bg-secondary text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                </motion.div>
                <span
                  className={cn(
                    "hidden sm:block text-[10px] font-medium uppercase tracking-wide truncate max-w-[80px]",
                    active ? "text-foreground" : "text-muted-foreground/70",
                  )}
                >
                  {t}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function StepFrame({ stepKey, title, subtitle, children }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [stepKey]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        ref={scrollRef}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-8"
      >
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[15px] text-muted-foreground leading-relaxed">{subtitle}</p>
          )}
        </div>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
