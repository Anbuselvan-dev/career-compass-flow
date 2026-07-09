export const initialAnswers = {
  basicInfo: { name: "", gender: "", ageRange: "" },
  education: { status: "", fieldOfStudy: "", institutionType: "" },
  workExperience: { hasExperience: "", years: "", type: "" },
  strengthsInterests: { primaryStrength: "", energizingTasks: "" },
  satisfaction: { duringWork: "", afterWork: "" },
  preferredRole: { freeText: "", category: "" },
  cognitiveProfile: { selections: [], skipped: false },
  coreCharacter: { openResponse: "" },
};

export const STEP_TITLES = [
  "The basics",
  "Your education",
  "Work experience",
  "Strengths & interests",
  "What matters to you",
  "A role in mind?",
  "How your mind works",
  "In your own words",
  "Review & submit",
];
