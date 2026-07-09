export function getMockAnalysis(answers) {
  const name = answers?.basicInfo?.name || "friend";
  const roleName = answers?.preferredRole?.freeText || "Creative Professional";

  return {
    summary: `Hello ${name}. Based on your cognitive strengths and background, you possess a versatile profile ideal for dynamic work environments. You thrive when balancing personal peace with meaningful problem-solving.`,
    careerPaths: [
      {
        title: roleName || "Full Stack Developer",
        matchScore: 92,
        salaryRange: "$85k - $125k",
        scope: "High",
        growthPercentage: 24,
        whyItFits:
          "Matches your focus on build tasks and problem-solving, aligning perfectly with your learning style.",
        searchQuery: roleName || "Developer",
      },
      {
        title: "Product Designer / UI/UX Analyst",
        matchScore: 84,
        salaryRange: "$75k - $110k",
        scope: "High",
        growthPercentage: 15,
        whyItFits:
          "Taps into your interest in helping people, design structure, and organizing user journeys.",
        searchQuery: "UI UX Designer",
      },
      {
        title: "Creative Systems Administrator",
        matchScore: 76,
        salaryRange: "$65k - $90k",
        scope: "Medium",
        growthPercentage: 11,
        whyItFits:
          "Balances clear project routines with autonomy, matching your preference for self-directed work.",
        searchQuery: "Systems Administrator",
      },
    ],
    growthOutlook: [
      { year: "2026", Path1: 100, Path2: 100, Path3: 100 },
      { year: "2027", Path1: 112, Path2: 106, Path3: 105 },
      { year: "2028", Path1: 126, Path2: 114, Path3: 112 },
      { year: "2029", Path1: 142, Path2: 125, Path3: 120 },
      { year: "2030", Path1: 160, Path2: 138, Path3: 128 },
    ],
    strengthsAlignment:
      "Your cognitive profile shows deep capacity for highly engaging, multi-faceted tasks. The structured yet flexible setup of developers/designers fits your need for creative freedom while providing clean, analytical benchmarks.",
    actionItems: [
      "Dedicate 1 hour daily to building personal portfolio items.",
      "Explore online bootcamps or specialized design courses to build technical credentials.",
      "Engage in community work or open-source projects to cultivate collaborative experience.",
    ],
  };
}

export function getMockJobs(query) {
  return [
    {
      title: `Junior ${query || "Developer"}`,
      company: "InnovateTech Inc.",
      location: "San Francisco, CA (Hybrid)",
      logo: null,
      url: "https://google.com/careers",
      posted: "2 days ago",
      matchScore: 94,
    },
    {
      title: `${query || "Designer"} Specialist`,
      company: "CreativeFlow Studio",
      location: "New York, NY (Remote)",
      logo: null,
      url: "https://google.com/careers",
      posted: "1 week ago",
      matchScore: 88,
    },
    {
      title: `Lead ${query || "Engineer"}`,
      company: "Pathfinder Systems",
      location: "Austin, TX (On-site)",
      logo: null,
      url: "https://google.com/careers",
      posted: "Just now",
      matchScore: 81,
    },
  ];
}
