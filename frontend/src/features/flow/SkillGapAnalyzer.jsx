import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Award,
  TrendingUp,
  BookOpen,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Activity,
  ArrowRight,
  MapPin,
  ListTodo,
  Sparkles,
  Layers,
} from "lucide-react";

export function SkillGapAnalyzer({ analysis, answers }) {
  const recommendedPaths = analysis?.careerPaths || [];
  
  const [selectedPath, setSelectedPath] = useState(recommendedPaths[0]?.title || "");
  const [city, setCity] = useState(answers?.basicInfo?.city || "");
  const [country, setCountry] = useState(answers?.basicInfo?.country || "India");
  const [studentSkillsText, setStudentSkillsText] = useState(
    answers?.strengthsInterests?.primaryStrength
      ? `${answers.strengthsInterests.primaryStrength}, ${answers.strengthsInterests.energizingTasks || ""}`
      : "Python, SQL, Git"
  );
  
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [activeRoadmapTab, setActiveRoadmapTab] = useState("weekly");

  const loadingMessages = [
    "Contacting JSearch API to scrape live job postings...",
    "Cleaning and deduplicating job descriptions...",
    "Running regex-based skill extraction and normalizer...",
    "Comparing your skills with live labor-market frequencies...",
    "Generating personalized learning roadmaps via Gemini AI...",
  ];

  const handleRunAnalysis = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setLoadingStep(0);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 2800);

    try {
      const skillsArray = studentSkillsText
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "");

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/skill-gap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          career_path: selectedPath,
          location: city ? `${city}, ${country}` : country,
          student_skills: skillsArray,
          answers: answers || {}
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData?.detail || `HTTP error status: ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to retrieve real-time skill gaps. Please check backend connection.");
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  const CircularProgress = ({ score, title, colorClass }) => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
      <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-background/40 border border-border/30">
        <div className="relative h-24 w-24 flex items-center justify-center">
          <svg className="absolute transform -rotate-90 w-full h-full">
            <circle
              cx="48"
              cy="48"
              r={radius}
              className="stroke-secondary fill-none"
              strokeWidth="8"
            />
            <circle
              cx="48"
              cy="48"
              r={radius}
              className={`fill-none transition-all duration-1000 ${colorClass}`}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <span className="text-xl font-bold text-foreground">{score}%</span>
        </div>
        <span className="text-xs font-semibold text-muted-foreground mt-2">{title}</span>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Parameter Selection Card */}
      <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Skill Gap Configuration
          </h3>
          <p className="text-xs text-muted-foreground">
            Configure your target career and verify your skills to trigger a real-time extraction of skills from active JSearch postings.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground block">Target Career Path</label>
            <input
              type="text"
              list="career-options"
              value={selectedPath}
              onChange={(e) => setSelectedPath(e.target.value)}
              placeholder="Select or type custom career path"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-xs outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground"
            />
            <datalist id="career-options">
              {recommendedPaths.map((path) => (
                <option key={path.title} value={path.title} />
              ))}
              <option value="Full Stack Developer" />
              <option value="Cybersecurity Analyst" />
              <option value="Cloud Engineer" />
              <option value="Data Scientist" />
            </datalist>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground block">Preferred City / Region</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Bangalore, Manila, remote"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-xs outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground block">Preferred Country</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. India, Philippines"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-xs outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 py-3.5 text-xs font-semibold text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Analyzing Market...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4" />
                  Run Skill Gap Analysis
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground block">
            Your Current Skills (Comma-separated)
          </label>
          <input
            type="text"
            value={studentSkillsText}
            onChange={(e) => setStudentSkillsText(e.target.value)}
            placeholder="e.g. Python, SQL, Git, Figma, JavaScript"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-xs outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-xs text-destructive">
            <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Loading Steps screen */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="rounded-3xl border border-border/70 bg-card/65 p-8 shadow-card flex flex-col items-center justify-center text-center space-y-6 min-h-[300px]"
          >
            <div className="relative flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary animate-spin">
              <RefreshCw className="h-8 w-8" />
            </div>
            <div className="space-y-2 max-w-md">
              <h4 className="text-md font-bold text-foreground">Scraping Live Labor Market Data</h4>
              <p className="text-xs text-muted-foreground animate-pulse leading-relaxed">
                {loadingMessages[loadingStep]}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {loadingMessages.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 w-8 rounded-full transition-all duration-500 ${
                    idx <= loadingStep ? "bg-primary" : "bg-secondary"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis Results Display */}
      {results && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-8"
        >
          {results.is_simulated ? (
            <div className="flex items-start gap-2.5 p-4 rounded-xl border border-warning/20 bg-warning/10 text-xs text-warning">
              <Sparkles className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold block">Live Market Fetch Offline (Simulated Output)</span>
                <span>The live job search returned 0 postings (likely due to subscription limits or region matching). We have simulated a set of 15 current job postings for '{selectedPath}' in '{city || country}' using AI models to complete the gap analysis successfully.</span>
              </div>
            </div>
          ) : results.confidence_low && (
            <div className="flex items-start gap-2.5 p-4 rounded-xl border border-warning/20 bg-warning/10 text-xs text-warning">
              <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold block">Lower Sample Size Warning</span>
                <span>Fewer than 15 jobs were actively scraped for this query. Calculations are accurate based on the retrieved set, but broad confidence is reduced.</span>
              </div>
            </div>
          )}

          {/* Scores Overview Row */}
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="sm:col-span-2 rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <h4 className="text-md font-bold text-foreground">Real-Time Labor Market Summary</h4>
                <p className="text-xs text-muted-foreground">
                  Frequencies calculated directly from **{results.jobs_analyzed}** active job descriptions in **{city || country}** for **{selectedPath}**.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <CircularProgress
                  score={results.skill_match_score}
                  title="Skill Match Rating"
                  colorClass="stroke-primary"
                />
                <CircularProgress
                  score={results.career_readiness_score}
                  title="Career Readiness Score"
                  colorClass="stroke-success"
                />
              </div>
            </div>

            {/* Emerging Skills list */}
            <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-4">
              <h4 className="text-md font-bold text-foreground flex items-center gap-1.5 border-b border-border/40 pb-3">
                <TrendingUp className="h-4.5 w-4.5 text-primary" />
                Emerging Market Skills
              </h4>
              <p className="text-xs text-muted-foreground leading-normal">
                These technologies were observed appearing in early-stage postings. Worth monitoring:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {results.emerging_skills.length > 0 ? (
                  results.emerging_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded bg-secondary/80 text-muted-foreground text-[10px] font-semibold border border-border/30"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">None found in current dataset.</span>
                )}
              </div>
            </div>
          </div>

          {/* Top 10 Most Demanded Skills Visual Chart */}
          <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-4">
            <h4 className="text-md font-bold text-foreground flex items-center gap-1.5">
              <Layers className="h-4.5 w-4.5 text-primary" />
              Top 10 Most Demanded Skills (Labor Market share)
            </h4>
            <div className="space-y-3 pt-2">
              {results.top_skills.map((item) => (
                <div key={item.rank} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                    <span>
                      {item.rank}. {item.skill}
                    </span>
                    <span>{item.demand_pct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary/60 overflow-hidden">
                    <div
                      className="h-full bg-gradient-primary rounded-full"
                      style={{ width: `${item.demand_pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Skill Gaps Matrix Table */}
          <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-4 overflow-hidden">
            <h4 className="text-md font-bold text-foreground flex items-center gap-1.5">
              <ListTodo className="h-4.5 w-4.5 text-primary" />
              Complete Market Skills Comparison
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="pb-3 font-semibold">Skill</th>
                    <th className="pb-3 font-semibold text-center">Market Demand</th>
                    <th className="pb-3 font-semibold text-center">Priority</th>
                    <th className="pb-3 font-semibold text-center">You Possess</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {results.market_skills.map((item, idx) => (
                    <tr key={idx} className="hover:bg-secondary/10 transition-colors">
                      <td className="py-3 font-semibold text-foreground">{item.skill}</td>
                      <td className="py-3 text-center text-muted-foreground">{item.demand_pct}%</td>
                      <td className="py-3 text-center">
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                          item.importance === "Critical" ? "bg-destructive/10 text-destructive border-destructive/20" :
                          item.importance === "High" ? "bg-warning/10 text-warning border-warning/20" :
                          item.importance === "Medium" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                          "bg-primary/10 text-primary border-primary/20"
                        }`}>
                          {item.importance}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        {item.student_has ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-success mx-auto" />
                        ) : (
                          <XCircle className="h-4.5 w-4.5 text-muted-foreground/45 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Missing Skills Details Grid */}
          <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-4">
            <h4 className="text-md font-bold text-foreground flex items-center gap-1.5">
              <BookOpen className="h-4.5 w-4.5 text-primary" />
              Missing Skills — Career Impact & Learning Estimations
            </h4>
            <div className="grid gap-6 md:grid-cols-2">
              {results.missing_skills.length > 0 ? (
                results.missing_skills.slice(0, 6).map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-border/50 bg-background/40 space-y-3">
                    <div className="flex justify-between items-start">
                      <h5 className="text-xs font-bold text-foreground">{item.skill}</h5>
                      <span className="text-[10px] font-semibold text-primary">
                        Requires {item.learning_time}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.usage}
                    </p>
                    <div className="text-[10px] font-medium text-muted-foreground bg-secondary/35 p-2 rounded">
                      Required by **{item.jobs_count}** of the analyzed job postings ({item.demand_pct}% share).
                    </div>
                  </div>
                ))
              ) : (
                <div className="md:col-span-2 text-center py-6 text-xs text-muted-foreground">
                  Excellent! You possess all primary demanded skills in this category.
                </div>
              )}
            </div>
          </div>

          {/* Career Access Eligibility Impact */}
          {results.career_impact.length > 0 && (
            <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-4">
              <h4 className="text-md font-bold text-foreground flex items-center gap-1.5">
                <TrendingUp className="h-4.5 w-4.5 text-success" />
                Hiring Eligibility Impact (Career Access Increase)
              </h4>
              <p className="text-xs text-muted-foreground">
                See how acquiring each missing technology raises your probability of matching active listings.
              </p>
              <div className="grid gap-4 md:grid-cols-2 pt-2">
                {results.career_impact.map((impact, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-border/50 bg-background/40 space-y-3">
                    <div className="flex justify-between text-xs font-bold text-foreground">
                      <span>{impact.skill}</span>
                      <span className="flex items-center gap-1 text-success">
                        {impact.before_pct}% <ArrowRight className="h-3.5 w-3.5" /> {impact.after_pct}%
                      </span>
                    </div>
                    <div className="relative h-2 w-full rounded-full bg-secondary/60 overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full bg-muted-foreground/60 rounded-full"
                        style={{ width: `${impact.before_pct}%` }}
                      />
                      <div
                        className="absolute left-0 top-0 h-full bg-success rounded-full transition-all duration-1000"
                        style={{ width: `${impact.after_pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Learning this tool opens access to an additional **{impact.after_pct - impact.before_pct}%** of jobs.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Personalized Learning Roadmap timelines */}
          <div className="rounded-3xl border border-border/70 bg-card/65 p-6 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/30 pb-4">
              <h4 className="text-md font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="h-4.5 w-4.5 text-primary" />
                Custom Learning Roadmap
              </h4>
              
              <div className="flex rounded-xl bg-secondary/40 p-1 text-xs">
                {["weekly", "monthly", "quarterly"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveRoadmapTab(tab)}
                    className={`px-3 py-1.5 rounded-lg font-semibold uppercase tracking-wider text-[10px] transition-colors ${
                      activeRoadmapTab === tab ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {results.roadmap && results.roadmap[activeRoadmapTab]?.map((item, idx) => (
                <div key={idx} className="flex gap-4 items-start">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-foreground">{item.milestone}</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Final AI Summary Card */}
          <div className="rounded-3xl bg-gradient-primary/10 border border-primary/20 p-6 shadow-card space-y-4">
            <h4 className="text-md font-bold text-primary flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="h-4.5 w-4.5" />
              AI Summary & Career Action Plan
            </h4>
            <div className="grid gap-6 md:grid-cols-2 text-xs">
              <div className="space-y-3">
                <div>
                  <span className="font-bold text-foreground block mb-0.5">Current Strengths:</span>
                  <span className="text-muted-foreground leading-relaxed block">{results.final_summary.strengths}</span>
                </div>
                <div>
                  <span className="font-bold text-foreground block mb-0.5">Identified Gaps:</span>
                  <span className="text-muted-foreground leading-relaxed block">{results.final_summary.weaknesses}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="font-bold text-foreground block mb-0.5">Immediate Priority Skills:</span>
                  <span className="text-muted-foreground leading-relaxed block">{results.final_summary.priority_skills}</span>
                </div>
                <div>
                  <span className="font-bold text-foreground block mb-0.5">Observed Hiring Trends:</span>
                  <span className="text-muted-foreground leading-relaxed block">{results.final_summary.hiring_trends}</span>
                </div>
                <div>
                  <span className="font-bold text-foreground block mb-0.5">Recommended Actions:</span>
                  <span className="text-muted-foreground leading-relaxed block">{results.final_summary.next_actions}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
