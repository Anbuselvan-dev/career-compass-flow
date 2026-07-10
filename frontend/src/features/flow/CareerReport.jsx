import { useState, useEffect } from "react";
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
  Shield,
  Zap,
  Award,
  AlertCircle,
  Activity,
  ListChecks,
  XCircle,
  AlertTriangle,
  FileText,
  Upload,
  CheckCircle,
  Loader2,
  FileBadge
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid
} from "recharts";
import { ProgressRoadmap } from "./ProgressRoadmap";
import { ResumeATS } from "./ResumeATS";
import { ExecutiveSummary } from "./ExecutiveSummary";

export function CareerReport({ analysis, jobs, answers, onRestart }) {
  const {
    summary,
    careerPaths = [],
    growthOutlook = [],
  } = analysis;

  const [activeTab, setActiveTab] = useState("report");
  const [selectedPath, setSelectedPath] = useState(careerPaths[0]?.title || "");
  
  // State for compare tab
  const [compareA, setCompareA] = useState(careerPaths[0]?.title || "");
  const [compareB, setCompareB] = useState(careerPaths[1]?.title || "");

  // State for Market Data tab
  const [marketData, setMarketData] = useState(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState(null);

  // State for Skill Gap tab
  const [skillGapData, setSkillGapData] = useState(null);
  const [skillGapLoading, setSkillGapLoading] = useState(false);
  const [skillGapError, setSkillGapError] = useState(null);

  // Lifted state for Resume ATS tab
  const [atsResult, setAtsResult] = useState(null);

  useEffect(() => {
    if (activeTab === "market" && selectedPath) {
      const fetchMarketData = async () => {
        setMarketLoading(true);
        setMarketError(null);
        try {
          const res = await fetch(
            `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/market-data?career_path=${encodeURIComponent(
              selectedPath
            )}&location=${encodeURIComponent(answers?.location?.country || "")}`
          );
          if (!res.ok) {
            throw new Error(`Server returned error status: ${res.status}`);
          }
          const data = await res.json();
          setMarketData(data);
        } catch (e) {
          console.error(e);
          setMarketError("Failed to fetch live market statistics. Please check your backend server.");
        } finally {
          setMarketLoading(false);
        }
      };
      fetchMarketData();
    }
  }, [activeTab, selectedPath]);

  useEffect(() => {
    if (activeTab === "skillgap" && selectedPath) {
      const fetchSkillGap = async () => {
        setSkillGapLoading(true);
        setSkillGapError(null);
        try {
          const skillsParam = encodeURIComponent(answers?.technical_skills?.join(",") || "");
          const res = await fetch(
            `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/skill-gap?career_path=${encodeURIComponent(
              selectedPath
            )}&location=${encodeURIComponent(answers?.location?.country || "")}&student_skills=${skillsParam}&cgpa=${answers?.academic?.cgpa || 8.0}`
          );
          if (!res.ok) {
            throw new Error(`Server returned error status: ${res.status}`);
          }
          const data = await res.json();
          setSkillGapData(data);
        } catch (e) {
          console.error(e);
          setSkillGapError("Failed to calculate live skill gap metrics. Please verify backend connection.");
        } finally {
          setSkillGapLoading(false);
        }
      };
      fetchSkillGap();
    }
  }, [activeTab, selectedPath]);

  // Color mappings for charting
  const pathColors = [
    { stroke: "#6366f1", fill: "rgba(99, 102, 241, 0.15)" },
    { stroke: "#06b6d4", fill: "rgba(6, 182, 212, 0.15)" },
    { stroke: "#ec4899", fill: "rgba(236, 72, 153, 0.15)" },
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
          <p className="max-w-xl mx-auto text-muted-foreground text-[14px] leading-relaxed">
            {summary}
          </p>
        </div>
      </motion.div>

      {/* Tabs Navigation */}
      <div className="flex justify-center border-b border-border/30 pb-4">
        <div className="flex flex-wrap justify-center gap-1 rounded-2xl bg-secondary/35 p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("report")}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === "report" ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Compass className="h-4 w-4" />
            Recommendations
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("market")}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === "market" ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Market Data
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("skillgap")}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === "skillgap" ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="h-4 w-4" />
            Skill Gap
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("compare")}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === "compare" ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GitCompare className="h-4 w-4" />
            Career Compare
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("roadmap")}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === "roadmap" ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ListChecks className="h-4 w-4" />
            Learning Roadmap
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("resume")}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === "resume" ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileBadge className="h-4 w-4" />
            Resume ATS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("summary")}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === "summary" ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Executive Summary
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* TAB 1: Career Recommendations */}
        {activeTab === "report" && (
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-12"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Top Career Path Matches</h2>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {careerPaths.map((path, idx) => {
                  const skillFit = path.skill_fit_score || 80;
                  const interestFit = path.interest_fit_score || 85;
                  const valuesFit = path.values_fit_score || 78;
                  const feasibility = path.feasibility_score || 90;

                  return (
                    <motion.div
                      key={path.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * idx }}
                      className="relative rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card flex flex-col justify-between hover:shadow-soft transition-all"
                    >
                      {idx === 0 && (
                        <span className="absolute -top-3 right-6 inline-flex items-center rounded-full bg-gradient-primary px-3 py-1 text-[10px] font-bold text-primary-foreground uppercase tracking-wider shadow-soft">
                          Best Fit
                        </span>
                      )}

                      <div className="space-y-4">
                        <div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Path {idx + 1}
                          </span>
                          <h3 className="text-lg font-bold text-foreground mt-0.5 leading-snug">
                            {path.title}
                          </h3>
                        </div>

                        <div className="space-y-2 border-b border-border/20 pb-3">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-muted-foreground font-bold">Overall Match</span>
                            <span className="text-primary font-bold">{path.matchScore}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-secondary/40 overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${path.matchScore}%` }}
                            />
                          </div>
                        </div>

                        {/* Breakdown scores */}
                        <div className="grid grid-cols-2 gap-2.5 text-[10px] font-semibold text-muted-foreground">
                          <div className="p-2.5 rounded-xl bg-background/50 border border-border/40 space-y-1">
                            <span>Skill Fit</span>
                            <span className="text-foreground block text-xs font-extrabold">{skillFit}%</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-background/50 border border-border/40 space-y-1">
                            <span>Interest Fit</span>
                            <span className="text-foreground block text-xs font-extrabold">{interestFit}%</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-background/50 border border-border/40 space-y-1">
                            <span>Values Fit</span>
                            <span className="text-foreground block text-xs font-extrabold">{valuesFit}%</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-background/50 border border-border/40 space-y-1">
                            <span>Feasibility</span>
                            <span className="text-foreground block text-xs font-extrabold">{feasibility}%</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t border-border/30 pt-3 text-xs">
                          <div>
                            <span className="text-[10px] text-muted-foreground block uppercase">Salary</span>
                            <span className="font-bold text-foreground">{path.salaryRange}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block uppercase">Growth</span>
                            <span className="font-bold text-foreground inline-flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-success" />
                              {path.scope} ({path.growthPercentage}%)
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/30 pt-3">
                          {path.whyItFits}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Recharts Area Growth Outlook */}
            {growthOutlook.length > 0 && (
              <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-6">
                <div className="space-y-1.5">
                  <h3 className="text-md font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    5-Year Projected Trajectory
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Market size and demand projection from 2026 to 2030 (Indexed at 100).
                  </p>
                </div>

                <div className="h-72 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthOutlook} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        {careerPaths.map((path, idx) => {
                          const colors = pathColors[idx % pathColors.length];
                          return (
                            <linearGradient key={path.title} id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={colors.stroke} stopOpacity={0.2}/>
                              <stop offset="95%" stopColor={colors.stroke} stopOpacity={0.01}/>
                            </linearGradient>
                          );
                        })}
                      </defs>
                      <XAxis dataKey="year" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} domain={[80, 'auto']} />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(30, 30, 40, 0.95)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "16px",
                          fontSize: "11px",
                          color: "#fff"
                        }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                      {careerPaths.map((path, idx) => {
                        const colors = pathColors[idx % pathColors.length];
                        return (
                          <Area
                            key={path.title}
                            type="monotone"
                            dataKey={`Path${idx + 1}`}
                            name={path.title}
                            stroke={colors.stroke}
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill={`url(#grad-${idx})`}
                          />
                        );
                      })}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 2: Market Data */}
        {activeTab === "market" && (
          <motion.div
            key="market"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Career Selector Toggle */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Select Career Path
              </span>
              <div className="flex flex-wrap gap-2 bg-secondary/35 p-1.5 rounded-2xl text-xs max-w-2xl">
                {careerPaths.map((path) => (
                  <button
                    key={path.title}
                    onClick={() => setSelectedPath(path.title)}
                    className={`py-2 px-3.5 rounded-xl font-bold transition-all ${
                      selectedPath === path.title
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {path.title}
                  </button>
                ))}
              </div>
            </div>

            {marketLoading ? (
              <div className="rounded-3xl border border-border/70 bg-card/65 p-12 text-center space-y-4">
                <RefreshCw className="h-6 w-6 text-primary animate-spin mx-auto" />
                <p className="text-xs text-muted-foreground">Loading live Adzuna & JSearch data metrics...</p>
              </div>
            ) : marketError ? (
              <div className="rounded-3xl border border-destructive/20 bg-destructive/10 p-8 text-center space-y-3">
                <AlertTriangle className="h-6 w-6 text-destructive mx-auto" />
                <p className="text-xs text-foreground font-semibold">{marketError}</p>
              </div>
            ) : marketData ? (
              <div className="grid gap-6 md:grid-cols-3">
                {/* Salary Ranges */}
                <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-4">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Salary ranges (Live Statistics)
                  </h4>
                  <div className="space-y-2.5 text-xs font-semibold">
                    <div className="p-3 bg-background/50 border border-border/30 rounded-xl flex justify-between">
                      <span className="text-muted-foreground">Entry Level</span>
                      <span className="text-foreground font-bold">{marketData.salary_ranges.entry}</span>
                    </div>
                    <div className="p-3 bg-background/50 border border-border/30 rounded-xl flex justify-between">
                      <span className="text-muted-foreground">Mid-Career</span>
                      <span className="text-foreground font-bold">{marketData.salary_ranges.mid}</span>
                    </div>
                    <div className="p-3 bg-background/50 border border-border/30 rounded-xl flex justify-between">
                      <span className="text-muted-foreground">Senior Specialist</span>
                      <span className="text-foreground font-bold">{marketData.salary_ranges.senior}</span>
                    </div>
                  </div>
                </div>

                {/* Job Posting trend line */}
                <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-4 md:col-span-2">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Historical Hiring Demand Trend Index
                  </h4>
                  <div className="h-56 w-full text-[10px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={marketData.historical_trend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="year" stroke="#888888" tickLine={false} />
                        <YAxis stroke="#888888" tickLine={false} />
                        <Tooltip contentStyle={{ background: "#222", border: "1px solid #444", borderRadius: "10px" }} />
                        <Line type="monotone" dataKey="Index" stroke="#6366f1" strokeWidth={2.5} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Regional Salaries Bar Chart */}
                <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-4 md:col-span-3">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-primary" />
                    Regional Salary Comparison (Annual USD Equivalent)
                  </h4>
                  <div className="h-64 w-full text-[10px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={marketData.regional_comparison} margin={{ top: 10, right: 5, left: -20, bottom: 5 }}>
                        <XAxis dataKey="region" stroke="#888888" tickLine={false} />
                        <YAxis stroke="#888888" tickLine={false} />
                        <Tooltip contentStyle={{ background: "#222", border: "1px solid #444", borderRadius: "10px" }} />
                        <Bar dataKey="salary" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}

        {/* TAB 3: Skill Gap */}
        {activeTab === "skillgap" && (
          <motion.div
            key="skillgap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Career Selector Toggle */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Select Career Path
              </span>
              <div className="flex flex-wrap gap-2 bg-secondary/35 p-1.5 rounded-2xl text-xs max-w-2xl">
                {careerPaths.map((path) => (
                  <button
                    key={path.title}
                    onClick={() => setSelectedPath(path.title)}
                    className={`py-2 px-3.5 rounded-xl font-bold transition-all ${
                      selectedPath === path.title
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {path.title}
                  </button>
                ))}
              </div>
            </div>

            {skillGapLoading ? (
              <div className="rounded-3xl border border-border/70 bg-card/65 p-12 text-center space-y-4">
                <RefreshCw className="h-6 w-6 text-primary animate-spin mx-auto" />
                <p className="text-xs text-muted-foreground">Running live skill gap analytics...</p>
              </div>
            ) : skillGapError ? (
              <div className="rounded-3xl border border-destructive/20 bg-destructive/10 p-8 text-center space-y-3">
                <AlertTriangle className="h-6 w-6 text-destructive mx-auto" />
                <p className="text-xs text-foreground font-semibold">{skillGapError}</p>
              </div>
            ) : skillGapData ? (
              <div className="grid gap-6 md:grid-cols-3">
                {/* Stats Panel */}
                <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-4 h-fit">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-primary" />
                    Overall Fit Indexes
                  </h4>
                  <div className="space-y-3">
                    <div className="p-3.5 bg-background/50 border border-border/30 rounded-2xl space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span>Skills Match Score</span>
                        <span className="text-primary">{skillGapData.skill_match_score}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary/40 overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${skillGapData.skill_match_score}%` }} />
                      </div>
                    </div>

                    <div className="p-3.5 bg-background/50 border border-border/30 rounded-2xl space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span>Academic Readiness</span>
                        <span className="text-success">{skillGapData.career_readiness_score}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary/40 overflow-hidden">
                        <div className="h-full bg-success" style={{ width: `${skillGapData.career_readiness_score}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Skills Gap Checklist */}
                <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-4 md:col-span-2">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Live Job-Posting Skills Match Breakdown
                  </h4>
                  <div className="space-y-2.5">
                    {skillGapData.market_skills.map((skillItem) => (
                      <div
                        key={skillItem.skill}
                        className="flex items-center justify-between p-3.5 rounded-2xl border border-border/40 bg-background/45 text-xs font-bold"
                      >
                        <div className="space-y-0.5">
                          <span className="text-foreground">{skillItem.skill}</span>
                          <div className="flex gap-2 text-[10px] text-muted-foreground font-semibold">
                            <span>Market Demand: {skillItem.demand_pct}%</span>
                            <span>•</span>
                            <span className={`uppercase font-bold ${
                              skillItem.importance === "Critical" ? "text-destructive" :
                              skillItem.importance === "High" ? "text-primary" : "text-muted-foreground"
                            }`}>{skillItem.importance}</span>
                          </div>
                        </div>

                        {skillItem.student_has ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success">
                            <CheckCircle2 className="h-4 w-4" />
                            Possessed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-destructive animate-pulse">
                            <XCircle className="h-4 w-4" />
                            Missing
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}

        {/* TAB 4: Career Compare */}
        {activeTab === "compare" && (
          <motion.div
            key="compare"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <GitCompare className="h-5 w-5 text-primary" />
                Career Side-by-Side Comparison
              </h3>
              <p className="text-xs text-muted-foreground">
                Compare parameters of two recommended pathways to weigh trade-offs.
              </p>
            </div>

            {/* Selection inputs */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground block">Career Path A</label>
                <select
                  value={compareA}
                  onChange={(e) => setCompareA(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-xs outline-none focus:border-primary text-foreground"
                >
                  {careerPaths.map((p) => (
                    <option key={p.title} value={p.title}>{p.title}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground block">Career Path B</label>
                <select
                  value={compareB}
                  onChange={(e) => setCompareB(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-xs outline-none focus:border-primary text-foreground"
                >
                  {careerPaths.map((p) => (
                    <option key={p.title} value={p.title}>{p.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {compareA && compareB && (
              <div className="grid gap-6 md:grid-cols-2 pt-4">
                {[compareA, compareB].map((pathTitle, idx) => {
                  const path = careerPaths.find(p => p.title === pathTitle) || careerPaths[idx];
                  const skillFit = path.skill_fit_score || 80;
                  const interestFit = path.interest_fit_score || 85;
                  const valuesFit = path.values_fit_score || 78;
                  const feasibility = path.feasibility_score || 90;

                  return (
                    <div
                      key={idx}
                      className="rounded-3xl border border-border/60 bg-card/65 p-6 shadow-card space-y-5"
                    >
                      <div className="border-b border-border/30 pb-3">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                          Career {idx === 0 ? "A" : "B"}
                        </span>
                        <h4 className="text-md font-bold text-foreground mt-0.5">{path.title}</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="p-3 rounded-xl bg-background/50 border border-border/40">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold">Overall Match</span>
                          <span className="text-sm font-extrabold text-foreground">{path.matchScore}%</span>
                        </div>
                        <div className="p-3 rounded-xl bg-background/50 border border-border/40">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold">Salary Range</span>
                          <span className="text-sm font-extrabold text-foreground">{path.salaryRange}</span>
                        </div>
                      </div>

                      <div className="space-y-2 border-t border-border/30 pt-4">
                        <h5 className="text-xs font-bold text-foreground uppercase tracking-wide">Scoring Breakdowns</h5>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-lg bg-secondary/30 flex justify-between">
                            <span className="text-muted-foreground">Skill Fit</span>
                            <span className="font-bold text-foreground">{skillFit}%</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-secondary/30 flex justify-between">
                            <span className="text-muted-foreground">Interest Fit</span>
                            <span className="font-bold text-foreground">{interestFit}%</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-secondary/30 flex justify-between">
                            <span className="text-muted-foreground">Values Fit</span>
                            <span className="font-bold text-foreground">{valuesFit}%</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-secondary/30 flex justify-between">
                            <span className="text-muted-foreground">Feasibility</span>
                            <span className="font-bold text-foreground">{feasibility}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 border-t border-border/30 pt-4 text-xs leading-relaxed">
                        <span className="text-[10px] text-muted-foreground block uppercase font-bold">Rationale</span>
                        <p className="text-muted-foreground">{path.whyItFits}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 5: Learning Roadmap */}
        {activeTab === "roadmap" && (
          <motion.div
            key="roadmap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <ProgressRoadmap
              careerPaths={careerPaths}
              studentSkills={answers.technical_skills}
              answers={answers}
            />
          </motion.div>
        )}

        {/* TAB 6: Resume ATS Intelligence Engine */}
        {activeTab === "resume" && (
          <motion.div
            key="resume"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <ResumeATS
              answers={answers}
              careerPaths={careerPaths}
              result={atsResult}
              setResult={setAtsResult}
            />
          </motion.div>
        )}

        {/* TAB 7: Executive Summary */}
        {activeTab === "summary" && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <ExecutiveSummary
              answers={answers}
              analysis={analysis}
              jobs={jobs}
              marketData={marketData}
              skillGapData={skillGapData}
              atsResult={atsResult}
            />
          </motion.div>
        )}
      </AnimatePresence>

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
