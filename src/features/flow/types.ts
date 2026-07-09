export interface FlowAnswers {
  basicInfo: { name: string; gender: string; ageRange: string };
  education: { status: string; fieldOfStudy: string; institutionType: string };
  workExperience: { hasExperience: string; years: string; type: string };
  strengthsInterests: { primaryStrength: string; energizingTasks: string };
  satisfaction: { duringWork: string; afterWork: string };
  preferredRole: { freeText: string; category: string };
  cognitiveProfile: { selections: string[]; skipped: boolean };
  coreCharacter: { openResponse: string };
}

export const initialAnswers: FlowAnswers = {
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
