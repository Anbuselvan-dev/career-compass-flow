import { motion, AnimatePresence } from "motion/react";
import { OptionGrid, QuestionCard, TextField } from "./components";

// ---------- Page 1 ----------
export function Step1BasicInfo({ answers, setAnswers }) {
  const { basicInfo } = answers;
  const set = (patch) => setAnswers((p) => ({ ...p, basicInfo: { ...p.basicInfo, ...patch } }));

  return (
    <div className="space-y-8">
      <QuestionCard
        question="What should we call you?"
        explainer="Just a first name is fine — we like keeping this human."
      >
        <TextField
          value={basicInfo.name}
          onChange={(v) => set({ name: v })}
          placeholder="Your name"
        />
      </QuestionCard>

      <QuestionCard
        question="How do you identify?"
        explainer="Only used to make our language feel personal, never to filter suggestions."
      >
        <OptionGrid
          value={basicInfo.gender}
          onChange={(v) => set({ gender: v })}
          options={[
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
            { value: "non-binary", label: "Non-binary" },
            { value: "prefer-not", label: "Prefer not to say" },
          ]}
          otherLabel="Self-describe"
          otherPlaceholder="How you'd describe yourself"
        />
      </QuestionCard>

      <QuestionCard
        question="What's your age range?"
        explainer="Different life stages open different doors — this helps us stay realistic."
      >
        <OptionGrid
          value={basicInfo.ageRange}
          onChange={(v) => set({ ageRange: v })}
          options={[
            { value: "<18", label: "Under 18" },
            { value: "18-22", label: "18 – 22" },
            { value: "23-27", label: "23 – 27" },
            { value: "28-35", label: "28 – 35" },
            { value: "36+", label: "36+" },
          ]}
          otherLabel="Other — type your own"
        />
      </QuestionCard>
    </div>
  );
}

// ---------- Page 2 ----------
export function Step2Education({ answers, setAnswers }) {
  const { education } = answers;
  const set = (patch) => setAnswers((p) => ({ ...p, education: { ...p.education, ...patch } }));

  const droppedOut =
    education.status === "dropped-school" || education.status === "dropped-college";
  const showField = education.status !== "" && education.status !== "in-school";

  return (
    <div className="space-y-8">
      <QuestionCard
        question="Where are you in your education right now?"
        explainer="This is a snapshot, not a label — paths in and out of school are all valid."
      >
        <OptionGrid
          value={education.status}
          onChange={(v) => set({ status: v })}
          options={[
            { value: "in-school", label: "In school" },
            { value: "in-college", label: "In college / university" },
            { value: "graduated", label: "Graduated" },
            { value: "dropped-school", label: "Dropped out of school" },
            { value: "dropped-college", label: "Dropped out of college" },
          ]}
        />
      </QuestionCard>

      <AnimatePresence>
        {droppedOut && (
          <motion.div
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-2xl border border-accent/50 bg-accent/25 px-5 py-4 text-sm text-accent-foreground"
          >
            No judgment here — plenty of successful paths don't follow a straight line. This just
            helps us tailor suggestions better.
          </motion.div>
        )}
      </AnimatePresence>

      {showField && (
        <QuestionCard
          question="What field or stream are you focused on?"
          explainer="Even if you've moved on from it, it still shapes how you think."
        >
          <OptionGrid
            value={education.fieldOfStudy}
            onChange={(v) => set({ fieldOfStudy: v })}
            options={[
              { value: "science", label: "Science" },
              { value: "commerce", label: "Commerce" },
              { value: "arts", label: "Arts / Humanities" },
              { value: "vocational", label: "Vocational / Technical" },
            ]}
          />
        </QuestionCard>
      )}

      <QuestionCard
        question="What kind of place did (or do) you study at?"
        explainer="Institutions shape habits — a data point, not a judgment."
      >
        <OptionGrid
          value={education.institutionType}
          onChange={(v) => set({ institutionType: v })}
          options={[
            { value: "public", label: "Public / Government" },
            { value: "private", label: "Private" },
            { value: "online", label: "Online / Distance" },
            { value: "homeschool", label: "Homeschooled" },
          ]}
        />
      </QuestionCard>
    </div>
  );
}

// ---------- Page 3 ----------
export function Step3Work({ answers, setAnswers }) {
  const { workExperience } = answers;
  const set = (patch) =>
    setAnswers((p) => ({ ...p, workExperience: { ...p.workExperience, ...patch } }));

  const hasWork =
    workExperience.hasExperience === "yes" ||
    workExperience.hasExperience === "freelance" ||
    workExperience.hasExperience === "current";

  return (
    <div className="space-y-8">
      <QuestionCard
        question="Have you worked before?"
        explainer="Any kind counts — internships, side gigs, family businesses, the lot."
      >
        <OptionGrid
          value={workExperience.hasExperience}
          onChange={(v) => set({ hasExperience: v })}
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "freelance", label: "Some freelance / internship" },
            { value: "current", label: "Currently working" },
          ]}
        />
      </QuestionCard>

      <AnimatePresence>
        {hasWork && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            <QuestionCard
              question="How much of it, roughly?"
              explainer="Years matter less than what you learned — this just adds context."
            >
              <OptionGrid
                value={workExperience.years}
                onChange={(v) => set({ years: v })}
                options={[
                  { value: "<1", label: "Less than a year" },
                  { value: "1-3", label: "1 – 3 years" },
                  { value: "3-5", label: "3 – 5 years" },
                  { value: "5+", label: "5+ years" },
                ]}
              />
            </QuestionCard>

            <QuestionCard
              question="What kind of work was it?"
              explainer="Even short experiences tell us what environments you've tasted."
            >
              <OptionGrid
                value={workExperience.type}
                onChange={(v) => set({ type: v })}
                options={[
                  { value: "technical", label: "Technical / Engineering" },
                  { value: "creative", label: "Creative" },
                  { value: "business", label: "Business / Management" },
                  { value: "service", label: "Service / Support" },
                ]}
              />
            </QuestionCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- Page 4 ----------
export function Step4Strengths({ answers, setAnswers }) {
  const { strengthsInterests } = answers;
  const set = (patch) =>
    setAnswers((p) => ({
      ...p,
      strengthsInterests: { ...p.strengthsInterests, ...patch },
    }));

  return (
    <div className="space-y-8">
      <QuestionCard
        question="Which of these feels most like you?"
        explainer="This isn't a test — just pick what feels most natural to how you think."
      >
        <OptionGrid
          value={strengthsInterests.primaryStrength}
          onChange={(v) => set({ primaryStrength: v })}
          options={[
            { value: "problem-solving", label: "Problem solving" },
            { value: "analytical", label: "Logical / Analytical thinking" },
            { value: "creative", label: "Creative thinking" },
            { value: "people", label: "People / Communication skills" },
          ]}
        />
      </QuestionCard>

      <QuestionCard
        question="What kind of tasks actually energize you?"
        explainer="Notice the ones you'd happily lose track of time doing."
      >
        <OptionGrid
          value={strengthsInterests.energizingTasks}
          onChange={(v) => set({ energizingTasks: v })}
          options={[
            { value: "puzzles", label: "Solving puzzles / challenges" },
            { value: "building", label: "Building or creating things" },
            { value: "helping", label: "Helping / talking to people" },
            { value: "organizing", label: "Organizing / planning" },
          ]}
        />
      </QuestionCard>
    </div>
  );
}

// ---------- Page 5 ----------
export function Step5Satisfaction({ answers, setAnswers }) {
  const { satisfaction } = answers;
  const set = (patch) =>
    setAnswers((p) => ({ ...p, satisfaction: { ...p.satisfaction, ...patch } }));

  return (
    <div className="space-y-8">
      <QuestionCard
        question="What matters most to you while you're working?"
        explainer="Career fit isn't just the job — it's how the day feels once you're in it."
      >
        <OptionGrid
          value={satisfaction.duringWork}
          onChange={(v) => set({ duringWork: v })}
          options={[
            { value: "autonomy", label: "Autonomy / Independence" },
            { value: "teamwork", label: "Teamwork & collaboration" },
            { value: "creative-freedom", label: "Creative freedom" },
            { value: "structure", label: "Clear structure & routine" },
          ]}
        />
      </QuestionCard>

      <QuestionCard
        question="And what matters most outside of work?"
        explainer="The life around the job is usually what makes or breaks it."
      >
        <OptionGrid
          value={satisfaction.afterWork}
          onChange={(v) => set({ afterWork: v })}
          options={[
            { value: "balance", label: "Work-life balance" },
            { value: "stability", label: "Financial stability" },
            { value: "growth", label: "Career growth opportunities" },
            { value: "peace", label: "Low stress / mental peace" },
          ]}
        />
      </QuestionCard>
    </div>
  );
}

// ---------- Page 6 ----------
export function Step6Preferred({ answers, setAnswers }) {
  const { preferredRole } = answers;
  const set = (patch) =>
    setAnswers((p) => ({ ...p, preferredRole: { ...p.preferredRole, ...patch } }));

  return (
    <div className="space-y-8">
      <QuestionCard
        question="Do you already have a specific role or field in mind?"
        explainer="Totally optional — a hunch is enough to steer us a little."
      >
        <TextField
          value={preferredRole.freeText}
          onChange={(v) => set({ freeText: v })}
          placeholder="e.g. product design, teaching kids, running my own café…"
        />
      </QuestionCard>

      <QuestionCard
        question="Or pick a broad area that sounds like your kind of world."
        explainer="No pressure to commit — this is just a starting compass."
      >
        <OptionGrid
          value={preferredRole.category}
          onChange={(v) => set({ category: v })}
          options={[
            { value: "tech", label: "Tech" },
            { value: "creative", label: "Creative" },
            { value: "business", label: "Business" },
            { value: "healthcare-science", label: "Healthcare / Science" },
          ]}
        />
      </QuestionCard>
    </div>
  );
}

// ---------- Page 7 ----------
const COGNITIVE_OPTIONS = [
  { value: "adhd", label: "ADHD traits" },
  { value: "autism", label: "Autism spectrum traits" },
  { value: "high-energy", label: "High energy / hyperactivity" },
  { value: "prefer-not", label: "Prefer not to share" },
];

export function Step7Cognitive({ answers, setAnswers }) {
  const { cognitiveProfile } = answers;
  const selections = cognitiveProfile.selections;
  const otherValue = selections.find(
    (s) => !COGNITIVE_OPTIONS.some((o) => o.value === s) && s !== "other",
  );

  const toggle = (v) => {
    setAnswers((p) => {
      const cur = p.cognitiveProfile.selections;
      const next = cur.includes(v)
        ? cur.filter((x) => x !== v)
        : [...cur.filter((x) => x !== "prefer-not" || v === "prefer-not"), v];
      // if prefer-not selected, keep only it
      const filtered = v === "prefer-not" && !cur.includes("prefer-not") ? ["prefer-not"] : next;
      return {
        ...p,
        cognitiveProfile: { selections: filtered, skipped: false },
      };
    });
  };

  const setOtherText = (text) => {
    setAnswers((p) => {
      const cleaned = p.cognitiveProfile.selections.filter(
        (s) => s === "other" || COGNITIVE_OPTIONS.some((o) => o.value === s),
      );
      const withoutOther = cleaned.filter((s) => s !== "other");
      return {
        ...p,
        cognitiveProfile: {
          selections: text ? [...withoutOther, text] : [...withoutOther, "other"],
          skipped: false,
        },
      };
    });
  };

  const skip = () => {
    setAnswers((p) => ({
      ...p,
      cognitiveProfile: { selections: [], skipped: true },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-accent/40 bg-accent/20 px-5 py-4 text-sm text-accent-foreground">
        This section is completely optional. Understanding how your mind naturally works can help us
        suggest environments where you'll genuinely thrive — not just perform.
      </div>

      <button
        type="button"
        onClick={skip}
        className={`w-full rounded-2xl border-2 border-dashed px-5 py-3 text-sm font-medium transition-all ${
          cognitiveProfile.skipped
            ? "border-primary bg-primary/5 text-foreground"
            : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
        }`}
      >
        {cognitiveProfile.skipped ? "Skipped — thanks, moving on" : "Skip this section"}
      </button>

      {!cognitiveProfile.skipped && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Pick any that resonate — self-identified only, no follow-ups.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {COGNITIVE_OPTIONS.map((o) => {
              const selected = selections.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggle(o.value)}
                  className={`flex items-center gap-3 rounded-2xl border bg-card px-5 py-4 text-left text-[15px] font-medium transition-all hover:-translate-y-0.5 hover:shadow-soft ${
                    selected
                      ? "border-primary bg-primary/5 shadow-soft ring-2 ring-primary/20"
                      : "border-border/70 hover:border-primary/40"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                    }`}
                  >
                    {selected && "✓"}
                  </span>
                  {o.label}
                </button>
              );
            })}
          </div>

          <div className="pt-2">
            <label className="mb-2 block text-sm font-medium text-foreground/80">
              Other — describe in your own words
            </label>
            <input
              value={otherValue ?? ""}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-[15px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Page 8 ----------
export function Step8Character({ answers, setAnswers }) {
  const set = (v) => setAnswers((p) => ({ ...p, coreCharacter: { openResponse: v } }));

  return (
    <div className="space-y-6">
      <QuestionCard
        question="In your own words — what's something about how you work or think that you wish more people understood?"
        explainer="This is the part checkboxes can't reach. Say it however feels right."
      >
        <TextField
          multiline
          rows={6}
          value={answers.coreCharacter.openResponse}
          onChange={set}
          placeholder="e.g. I'm slow to start but very hard to stop once I'm in. I need to see the whole picture before I care about the pieces…"
        />
      </QuestionCard>
      <p className="text-xs text-muted-foreground">Optional — leave blank if you'd rather not.</p>
    </div>
  );
}
