import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  GitCompare,
  Cpu,
  Shield,
  Zap,
  Award,
  AlertCircle
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

  const [selectedPath, setSelectedPath] = useState(careerPaths[0]?.title || "");
  const [compareWith, setCompareWith] = useState("");
  const [compareLoading, setCompareLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [compareError, setCompareError] = useState(null);

  const handleCompare = async () => {
    if (!compareWith.trim()) return;
    setCompareLoading(true);
    setCompareError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          career_a: selectedPath,
          career_b: compareWith.trim()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setComparisonResult(data);
    } catch (e) {
      console.error(e);
      setCompareError("Failed to fetch comparison report. Please make sure your backend server is running.");
    } finally {
      setCompareLoading(false);
    }
  };

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

      {/* Career Comparison Playground Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-8"
      >
        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-primary" />
            Interactive Career Comparison
          </h3>
          <p className="text-xs text-muted-foreground">
            Compare your recommended paths with any other career track (e.g. Cybersecurity, Cloud Engineering, Full Stack) to see real-time salary, demand, and skill differences.
          </p>
        </div>

        {/* Inputs Form */}
        <div className="grid gap-4 sm:grid-cols-3 items-end">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground block">Career A (Recommended)</label>
            <select
              value={selectedPath}
              onChange={(e) => setSelectedPath(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-xs outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground"
            >
              {careerPaths.map((path) => (
                <option key={path.title} value={path.title}>
                  {path.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground block">Career B (Compare With)</label>
            <input
              type="text"
              value={compareWith}
              onChange={(e) => setCompareWith(e.target.value)}
              placeholder="e.g. Cybersecurity Specialist, Cloud Engineer"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-xs outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={handleCompare}
              disabled={compareLoading || !compareWith.trim()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 text-xs font-semibold text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {compareLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Comparing...
                </>
              ) : (
                <>
                  <GitCompare className="h-4 w-4" />
                  Compare Careers
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Suggestions Helper */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Popular ideas:</span>
          {["Cybersecurity", "Cloud Engineer", "Full Stack Developer", "Data Scientist"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCompareWith(item)}
              className="px-2.5 py-1 rounded-full bg-secondary/80 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {item}
            </button>
          ))}
        </div>

        {/* Error Notification */}
        {compareError && (
          <div className="flex items-center gap-2 p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{compareError}</span>
          </div>
        )}

        {/* Comparison Result Display */}
        <AnimatePresence mode="wait">
          {comparisonResult && (
            <motion.div
              key={comparisonResult.career_a.title + "_" + comparisonResult.career_b.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 pt-4 border-t border-border/40"
            >
              {/* Main Comparison Column Grid */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Career A Details */}
                <div className="p-5 rounded-2xl border border-border/50 bg-background/40 space-y-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Career A</span>
                      <h4 className="text-md font-bold text-foreground">{comparisonResult.career_a.title}</h4>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                      comparisonResult.career_a.demand === "High" ? "bg-success/10 text-success ring-success/20" :
                      comparisonResult.career_a.demand === "Medium" ? "bg-warning/10 text-warning ring-warning/20" :
                      "bg-destructive/10 text-destructive ring-destructive/20"
                    }`}>
                      {comparisonResult.career_a.demand} Demand
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                    {comparisonResult.career_a.demand_trend}
                  </p>

                  {/* Salaries */}
                  <div className="space-y-2 border-t border-border/30 pt-4">
                    <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-success" />
                      Salary Benchmarks
                    </h5>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-secondary/30">
                        <span className="text-[10px] text-muted-foreground block uppercase">Entry</span>
                        <span className="font-bold text-foreground">{comparisonResult.career_a.salary.entry}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-secondary/30">
                        <span className="text-[10px] text-muted-foreground block uppercase">Mid</span>
                        <span className="font-bold text-foreground">{comparisonResult.career_a.salary.mid}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-secondary/30">
                        <span className="text-[10px] text-muted-foreground block uppercase">Senior</span>
                        <span className="font-bold text-foreground">{comparisonResult.career_a.salary.senior}</span>
                      </div>
                    </div>
                  </div>

                  {/* Skills required */}
                  <div className="space-y-3 border-t border-border/30 pt-4">
                    <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-primary" />
                      Required Skillsets
                    </h5>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-1">Technical Skills:</span>
                        <div className="flex flex-wrap gap-1">
                          {comparisonResult.career_a.skills.technical.map((skill, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-1">Soft Skills:</span>
                        <div className="flex flex-wrap gap-1">
                          {comparisonResult.career_a.skills.soft.map((skill, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-secondary/60 text-muted-foreground text-[10px] font-medium">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Government Sector jobs */}
                  <div className="space-y-1.5 border-t border-border/30 pt-4">
                    <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-primary" />
                      Government Sector Relevance
                    </h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {comparisonResult.career_a.govt_relevance}
                    </p>
                  </div>
                </div>

                {/* Career B Details */}
                <div className="p-5 rounded-2xl border border-border/50 bg-background/40 space-y-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Career B</span>
                      <h4 className="text-md font-bold text-foreground">{comparisonResult.career_b.title}</h4>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                      comparisonResult.career_b.demand === "High" ? "bg-success/10 text-success ring-success/20" :
                      comparisonResult.career_b.demand === "Medium" ? "bg-warning/10 text-warning ring-warning/20" :
                      "bg-destructive/10 text-destructive ring-destructive/20"
                    }`}>
                      {comparisonResult.career_b.demand} Demand
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                    {comparisonResult.career_b.demand_trend}
                  </p>

                  {/* Salaries */}
                  <div className="space-y-2 border-t border-border/30 pt-4">
                    <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-success" />
                      Salary Benchmarks
                    </h5>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-secondary/30">
                        <span className="text-[10px] text-muted-foreground block uppercase">Entry</span>
                        <span className="font-bold text-foreground">{comparisonResult.career_b.salary.entry}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-secondary/30">
                        <span className="text-[10px] text-muted-foreground block uppercase">Mid</span>
                        <span className="font-bold text-foreground">{comparisonResult.career_b.salary.mid}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-secondary/30">
                        <span className="text-[10px] text-muted-foreground block uppercase">Senior</span>
                        <span className="font-bold text-foreground">{comparisonResult.career_b.salary.senior}</span>
                      </div>
                    </div>
                  </div>

                  {/* Skills required */}
                  <div className="space-y-3 border-t border-border/30 pt-4">
                    <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-primary" />
                      Required Skillsets
                    </h5>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-1">Technical Skills:</span>
                        <div className="flex flex-wrap gap-1">
                          {comparisonResult.career_b.skills.technical.map((skill, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-1">Soft Skills:</span>
                        <div className="flex flex-wrap gap-1">
                          {comparisonResult.career_b.skills.soft.map((skill, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-secondary/60 text-muted-foreground text-[10px] font-medium">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Government Sector jobs */}
                  <div className="space-y-1.5 border-t border-border/30 pt-4">
                    <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-primary" />
                      Government Sector Relevance
                    </h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {comparisonResult.career_b.govt_relevance}
                    </p>
                  </div>
                </div>
              </div>

              {/* Comparative Operations Matrix */}
              <div className="rounded-2xl border border-border/50 bg-background/25 p-5 space-y-4">
                <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5 border-b border-border/30 pb-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Comparative Operations Matrix
                </h5>
                <div className="space-y-3 text-xs">
                  <div className="grid sm:grid-cols-4 gap-2">
                    <span className="font-semibold text-foreground block">Learning Curve:</span>
                    <span className="sm:col-span-3 text-muted-foreground">{comparisonResult.comparison_matrix.learning_curve}</span>
                  </div>
                  <div className="grid sm:grid-cols-4 gap-2 border-t border-border/20 pt-2">
                    <span className="font-semibold text-foreground block">Work-Life Balance:</span>
                    <span className="sm:col-span-3 text-muted-foreground">{comparisonResult.comparison_matrix.work_life_balance}</span>
                  </div>
                  <div className="grid sm:grid-cols-4 gap-2 border-t border-border/20 pt-2">
                    <span className="font-semibold text-foreground block">Remote Opportunities:</span>
                    <span className="sm:col-span-3 text-muted-foreground">{comparisonResult.comparison_matrix.remote_opportunities}</span>
                  </div>
                  <div className="grid sm:grid-cols-4 gap-2 border-t border-border/20 pt-2">
                    <span className="font-semibold text-foreground block">AI Susceptibility:</span>
                    <span className="sm:col-span-3 text-muted-foreground">{comparisonResult.comparison_matrix.ai_susceptibility}</span>
                  </div>
                  <div className="grid sm:grid-cols-4 gap-2 border-t border-border/20 pt-2">
                    <span className="font-semibold text-foreground block">Long-Term Growth:</span>
                    <span className="sm:col-span-3 text-muted-foreground">{comparisonResult.comparison_matrix.long_term_growth}</span>
                  </div>
                </div>
              </div>

              {/* Personal Recommendation Verdict Callout */}
              <div className="rounded-2xl bg-gradient-primary/10 border border-primary/20 p-5 space-y-2">
                <h5 className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wide">
                  <Sparkles className="h-4 w-4" />
                  Comparison Verdict
                </h5>
                <p className="text-xs text-foreground leading-relaxed">
                  {comparisonResult.verdict}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

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
