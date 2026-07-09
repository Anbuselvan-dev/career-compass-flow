import { motion } from "motion/react";
import {
  TrendingUp,
  DollarSign,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Brain,
  Compass,
  MapPin,
  Calendar,
  Briefcase,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend } from "recharts";

export function CareerReport({ analysis, jobs, onRestart }) {
  const {
    summary,
    careerPaths = [],
    growthOutlook = [],
    strengthsAlignment,
    actionItems = [],
  } = analysis;

  // Colors for charting different paths
  const pathColors = [
    { stroke: "#6366f1", fill: "rgba(99, 102, 241, 0.15)" }, // Indigo
    { stroke: "#06b6d4", fill: "rgba(6, 182, 212, 0.15)" }, // Cyan
    { stroke: "#ec4899", fill: "rgba(236, 72, 153, 0.15)" }, // Pink
  ];

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-4"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-soft">
          <Compass className="h-8 w-8 animate-pulse" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
            Your Career Reality Check
          </h1>
          <p className="max-w-xl mx-auto text-muted-foreground text-[15px] leading-relaxed">
            {summary}
          </p>
        </div>
      </motion.div>

      {/* Main Career Matches Grid */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Top Career Path Matches</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {careerPaths.slice(0, 3).map((path, idx) => (
            <motion.div
              key={path.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card hover:border-primary/30 transition-all flex flex-col justify-between"
            >
              {/* Highlight badge for the top match */}
              {idx === 0 && (
                <div className="absolute top-0 right-0 bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground rounded-bl-xl">
                  Best Fit
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Path {idx + 1}
                  </span>
                  <h3 className="text-lg font-bold leading-snug text-foreground">{path.title}</h3>
                </div>

                {/* Match Rating Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Compatibility</span>
                    <span className="text-foreground">{path.matchScore}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary/60 overflow-hidden">
                    <div
                      className="h-full bg-gradient-primary rounded-full"
                      style={{ width: `${path.matchScore}%` }}
                    />
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3 py-3 border-y border-border/40 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground block">Salary Range</span>
                    <span className="font-semibold text-foreground flex items-center gap-0.5">
                      <DollarSign className="h-3.5 w-3.5 text-success" />
                      {path.salaryRange}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground block">Growth Scope</span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                      {path.scope} ({path.growthPercentage}%)
                    </span>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-muted-foreground/90">{path.whyItFits}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 5-Year Growth Outlook Visualization */}
      {growthOutlook.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-6"
        >
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              5-Year Projected Trajectory
            </h3>
            <p className="text-xs text-muted-foreground">
              Market size and demand projection from 2026 to 2030 (Indexed at 100).
            </p>
          </div>

          <div className="h-[280px] w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthOutlook} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  {careerPaths.slice(0, 3).map((path, idx) => (
                    <linearGradient
                      key={path.title}
                      id={`colorPath${idx}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor={pathColors[idx].stroke} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={pathColors[idx].stroke} stopOpacity={0.0} />
                    </linearGradient>
                  ))}
                </defs>
                <XAxis
                  dataKey="year"
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={[90, "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(17, 17, 17, 0.9)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "12px",
                  }}
                  labelStyle={{ fontWeight: "bold", color: "#fff" }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                {careerPaths.slice(0, 3).map((path, idx) => (
                  <Area
                    key={path.title}
                    name={path.title}
                    type="monotone"
                    dataKey={`Path${idx + 1}`}
                    stroke={pathColors[idx].stroke}
                    fillOpacity={1}
                    fill={`url(#colorPath${idx})`}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Live Jobs & Cognitive Section Grid */}
      <div className="grid gap-8 md:grid-cols-5">
        {/* Real Job Matches list */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="md:col-span-3 rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-6"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Live Job Openings
            </h3>
            <p className="text-xs text-muted-foreground">
              Recent listings matched from job boards based on your top recommended role.
            </p>
          </div>

          <div className="space-y-4">
            {jobs.length > 0 ? (
              jobs.map((job, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-border/50 bg-background/50 hover:border-primary/20 transition-colors"
                >
                  <div className="space-y-2 flex-1">
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground leading-snug">
                          {job.title}
                        </h4>
                        {job.matchScore && (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary ring-1 ring-inset ring-primary/20">
                            {job.matchScore}% Match
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-primary">{job.company}</p>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {job.posted}
                      </span>
                    </div>
                  </div>
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-secondary/80 px-3.5 py-2 text-xs font-medium text-foreground hover:bg-primary hover:text-primary-foreground transition-all shrink-0 self-center"
                  >
                    Apply
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No active openings found matching this profile currently.
              </div>
            )}
          </div>
        </motion.div>

        {/* Cognitive strengths & next steps */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="md:col-span-2 space-y-6"
        >
          {/* Insights Box */}
          <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-4">
            <h3 className="text-md font-bold text-foreground flex items-center gap-2 border-b border-border/40 pb-3">
              <Brain className="h-5 w-5 text-primary" />
              Cognitive Profile Insights
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">{strengthsAlignment}</p>
          </div>

          {/* Action Items Box */}
          <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-4">
            <h3 className="text-md font-bold text-foreground flex items-center gap-2 border-b border-border/40 pb-3">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Recommended Next Steps
            </h3>
            <ul className="space-y-3 text-xs text-muted-foreground">
              {actionItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>

      {/* Restart Button */}
      <div className="flex justify-center pt-4">
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-2.5 text-sm font-semibold text-muted-foreground shadow-soft transition-all hover:text-foreground hover:-translate-y-0.5 hover:shadow-card"
        >
          <RefreshCw className="h-4 w-4" />
          Test Another Path
        </button>
      </div>
    </div>
  );
}
