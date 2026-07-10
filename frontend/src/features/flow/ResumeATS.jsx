import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload, FileText, Loader2, CheckCircle, AlertTriangle,
  Target, TrendingUp, Award, Brain, Briefcase, BookOpen,
  ChevronRight, RotateCcw, Star, Zap, Shield, Users,
  XCircle, CheckCircle2, BarChart2, MapPin, Building2,
  FileBadge, ArrowUp, ArrowRight, Lightbulb
} from "lucide-react";
import {
  ResponsiveContainer, RadialBarChart, RadialBar, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList
} from "recharts";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// ── Animated circular score gauge ──────────────────────────────────────
function ScoreGauge({ score, max = 100, label, color = "#6366f1", size = 140 }) {
  const pct = Math.min(score / max, 1);
  const radius = (size - 20) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = circ * pct;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={12}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={12}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-3xl font-extrabold text-foreground">{score}</span>
        <span className="text-[10px] font-bold text-muted-foreground uppercase">/ {max}</span>
      </div>
      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ── Category score bar ──────────────────────────────────────────────────
function CategoryBar({ label, score, max, pct, color }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">{score}/{max} pts</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-secondary/40 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground font-semibold">{pct}% match</span>
    </div>
  );
}

export function ResumeATS({ answers, careerPaths }) {
  const [phase, setPhase] = useState("form"); // form | analyzing | dashboard
  const [resumeFile, setResumeFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [careerTarget, setCareerTarget] = useState(careerPaths?.[0]?.title || "");
  const [country, setCountry] = useState(answers?.location?.country || "");
  const [city, setCity] = useState(answers?.location?.city || "");
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");
  const fileInputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.toLowerCase();
    if (!ext.endsWith(".pdf") && !ext.endsWith(".docx")) {
      setError("Only PDF and DOCX files are accepted.");
      return;
    }
    setResumeFile(f);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!resumeFile) { setError("Please upload your resume."); return; }
    if (!careerTarget.trim()) { setError("Please enter a target career."); return; }

    setPhase("analyzing");
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", resumeFile);
      fd.append("career_path", careerTarget.trim());
      fd.append("country", country.trim());
      fd.append("city", city.trim());

      const res = await fetch(`${API}/api/ats/analyze`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error: ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
      setPhase("dashboard");
    } catch (e) {
      setError(e.message || "Analysis failed. Please try again.");
      setPhase("form");
    }
  };

  const categoryConfig = [
    { key: "skills_match",       label: "Skills Match",       color: "#6366f1", icon: "⚡" },
    { key: "projects",           label: "Projects",           color: "#06b6d4", icon: "🛠" },
    { key: "keywords",           label: "Keywords",           color: "#8b5cf6", icon: "🔑" },
    { key: "certifications",     label: "Certifications",     color: "#f59e0b", icon: "🏅" },
    { key: "experience",         label: "Experience",         color: "#10b981", icon: "💼" },
    { key: "resume_structure",   label: "Resume Structure",   color: "#ec4899", icon: "📄" },
    { key: "education_alignment",label: "Education Alignment",color: "#14b8a6", icon: "🎓" },
  ];

  // ── Phase: Upload Form ──────────────────────────────────────────────────
  if (phase === "form") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-8"
      >
        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <FileBadge className="h-5 w-5 text-primary" />
            Resume ATS Intelligence Engine
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Upload your resume (PDF or DOCX). We'll fetch 100–500 live job postings via JSearch,
            mathematically score your ATS compatibility across 7 categories, and generate
            personalized AI recommendations — all backed by real labour market data.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed p-10 text-center cursor-pointer transition-all ${
            dragOver ? "border-primary bg-primary/5 scale-[1.01]"
            : resumeFile ? "border-success/50 bg-success/5"
            : "border-border/50 bg-card/60 hover:border-primary/40 hover:bg-primary/5"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {resumeFile ? (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15 text-success">
                <FileText className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{resumeFile.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{(resumeFile.size / 1024).toFixed(0)} KB — click to change</p>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Upload className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Drop your resume here</p>
                <p className="text-xs text-muted-foreground mt-0.5">PDF or DOCX — max 6 MB</p>
              </div>
            </>
          )}
        </div>

        {/* Form fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Target Career *</label>
            <input
              value={careerTarget}
              onChange={(e) => setCareerTarget(e.target.value)}
              placeholder="e.g. AI Engineer, Data Scientist, Backend Developer"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-xs outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Country</label>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. India, United States"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-xs outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">City / Remote</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Bangalore, Remote"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-xs outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!resumeFile}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-6 py-4 text-sm font-bold text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Brain className="h-4 w-4" />
          Analyze Resume Against Live Market
        </button>

        <div className="grid grid-cols-3 gap-3 text-center text-[10px] font-bold text-muted-foreground">
          {["Real JSearch Data", "Math Scoring (No AI)", "7 Categories"].map(f => (
            <div key={f} className="rounded-xl border border-border/40 bg-card/40 py-2.5 px-2">{f}</div>
          ))}
        </div>
      </motion.div>
    );
  }

  // ── Phase: Analyzing ────────────────────────────────────────────────────
  if (phase === "analyzing") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-md mx-auto text-center space-y-8 py-12"
      >
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
          <div className="relative flex h-full items-center justify-center rounded-full bg-primary/15">
            <Brain className="h-10 w-10 text-primary animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground">Analyzing Your Resume</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Fetching live job postings from JSearch, extracting market requirements,
            and running our 7-category mathematical scoring engine...
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-muted-foreground text-left">
          {[
            "📄 Parsing resume text...",
            "🔍 Fetching JSearch jobs...",
            "📊 Extracting market skills...",
            "🧮 Calculating ATS score...",
            "🏢 Matching companies...",
            "🤖 Generating AI insights...",
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl border border-border/40 bg-card/40">
              <Loader2 className="h-3 w-3 animate-spin flex-shrink-0 text-primary" />
              {step}
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  // ── Phase: Dashboard ────────────────────────────────────────────────────
  if (phase === "dashboard" && result) {
    const sections = [
      { id: "overview", label: "Overview", icon: BarChart2 },
      { id: "skills", label: "Skill Gap", icon: Zap },
      { id: "companies", label: "Companies", icon: Building2 },
      { id: "improve", label: "Improve", icon: Lightbulb },
      { id: "ai", label: "AI Summary", icon: Brain },
    ];

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-bold text-foreground">ATS Analysis Results</h3>
            <p className="text-xs text-muted-foreground">
              {result.market?.total_jobs_analysed} live job postings analysed · {result.career_path} · {result.city || ""} {result.country || ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setPhase("form"); setResult(null); setResumeFile(null); }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Re-analyze
          </button>
        </div>

        {/* Score Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* ATS Score gauge */}
          <div className="col-span-2 md:col-span-2 rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card flex items-center justify-around gap-6">
            <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
              <svg width={140} height={140} className="-rotate-90 absolute">
                <circle cx={70} cy={70} r={58} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={14} />
                <motion.circle
                  cx={70} cy={70} r={58}
                  fill="none" stroke="#6366f1" strokeWidth={14}
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "0 365" }}
                  animate={{ strokeDasharray: `${(result.ats_score / 100) * 365} 365` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </svg>
              <div className="relative text-center">
                <span className="text-3xl font-extrabold text-foreground">{result.ats_score}</span>
                <span className="text-[10px] font-bold text-muted-foreground block">ATS Score</span>
              </div>
            </div>
            <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
              <svg width={120} height={120} className="-rotate-90 absolute">
                <circle cx={60} cy={60} r={48} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={12} />
                <motion.circle
                  cx={60} cy={60} r={48}
                  fill="none" stroke="#10b981" strokeWidth={12}
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "0 302" }}
                  animate={{ strokeDasharray: `${(result.market_readiness / 100) * 302} 302` }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                />
              </svg>
              <div className="relative text-center">
                <span className="text-2xl font-extrabold text-foreground">{result.market_readiness}</span>
                <span className="text-[9px] font-bold text-muted-foreground block">Market Ready</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="rounded-3xl border border-border/70 bg-card/65 p-5 shadow-card space-y-3">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Career Readiness</h4>
            <div className="space-y-2 text-xs font-bold">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Now</span>
                <span className="text-foreground">{result.career_readiness_now}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">After Fixes</span>
                <span className="text-success">{result.career_readiness_after}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary/40">
                <div className="h-full bg-success rounded-full" style={{ width: `${result.career_readiness_after}%` }} />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card/65 p-5 shadow-card space-y-3">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Job Eligibility</h4>
            <div className="space-y-1 text-xs font-bold">
              <div>
                <span className="text-2xl font-extrabold text-foreground">{result.current_eligible_jobs}</span>
                <span className="text-muted-foreground text-[10px] ml-1">jobs now</span>
              </div>
              <div className="flex items-center gap-1 text-success">
                <ArrowUp className="h-3 w-3" />
                <span>{result.eligible_after_improvements} jobs after improvements</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section Nav */}
        <div className="flex flex-wrap gap-1 rounded-2xl bg-secondary/35 p-1 text-xs">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all ${
                activeSection === s.id ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* OVERVIEW */}
          {activeSection === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-5">
                <h4 className="text-sm font-bold text-foreground">7-Category Score Breakdown</h4>
                <div className="space-y-4">
                  {categoryConfig.map((cat) => {
                    const data = result.category_scores?.[cat.key];
                    if (!data) return null;
                    return (
                      <CategoryBar
                        key={cat.key}
                        label={`${cat.icon} ${cat.label}`}
                        score={data.score}
                        max={data.max}
                        pct={data.pct}
                        color={cat.color}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Parsed resume profile */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-border/70 bg-card/65 p-5 shadow-card space-y-3">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">Detected Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(result.resume?.skills || []).map((sk) => (
                      <span key={sk} className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary">{sk}</span>
                    ))}
                    {(result.resume?.skills || []).length === 0 && <p className="text-xs text-muted-foreground">No skills extracted</p>}
                  </div>
                </div>
                <div className="rounded-3xl border border-border/70 bg-card/65 p-5 shadow-card space-y-2">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">Resume Profile</h4>
                  <div className="space-y-1.5 text-xs font-semibold">
                    {[
                      ["Projects Detected", result.resume?.projects?.length || 0],
                      ["Experience Entries", result.resume?.experience_count || 0],
                      ["Certifications", result.resume?.certifications?.length || 0],
                      ["CGPA", result.resume?.cgpa || "—"],
                      ["GitHub", result.resume?.github_url ? "✅ Detected" : "❌ Missing"],
                      ["Sections Found", (result.resume?.sections_found || []).join(", ") || "—"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-border/20 pb-1">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="text-foreground font-bold">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* SKILL GAP */}
          {activeSection === "skills" && (
            <motion.div key="skills" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Present skills */}
                <div className="rounded-3xl border border-success/20 bg-success/5 p-5 shadow-card space-y-3">
                  <h4 className="text-xs font-bold text-success uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Skills You Have ({result.present_skills?.length || 0})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(result.present_skills || []).map((sk) => (
                      <span key={sk} className="px-2.5 py-1 rounded-full bg-success/10 border border-success/25 text-[10px] font-bold text-success">{sk}</span>
                    ))}
                    {(result.present_skills || []).length === 0 && <p className="text-xs text-muted-foreground">None matched from live job data</p>}
                  </div>
                </div>

                {/* Missing skills */}
                <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-5 shadow-card space-y-3">
                  <h4 className="text-xs font-bold text-destructive uppercase tracking-wide flex items-center gap-1.5">
                    <XCircle className="h-4 w-4" /> Critical Missing Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(result.missing_skills || []).map((s) => (
                      <span key={s.skill} className="px-2.5 py-1 rounded-full bg-destructive/10 border border-destructive/20 text-[10px] font-bold text-destructive">{s.skill}</span>
                    ))}
                    {(result.missing_skills || []).length === 0 && <p className="text-xs text-muted-foreground">Great — no critical gaps found!</p>}
                  </div>
                </div>
              </div>

              {/* Missing skills table */}
              {(result.missing_skills || []).length > 0 && (
                <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-4">
                  <h4 className="text-sm font-bold text-foreground">Missing Skills Priority List</h4>
                  <div className="space-y-2.5">
                    {result.missing_skills.map((s) => (
                      <div key={s.skill} className="grid grid-cols-5 gap-3 items-center p-3.5 rounded-2xl border border-border/40 bg-background/45 text-xs font-bold">
                        <div className="col-span-2">
                          <span className="text-foreground">{s.skill}</span>
                          <span className={`ml-2 text-[9px] uppercase px-1.5 py-0.5 rounded font-extrabold ${
                            s.importance === "Critical" ? "bg-destructive/15 text-destructive" :
                            s.importance === "High" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                          }`}>{s.importance}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-foreground">{s.demand_pct}%</span>
                          <span className="text-[9px] text-muted-foreground block">Demand</span>
                        </div>
                        <div className="text-center">
                          <span className="text-foreground">{s.learning_time}</span>
                          <span className="text-[9px] text-muted-foreground block">To Learn</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-muted-foreground leading-tight block truncate">{(s.companies || []).slice(0, 2).join(", ")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* COMPANIES */}
          {activeSection === "companies" && (
            <motion.div key="companies" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-4">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Company Match Analysis
                </h4>
                <div className="space-y-3">
                  {(result.company_match || []).map((c) => (
                    <div key={c.company} className="flex items-center gap-4 p-3.5 rounded-2xl border border-border/40 bg-background/45">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-xs font-extrabold text-primary flex-shrink-0">
                        {(c.company || "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-foreground truncate">{c.company}</span>
                          <span className="text-[10px] text-muted-foreground font-semibold ml-2 flex-shrink-0">{c.postings} postings</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-secondary/40 overflow-hidden">
                          <div className="h-full flex">
                            <div className="bg-primary rounded-l-full transition-all" style={{ width: `${c.current_match}%` }} />
                            <div className="bg-success/50 rounded-r-full transition-all" style={{ width: `${Math.max(0, c.potential_match - c.current_match)}%` }} />
                          </div>
                        </div>
                        <div className="flex justify-between text-[9px] mt-0.5 font-semibold">
                          <span className="text-primary">Now: {c.current_match}%</span>
                          <span className="text-success">Potential: {c.potential_match}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(result.company_match || []).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">No company match data available (JSearch may not have returned results for this location).</p>
                  )}
                </div>
              </div>

              {/* Top market skills from job postings */}
              {(result.market?.top_market_skills || []).length > 0 && (
                <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-4">
                  <h4 className="text-sm font-bold text-foreground">Top Skills from Live Job Postings</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={result.market.top_market_skills.slice(0, 10)} layout="vertical" margin={{ left: 60, right: 20 }}>
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#888" />
                        <YAxis type="category" dataKey="skill" tick={{ fontSize: 10 }} stroke="#888" width={60} />
                        <Tooltip contentStyle={{ background: "#1e1e2a", border: "1px solid #333", borderRadius: "10px", fontSize: 11 }} />
                        <Bar dataKey="demand_pct" name="Demand %" fill="#6366f1" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* IMPROVE */}
          {activeSection === "improve" && (
            <motion.div key="improve" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Improvement checklist */}
              {(result.improvement_checklist || []).length > 0 && (
                <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-4">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> Resume Improvement Checklist
                  </h4>
                  <div className="space-y-2.5">
                    {result.improvement_checklist.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-3.5 rounded-2xl border border-border/40 bg-background/45">
                        <div className={`flex-shrink-0 mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-extrabold ${
                          item.priority === "High" ? "bg-destructive/15 text-destructive" :
                          item.priority === "Medium" ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                        }`}>{i + 1}</div>
                        <div className="space-y-0.5 flex-1">
                          <p className="text-xs font-bold text-foreground">{item.action}</p>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">{item.impact}</p>
                        </div>
                        <span className={`text-[9px] font-extrabold uppercase flex-shrink-0 ${
                          item.priority === "High" ? "text-destructive" :
                          item.priority === "Medium" ? "text-primary" : "text-muted-foreground"
                        }`}>{item.priority}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Project recommendations */}
              {(result.project_recommendations || []).length > 0 && (
                <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-4">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" /> Recommended Projects
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {result.project_recommendations.map((proj, i) => (
                      <div key={i} className="p-4 rounded-2xl border border-border/40 bg-background/45 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-foreground">{proj.name}</span>
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${
                            proj.difficulty === "Beginner" ? "bg-success/15 text-success" :
                            proj.difficulty === "Intermediate" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
                          }`}>{proj.difficulty}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(proj.tech_stack || []).map((t) => (
                            <span key={t} className="px-1.5 py-0.5 rounded bg-secondary/50 text-[9px] font-bold text-muted-foreground">{t}</span>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{proj.career_impact}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certification recommendations */}
              {(result.certification_recommendations || []).length > 0 && (
                <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-4">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" /> Recommended Certifications
                  </h4>
                  <div className="space-y-2.5">
                    {result.certification_recommendations.map((cert, i) => (
                      <div key={i} className="flex items-start gap-3 p-3.5 rounded-2xl border border-border/40 bg-background/45">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 flex-shrink-0">
                          <Award className="h-4 w-4" />
                        </div>
                        <div className="space-y-0.5 flex-1">
                          <p className="text-xs font-bold text-foreground">{cert.name}</p>
                          <p className="text-[10px] text-muted-foreground">{cert.provider}</p>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">{cert.relevance}</p>
                        </div>
                        <span className={`text-[9px] font-extrabold uppercase ${cert.priority === "High" ? "text-destructive" : "text-primary"}`}>{cert.priority}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* AI SUMMARY */}
          {activeSection === "ai" && (
            <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 shadow-card space-y-4">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary animate-pulse" /> AI Career Coach Analysis
                </h4>
                <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line space-y-3">
                  {result.ai_summary ? (
                    result.ai_summary.split(/\n\n+/).map((para, i) => (
                      <p key={i}>{para}</p>
                    ))
                  ) : (
                    <p>AI summary not available.</p>
                  )}
                </div>
              </div>

              {/* Top Priority Skills */}
              {(result.top_priority_skills || []).length > 0 && (
                <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-4">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-400" /> Top 3 Skills to Learn First
                  </h4>
                  <div className="space-y-3">
                    {result.top_priority_skills.map((s, i) => (
                      <div key={i} className="flex items-start gap-3 p-4 rounded-2xl border border-border/40 bg-background/45">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400/20 text-amber-400 text-[10px] font-extrabold flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="space-y-1 flex-1">
                          <p className="text-xs font-bold text-foreground">{s.skill}</p>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">{s.why}</p>
                          <div className="flex items-center gap-1 text-[10px] text-primary font-semibold">
                            <ArrowRight className="h-3 w-3" />
                            {s.learning_path}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return null;
}
