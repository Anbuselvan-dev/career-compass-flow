import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  TrendingUp,
  Award,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  GitCompare,
  Shield,
  Zap,
  BookOpen,
  Briefcase,
  Compass,
  MapPin,
  Calendar
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from "recharts";

export function ProgressRoadmap({ careerPaths, studentSkills, answers }) {
  const [selectedCareer, setSelectedCareer] = useState(
    careerPaths && careerPaths.length > 0 ? careerPaths[0].title : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [roadmapData, setRoadmapData] = useState(null);
  const [completedSkills, setCompletedSkills] = useState(new Set());
  const [expandedPhases, setExpandedPhases] = useState({ 1: true }); // Phase 1 open by default

  const profile = {
    degree: answers?.education?.fieldOfStudy || answers?.education?.institutionType || "Vocational/Technical",
    year: answers?.education?.status || "Student",
    cgpa: "N/A",
    interests: `${answers?.strengthsInterests?.primaryStrength || ""}, ${answers?.strengthsInterests?.energizingTasks || ""}`,
    country: "Global",
    city: "Remote"
  };

  useEffect(() => {
    if (!selectedCareer) return;

    const fetchRoadmap = async () => {
      setLoading(true);
      setError(null);
      try {
        const skillsParam = encodeURIComponent(studentSkills.join(","));
        const cgpaParam = answers?.academic?.cgpa || 8.0;
        const locationParam = encodeURIComponent(answers?.location?.country || "");
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/roadmap?career_path=${encodeURIComponent(
            selectedCareer
          )}&location=${locationParam}&student_skills=${skillsParam}&cgpa=${cgpaParam}`
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.detail || `Server returned error status: ${res.status}`);
        }

        const data = await res.json();
        setRoadmapData(data);
        
        // Auto-complete skills the student already has
        const initialCompleted = new Set();
        data.phases.forEach((phase) => {
          phase.skills.forEach((skill) => {
            const hasIt = studentSkills.some(
              (s) => s.toLowerCase().trim() === skill.toLowerCase().trim()
            );
            if (hasIt) {
              initialCompleted.add(skill);
            }
          });
        });
        setCompletedSkills(initialCompleted);
      } catch (err) {
        console.error("Error loading progression roadmap:", err);
        setError(err.message || "Failed to load the progression roadmap. Make sure the backend is active.");
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmap();
  }, [selectedCareer]);

  // Compute dynamic stats based on checked checklist items
  const getDynamicMetrics = () => {
    if (!roadmapData) return null;
    let currentReadiness = roadmapData.base_metrics.initial_readiness;
    let currentEligibility = roadmapData.base_metrics.initial_eligibility;
    let currentMatches = { ...roadmapData.base_metrics.company_matches };

    roadmapData.phases.forEach((phase) => {
      const totalSkills = phase.skills.length;
      if (totalSkills === 0) return;

      let completedInPhase = 0;
      phase.skills.forEach((skill) => {
        if (completedSkills.has(skill)) {
          completedInPhase++;
        }
      });

      const ratio = completedInPhase / totalSkills;
      currentReadiness += ratio * (phase.readiness_impact || 0);
      currentEligibility += ratio * (phase.eligibility_impact || 0);

      if (phase.company_match_impacts) {
        Object.keys(phase.company_match_impacts).forEach((company) => {
          currentMatches[company] =
            (currentMatches[company] || 0) + ratio * phase.company_match_impacts[company];
        });
      }
    });

    // Cap at 100%
    currentReadiness = Math.min(100, Math.round(currentReadiness));
    currentEligibility = Math.min(100, Math.round(currentEligibility));
    Object.keys(currentMatches).forEach((key) => {
      currentMatches[key] = Math.min(100, Math.round(currentMatches[key]));
    });

    return {
      readiness: currentReadiness,
      eligibility: currentEligibility,
      matches: currentMatches
    };
  };

  const metrics = getDynamicMetrics();

  const handleToggleSkill = (skill) => {
    const updated = new Set(completedSkills);
    if (updated.has(skill)) {
      updated.delete(skill);
    } else {
      updated.add(skill);
    }
    setCompletedSkills(updated);
  };

  const togglePhaseExpand = (phaseNum) => {
    setExpandedPhases((prev) => ({
      ...prev,
      [phaseNum]: !prev[phaseNum],
    }));
  };

  // Recharts line chart data representing employability growth over the 7 phases
  const getGrowthChartData = () => {
    if (!roadmapData) return [];
    
    let currentReadiness = roadmapData.base_metrics.initial_readiness;
    let currentEligibility = roadmapData.base_metrics.initial_eligibility;

    const data = [
      {
        name: "Today",
        Readiness: currentReadiness,
        Eligibility: currentEligibility
      }
    ];

    roadmapData.phases.forEach((phase) => {
      currentReadiness += phase.readiness_impact || 0;
      currentEligibility += phase.eligibility_impact || 0;
      data.push({
        name: phase.name.split(":")[0],
        Readiness: Math.min(100, Math.round(currentReadiness)),
        Eligibility: Math.min(100, Math.round(currentEligibility))
      });
    });

    return data;
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-border/70 bg-card/65 p-12 text-center space-y-4 shadow-card">
        <RefreshCw className="h-8 w-8 text-primary animate-spin mx-auto" />
        <h4 className="font-bold text-foreground">Assembling AI Progression Engine...</h4>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          Scanning your profile, extracting skill gaps, and mapping milestones based on live labor postings.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-destructive/20 bg-destructive/10 p-8 text-center space-y-4 shadow-card">
        <div className="text-destructive font-bold text-sm">Roadmap Generation Failed</div>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">{error}</p>
        <button
          onClick={() => setSelectedCareer(selectedCareer)}
          className="px-4 py-2 bg-destructive/20 hover:bg-destructive/30 text-destructive text-xs font-semibold rounded-xl transition-all"
        >
          Retry Load
        </button>
      </div>
    );
  }

  if (!roadmapData) return null;

  return (
    <div className="space-y-8">
      {/* Path Selector Toggle */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Select Career Path Goal
        </span>
        <div className="flex flex-wrap gap-2 bg-secondary/35 p-1.5 rounded-2xl text-xs max-w-2xl">
          {careerPaths.map((path) => (
            <button
              key={path.title}
              onClick={() => setSelectedCareer(path.title)}
              className={`py-2.5 px-4 rounded-xl font-bold transition-all ${
                selectedCareer === path.title
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {path.title}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Dashboard Widgets */}
      <div className="grid gap-6 md:grid-cols-4">
        {/* Career Readiness circular tracker */}
        <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card flex flex-col items-center justify-center space-y-4 text-center">
          <div className="relative h-28 w-28 flex items-center justify-center">
            {/* SVG Circle meter */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="46"
                className="stroke-secondary/35 fill-none"
                strokeWidth="8"
              />
              <circle
                cx="56"
                cy="56"
                r="46"
                className="stroke-primary fill-none transition-all duration-500"
                strokeWidth="8"
                strokeDasharray={2 * Math.PI * 46}
                strokeDashoffset={2 * Math.PI * 46 * (1 - metrics.readiness / 100)}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-xl font-extrabold text-foreground">
              {metrics.readiness}%
            </span>
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-foreground">Career Readiness</h4>
            <p className="text-[10px] text-muted-foreground max-w-[150px]">
              Dynamic indicator of your competitive rating based on completed milestones.
            </p>
          </div>
        </div>

        {/* Job Eligibility metric gauge */}
        <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card flex flex-col items-center justify-center space-y-4 text-center">
          <div className="relative h-28 w-28 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="46"
                className="stroke-secondary/35 fill-none"
                strokeWidth="8"
              />
              <circle
                cx="56"
                cy="56"
                r="46"
                className="stroke-success fill-none transition-all duration-500"
                strokeWidth="8"
                strokeDasharray={2 * Math.PI * 46}
                strokeDashoffset={2 * Math.PI * 46 * (1 - metrics.eligibility / 100)}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-xl font-extrabold text-foreground">
              {metrics.eligibility}%
            </span>
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-foreground">Job Eligibility</h4>
            <p className="text-[10px] text-muted-foreground max-w-[150px]">
              Percentage of current market roles open to you. Complete skill groups to qualify.
            </p>
          </div>
        </div>

        {/* Company Matches Grid */}
        <div className="md:col-span-2 rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-4">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
            <Shield className="h-4 w-4 text-primary" />
            Company Recruitment Matches
          </h4>
          <div className="grid gap-3 text-xs">
            {Object.entries(metrics.matches).map(([company, match]) => (
              <div key={company} className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">{company}</span>
                  <span className="text-foreground">{match}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary/40 overflow-hidden">
                  <div
                    className="h-full bg-gradient-primary rounded-full transition-all duration-500"
                    style={{ width: `${match}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Summary and Strategy */}
      <div className="rounded-3xl border border-primary/20 bg-gradient-primary/5 p-6 shadow-soft space-y-3">
        <h4 className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wide">
          <Sparkles className="h-4 w-4" />
          AI Progression Strategy & Trend Alignment
        </h4>
        <p className="text-xs text-foreground/80 leading-relaxed font-medium">
          {roadmapData.ai_summary}
        </p>
      </div>

      {/* Timeline and Detailed Steps Split */}
      <div className="grid gap-6 md:grid-cols-5 items-start">
        {/* Detailed Phases accordion */}
        <div className="md:col-span-3 space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h3 className="text-md font-bold text-foreground">Interactive Roadmaps & Phases</h3>
          </div>

          <div className="space-y-3">
            {roadmapData.phases.map((phase) => {
              const isOpen = !!expandedPhases[phase.phase_num];
              const totalSkills = phase.skills.length;
              const completedCount = phase.skills.filter((s) => completedSkills.has(s)).length;
              const pctComplete = totalSkills > 0 ? Math.round((completedCount / totalSkills) * 100) : 0;

              return (
                <div
                  key={phase.phase_num}
                  className="rounded-3xl border border-border/70 bg-card/65 overflow-hidden transition-all shadow-soft"
                >
                  {/* Accordion header */}
                  <button
                    onClick={() => togglePhaseExpand(phase.phase_num)}
                    className="w-full p-5 flex items-center justify-between text-left hover:bg-secondary/20 transition-colors"
                  >
                    <div className="space-y-1 max-w-[80%]">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                        {phase.duration} • Difficulty: {phase.difficulty}
                      </span>
                      <h4 className="text-sm font-bold text-foreground">{phase.name}</h4>
                      {/* Sub progress line */}
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-semibold">
                        <span className="text-primary font-bold">{pctComplete}% Complete</span>
                        <span>•</span>
                        <span>{completedCount} of {totalSkills} skills checked</span>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="p-5 border-t border-border/40 space-y-6 bg-background/25">
                          {/* Objectives and prerequisites */}
                          <div className="grid gap-4 sm:grid-cols-2 text-xs">
                            <div className="space-y-1">
                              <span className="text-[10px] text-muted-foreground block uppercase font-bold">Objectives</span>
                              <p className="text-foreground/80 leading-relaxed font-medium">{phase.objectives}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] text-muted-foreground block uppercase font-bold">Prerequisites</span>
                              <p className="text-foreground/80 font-semibold">{phase.prerequisites || "None"}</p>
                            </div>
                          </div>

                          {/* Interactive Milestone check list */}
                          <div className="space-y-2 border-t border-border/30 pt-4">
                            <span className="text-[10px] text-muted-foreground block uppercase font-bold mb-2">
                              Milestone Check List (Tap to verify)
                            </span>
                            <div className="grid gap-2">
                              {phase.skills.map((skill) => {
                                const isDone = completedSkills.has(skill);
                                return (
                                  <label
                                    key={skill}
                                    className={`flex items-center gap-3 p-3 rounded-2xl border text-xs font-semibold cursor-pointer transition-all ${
                                      isDone
                                        ? "border-primary/30 bg-primary/5 text-foreground"
                                        : "border-border/60 bg-background/30 text-muted-foreground hover:border-border hover:bg-background/50"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isDone}
                                      onChange={() => handleToggleSkill(skill)}
                                      className="h-4.5 w-4.5 rounded border-border text-primary focus:ring-primary/20 accent-primary"
                                    />
                                    <span>{skill}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          {/* Mini Project card */}
                          {phase.mini_project && (
                            <div className="rounded-2xl border border-primary/25 bg-gradient-primary/5 p-4 space-y-2.5">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider block">Mini Project Goal</span>
                                  <h5 className="text-xs font-bold text-foreground">{phase.mini_project.title}</h5>
                                </div>
                                <span className="text-xs text-primary font-bold">{phase.mini_project.difficulty}</span>
                              </div>
                              <div className="text-[11px] space-y-1">
                                <p className="text-muted-foreground"><span className="font-semibold text-foreground">Relevance:</span> {phase.mini_project.relevance}</p>
                                <p className="text-muted-foreground"><span className="font-semibold text-foreground">Portfolio Value:</span> {phase.mini_project.value}</p>
                              </div>
                            </div>
                          )}

                          {/* Learning resources */}
                          {phase.resources && phase.resources.length > 0 && (
                            <div className="space-y-2 border-t border-border/30 pt-4">
                              <span className="text-[10px] text-muted-foreground block uppercase font-bold">
                                Recommended Study Materials
                              </span>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {phase.resources.map((res, idx) => (
                                  <a
                                    key={idx}
                                    href={res.url || "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-3 rounded-2xl border border-border/50 bg-background/40 hover:border-primary/45 transition-colors flex items-center justify-between text-xs"
                                  >
                                    <div className="space-y-0.5 max-w-[80%]">
                                      <span className="text-[9px] text-primary uppercase font-bold tracking-wide">
                                        {res.type}
                                      </span>
                                      <span className="font-semibold text-foreground block truncate">
                                        {res.title}
                                      </span>
                                    </div>
                                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground shrink-0" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visual Timeline and growth graph side */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="text-md font-bold text-foreground">Interactive Visual Timeline</h3>
          </div>

          {/* Visual Progression Timeline block */}
          <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-5">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wide border-b border-border/30 pb-2.5">
              Milestone Path
            </h4>
            <div className="relative pl-6 space-y-6 border-l-2 border-primary/20 text-xs">
              <div className="relative">
                <div className="absolute -left-8.5 top-0.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center border-4 border-card">
                  <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />
                </div>
                <div>
                  <h5 className="font-bold text-foreground">TODAY</h5>
                  <p className="text-[10px] text-muted-foreground">Baseline setup established.</p>
                </div>
              </div>

              {roadmapData.phases.map((phase) => {
                const totalSkills = phase.skills.length;
                const completedCount = phase.skills.filter((s) => completedSkills.has(s)).length;
                const isCompleted = completedCount === totalSkills;

                return (
                  <div key={phase.phase_num} className="relative">
                    <div
                      className={`absolute -left-8.5 top-0.5 h-5 w-5 rounded-full flex items-center justify-center border-4 border-card transition-all ${
                        isCompleted ? "bg-success" : "bg-secondary"
                      }`}
                    >
                      <div className={`h-1.5 w-1.5 rounded-full ${isCompleted ? "bg-success-foreground" : "bg-muted-foreground"}`} />
                    </div>
                    <div>
                      <h5 className={`font-bold ${isCompleted ? "text-success" : "text-foreground"}`}>
                        {phase.milestone || `Phase ${phase.phase_num} Complete`}
                      </h5>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Completes: {phase.skills.join(", ")}
                      </p>
                    </div>
                  </div>
                );
              })}

              <div className="relative">
                <div className="absolute -left-8.5 top-0.5 h-5 w-5 rounded-full bg-gradient-primary flex items-center justify-center border-4 border-card shadow-soft">
                  <Award className="h-2.5 w-2.5 text-primary-foreground animate-pulse" />
                </div>
                <div>
                  <h5 className="font-bold text-foreground">JOB READY</h5>
                  <p className="text-[10px] text-muted-foreground">Ready for placement matching.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Employability Growth Graph widget */}
          <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-4">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
              Employability Growth Chart
            </h4>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Expected increase in Career Readiness and Job Eligibility metrics after completing each phase.
            </p>
            <div className="h-56 w-full text-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getGrowthChartData()} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#888888" tickLine={false} />
                  <YAxis stroke="#888888" tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(30, 30, 40, 0.85)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "16px",
                      color: "#fff"
                    }}
                  />
                  <Legend iconType="circle" iconSize={6} />
                  <Line type="monotone" dataKey="Readiness" stroke="#5f5ff1" strokeWidth={2.5} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Eligibility" stroke="#10b981" strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Projects section */}
      {roadmapData.projects && roadmapData.projects.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-border/30">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <h3 className="text-md font-bold text-foreground">Target Portfolio Projects</h3>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {roadmapData.projects.map((proj, idx) => (
              <div
                key={idx}
                className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-sm font-bold text-foreground leading-snug">{proj.title}</h4>
                    <span className="text-xs text-primary font-bold">{proj.difficulty}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {proj.technologies.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold">
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="text-[11px] space-y-1.5 border-t border-border/30 pt-3">
                    <p className="text-muted-foreground"><span className="font-semibold text-foreground block mb-0.5">Industry Relevance</span>{proj.relevance}</p>
                    <p className="text-muted-foreground"><span className="font-semibold text-foreground block mb-0.5">Portfolio Value</span>{proj.value}</p>
                  </div>
                </div>
                {proj.companies && proj.companies.length > 0 && (
                  <div className="text-[10px] text-muted-foreground border-t border-border/20 pt-3 mt-4">
                    Requested by: <span className="font-bold text-foreground">{proj.companies.join(", ")}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications section */}
      {roadmapData.certifications && roadmapData.certifications.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-border/30">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <h3 className="text-md font-bold text-foreground">Recommended Career Certifications</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {roadmapData.certifications.map((cert, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-border/50 bg-background/30 p-4 flex items-center justify-between gap-4 text-xs font-semibold"
              >
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground">{cert.name}</h4>
                  <span className="text-[10px] text-primary">{cert.provider}</span>
                </div>
                {cert.relevance && (
                  <p className="text-[10px] text-muted-foreground max-w-[60%] text-right font-medium leading-relaxed">
                    {cert.relevance}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
