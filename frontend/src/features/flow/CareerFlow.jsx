import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Sparkles, RefreshCw, AlertTriangle, X, Plus } from "lucide-react";
import { CareerReport } from "./CareerReport";
import { ProgressBar } from "./components";
import { initialAnswers, STEP_TITLES } from "./types";

export function CareerFlow({ user }) {
  const [step, setStep] = useState(-1); // -1: Landing Page, 0 to 4: Form steps
  const [answers, setAnswers] = useState(initialAnswers);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [customSkillInput, setCustomSkillInput] = useState("");
  const [customInterestInput, setCustomInterestInput] = useState("");
  const [restoring, setRestoring] = useState(true);

  // Restore previous session if career report exists in Supabase
  useEffect(() => {
    if (!user) {
      setRestoring(false);
      return;
    }
    const username = user.fullname || user.email;
    if (!username) {
      setRestoring(false);
      return;
    }

    const restoreSession = async () => {
      setRestoring(true);
      try {
        const url = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/auth/latest-report?username=${encodeURIComponent(username)}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.found && data.report) {
            if (data.report.answers) {
              setAnswers(data.report.answers);
            }
            if (data.report.analysis && data.report.jobs) {
              setResult({
                analysis: data.report.analysis,
                jobs: data.report.jobs
              });
              setSubmitted(true);
            }
          } else {
            // No previous report found for this user - reset submitted state so they can fill it
            setSubmitted(false);
            setResult(null);
          }
        }
      } catch (e) {
        console.error("Error restoring session:", e);
      } finally {
        setRestoring(false);
      }
    };

    restoreSession();
  }, [user]);


  const getSuggestedSkills = (degree) => {
    if (!degree) return ["Python", "Java", "SQL", "React", "Node", "Docker", "AWS", "TensorFlow", "Git"];
    const d = degree.toLowerCase();
    if (d.includes("engineering") || d.includes("tech") || d.includes("computers") || d.includes("c.a")) {
      return ["Python", "Java", "SQL", "React", "Node", "Docker", "AWS", "TensorFlow", "Git"];
    }
    if (d.includes("business") || d.includes("mba") || d.includes("finance") || d.includes("management")) {
      return ["Excel", "PowerPoint", "SQL", "Tableau", "Project Management", "SEO", "Financial Analysis", "Agile", "Scrum"];
    }
    if (d.includes("science") || d.includes("sc")) {
      return ["Python", "R", "MATLAB", "Data Analysis", "LaTeX", "SQL", "Statistics", "Research", "SPSS"];
    }
    if (d.includes("arts") || d.includes("humanities") || d.includes("design") || d.includes("writing")) {
      return ["Photoshop", "Illustrator", "Figma", "Copywriting", "SEO", "Video Editing", "UI Design", "Content Strategy", "Communication"];
    }
    return ["Python", "SQL", "Excel", "Communication", "Project Management", "Figma", "Git", "React", "SEO"];
  };

  const totalSteps = STEP_TITLES.length;

  const validateStep = (currentStep) => {
    const errors = {};
    if (currentStep === 0) {
      if (!answers.academic.degree.trim()) {
        errors.degree = "Degree or course is required";
      } else {
        const d = answers.academic.degree.toLowerCase();
        const isSchool = (
          d.includes("10th") ||
          d.includes("12th") ||
          d.includes("11th") ||
          d.includes("9th") ||
          d.includes("8th") ||
          d.includes("school") ||
          d.includes("ssc") ||
          d.includes("hsc") ||
          d.includes("std") ||
          d.includes("grade") ||
          d.includes("class") ||
          d.includes("intermediate")
        );

        if (!isSchool) {
          if (!answers.academic.current_year) errors.current_year = "Current academic year is required";
          const parsedCgpa = parseFloat(answers.academic.cgpa);
          if (isNaN(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 100) {
            errors.cgpa = "CGPA/Percentage must be a valid number between 0 and 100";
          }
        }
      }
    } else if (currentStep === 1) {
      if (answers.technical_skills.length === 0) {
        errors.skills = "Please select or add at least one technical skill";
      }
    } else if (currentStep === 2) {
      if (answers.interests.length === 0) {
        errors.interests = "Please select at least one area of interest";
      }
    } else if (currentStep === 3) {
      if (!answers.priority) {
        errors.priority = "Please choose a primary driver priority";
      }
    } else if (currentStep === 4) {
      if (!answers.location.country.trim()) errors.country = "Country is required";
      if (!answers.location.city.trim()) errors.city = "City is required";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      if (step < totalSteps - 1) {
        setStep((s) => s + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    setValidationErrors({});
    if (step > 0) setStep((s) => s - 1);
    else if (step === 0) setStep(-1);
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;

    setLoading(true);
    setLoadingMessage("Analyzing your technical profile and checking market databases...");
    setError(null);

    const messages = [
      "Querying Adzuna, JSearch, and Jooble for real-time market data...",
      "Mapping skills profile against live job requirements...",
      "Calculating compatibility indexes across 5 critical fits...",
      "Designing your personalized 7-phase learning roadmap...",
    ];
    let msgIdx = 0;
    const interval = setInterval(() => {
      setLoadingMessage(messages[msgIdx]);
      msgIdx = (msgIdx + 1) % messages.length;
    }, 2500);

    try {
      const degreeLower = (answers.academic.degree || "").toLowerCase();
      const isSchool = (
        degreeLower.includes("10th") ||
        degreeLower.includes("12th") ||
        degreeLower.includes("11th") ||
        degreeLower.includes("9th") ||
        degreeLower.includes("8th") ||
        degreeLower.includes("school") ||
        degreeLower.includes("ssc") ||
        degreeLower.includes("hsc") ||
        degreeLower.includes("std") ||
        degreeLower.includes("grade") ||
        degreeLower.includes("class") ||
        degreeLower.includes("intermediate")
      );

      const cleanedAcademic = { ...answers.academic };
      if (isSchool) {
        cleanedAcademic.current_year = "";
        cleanedAcademic.cgpa = 0.0;
      } else {
        cleanedAcademic.cgpa = parseFloat(answers.academic.cgpa) || 0.0;
      }

      const payload = {
        ...answers,
        academic: cleanedAcademic,
        candidate_name: user?.fullname || user?.email || "Student"
      };

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        let errorMsg = "Failed to analyze your career path.";
        if (errData?.detail) {
          if (typeof errData.detail === "string") {
            errorMsg = errData.detail;
          } else if (Array.isArray(errData.detail)) {
            errorMsg = errData.detail.map(e => `${e.loc.join('.')}: ${e.msg}`).join(", ");
          } else {
            errorMsg = JSON.stringify(errData.detail);
          }
        }
        throw new Error(errorMsg || `Server returned error status: ${response.status}`);
      }

      const res = await response.json();
      setResult(res);
      setSubmitted(true);
    } catch (err) {
      console.error("Error analyzing career path:", err);
      setError(err.message || "Failed to analyze your career path. Please check if your backend is running.");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  // Drag-to-rank Core Values
  const handleMoveValue = (index, direction) => {
    const newRanking = [...answers.values_ranking];
    if (direction === "up" && index > 0) {
      [newRanking[index], newRanking[index - 1]] = [newRanking[index - 1], newRanking[index]];
    } else if (direction === "down" && index < newRanking.length - 1) {
      [newRanking[index], newRanking[index + 1]] = [newRanking[index + 1], newRanking[index]];
    }
    setAnswers({ ...answers, values_ranking: newRanking });
  };

  // Toggle dynamic lists (Technical Skills and Interests)
  const handleToggleTechSkill = (skill) => {
    const isSelected = answers.technical_skills.includes(skill);
    if (isSelected) {
      setAnswers({
        ...answers,
        technical_skills: answers.technical_skills.filter((s) => s !== skill),
      });
    } else {
      setAnswers({
        ...answers,
        technical_skills: [...answers.technical_skills, skill],
      });
    }
  };

  const handleAddCustomSkill = () => {
    const skill = customSkillInput.trim();
    if (skill && !answers.technical_skills.includes(skill)) {
      setAnswers({
        ...answers,
        technical_skills: [...answers.technical_skills, skill],
      });
      setCustomSkillInput("");
    }
  };

  const handleToggleInterest = (interest) => {
    const isSelected = answers.interests.includes(interest);
    if (isSelected) {
      setAnswers({
        ...answers,
        interests: answers.interests.filter((i) => i !== interest),
      });
    } else {
      setAnswers({
        ...answers,
        interests: [...answers.interests, interest],
      });
    }
  };

  const handleAddCustomInterest = () => {
    const interest = customInterestInput.trim();
    if (interest && !answers.interests.includes(interest)) {
      setAnswers({
        ...answers,
        interests: [...answers.interests, interest],
      });
      setCustomInterestInput("");
    }
  };

  const handleToggleAntiGoal = (goal) => {
    const current = answers.anti_goals;
    if (current.includes(goal)) {
      setAnswers({
        ...answers,
        anti_goals: current.filter((g) => g !== goal),
      });
    } else {
      if (current.length < 2) {
        setAnswers({
          ...answers,
          anti_goals: [...current, goal],
        });
      }
    }
  };

  if (restoring) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-14 bg-background">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-border/60 bg-card/70 p-8 text-center shadow-card backdrop-blur-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-soft animate-spin">
            <RefreshCw className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground animate-pulse">
              Restoring session...
            </h2>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-14 bg-background">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-border/60 bg-card/70 p-8 text-center shadow-card backdrop-blur-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-soft animate-spin">
            <RefreshCw className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground animate-pulse">
              Mapping your potential...
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">{loadingMessage}</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-14 bg-background">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-destructive/20 bg-destructive/10 p-8 text-center shadow-card">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20 text-destructive animate-pulse">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Analysis Failed
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">{error}</p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 text-xs font-semibold text-primary-foreground shadow-soft transition-all"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Analysis
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setSubmitted(false);
              }}
              className="w-full text-xs text-muted-foreground hover:text-foreground font-medium py-2"
            >
              Go back to edit answers
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (submitted && result) {
    return (
      <main className="min-h-screen px-4 py-8 sm:py-14 max-w-5xl mx-auto">
        <CareerReport
          analysis={result.analysis}
          jobs={result.jobs}
          answers={answers}
          onRestart={() => {
            setSubmitted(false);
            setResult(null);
            setStep(-1);
            setAnswers(initialAnswers);
            setValidationErrors({});
          }}
        />
      </main>
    );
  }

  if (step === -1) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-14 bg-background">
        <div className="w-full max-w-2xl text-center space-y-8 rounded-3xl border border-border/60 bg-card/65 p-8 sm:p-12 shadow-card backdrop-blur-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-soft">
            <Sparkles className="h-8 w-8 animate-pulse" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
              Career Path Reality Checker
            </h1>
            <p className="max-w-md mx-auto text-muted-foreground text-sm sm:text-base leading-relaxed">
              Find work that fits your strengths, interests, and practical constraints. Powered by real-time labor market API data and dynamic AI progression roadmaps.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setStep(0)}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
            >
              Start Career Analysis
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:py-14 bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">Reality Checker</p>
            <p className="text-xs text-muted-foreground">Mapping matches backed by live data.</p>
          </div>
        </header>

        {/* Form step tracker indicator */}
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>{STEP_TITLES[step]}</span>
          <span>Section {step + 1} of {totalSteps}</span>
        </div>

        <section className="rounded-3xl border border-border/60 bg-card/75 p-6 shadow-card backdrop-blur-sm sm:p-9">
          <div className="space-y-6">
            
            {/* Step 0: Academic Profile */}
            {step === 0 && (
              <div className="space-y-4">
                <h3 className="text-md font-bold text-foreground border-b border-border/20 pb-2">Academic Profile</h3>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground block">Degree / Course</label>
                  <input
                    type="text"
                    value={answers.academic.degree}
                    onChange={(e) => setAnswers({
                      ...answers,
                      academic: { ...answers.academic, degree: e.target.value }
                    })}
                    placeholder="e.g. B.Tech Computer Science, B.Com, 12th Standard, 10th Standard"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-xs outline-none focus:border-primary text-foreground"
                  />
                  {validationErrors.degree && <p className="text-[10px] text-destructive font-bold">{validationErrors.degree}</p>}
                </div>

                {!(() => {
                  const d = (answers.academic.degree || "").toLowerCase();
                  return (
                    d.includes("10th") ||
                    d.includes("12th") ||
                    d.includes("11th") ||
                    d.includes("9th") ||
                    d.includes("8th") ||
                    d.includes("school") ||
                    d.includes("ssc") ||
                    d.includes("hsc") ||
                    d.includes("std") ||
                    d.includes("grade") ||
                    d.includes("class") ||
                    d.includes("intermediate")
                  );
                })() && (
                  <>
                    <div className="space-y-1.5 animate-in fade-in-50">
                      <label className="text-xs font-bold text-muted-foreground block">Current Year</label>
                      <select
                        value={answers.academic.current_year}
                        onChange={(e) => setAnswers({
                          ...answers,
                          academic: { ...answers.academic, current_year: e.target.value }
                        })}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-xs outline-none focus:border-primary text-foreground"
                      >
                        <option value="">Select Year...</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                        <option value="graduated">Graduated</option>
                      </select>
                      {validationErrors.current_year && <p className="text-[10px] text-destructive font-bold">{validationErrors.current_year}</p>}
                    </div>

                    <div className="space-y-1.5 animate-in fade-in-50">
                      <label className="text-xs font-bold text-muted-foreground block">CGPA or Percentage</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={answers.academic.cgpa}
                        onChange={(e) => setAnswers({
                          ...answers,
                          academic: { ...answers.academic, cgpa: e.target.value }
                        })}
                        placeholder="e.g. 8.5 (or 85%)"
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-xs outline-none focus:border-primary text-foreground"
                      />
                      {validationErrors.cgpa && <p className="text-[10px] text-destructive font-bold">{validationErrors.cgpa}</p>}
                    </div>
                  </>
                )}
              </div>
            )}


            {/* Step 1: Technical Skills */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/20 pb-2">
                  <h3 className="text-md font-bold text-foreground">Technical Skills</h3>
                  <span className="text-[9px] font-bold text-primary uppercase">Select or add skills</span>
                </div>

                {validationErrors.skills && (
                  <p className="text-[10px] text-destructive font-bold">{validationErrors.skills}</p>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  {getSuggestedSkills(answers.academic.degree).map((skill) => {
                    const isSelected = answers.technical_skills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => handleToggleTechSkill(skill)}
                        className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all border ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-soft"
                            : "bg-background border-border/60 hover:border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {skill}
                      </button>
                    );
                  })}
                </div>

                {/* Custom skill add input block */}
                <div className="space-y-1.5 pt-4">
                  <label className="text-xs font-bold text-muted-foreground block">Add Custom Skill</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customSkillInput}
                      onChange={(e) => setCustomSkillInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCustomSkill()}
                      placeholder="e.g. Kubernetes, Flutter, Django"
                      className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-xs outline-none focus:border-primary text-foreground"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSkill}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-secondary px-4 text-xs font-bold text-foreground hover:bg-secondary-hover transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
                  </div>
                </div>

                {/* Added custom skills list */}
                {answers.technical_skills.filter(s => !getSuggestedSkills(answers.academic.degree).includes(s)).length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Custom Skills Added</label>
                    <div className="flex flex-wrap gap-1.5">
                      {answers.technical_skills
                        .filter(s => !getSuggestedSkills(answers.academic.degree).includes(s))
                        .map((s) => (
                           <span
                             key={s}
                             className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary/40 text-xs font-bold text-foreground border border-border/40"
                           >
                             {s}
                             <X className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground" onClick={() => handleToggleTechSkill(s)} />
                           </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Interests */}
            {step === 2 && (
              <div className="space-y-5">
                <h3 className="text-md font-bold text-foreground border-b border-border/20 pb-2">Interests & Direction</h3>
                
                {validationErrors.interests && (
                  <p className="text-[10px] text-destructive font-bold">{validationErrors.interests}</p>
                )}

                {/* Custom interest add input block */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground block">Add Your Areas of Interest / Course Domains</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customInterestInput}
                      onChange={(e) => setCustomInterestInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCustomInterest()}
                      placeholder="e.g. Artificial Intelligence, Data Science, Blockchains, UI/UX Research"
                      className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-xs outline-none focus:border-primary text-foreground"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomInterest}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-secondary px-4 text-xs font-bold text-foreground hover:bg-secondary-hover transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
                  </div>
                </div>

                {/* Added interests list */}
                {answers.interests.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Your Interests</label>
                    <div className="flex flex-wrap gap-1.5">
                      {answers.interests.map((i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary/40 text-xs font-bold text-foreground border border-border/40"
                        >
                          {i}
                          <X className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground" onClick={() => handleToggleInterest(i)} />
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 border-t border-border/30 pt-4">
                  <label className="text-xs font-bold text-muted-foreground block">Preferred Career Path (Optional)</label>
                  <select
                    value={answers.preferred_career}
                    onChange={(e) => setAnswers({ ...answers, preferred_career: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-xs outline-none focus:border-primary text-foreground"
                  >
                    <option value="">Select Preferred Career Path...</option>
                    <option value="AI Engineer">AI Engineer</option>
                    <option value="ML Engineer">ML Engineer</option>
                    <option value="Backend Developer">Backend Developer</option>
                    <option value="Data Scientist">Data Scientist</option>
                    <option value="Cloud Engineer">Cloud Engineer</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 3: Core Values & Priority */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-md font-bold text-foreground border-b border-border/20 pb-2">Core Values Trade-offs</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Arrange from highest priority (top) to lowest (bottom) to define your required trade-offs.
                  </p>
                  
                  <div className="space-y-2 pt-2">
                    {answers.values_ranking.map((val, idx) => (
                      <div
                        key={val}
                        className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-background/50 text-xs font-bold text-foreground shadow-sm"
                      >
                        <span className="capitalize">{val}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveValue(idx, "up")}
                            disabled={idx === 0}
                            className="p-1.5 px-3 hover:bg-secondary rounded text-[10px] disabled:opacity-30 border border-border/20 text-muted-foreground hover:text-foreground"
                          >
                            ▲ Up
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveValue(idx, "down")}
                            disabled={idx === answers.values_ranking.length - 1}
                            className="p-1.5 px-3 hover:bg-secondary rounded text-[10px] disabled:opacity-30 border border-border/20 text-muted-foreground hover:text-foreground"
                          >
                            ▼ Down
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-border/30 pt-4">
                  <label className="text-xs font-bold text-muted-foreground block">Primary Career Priority Driver</label>
                  <select
                    value={answers.priority}
                    onChange={(e) => setAnswers({ ...answers, priority: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-xs outline-none focus:border-primary text-foreground"
                  >
                    <option value="">Select Driver...</option>
                    <option value="salary">Highest salary</option>
                    <option value="speed">Fastest placement</option>
                    <option value="growth">Long-term growth</option>
                    <option value="balance">Work-life balance</option>
                  </select>
                  {validationErrors.priority && <p className="text-[10px] text-destructive font-bold">{validationErrors.priority}</p>}
                </div>
              </div>
            )}

            {/* Step 4: Practical Constraints & Anti-Goals */}
            {step === 4 && (
              <div className="space-y-6">
                <h3 className="text-md font-bold text-foreground border-b border-border/20 pb-2">Practical Constraints</h3>
                
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground block">Country</label>
                    <select
                      value={answers.location.country}
                      onChange={(e) => setAnswers({
                        ...answers,
                        location: { ...answers.location, country: e.target.value }
                      })}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-xs outline-none focus:border-primary text-foreground"
                    >
                      <option value="">Select Country...</option>
                      <option value="United States">United States</option>
                      <option value="India">India</option>
                      <option value="Canada">Canada</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Singapore">Singapore</option>
                      <option value="Germany">Germany</option>
                      <option value="Australia">Australia</option>
                      <option value="Other">Other</option>
                    </select>
                    {validationErrors.country && <p className="text-[10px] text-destructive font-bold">{validationErrors.country}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground block">City</label>
                    <input
                      type="text"
                      value={answers.location.city}
                      onChange={(e) => setAnswers({
                        ...answers,
                        location: { ...answers.location, city: e.target.value }
                      })}
                      placeholder="e.g. San Francisco, Mumbai, London"
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-xs outline-none focus:border-primary text-foreground"
                    />
                    {validationErrors.city && <p className="text-[10px] text-destructive font-bold">{validationErrors.city}</p>}
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={answers.location.remote_ok}
                        onChange={(e) => setAnswers({
                          ...answers,
                          location: { ...answers.location, remote_ok: e.target.checked }
                        })}
                        className="accent-primary h-4 w-4 rounded"
                      />
                      <span>Open to remote opportunities</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2 border-t border-border/30 pt-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground block">Anti-Goals (Cuts out poor fits)</label>
                    <span className="text-[9px] font-bold text-primary block uppercase">Select Max 2</span>
                  </div>
                  
                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 pt-2">
                    {[
                      ["job_insecurity", "Job insecurity"],
                      ["underpaid", "Being underpaid"],
                      ["work_life_imbalance", "Work-life imbalance"],
                      ["no_growth_potential", "No growth potential"],
                      ["meaningless_work", "Work that feels meaningless"],
                      ["too_little_people", "Too little people-interaction"],
                      ["too_much_people", "Too much people-interaction"]
                    ].map(([key, label]) => {
                      const isSelected = answers.anti_goals.includes(key);
                      const isDisabled = !isSelected && answers.anti_goals.length >= 2;
                      return (
                        <label
                          key={key}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary/40 bg-primary/5 text-foreground"
                              : isDisabled
                              ? "opacity-40 cursor-not-allowed border-border/40 bg-background/20"
                              : "border-border/60 bg-background/30 hover:border-border hover:bg-background/50 text-muted-foreground"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isDisabled}
                            onChange={() => handleToggleAntiGoal(key)}
                            className="accent-primary"
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-10 flex items-center justify-between gap-3 border-t border-border/60 pt-6">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-7 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
            >
              {step < totalSteps - 1 ? (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Submit Analysis
                  <Check className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
