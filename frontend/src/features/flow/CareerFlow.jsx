import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Pencil, Sparkles, RefreshCw } from "lucide-react";
import { ProgressBar, StepFrame } from "./components";
import {
  Step1BasicInfo,
  Step2Education,
  Step3Work,
  Step4Strengths,
  Step5Satisfaction,
  Step6Preferred,
  Step7Cognitive,
  Step8Character,
} from "./steps";
import { initialAnswers, STEP_TITLES } from "./types";
import { CareerReport } from "./CareerReport";
import { getMockAnalysis, getMockJobs } from "./mockData";

const STEP_SUBTITLES = [
  "A few quick things so we can talk to you like a person, not a form.",
  "Where you've been learning — and how — colors what fits next.",
  "Any work you've done, however small, is a real data point.",
  "How your brain likes to spend its energy.",
  "What a good day looks like, both on and off the clock.",
  "Bring your own idea, or borrow a starting direction.",
  "Optional. Your wiring, in your words.",
  "One open question. No word count, no wrong answer.",
];

export function CareerFlow() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(initialAnswers);
  const [submitted, setSubmitted] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [result, setResult] = useState(null);

  const totalSteps = STEP_TITLES.length;

  const canProceed = useMemo(() => {
    switch (step) {
      case 0:
        return (
          !!answers.basicInfo.name.trim() &&
          !!answers.basicInfo.gender &&
          !!answers.basicInfo.ageRange
        );
      case 1: {
        const e = answers.education;
        if (!e.status || !e.institutionType) return false;
        if (e.status !== "in-school" && !e.fieldOfStudy) return false;
        return true;
      }
      case 2: {
        const w = answers.workExperience;
        if (!w.hasExperience) return false;
        if (w.hasExperience !== "no" && (!w.years || !w.type)) return false;
        return true;
      }
      case 3:
        return (
          !!answers.strengthsInterests.primaryStrength &&
          !!answers.strengthsInterests.energizingTasks
        );
      case 4:
        return !!answers.satisfaction.duringWork && !!answers.satisfaction.afterWork;
      case 5:
        return !!answers.preferredRole.freeText.trim() || !!answers.preferredRole.category;
      case 6:
        return answers.cognitiveProfile.skipped || answers.cognitiveProfile.selections.length > 0;
      case 7:
        return true; // optional
      case 8:
        return true;
      default:
        return false;
    }
  }, [step, answers]);

  const handleNext = () => {
    if (step < totalSteps - 1) setStep((s) => s + 1);
  };
  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };
  const handleSubmit = async () => {
    setLoading(true);
    setLoadingMessage("Analyzing your responses and building your profile...");

    const messages = [
      "Extracting key cognitive strengths...",
      "Evaluating candidate matching criteria...",
      "Consulting historical industry trajectories...",
      "Searching job boards for live matching roles...",
      "Generating 5-year growth predictions...",
    ];
    let msgIdx = 0;
    const interval = setInterval(() => {
      setLoadingMessage(messages[msgIdx]);
      msgIdx = (msgIdx + 1) % messages.length;
    }, 2500);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(answers),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const res = await response.json();
      setResult(res);
      setSubmitted(true);
    } catch (error) {
      console.error("Error analyzing career path, running client-side fallback:", error);
      const fallbackAnalysis = getMockAnalysis(answers);
      const fallbackJobs = getMockJobs(fallbackAnalysis?.careerPaths?.[0]?.searchQuery);
      setResult({
        analysis: fallbackAnalysis,
        jobs: fallbackJobs,
      });
      setSubmitted(true);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-14">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-border/60 bg-card/70 p-8 text-center shadow-card backdrop-blur-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-soft animate-spin">
            <RefreshCw className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Mapping your potential...
            </h2>
            <p className="text-xs text-muted-foreground animate-pulse">{loadingMessage}</p>
          </div>
        </div>
      </main>
    );
  }

  if (submitted) {
    if (result) {
      return (
        <main className="min-h-screen px-4 py-8 sm:py-14 max-w-5xl mx-auto">
          <CareerReport
            analysis={result.analysis}
            jobs={result.jobs}
            onRestart={() => {
              setSubmitted(false);
              setResult(null);
              setStep(0);
              setAnswers(initialAnswers);
            }}
          />
        </main>
      );
    }
    return <SuccessView data={submitted} />;
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:py-14">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">Pathfinder</p>
            <p className="text-xs text-muted-foreground">A warmer way to find work that fits.</p>
          </div>
        </header>

        <ProgressBar current={step} total={totalSteps} titles={STEP_TITLES} />

        <section className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-card backdrop-blur-sm sm:p-9">
          <StepFrame
            stepKey={step}
            title={STEP_TITLES[step]}
            subtitle={step < 8 ? STEP_SUBTITLES[step] : "One last look before we call it done."}
          >
            {step === 0 && <Step1BasicInfo answers={answers} setAnswers={setAnswers} />}
            {step === 1 && <Step2Education answers={answers} setAnswers={setAnswers} />}
            {step === 2 && <Step3Work answers={answers} setAnswers={setAnswers} />}
            {step === 3 && <Step4Strengths answers={answers} setAnswers={setAnswers} />}
            {step === 4 && <Step5Satisfaction answers={answers} setAnswers={setAnswers} />}
            {step === 5 && <Step6Preferred answers={answers} setAnswers={setAnswers} />}
            {step === 6 && <Step7Cognitive answers={answers} setAnswers={setAnswers} />}
            {step === 7 && <Step8Character answers={answers} setAnswers={setAnswers} />}
            {step === 8 && <ReviewStep answers={answers} onJump={setStep} />}
          </StepFrame>

          <div className="mt-10 flex items-center justify-between gap-3 border-t border-border/60 pt-6">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 0}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            {step < totalSteps - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-7 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
              >
                Submit
                <Check className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Your answers stay on this device until you submit.
        </p>
      </div>
    </main>
  );
}

// ---------- Review ----------
function ReviewStep({ answers, onJump }) {
  const sections = [
    {
      step: 0,
      title: "The basics",
      rows: [
        ["Name", answers.basicInfo.name || "—"],
        ["Gender", answers.basicInfo.gender || "—"],
        ["Age range", answers.basicInfo.ageRange || "—"],
      ],
    },
    {
      step: 1,
      title: "Education",
      rows: [
        ["Status", answers.education.status || "—"],
        ["Field of study", answers.education.fieldOfStudy || "—"],
        ["Institution", answers.education.institutionType || "—"],
      ],
    },
    {
      step: 2,
      title: "Work experience",
      rows: [
        ["Has experience", answers.workExperience.hasExperience || "—"],
        ["Years", answers.workExperience.years || "—"],
        ["Type", answers.workExperience.type || "—"],
      ],
    },
    {
      step: 3,
      title: "Strengths & interests",
      rows: [
        ["Primary strength", answers.strengthsInterests.primaryStrength || "—"],
        ["Energizing tasks", answers.strengthsInterests.energizingTasks || "—"],
      ],
    },
    {
      step: 4,
      title: "What matters",
      rows: [
        ["While working", answers.satisfaction.duringWork || "—"],
        ["Outside work", answers.satisfaction.afterWork || "—"],
      ],
    },
    {
      step: 5,
      title: "A role in mind",
      rows: [
        ["In your words", answers.preferredRole.freeText || "—"],
        ["Broad area", answers.preferredRole.category || "—"],
      ],
    },
    {
      step: 6,
      title: "Cognitive profile",
      rows: [
        [
          "Selections",
          answers.cognitiveProfile.skipped
            ? "Skipped"
            : answers.cognitiveProfile.selections.join(", ") || "—",
        ],
      ],
    },
    {
      step: 7,
      title: "In your own words",
      rows: [["Response", answers.coreCharacter.openResponse || "—"]],
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Quick look. Tap edit on anything you'd like to change.
      </p>
      <div className="space-y-3">
        {sections.map((s) => (
          <div key={s.step} className="rounded-2xl border border-border/70 bg-background/60 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {s.title}
              </h4>
              <button
                type="button"
                onClick={() => onJump(s.step)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {s.rows.map(([k, v]) => (
                <div key={k} className="flex flex-col">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                  <dd className="mt-0.5 break-words text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Success ----------
function SuccessView({ data }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-14">
      <AnimatePresence>
        <motion.div
          key="success"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-xl space-y-6 rounded-3xl border border-border/60 bg-card p-8 text-center shadow-card sm:p-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.15 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-soft"
          >
            <Check className="h-7 w-7" strokeWidth={2.5} />
          </motion.div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Thanks{data.basicInfo.name ? `, ${data.basicInfo.name.split(" ")[0]}` : ""}.
            </h1>
            <p className="text-muted-foreground">
              We've got everything we need. Here's the snapshot we'll work from.
            </p>
          </div>
          <pre className="max-h-72 overflow-auto rounded-2xl border border-border/60 bg-background p-4 text-left text-xs leading-relaxed text-foreground/80">
            {JSON.stringify(data, null, 2)}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-sm font-medium text-primary hover:underline"
          >
            Start over
          </button>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
