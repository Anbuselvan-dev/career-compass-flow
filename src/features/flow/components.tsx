import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const OTHER = "__other__";

interface Option {
  value: string;
  label: string;
}

export function OptionGrid({
  options,
  value,
  onChange,
  otherLabel = "Other — type your own",
  otherPlaceholder = "Type your answer…",
  columns = 2,
}: {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  otherLabel?: string;
  otherPlaceholder?: string;
  columns?: 1 | 2;
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
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "group relative flex items-center gap-3 rounded-2xl border bg-card px-5 py-4 text-left text-[15px] font-medium transition-all",
              "hover:-translate-y-0.5 hover:shadow-soft",
              selected
                ? "border-primary bg-primary/5 text-foreground shadow-soft ring-2 ring-primary/20"
                : "border-border/70 text-foreground/85 hover:border-primary/40",
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
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => onChange(isOther ? value : (otherText || " "))}
        className={cn(
          "group relative flex items-center gap-3 rounded-2xl border bg-card px-5 py-4 text-left text-[15px] font-medium transition-all sm:col-span-full",
          "hover:-translate-y-0.5 hover:shadow-soft",
          isOther
            ? "border-primary bg-primary/5 shadow-soft ring-2 ring-primary/20"
            : "border-dashed border-border text-foreground/70 hover:border-primary/40",
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
            transition={{ duration: 0.22, ease: "easeOut" }}
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
              className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-[15px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function QuestionCard({
  question,
  explainer,
  children,
}: {
  question: string;
  explainer: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h3 className="text-xl font-semibold text-foreground sm:text-[22px]">{question}</h3>
        <p className="text-sm italic text-muted-foreground">{explainer}</p>
      </div>
      {children}
    </div>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  multiline,
  rows = 5,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  autoFocus?: boolean;
}) {
  const cls =
    "w-full rounded-xl border border-border bg-card px-4 py-3 text-[15px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20";
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

export function ProgressBar({
  current,
  total,
  titles,
}: {
  current: number;
  total: number;
  titles: string[];
}) {
  const pct = ((current + 1) / total) * 100;
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        <span>
          Step {current + 1} of {total}
        </span>
        <span className="text-foreground/70 normal-case tracking-normal">
          {titles[current]}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <motion.div
          className="h-full rounded-full bg-gradient-primary"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}

export function StepFrame({
  stepKey,
  title,
  subtitle,
  children,
}: {
  stepKey: string | number;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [stepKey]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        ref={scrollRef}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-8"
      >
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h2>
          <p className="text-[15px] text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
