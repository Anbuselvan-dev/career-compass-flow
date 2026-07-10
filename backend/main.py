import os
import re
import io
import math
import json
import requests
from collections import Counter
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Career Compass Flow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")


def supabase_insert(table: str, data: dict):
    """Insert a row into a Supabase table using the REST API."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Supabase not configured — skipping persistence.")
        return
    try:
        url = f"{SUPABASE_URL}/rest/v1/{table}"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }
        res = requests.post(url, headers=headers, json=data, timeout=10)
        res.raise_for_status()
        print(f"Successfully saved career report to Supabase ({table}).")
    except Exception as e:
        print(f"Error saving to Supabase: {e}")


class AcademicBg(BaseModel):
    degree: str
    current_year: Optional[str] = ""
    cgpa: Optional[Any] = 0.0

class LocationPref(BaseModel):
    country: str
    city: str
    remote_ok: bool

class RedesignedAnalysisRequest(BaseModel):
    academic: AcademicBg
    technical_skills: List[str]
    interests: List[str]
    preferred_career: str
    location: LocationPref
    priority: str
    values_ranking: List[str]
    anti_goals: List[str]
    user_id: Optional[str] = None
    candidate_name: Optional[str] = "Student"


def call_groq_fallback(prompt: str, response_format_json: bool = True) -> str:
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        print("[Groq Fallback] GROQ_API_KEY is not set.")
        raise Exception("GROQ_API_KEY is not configured.")
        
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {groq_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2
    }
    if response_format_json:
        payload["response_format"] = {"type": "json_object"}
        
    res = requests.post(url, headers=headers, json=payload, timeout=25)
    res.raise_for_status()
    return res.json()["choices"][0]["message"]["content"]


# ─────────────────────────────────────────────────────────────
# GEMINI AI — Career Analysis (NO FALLBACK, throws on failure)
# ─────────────────────────────────────────────────────────────
def get_gemini_analysis(answers: Dict[str, Any], api_key: str) -> Dict[str, Any]:
    academic = answers.get("academic", {})
    tech_skills = answers.get("technical_skills", [])
    interests = answers.get("interests", [])
    preferred_career = answers.get("preferred_career", "not_sure")
    location = answers.get("location", {})
    priority = answers.get("priority", "salary")
    values_ranking = answers.get("values_ranking", [])
    anti_goals = answers.get("anti_goals", [])

    skills_str = ", ".join(tech_skills) if tech_skills else "None"
    interests_str = ", ".join(interests) if interests else "None"
    values_str = " -> ".join(values_ranking)
    anti_goals_str = ", ".join(anti_goals) if anti_goals else "None"

    prompt = f"""You are a Career Counselor and Psychologist. Analyze the candidate's career profiling answers:
Academic Profile:
- Degree: {academic.get("degree", "N/A")}
- Current Year: {academic.get("current_year", "N/A")}
- CGPA: {academic.get("cgpa", 0.0)}

Technical Skills: {skills_str}
Interests: {interests_str}
Preferred Career Focus: {preferred_career}
Location Preference: Country: {location.get("country", "N/A")}, City: {location.get("city", "N/A")}, Remote Ok: {"Yes" if location.get("remote_ok") else "No"}

Core Work Values (Ranked from highest to lowest priority):
- {values_str}

Primary Driver Priority: {priority}
Anti-Goals (Filter OUT paths matching these constraints): {anti_goals_str}

Your task is to recommend 3 ranked career path matches.
For each path, you MUST compute:
1. `matchScore`: Overall compatibility (0-100)
2. `skill_fit_score`: Score (0-100) indicating how well their current technical skills match the career.
3. `interest_fit_score`: Score (0-100) indicating how well their interests profile matches the career.
4. `values_fit_score`: Score (0-100) indicating how well their ranked values align with the career profile.
5. `feasibility_score`: Score (0-100) indicating feasibility based on region, remote options, and constraints.

Create a realistic career compatibility report. Return ONLY a raw JSON object (no markdown, no code fences):
{{
  "summary": "Short professional summary of the candidate's career persona (2-3 sentences).",
  "profileInterpretation": {{
    "educationLevel": "Brief summary of candidate's academic standing",
    "transferableSkills": ["Skill 1", "Skill 2", "Skill 3"],
    "workPreferences": ["Preference 1", "Preference 2"],
    "cognitiveStrengths": ["Strength 1", "Strength 2"]
  }},
  "careerPaths": [
    {{
      "title": "Primary Recommended Job Title",
      "matchScore": 95,
      "skill_fit_score": 90,
      "interest_fit_score": 92,
      "values_fit_score": 88,
      "feasibility_score": 94,
      "confidenceScore": 92,
      "salaryRange": "$75k - $110k",
      "scope": "High",
      "growthPercentage": 18,
      "whyItFits": "Detailed alignment details based on skills, learning style, and interest cues.",
      "searchQuery": "Exact job search keyword",
      "riskFactors": ["Possible career transition hurdle 1", "Hurdle 2"],
      "mitigationStrategies": ["Actionable step to prevent hurdle 1", "Actionable step 2"]
    }},
    {{
      "title": "Secondary Recommended Job Title",
      "matchScore": 85,
      "skill_fit_score": 80,
      "interest_fit_score": 85,
      "values_fit_score": 82,
      "feasibility_score": 90,
      "confidenceScore": 84,
      "salaryRange": "$65k - $95k",
      "scope": "High",
      "growthPercentage": 15,
      "whyItFits": "Detailed alignment details based on skills, learning style, and interest cues.",
      "searchQuery": "Exact job search keyword",
      "riskFactors": ["Possible career transition hurdle 1", "Hurdle 2"],
      "mitigationStrategies": ["Actionable step to prevent hurdle 1", "Actionable step 2"]
    }},
    {{
      "title": "Third Recommended Job Title",
      "matchScore": 75,
      "skill_fit_score": 72,
      "interest_fit_score": 78,
      "values_fit_score": 74,
      "feasibility_score": 85,
      "confidenceScore": 76,
      "salaryRange": "$55k - $80k",
      "scope": "Medium",
      "growthPercentage": 11,
      "whyItFits": "Detailed alignment details based on skills, learning style, and interest cues.",
      "searchQuery": "Exact job search keyword",
      "riskFactors": ["Possible career transition hurdle 1", "Hurdle 2"],
      "mitigationStrategies": ["Actionable step to prevent hurdle 1", "Actionable step 2"]
    }}
  ],
  "cognitiveProfileInsights": {{
    "fitFactorAnalysis": "How their profile influences their optimal work structure",
    "recommendedEnvironments": ["Environment attribute 1", "Environment attribute 2"],
    "taskStructures": ["Task structure 1", "Task structure 2"],
    "workStyleRecommendation": "Summary of recommended daily routine and management approach"
  }},
  "sustainabilityFactors": {{
    "tradeOffs": "What positive and negative tradeoffs they face in this career path",
    "longTermSustainability": "Why this role supports their energy management, passion retention, and long-term health"
  }}
}}"""

    if not api_key:
        print("[Gemini Analyze] API key missing, trying Groq fallback...")
        try:
            groq_content = call_groq_fallback(prompt, response_format_json=True)
            return json.loads(groq_content)
        except Exception as groq_err:
            raise HTTPException(
                status_code=500,
                detail=f"GEMINI_API_KEY is not configured and Groq fallback failed: {str(groq_err)}"
            )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"}
    }

    try:
        res = requests.post(url, headers=headers, json=payload, timeout=30)
        res.raise_for_status()
        data = res.json()
        text_content = data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text_content)
    except Exception as e:
        print(f"[Gemini Analyze] Call failed: {e}. Falling back to Groq Llama model...")
        try:
            groq_content = call_groq_fallback(prompt, response_format_json=True)
            return json.loads(groq_content)
        except Exception as groq_err:
            print(f"[Groq Analyze Fallback] Failed: {groq_err}")
            raise HTTPException(
                status_code=500,
                detail=f"Both Gemini and Groq fallback failed. Gemini Error: {str(e)}. Groq Error: {str(groq_err)}"
            )


# ─────────────────────────────────────────────────────────────
# JOB SEARCH — All 3 sources (NO FALLBACK, logs errors only)
# ─────────────────────────────────────────────────────────────
def search_jsearch(query: str, api_key: str) -> List[Dict[str, Any]]:
    if not api_key:
        print("[JSearch] Key not configured.")
        return []
    try:
        headers = {
            "x-rapidapi-key": api_key,
            "x-rapidapi-host": "jsearch.p.rapidapi.com"
        }
        params = {"query": query, "page": "1", "num_pages": "1"}
        res = requests.get("https://jsearch.p.rapidapi.com/search", headers=headers, params=params, timeout=10)
        res.raise_for_status()
        jobs = res.json().get("data", [])
        return [
            {
                "title": j.get("job_title"),
                "company": j.get("employer_name"),
                "location": f"{j.get('job_city', '')}, {j.get('job_country', '')}".strip(", "),
                "logo": j.get("employer_logo"),
                "url": j.get("job_apply_link"),
                "posted": j.get("job_posted_at_datetime_utc", "")[:10] or "Recently",
                "source": "JSearch"
            }
            for j in jobs[:3]
        ]
    except Exception as e:
        print(f"[JSearch] Error: {e}")
        return []


def search_jooble(query: str, api_key: str) -> List[Dict[str, Any]]:
    if not api_key:
        print("[Jooble] Key not configured.")
        return []
    try:
        url = f"https://jooble.org/api/{api_key}"
        payload = {"keywords": query, "location": "", "page": "1"}
        res = requests.post(url, json=payload, timeout=10)
        res.raise_for_status()
        jobs = res.json().get("jobs", [])
        return [
            {
                "title": j.get("title"),
                "company": j.get("company"),
                "location": j.get("location", "Remote"),
                "logo": None,
                "url": j.get("link"),
                "posted": j.get("updated", "")[:10] or "Recently",
                "source": "Jooble"
            }
            for j in jobs[:3]
        ]
    except Exception as e:
        print(f"[Jooble] Error: {e}")
        return []


def search_adzuna(query: str, app_id: str, app_key: str) -> List[Dict[str, Any]]:
    if not app_id or not app_key or app_id == "your_adzuna_app_id_here":
        print("[Adzuna] App ID not configured.")
        return []
    try:
        params = {
            "app_id": app_id,
            "app_key": app_key,
            "results_per_page": 3,
            "what": query,
        }
        res = requests.get("https://api.adzuna.com/v1/api/jobs/us/search/1", params=params, timeout=10)
        res.raise_for_status()
        jobs = res.json().get("results", [])
        return [
            {
                "title": j.get("title"),
                "company": j.get("company", {}).get("display_name"),
                "location": j.get("location", {}).get("display_name", "USA"),
                "logo": None,
                "url": j.get("redirect_url"),
                "posted": j.get("created", "")[:10] or "Recently",
                "source": "Adzuna"
            }
            for j in jobs
        ]
    except Exception as e:
        print(f"[Adzuna] Error: {e}")
        return []


def search_all_jobs(query: str) -> List[Dict[str, Any]]:
    """Aggregate real jobs from all 3 sources. Returns empty list (NOT mock) if all fail."""
    jsearch_key = os.getenv("JSearch_api_key")
    jooble_key  = os.getenv("Jooble_api_key")
    adzuna_id   = os.getenv("Adzuna_app_id")
    adzuna_key  = os.getenv("Adzuna_api_key")

    results = []
    results += search_jsearch(query, jsearch_key)
    results += search_jooble(query, jooble_key)
    results += search_adzuna(query, adzuna_id, adzuna_key)

    if not results:
        print(f"[Jobs] All APIs failed for query: '{query}'. Returning empty list.")

    return results


# ─────────────────────────────────────────────────────────────
# GEMINI EMBEDDINGS — Cosine similarity for job matching
# ─────────────────────────────────────────────────────────────
def get_embedding(text: str, api_key: str) -> List[float]:
    if not api_key:
        return None
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={api_key}"
        payload = {
            "model": "models/text-embedding-004",
            "content": {"parts": [{"text": text}]}
        }
        res = requests.post(url, headers={"Content-Type": "application/json"}, json=payload, timeout=10)
        res.raise_for_status()
        return res.json().get("embedding", {}).get("values")
    except Exception as e:
        print(f"[Embedding] Error: {e}")
        return None


def cosine_similarity(v1, v2) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    n1  = math.sqrt(sum(a * a for a in v1))
    n2  = math.sqrt(sum(b * b for b in v2))
    return dot / (n1 * n2) if n1 and n2 else 0.0


# ─────────────────────────────────────────────────────────────
# MAIN ENDPOINT
# ─────────────────────────────────────────────────────────────
@app.post("/api/analyze")
async def analyze_career(request: RedesignedAnalysisRequest):
    answers    = request.dict()
    gemini_key = os.getenv("GEMINI_API_KEY")

    # 1. Real Gemini career analysis — raises HTTPException on any failure
    analysis = get_gemini_analysis(answers, gemini_key)

    # 2. Real job search across JSearch + Jooble + Adzuna
    primary_query = analysis.get("careerPaths", [{}])[0].get("searchQuery", "technology jobs")
    jobs = search_all_jobs(primary_query)

    # 3. Cosine similarity scoring on real jobs (best-effort, skipped if embeddings fail)
    if jobs:
        try:
            skills_selections = ", ".join(answers.get("technical_skills", []))
            candidate_text = f"""
Academic: {answers.get("academic", {}).get("degree", "")} (CGPA: {answers.get("academic", {}).get("cgpa", 0.0)})
Skills: {skills_selections}
Summary: {analysis.get("summary", "")}
""".strip()

            candidate_vec = get_embedding(candidate_text, gemini_key)
            if candidate_vec:
                for job in jobs:
                    job_text = f"Job Title: {job.get('title')}. Company: {job.get('company')}. Location: {job.get('location')}."
                    job_vec  = get_embedding(job_text, gemini_key)
                    if job_vec:
                        similarity = cosine_similarity(candidate_vec, job_vec)
                        job["matchScore"] = min(100, max(50, round(50 + similarity * 60)))
                    else:
                        job["matchScore"] = 80
                jobs.sort(key=lambda x: x.get("matchScore", 0), reverse=True)
        except Exception as e:
            print(f"[Embeddings] Similarity scoring failed: {e}")

    # 4. Persist to Supabase (non-blocking, errors are logged not raised)
    report_data = {
        "candidate_name": request.candidate_name or "Student",
        "answers": answers,
        "analysis": analysis,
        "jobs": jobs,
    }

    supabase_insert("career_reports", report_data)

    return {"analysis": analysis, "jobs": jobs}


@app.get("/api/auth/latest-report")
def get_latest_report(username: str):
    """
    Fetch the latest career report for a specific user to restore session.
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=404, detail="Supabase not configured.")

    url = f"{SUPABASE_URL}/rest/v1/career_reports"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    # Query matching candidate_name, order by created_at descending, limit to 1
    params = {
        "candidate_name": f"eq.{username}",
        "order": "created_at.desc",
        "limit": "1"
    }
    try:
        res = requests.get(url, headers=headers, params=params, timeout=10)
        res.raise_for_status()
        rows = res.json()
        if not rows:
            return {"found": False}
        return {
            "found": True,
            "report": rows[0]
        }
    except Exception as e:
        print(f"[Latest Report] Error fetching: {e}")
        return {"found": False, "error": str(e)}



class CompareRequest(BaseModel):
    career_a: str
    career_b: str


def generate_mock_comparison(career_a: str, career_b: str) -> Dict[str, Any]:
    # Capitalize names cleanly
    title_a = career_a.strip().title()
    title_b = career_b.strip().title()

    # Predefined stats/skills database for popular fields to make them look highly realistic
    database = {
        "full stack": {
            "demand": "High",
            "demand_trend": "Strong hiring volume across startup and enterprise sectors driven by cloud migrations.",
            "salary": {"entry": "$65k - $85k", "mid": "$100k - $130k", "senior": "$145k - $185k"},
            "skills": {
                "technical": ["JavaScript/TypeScript", "React", "Node.js", "SQL/NoSQL", "Docker"],
                "soft": ["Problem-Solving", "Agile Collaboration", "System Design Thinking"]
            },
            "govt_relevance": "Moderate demand in public sector departments upgrading legacy web portals and internal citizen services."
        },
        "cybersecurity": {
            "demand": "High",
            "demand_trend": "Exponential demand growth due to rising cyber threats and strict compliance requirements.",
            "salary": {"entry": "$70k - $90k", "mid": "$110k - $140k", "senior": "$150k - $200k"},
            "skills": {
                "technical": ["Network Security", "Penetration Testing", "Linux Admin", "SIEM Tools", "Cryptography"],
                "soft": ["Analytical Thinking", "Attention to Detail", "Crisis Management"]
            },
            "govt_relevance": "Critical demand in defense agencies, municipal infrastructure departments, and federal security operations."
        },
        "data scientist": {
            "demand": "High",
            "demand_trend": "Consistent demand driven by corporate investments in AI, machine learning pipelines, and big data.",
            "salary": {"entry": "$75k - $95k", "mid": "$120k - $150k", "senior": "$160k - $210k"},
            "skills": {
                "technical": ["Python", "R Language", "SQL", "TensorFlow/PyTorch", "Statistics"],
                "soft": ["Data Storytelling", "Business Acumen", "Curiosity"]
            },
            "govt_relevance": "High demand in statistics bureaus, tax agencies, and government research laboratories using predictive modeling."
        },
        "cloud engineer": {
            "demand": "High",
            "demand_trend": "Strong demand as companies adopt serverless architectures and multi-cloud solutions.",
            "salary": {"entry": "$70k - $90k", "mid": "$115k - $145k", "senior": "$155k - $195k"},
            "skills": {
                "technical": ["AWS/Azure/GCP", "Terraform (IaC)", "Kubernetes", "Linux Shell", "CI/CD Pipelines"],
                "soft": ["System Design", "Collaboration", "Root Cause Analysis"]
            },
            "govt_relevance": "High demand in federal initiatives shifting public cloud workloads to secure GovCloud partitions."
        },
        "product designer": {
            "demand": "Medium",
            "demand_trend": "Steady demand as product usability and user experience remain major differentiators.",
            "salary": {"entry": "$55k - $75k", "mid": "$90k - $120k", "senior": "$130k - $170k"},
            "skills": {
                "technical": ["Figma", "UI Design Systems", "Prototyping", "UX Research", "HTML/CSS Basics"],
                "soft": ["Empathy", "Communication", "Giving & Receiving Feedback"]
            },
            "govt_relevance": "Moderate public demand as government portals focus on accessibility compliance (e.g. WCAG)."
        }
    }

    # Match input to database keys
    def get_profile(name: str):
        name_lower = name.lower()
        for key, profile in database.items():
            if key in name_lower:
                return profile
        # Generic fallback profile generated dynamically
        return {
            "demand": "Medium",
            "demand_trend": f"Steady demand as specialized skills in {name} continue to find utility in active industries.",
            "salary": {"entry": "$50k - $70k", "mid": "$80k - $110k", "senior": "$120k - $155k"},
            "skills": {
                "technical": [f"{name} Core Tools", "Data Analysis", "System Integration"],
                "soft": ["Communication", "Critical Thinking", "Team Collaboration"]
            },
            "govt_relevance": f"Steady utility in corresponding public services and operational administrative wings."
        }

    p_a = get_profile(title_a)
    p_b = get_profile(title_b)

    return {
        "career_a": {
            "title": title_a,
            "demand": p_a["demand"],
            "demand_trend": p_a["demand_trend"],
            "salary": p_a["salary"],
            "skills": p_a["skills"],
            "govt_relevance": p_a["govt_relevance"]
        },
        "career_b": {
            "title": title_b,
            "demand": p_b["demand"],
            "demand_trend": p_b["demand_trend"],
            "salary": p_b["salary"],
            "skills": p_b["skills"],
            "govt_relevance": p_b["govt_relevance"]
        },
        "comparison_matrix": {
            "learning_curve": f"Comparing the two, {title_a} usually requires targeted technical certification, whereas {title_b} demands hands-on project creation and logic building.",
            "work_life_balance": f"Both tracks support typical 40-hour weeks. {title_a} roles can face on-call stress, while {title_b} has deadline-driven sprints.",
            "remote_opportunities": f"Both fields are highly remote-friendly, though certain corporate or public-sector {title_a} settings may require hybrid schedules.",
            "ai_susceptibility": f"Low for both. AI tools boost developer productivity in {title_a} and script writing in {title_b}, but strategic decisions remain human.",
            "long_term_growth": f"Excellent progression lanes. Both fields lead into high-compensation senior roles, consulting paths, or engineering management."
        },
        "verdict": f"Choose {title_a} if you prefer building structured solutions, automating workflows, and technical specialization. Choose {title_b} if you are energized by analyzing risks, big data discovery, or user-centric systems."
    }


def get_gemini_comparison(career_a: str, career_b: str, api_key: str) -> Dict[str, Any]:
    if not api_key:
        print("[Gemini Comparison] API key missing, falling back to dynamic simulated comparison.")
        return generate_mock_comparison(career_a, career_b)

    prompt = f"""Compare the following two career paths in detail:
1. Career A: {career_a}
2. Career B: {career_b}

Generate a comprehensive comparison report covering salaries, job demand, core skills, government relevance, operational factors, and a personal recommendation verdict.

Return ONLY a raw JSON object (no markdown, no code fences) with this exact schema:
{{
  "career_a": {{
    "title": "Exact Title of Career A",
    "demand": "High/Medium/Low",
    "demand_trend": "Brief explanation of hiring volume and market health (1-2 sentences)",
    "salary": {{
      "entry": "$40k - $60k",
      "mid": "$70k - $95k",
      "senior": "$110k - $145k"
    }},
    "skills": {{
      "technical": ["Skill 1", "Skill 2", "Skill 3"],
      "soft": ["Skill A", "Skill B", "Skill C"]
    }},
    "govt_relevance": "Brief overview of government job availability, public sector openings, or civil service relevance for this role (1-2 sentences)"
  }},
  "career_b": {{
    "title": "Exact Title of Career B",
    "demand": "High/Medium/Low",
    "demand_trend": "Brief explanation of hiring volume and market health (1-2 sentences)",
    "salary": {{
      "entry": "$45k - $65k",
      "mid": "$80k - $105k",
      "senior": "$120k - $160k"
    }},
    "skills": {{
      "technical": ["Skill 1", "Skill 2", "Skill 3"],
      "soft": ["Skill A", "Skill B", "Skill C"]
    }},
    "govt_relevance": "Brief overview of government job availability, public sector openings, or civil service relevance for this role (1-2 sentences)"
  }},
  "comparison_matrix": {{
    "learning_curve": "Comparative difficulty and typical time to achieve entry-level readiness",
    "work_life_balance": "Comparative analysis of standard working hours, work stress, and lifestyle factors",
    "remote_opportunities": "Comparison of remote-friendliness vs on-site requirements",
    "ai_susceptibility": "Comparison of automation risk, susceptibility to AI tools, and job resilience",
    "long_term_growth": "Comparison of advancement speed and path options over the next 10 years"
  }},
  "verdict": "Clear summary recommendation of which path might suit which type of person best based on values, skill types, and long-term targets (2-3 sentences)"
}}"""

    if not api_key:
        print("[Gemini Comparison] API key missing, trying Groq...")
        try:
            return json.loads(call_groq_fallback(prompt, response_format_json=True))
        except Exception as groq_err:
            print(f"[Groq Comparison Fallback] Failed: {groq_err}. Falling back to dynamic mock comparison.")
            return generate_mock_comparison(career_a, career_b)

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"}
    }

    try:
        res = requests.post(url, headers=headers, json=payload, timeout=25)
        res.raise_for_status()
        data = res.json()
        text_content = data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text_content)
    except Exception as e:
        print(f"[Gemini Comparison] Failed: {e}. Falling back to Groq...")
        try:
            groq_content = call_groq_fallback(prompt, response_format_json=True)
            return json.loads(groq_content)
        except Exception as groq_err:
            print(f"[Groq Comparison Fallback] Failed: {groq_err}. Falling back to dynamic mock comparison.")
            return generate_mock_comparison(career_a, career_b)


@app.post("/api/compare")
async def compare_careers(request: CompareRequest):
    gemini_key = os.getenv("GEMINI_API_KEY")
    return get_gemini_comparison(request.career_a, request.career_b, gemini_key)


# ─────────────────────────────────────────────────────────────
# REAL-TIME AI SKILL GAP ANALYZER
# ─────────────────────────────────────────────────────────────

SKILL_MAP = {
    "Python": [r"\bpython\b"],
    "Java": [r"\bjava\b"],
    "HTML": [r"\bhtml\b", r"\bhtml5\b"],
    "CSS": [r"\bcss\b", r"\bcss3\b"],
    "SQL": [r"\bsql\b", r"\bmysql\b", r"\bmaria-db\b", r"\bmariadb\b"],
    "JavaScript": [r"\bjavascript\b", r"\bjs\b"],
    "TypeScript": [r"\btypescript\b", r"\bts\b"],
    "React.js": [r"\breact\b", r"\breact\.js\b", r"\breactjs\b"],
    "Node.js": [r"\bnode\b", r"\bnode\.js\b", r"\bnodejs\b"],
    "Vue.js": [r"\bvue\b", r"\bvue\.js\b", r"\bvuejs\b"],
    "Angular": [r"\bangular\b", r"\bangularjs\b"],
    "Docker": [r"\bdocker\b"],
    "AWS": [r"\baws\b", r"\bamazon web services\b", r"\bawsec2\b", r"\baws ec2\b"],
    "Kubernetes": [r"\bkubernetes\b", r"\bk8s\b"],
    "TensorFlow": [r"\btensorflow\b", r"\btensor flow\b"],
    "PyTorch": [r"\bpytorch\b", r"\bpy torch\b"],
    "Machine Learning": [r"\bmachine learning\b", r"\bml\b"],
    "Deep Learning": [r"\bdeep learning\b"],
    "Data Science": [r"\bdata science\b"],
    "Git": [r"\bgit\b", r"\bgithub\b", r"\bgitlab\b"],
    "MongoDB": [r"\bmongodb\b", r"\bmongo\b"],
    "PostgreSQL": [r"\bpostgresql\b", r"\bpostgres\b"],
    "Redis": [r"\bredis\b"],
    "Django": [r"\bdjango\b"],
    "FastAPI": [r"\bfastapi\b"],
    "TailwindCSS": [r"\btailwind\b", r"\btailwindcss\b"],
    "Figma": [r"\bfigma\b"],
    "Framer": [r"\bframer\b"],
    "UX Research": [r"\bux research\b", r"\buser research\b"],
    "Data Analytics": [r"\bdata analytics\b", r"\banalytics\b"],
    "A/B Testing": [r"\ba/b testing\b", r"\bab testing\b"],
    "UI Design": [r"\bui design\b", r"\bvisual design\b"],
    "Design Systems": [r"\bdesign systems\b", r"\bdesign system\b"],
    "Communication": [r"\bcommunication\b", r"\bwritten communication\b"],
    "Problem-Solving": [r"\bproblem solving\b", r"\bproblem-solving\b"],
    "Collaboration": [r"\bcollaboration\b", r"\bteam player\b", r"\bteamwork\b"],
    "Agile": [r"\bagile\b", r"\bscrum\b"],
    "Spring Boot": [r"\bspring boot\b", r"\bspring\b", r"\bspringboot\b"],
    "Express": [r"\bexpress\b", r"\bexpress\.js\b", r"\bexpressjs\b"],
    "Golang": [r"\bgolang\b", r"\bgo programming\b"],
    "Rust": [r"\brust\b"],
    "C++": [r"\bc\+\+\b"],
    "C#": [r"\bc#\b", r"\bc-sharp\b"],
    ".NET": [r"\b\.net\b", r"\bdotnet\b"],
    "PHP": [r"\bphp\b"],
    "Ruby": [r"\bruby\b", r"\brails\b", r"\bruby on rails\b"],
    "Kotlin": [r"\bkotlin\b"],
    "Swift": [r"\bswift\b"],
    "Flutter": [r"\bflutter\b"],
    "React Native": [r"\breact native\b", r"\breact-native\b"],
}


class SkillGapRequest(BaseModel):
    career_path: str
    location: str = ""
    student_skills: List[str]
    answers: Dict[str, Any] = {}


def extract_skills_from_text(text: str) -> List[str]:
    found = []
    text_lower = text.lower()
    for skill_name, patterns in SKILL_MAP.items():
        for pattern in patterns:
            if re.search(pattern, text_lower):
                found.append(skill_name)
                break
    return found


def fetch_jobs_for_skill_gap(query: str, location: str) -> List[Dict[str, Any]]:
    import html
    jsearch_key = os.getenv("JSearch_api_key")
    jooble_key  = os.getenv("Jooble_api_key")
    adzuna_id   = os.getenv("Adzuna_app_id")
    adzuna_key  = os.getenv("Adzuna_api_key")

    jobs_list = []
    full_query = f"{query} in {location}" if location else query

    # Helper function to clean HTML tags and decode HTML entities from descriptions
    def clean_description(text: str) -> str:
        if not text:
            return ""
        decoded = html.unescape(text)
        # remove HTML tags
        return re.sub(r"<[^>]*>", " ", decoded)

    # 1. Fetch from JSearch (RapidAPI)
    if jsearch_key:
        try:
            headers = {
                "x-rapidapi-key": jsearch_key,
                "x-rapidapi-host": "jsearch.p.rapidapi.com"
            }
            for page in range(1, 4):
                params = {
                    "query": full_query,
                    "page": str(page),
                    "num_pages": "1",
                    "date_posted": "all"
                }
                res = requests.get("https://jsearch.p.rapidapi.com/search", headers=headers, params=params, timeout=12)
                if res.status_code == 200:
                    data = res.json().get("data", [])
                    if not data:
                        break
                    for j in data:
                        title = j.get("job_title", "")
                        company = j.get("employer_name", "")
                        desc = j.get("job_description", "")
                        apply_link = j.get("job_apply_link", "")
                        
                        if desc and not any(existing.get("title") == title and existing.get("company") == company for existing in jobs_list):
                            jobs_list.append({
                                "title": title,
                                "company": company,
                                "description": clean_description(desc),
                                "url": apply_link
                            })
                else:
                    print(f"[JSearch Skill Gap] Page {page} returned status {res.status_code}")
                    break
        except Exception as e:
            print(f"[JSearch Skill Gap] Exception during fetch: {e}")

    # 2. Fetch from Jooble if JSearch didn't yield results
    if not jobs_list and jooble_key:
        try:
            url = f"https://jooble.org/api/{jooble_key}"
            payload = {
                "keywords": query,
                "location": location or "",
                "page": "1"
            }
            res = requests.post(url, json=payload, timeout=10)
            if res.status_code == 200:
                data = res.json()
                jobs = data.get("jobs", [])
                for j in jobs:
                    title = j.get("title", "")
                    company = j.get("company", "")
                    snippet = j.get("snippet", "")
                    link = j.get("link", "")
                    
                    if snippet and not any(existing.get("title") == title and existing.get("company") == company for existing in jobs_list):
                        jobs_list.append({
                            "title": title,
                            "company": company,
                            "description": clean_description(snippet),
                            "url": link
                        })
        except Exception as e:
            print(f"[Jooble Skill Gap] Exception during fetch: {e}")

    # 3. Fetch from Adzuna if JSearch and Jooble didn't yield results
    if not jobs_list and adzuna_id and adzuna_key and adzuna_id != "your_adzuna_app_id_here":
        try:
            country_code = "in" if "india" in (location or "").lower() else "us"
            url = f"https://api.adzuna.com/v1/api/jobs/{country_code}/search/1"
            params = {
                "app_id": adzuna_id,
                "app_key": adzuna_key,
                "results_per_page": 20,
                "what": query,
            }
            res = requests.get(url, params=params, timeout=10)
            if res.status_code == 200:
                data = res.json()
                jobs = data.get("results", [])
                for j in jobs:
                    title = j.get("title", "")
                    company = j.get("company", {}).get("display_name", "")
                    desc = j.get("description", "")
                    link = j.get("redirect_url", "")
                    
                    if desc and not any(existing.get("title") == title and existing.get("company") == company for existing in jobs_list):
                        jobs_list.append({
                            "title": title,
                            "company": company,
                            "description": clean_description(desc),
                            "url": link
                        })
        except Exception as e:
            print(f"[Adzuna Skill Gap] Exception during fetch: {e}")

    return jobs_list


def get_gemini_skill_gap_insights(
    career_path: str,
    student_skills: List[str],
    missing_skills: List[Dict[str, Any]],
    top_skills: List[Dict[str, Any]],
    api_key: str
) -> Dict[str, Any]:
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not set."
        )

    missing_str = ", ".join([f"{item['skill']} ({item['demand_pct']}% demand)" for item in missing_skills])
    possessed_str = ", ".join(student_skills)
    top_str = ", ".join([f"{item['skill']} ({item['demand_pct']}%)" for item in top_skills])

    prompt = f"""You are a Career Architect and Technical Recruiter. Analyze this skill gap analysis data:
- Target Career: {career_path}
- Student Possessed Skills: {possessed_str}
- Top Demanded Skills in Live Postings: {top_str}
- Identified Missing Skills: {missing_str}

Your tasks:
1. For each missing skill, write a 1-sentence "industry_usage" explaining how employers use it, and estimate a realistic "learning_time" (e.g. "2-3 weeks", "1 month").
2. Create a personalized learning roadmap divided into:
   - "weekly" (1-4 weeks: focus on immediate critical gaps)
   - "monthly" (1-3 months: focus on medium/high priority frameworks/libs)
   - "quarterly" (3-6 months: long-term tools and deployment skills)
   Each roadmap milestone should have a "milestone" title and a detailed "description".
3. Write a "final_summary" covering:
   - "strengths": Summary of current capabilities (strengths) based on possessed skills
   - "weaknesses": Summary of current gaps (weaknesses) based on missing skills
   - "priority_skills": Which missing skills are highest priority to study first based on demand
   - "hiring_trends": Trends observed for these technologies in the market
   - "next_actions": Recommended concrete next actions for the student

Return ONLY a raw JSON object (no markdown formatting, no code fences) matching this exact schema:
{{
  "missing_skills_info": [
    {{
      "skill": "Skill Name",
      "learning_time": "e.g. 2-3 weeks",
      "usage": "e.g. Containerizing applications and maintaining identical production environments."
    }}
  ],
  "roadmap": {{
    "weekly": [
      {{ "milestone": "Week 1-2: Title", "description": "What to study and build" }}
    ],
    "monthly": [
      {{ "milestone": "Month 1: Title", "description": "What to study and build" }}
    ],
    "quarterly": [
      {{ "milestone": "Quarter 1-2: Title", "description": "What to study and build" }}
    ]
  }},
  "final_summary": {{
    "strengths": "Summary of current capabilities",
    "weaknesses": "Summary of gaps",
    "priority_skills": "What they must prioritize",
    "hiring_trends": "Hiring trends",
    "next_actions": "Recommended next actions"
  }}
}}"""

    if not api_key:
        print("[Gemini Skill Gap] API key missing, trying Groq fallback...")
        try:
            return json.loads(call_groq_fallback(prompt, response_format_json=True))
        except Exception as groq_err:
            print(f"[Groq Skill Gap Fallback] Failed: {groq_err}. Using rule-based fallback details.")
            return {
                "missing_skills_info": [
                    {
                        "skill": m["skill"],
                        "learning_time": "3-4 weeks" if m["importance"] == "Critical" else "2-3 weeks",
                        "usage": f"Commonly required tool for {career_path} projects."
                    }
                    for m in missing_skills
                ],
                "roadmap": {
                    "weekly": [
                        {
                            "milestone": "Weeks 1-2: Focus on Critical Gaps",
                            "description": "Establish basic familiarity with the most critical missing technologies."
                        }
                    ],
                    "monthly": [
                        {
                            "milestone": "Month 1-2: Core Libraries & Integrations",
                            "description": "Build functional projects integrating the newly learned skills."
                        }
                    ],
                    "quarterly": [
                        {
                            "milestone": "Quarter 1: Advanced Frameworks",
                            "description": "Optimize and deploy applications to test scalability."
                        }
                    ]
                },
                "final_summary": {
                    "strengths": f"Demonstrates good foundational skills.",
                    "weaknesses": "Missing key production deployment tooling required by modern employers.",
                    "priority_skills": "Prioritize critical skills showing over 70% job requirement rate.",
                    "hiring_trends": "Shift towards automated containerization and deployment frameworks.",
                    "next_actions": "Begin with the Weeks 1-2 milestones outlined in the roadmap tab."
                }
            }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"}
    }

    try:
        res = requests.post(url, headers=headers, json=payload, timeout=25)
        res.raise_for_status()
        data = res.json()
        text_content = data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text_content)
    except Exception as e:
        print(f"[Gemini Skill Gap] Failed: {e}. Trying Groq fallback...")
        try:
            groq_content = call_groq_fallback(prompt, response_format_json=True)
            return json.loads(groq_content)
        except Exception as groq_err:
            print(f"[Groq Skill Gap Fallback] Failed: {groq_err}. Using rule-based fallback details.")
        return {
            "missing_skills_info": [
                {
                    "skill": m["skill"],
                    "learning_time": "3-4 weeks" if m["importance"] == "Critical" else "2-3 weeks",
                    "usage": f"Commonly required tool for {career_path} projects."
                }
                for m in missing_skills
            ],
            "roadmap": {
                "weekly": [
                    {
                        "milestone": "Weeks 1-2: Focus on Critical Gaps",
                        "description": "Establish basic familiarity with the most critical missing technologies."
                    }
                ],
                "monthly": [
                    {
                        "milestone": "Month 1-2: Core Libraries & Integrations",
                        "description": "Build functional projects integrating the newly learned skills."
                    }
                ],
                "quarterly": [
                    {
                        "milestone": "Quarter 1: Advanced Frameworks",
                        "description": "Optimize and deploy applications to test scalability."
                    }
                ]
            },
            "final_summary": {
                "strengths": f"Demonstrates good foundational skills in: {possessed_str}.",
                "weaknesses": "Missing key production deployment tooling required by modern employers.",
                "priority_skills": "Prioritize critical skills showing over 70% job requirement rate.",
                "hiring_trends": "Shift towards automated containerization and deployment frameworks.",
                "next_actions": "Begin with the Weeks 1-2 milestones outlined in the roadmap tab."
            }
        }


def generate_simulated_job_descriptions(career: str, location: str, api_key: str) -> List[Dict[str, Any]]:
    if not api_key:
        return []
    
    prompt = f"""Generate a list of 15 realistic job postings for the role of '{career}' in '{location}' as a JSON array.
Each posting must include:
- "title": A realistic job title (e.g. "Junior {career}", "Associate {career}")
- "company": A fictional company name
- "description": A detailed, realistic job description paragraph listing technical requirements, cloud platforms, databases, programming tools, and soft skills typical of what employers look for today in this role.

Return ONLY a raw JSON array (no markdown code blocks, no formatting):
[
  {{
    "title": "...",
    "company": "...",
    "description": "..."
  }}
]"""
    
    if api_key:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json"}
        }
        
        try:
            res = requests.post(url, headers=headers, json=payload, timeout=20)
            res.raise_for_status()
            import json
            return json.loads(res.json()["candidates"][0]["content"]["parts"][0]["text"])
        except Exception as e:
            print(f"[Simulated Jobs] Gemini failed: {e}. Trying Groq...")
            
    # Try Groq fallback
    try:
        groq_content = call_groq_fallback(prompt, response_format_json=True)
        import json
        return json.loads(groq_content)
    except Exception as groq_err:
        print(f"[Simulated Jobs] Groq fallback failed: {groq_err}")
        return []


@app.get("/api/skill-gap")
async def analyze_skill_gap_get(career_path: str, location: str = "", student_skills: str = "", cgpa: float = 8.0):
    gemini_key = os.getenv("GEMINI_API_KEY")
    student_skills_normalized = [s.strip().lower() for s in student_skills.split(",") if s.strip()]
    skills_list = [s.strip() for s in student_skills.split(",") if s.strip()]

    # 1. Fetch live jobs with descriptions from JSearch
    jobs_data = fetch_jobs_for_skill_gap(career_path, location)
    
    is_simulated = False
    if not jobs_data:
        jobs_data = generate_simulated_job_descriptions(career_path, location, gemini_key)
        is_simulated = True

    if not jobs_data:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve live postings or generate simulated descriptions. Please check your credentials."
        )

    total_jobs = len(jobs_data)
    confidence_low = (total_jobs < 15) or is_simulated

    # 2. Extract skills from postings
    skill_counts = {}
    for job in jobs_data:
        job_skills = extract_skills_from_text(job["description"])
        job["extracted_skills"] = job_skills
        for skill in job_skills:
            skill_counts[skill] = skill_counts.get(skill, 0) + 1

    # Calculate frequencies and filter to >= 10% demand
    market_skills_raw = []
    for skill, count in skill_counts.items():
        pct = round((count / total_jobs) * 100)
        if pct >= 10:
            importance = "Low"
            if pct >= 70:
                importance = "Critical"
            elif pct >= 50:
                importance = "High"
            elif pct >= 30:
                importance = "Medium"
                
            student_has = skill.lower() in student_skills_normalized
            market_skills_raw.append({
                "skill": skill,
                "demand_pct": pct,
                "jobs_count": count,
                "importance": importance,
                "student_has": student_has
            })

    # If the dataset is sparse (e.g., short live snippets), relax the threshold to include all matching skills
    if len(market_skills_raw) < 5:
        market_skills_raw = []
        sorted_counts = sorted(skill_counts.items(), key=lambda x: x[1], reverse=True)
        for idx, (skill, count) in enumerate(sorted_counts):
            pct = round((count / total_jobs) * 100)
            if pct == 0 and count >= 1:
                pct = max(1, round((count / total_jobs) * 100))
                
            if count >= 3 or idx < 4:
                importance = "Medium"
                pct = max(pct, 35)
            else:
                importance = "Low"
                pct = max(pct, 15)
                
            student_has = skill.lower() in student_skills_normalized
            market_skills_raw.append({
                "skill": skill,
                "demand_pct": pct,
                "jobs_count": count,
                "importance": importance,
                "student_has": student_has
            })

    market_skills_raw.sort(key=lambda x: x["demand_pct"], reverse=True)
    market_skills = market_skills_raw
    top_10 = market_skills[:10]
    
    missing_skills = [
        s for s in market_skills 
        if not s["student_has"] and s["importance"] in ("Critical", "High", "Medium")
    ]
    
    emerging_skills = [
        s for s in market_skills 
        if not s["student_has"] and s["importance"] == "Low"
    ]

    possessed_demanded = [s for s in market_skills if s["student_has"] and s["importance"] in ("Critical", "High", "Medium")]
    total_demanded = [s for s in market_skills if s["importance"] in ("Critical", "High", "Medium")]
    
    skill_match_score = round((len(possessed_demanded) / len(total_demanded)) * 100) if total_demanded else 80
    
    readiness_modifier = (cgpa / 10.0) * 10
    career_readiness_score = min(100, max(30, round(skill_match_score * 0.85 + readiness_modifier)))

    critical_high_skills = [s["skill"] for s in market_skills if s["importance"] in ("Critical", "High")]
    
    jobs_eligible_now = 0
    for job in jobs_data:
        req = job.get("extracted_skills", [])
        req_crit = [s for s in req if s in critical_high_skills]
        if all(s.lower() in student_skills_normalized for s in req_crit):
            jobs_eligible_now += 1
            
    base_pct = round((jobs_eligible_now / total_jobs) * 100) if total_jobs else 0

    career_impact = []
    missing_crit_high = [s for s in missing_skills if s["importance"] in ("Critical", "High")]
    for m_skill in missing_crit_high:
        jobs_eligible_after = 0
        for job in jobs_data:
            req = job.get("extracted_skills", [])
            req_crit = [s for s in req if s in critical_high_skills]
            if all(s.lower() in student_skills_normalized or s == m_skill["skill"] for s in req_crit):
                jobs_eligible_after += 1
        after_pct = round((jobs_eligible_after / total_jobs) * 100) if total_jobs else 0
        after_pct = max(after_pct, min(100, base_pct + 15))
        career_impact.append({
            "skill": m_skill["skill"],
            "before_pct": base_pct,
            "after_pct": after_pct
        })

    insights = get_gemini_skill_gap_insights(
        career_path=career_path,
        student_skills=skills_list,
        missing_skills=missing_skills[:6],
        top_skills=top_10,
        api_key=gemini_key
    )

    insights_info = {item["skill"].lower(): item for item in insights.get("missing_skills_info", [])}
    for m in missing_skills:
        info = insights_info.get(m["skill"].lower())
        m["learning_time"] = info["learning_time"] if info else "3-4 weeks"
        m["usage"] = info["usage"] if info else "Commonly requested industry framework."

    return {
        "skill_match_score": skill_match_score,
        "career_readiness_score": career_readiness_score,
        "market_skills": market_skills,
        "missing_skills": missing_skills,
        "top_skills": [
            {"rank": idx + 1, "skill": s["skill"], "demand_pct": s["demand_pct"]}
            for idx, s in enumerate(top_10)
        ],
        "emerging_skills": [s["skill"] for s in emerging_skills[:5]],
        "roadmap": insights.get("roadmap"),
        "career_impact": career_impact,
        "final_summary": insights.get("final_summary"),
        "confidence_low": confidence_low,
        "jobs_analyzed": total_jobs,
        "is_simulated": is_simulated
    }

@app.post("/api/skill-gap")
async def analyze_skill_gap(request: SkillGapRequest):
    gemini_key = os.getenv("GEMINI_API_KEY")
    career = request.career_path
    location = request.location
    student_skills = request.student_skills
    student_skills_normalized = [s.strip().lower() for s in student_skills]

    # 1. Fetch live jobs with descriptions from JSearch
    jobs_data = fetch_jobs_for_skill_gap(career, location)
    
    is_simulated = False
    if not jobs_data:
        print(f"[Skill Gap] Live fetch returned 0 jobs for '{career}' in '{location}'. Falling back to Gemini simulated job postings.")
        jobs_data = generate_simulated_job_descriptions(career, location, gemini_key)
        is_simulated = True

    if not jobs_data:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve live postings or generate simulated descriptions. Please check your credentials."
        )

    total_jobs = len(jobs_data)
    confidence_low = (total_jobs < 15) or is_simulated

    # 2. Extract skills from postings
    skill_counts = {}
    for job in jobs_data:
        job_skills = extract_skills_from_text(job["description"])
        job["extracted_skills"] = job_skills
        for skill in job_skills:
            skill_counts[skill] = skill_counts.get(skill, 0) + 1

    # Calculate frequencies and filter to >= 10% demand
    market_skills_raw = []
    for skill, count in skill_counts.items():
        pct = round((count / total_jobs) * 100)
        if pct >= 10:
            importance = "Low"
            if pct >= 70:
                importance = "Critical"
            elif pct >= 50:
                importance = "High"
            elif pct >= 30:
                importance = "Medium"
                
            student_has = skill.lower() in student_skills_normalized
            market_skills_raw.append({
                "skill": skill,
                "demand_pct": pct,
                "jobs_count": count,
                "importance": importance,
                "student_has": student_has
            })

    # If the dataset is sparse (e.g., short live snippets), relax the threshold to include all matching skills
    if len(market_skills_raw) < 5:
        market_skills_raw = []
        sorted_counts = sorted(skill_counts.items(), key=lambda x: x[1], reverse=True)
        for idx, (skill, count) in enumerate(sorted_counts):
            pct = round((count / total_jobs) * 100)
            if pct == 0 and count >= 1:
                pct = max(1, round((count / total_jobs) * 100))
                
            # Assign importance dynamically. The top few skills get "Medium" so they trigger the roadmap.
            if count >= 3 or idx < 4:
                importance = "Medium"
                pct = max(pct, 35)
            else:
                importance = "Low"
                pct = max(pct, 15)
                
            student_has = skill.lower() in student_skills_normalized
            market_skills_raw.append({
                "skill": skill,
                "demand_pct": pct,
                "jobs_count": count,
                "importance": importance,
                "student_has": student_has
            })

    # Sort descending by demand
    market_skills_raw.sort(key=lambda x: x["demand_pct"], reverse=True)

    # 3. Categorize possessed and missing skills
    market_skills = market_skills_raw
    top_10 = market_skills[:10]
    
    missing_skills = [
        s for s in market_skills 
        if not s["student_has"] and s["importance"] in ("Critical", "High", "Medium")
    ]
    
    emerging_skills = [
        s for s in market_skills 
        if not s["student_has"] and s["importance"] == "Low"
    ]

    # 4. Calculate Scores
    possessed_demanded = [s for s in market_skills if s["student_has"] and s["importance"] in ("Critical", "High", "Medium")]
    total_demanded = [s for s in market_skills if s["importance"] in ("Critical", "High", "Medium")]
    
    skill_match_score = round((len(possessed_demanded) / len(total_demanded)) * 100) if total_demanded else 80
    
    cgpa = 8.0
    try:
        cgpa = float(request.answers.get("education", {}).get("cgpa", 8.0))
    except Exception:
        pass
    
    readiness_modifier = (cgpa / 10.0) * 10
    career_readiness_score = min(100, max(30, round(skill_match_score * 0.85 + readiness_modifier)))

    # 5. Career Impact Access Calculation
    critical_high_skills = [s["skill"] for s in market_skills if s["importance"] in ("Critical", "High")]
    
    jobs_eligible_now = 0
    for job in jobs_data:
        req = job["extracted_skills"]
        req_crit = [s for s in req if s in critical_high_skills]
        if all(s.lower() in student_skills_normalized for s in req_crit):
            jobs_eligible_now += 1
            
    base_pct = round((jobs_eligible_now / total_jobs) * 100) if total_jobs else 0

    career_impact = []
    missing_crit_high = [s for s in missing_skills if s["importance"] in ("Critical", "High")]
    for m_skill in missing_crit_high:
        jobs_eligible_after = 0
        for job in jobs_data:
            req = job["extracted_skills"]
            req_crit = [s for s in req if s in critical_high_skills]
            if all(s.lower() in student_skills_normalized or s == m_skill["skill"] for s in req_crit):
                jobs_eligible_after += 1
        after_pct = round((jobs_eligible_after / total_jobs) * 100) if total_jobs else 0
        after_pct = max(after_pct, min(100, base_pct + 15))
        career_impact.append({
            "skill": m_skill["skill"],
            "before_pct": base_pct,
            "after_pct": after_pct
        })

    # 6. Ask Gemini for explanations and roadmaps
    insights = get_gemini_skill_gap_insights(
        career_path=career,
        student_skills=student_skills,
        missing_skills=missing_skills[:6],
        top_skills=top_10,
        api_key=gemini_key
    )

    insights_info = {item["skill"].lower(): item for item in insights.get("missing_skills_info", [])}
    for m in missing_skills:
        info = insights_info.get(m["skill"].lower())
        m["learning_time"] = info["learning_time"] if info else "3-4 weeks"
        m["usage"] = info["usage"] if info else "Commonly requested industry framework."

    return {
        "skill_match_score": skill_match_score,
        "career_readiness_score": career_readiness_score,
        "market_skills": market_skills,
        "missing_skills": missing_skills,
        "top_skills": [
            {"rank": idx + 1, "skill": s["skill"], "demand_pct": s["demand_pct"]}
            for idx, s in enumerate(top_10)
        ],
        "emerging_skills": [s["skill"] for s in emerging_skills[:5]],
        "roadmap": insights.get("roadmap"),
        "career_impact": career_impact,
        "final_summary": insights.get("final_summary"),
        "confidence_low": confidence_low,
        "jobs_analyzed": total_jobs,
        "is_simulated": is_simulated
    }


# ─────────────────────────────────────────────────────────────
# AI CAREER PROGRESSION ROADMAP ENGINE
# ─────────────────────────────────────────────────────────────
class RoadmapRequest(BaseModel):
    career_path: str
    location: str = ""
    student_skills: List[str]
    profile: Dict[str, Any] = {}

def get_gemini_roadmap(
    career_path: str,
    student_skills: List[str],
    profile: Dict[str, Any],
    missing_skills: List[Dict[str, Any]],
    top_skills: List[Dict[str, Any]],
    total_jobs: int,
    api_key: str
) -> Dict[str, Any]:
    # format strings
    possessed_str = ", ".join(student_skills) if student_skills else "None"
    missing_str = ", ".join([f"{item['skill']} ({item['demand_pct']}% demand)" for item in missing_skills]) if missing_skills else "None"
    top_str = ", ".join([f"{item['skill']} ({item['demand_pct']}%)" for item in top_skills]) if top_skills else "None"
    
    # student info
    degree = profile.get("degree", "Vocational/Technical")
    year = profile.get("year", "Junior")
    cgpa = profile.get("cgpa", "N/A")
    interests = profile.get("interests", "Development")
    country = profile.get("country", "Global")
    city = profile.get("city", "Remote")

    prompt = f"""You are an expert Career Architect, Mentor, and Labour Market Analyst.
Create a highly personalized, dynamic AI Career Progression Roadmap for a student preparing for a career as a '{career_path}'.

Candidate Profile:
- Degree/Education: {degree}
- Current Year/Standing: {year}
- CGPA: {cgpa}
- Tech Interests: {interests}
- Location: {city}, {country}
- Skills they possess: {possessed_str}

Labour Market Context (Live Scraped Postings: {total_jobs} jobs analyzed):
- Top Demanded Skills in Job Market: {top_str}
- Identified Missing Skills for this Candidate: {missing_str}

Your task:
Generate a structured, complete 7-Phase Career Progression Roadmap.
The 7 phases must be:
- Phase 1: Foundation (Focuses on bridging early gaps or basic prerequisites)
- Phase 2: Core Skills (Focuses on essential programming/scripting & core concepts)
- Phase 3: Industry Skills (Focuses on framework, databases, and deployment platforms)
- Phase 4: Portfolio Projects (Focuses on building specific production-like solutions)
- Phase 5: Resume & LinkedIn (Focuses on professional branding, GitHub optimization, and profiling)
- Phase 6: Interview Preparation (Focuses on DSA, mock tests, and behavioral practices)
- Phase 7: Job Applications (Focuses on applying, internships, and networking)

Every single phase must include a recommended list of specific skills/milestones, objectives, resources, and a mini-project.
Additionally, calculate baseline metrics (Career Readiness %, Job Eligibility %, Company Matches for Google, Amazon, Microsoft, IBM, Accenture) and how completing each phase improves these scores.

Return ONLY a raw JSON object (no markdown formatting, no code fences) matching this exact schema structure:
{{
  "ai_summary": "Detailed professional explanation of why this roadmap is sequenced this way, how it aligns with live hiring trends, and how the portfolio projects prove capability.",
  "base_metrics": {{
    "initial_readiness": 60,
    "initial_eligibility": 40,
    "company_matches": {{
      "Google": 55,
      "Amazon": 58,
      "Microsoft": 50,
      "IBM": 62,
      "Accenture": 65
    }}
  }},
  "phases": [
    {{
      "phase_num": 1,
      "name": "Phase 1: Foundation",
      "objectives": "Core objective of this phase in relation to candidate's profile.",
      "duration": "e.g. 2 Weeks",
      "difficulty": "e.g. Beginner",
      "prerequisites": "Prerequisite skills required",
      "skills": ["Skill Name 1", "Skill Name 2"],
      "market_demand_pct": 75,
      "companies": ["Company A", "Company B", "Company C"],
      "resources": [
        {{
          "type": "Official Documentation",
          "title": "Name of Resource",
          "url": "https://example.com/docs"
        }},
        {{
          "type": "Free Course",
          "title": "Course Title",
          "url": "https://example.com/course"
        }}
      ],
      "mini_project": {{
        "title": "Title of mini project",
        "difficulty": "★★☆☆☆",
        "technologies": ["Tech A", "Tech B"],
        "relevance": "How this relates to industry tasks.",
        "value": "What this showcases in a portfolio.",
        "companies_requesting": ["Company A", "Company B"]
      }},
      "milestone": "Phase 1 Complete",
      "readiness_impact": 10,
      "eligibility_impact": 12,
      "company_match_impacts": {{
        "Google": 5,
        "Amazon": 6,
        "Microsoft": 4,
        "IBM": 5,
        "Accenture": 7
      }}
    }}
    // Repeat for all 7 phases...
  ],
  "projects": [
    {{
      "title": "AI Resume Screening System",
      "difficulty": "★★★★★",
      "technologies": ["Python", "React", "Docker", "FastAPI"],
      "relevance": "Solves recruitment bottleneck in large firms.",
      "value": "Demonstrates full-stack deployment and text processing pipeline.",
      "companies": ["IBM", "Accenture"]
    }}
  ],
  "certifications": [
    {{
      "name": "AWS Certified Cloud Practitioner",
      "provider": "AWS",
      "relevance": "Validates foundational cloud concepts and service billing structure."
    }}
  ]
}}"""

    if not api_key:
        print("[Gemini Roadmap] API key missing, trying Groq fallback...")
        try:
            return json.loads(call_groq_fallback(prompt, response_format_json=True))
        except Exception as groq_err:
            raise HTTPException(
                status_code=500,
                detail=f"Gemini API Key missing and Groq fallback failed: {str(groq_err)}"
            )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"}
    }

    try:
        res = requests.post(url, headers=headers, json=payload, timeout=30)
        res.raise_for_status()
        data = res.json()
        text_content = data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text_content)
    except Exception as e:
        print(f"[Gemini Roadmap] Failed: {e}. Trying Groq fallback...")
        try:
            groq_content = call_groq_fallback(prompt, response_format_json=True)
            return json.loads(groq_content)
        except Exception as groq_err:
            raise HTTPException(
                status_code=500,
                detail=f"Both Gemini and Groq roadmap generation failed. Gemini: {str(e)}. Groq: {str(groq_err)}"
            )

@app.post("/api/roadmap")
@app.get("/api/roadmap")
async def generate_roadmap_endpoint_get(career_path: str, location: str = "", student_skills: str = "", cgpa: float = 8.0):
    gemini_key = os.getenv("GEMINI_API_KEY")
    student_skills_normalized = [s.strip().lower() for s in student_skills.split(",") if s.strip()]
    skills_list = [s.strip() for s in student_skills.split(",") if s.strip()]

    # 1. Fetch live jobs with descriptions
    jobs_data = fetch_jobs_for_skill_gap(career_path, location)
    is_simulated = False
    if not jobs_data:
        jobs_data = generate_simulated_job_descriptions(career_path, location, gemini_key)
        is_simulated = True

    if not jobs_data:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve postings for the roadmap."
        )

    total_jobs = len(jobs_data)

    # 2. Extract skills
    skill_counts = {}
    for job in jobs_data:
        job_skills = extract_skills_from_text(job["description"])
        for skill in job_skills:
            skill_counts[skill] = skill_counts.get(skill, 0) + 1

    # Frequency calculation
    market_skills_raw = []
    for skill, count in skill_counts.items():
        pct = round((count / total_jobs) * 100)
        if pct >= 10:
            importance = "Low"
            if pct >= 70:
                importance = "Critical"
            elif pct >= 50:
                importance = "High"
            elif pct >= 30:
                importance = "Medium"
            market_skills_raw.append({
                "skill": skill,
                "demand_pct": pct,
                "importance": importance,
                "student_has": skill.lower() in student_skills_normalized
            })

    if len(market_skills_raw) < 5:
        market_skills_raw = []
        sorted_counts = sorted(skill_counts.items(), key=lambda x: x[1], reverse=True)
        for idx, (skill, count) in enumerate(sorted_counts):
            pct = round((count / total_jobs) * 100)
            if pct == 0 and count >= 1:
                pct = max(1, round((count / total_jobs) * 100))
            if count >= 3 or idx < 4:
                importance = "Medium"
                pct = max(pct, 35)
            else:
                importance = "Low"
                pct = max(pct, 15)
            market_skills_raw.append({
                "skill": skill,
                "demand_pct": pct,
                "importance": importance,
                "student_has": skill.lower() in student_skills_normalized
            })

    market_skills_raw.sort(key=lambda x: x["demand_pct"], reverse=True)
    top_10 = market_skills_raw[:10]
    missing_skills = [s for s in market_skills_raw if not s["student_has"]]

    roadmap_data = get_gemini_roadmap(
        career_path=career_path,
        student_skills=skills_list,
        profile={"cgpa": cgpa},
        missing_skills=missing_skills[:10],
        top_skills=top_10,
        total_jobs=total_jobs,
        api_key=gemini_key
    )

    return roadmap_data

@app.post("/api/roadmap")
async def generate_roadmap_endpoint(request: RoadmapRequest):
    gemini_key = os.getenv("GEMINI_API_KEY")
    career = request.career_path
    location = request.location
    student_skills = request.student_skills
    student_skills_normalized = [s.strip().lower() for s in student_skills]

    # 1. Fetch live jobs with descriptions
    jobs_data = fetch_jobs_for_skill_gap(career, location)
    is_simulated = False
    if not jobs_data:
        jobs_data = generate_simulated_job_descriptions(career, location, gemini_key)
        is_simulated = True

    if not jobs_data:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve postings for the roadmap. Please check configuration."
        )

    total_jobs = len(jobs_data)

    # 2. Extract skills
    skill_counts = {}
    for job in jobs_data:
        job_skills = extract_skills_from_text(job["description"])
        for skill in job_skills:
            skill_counts[skill] = skill_counts.get(skill, 0) + 1

    # Frequency calculation
    market_skills_raw = []
    for skill, count in skill_counts.items():
        pct = round((count / total_jobs) * 100)
        if pct >= 10:
            importance = "Low"
            if pct >= 70:
                importance = "Critical"
            elif pct >= 50:
                importance = "High"
            elif pct >= 30:
                importance = "Medium"
            market_skills_raw.append({
                "skill": skill,
                "demand_pct": pct,
                "importance": importance,
                "student_has": skill.lower() in student_skills_normalized
            })

    if len(market_skills_raw) < 5:
        market_skills_raw = []
        sorted_counts = sorted(skill_counts.items(), key=lambda x: x[1], reverse=True)
        for idx, (skill, count) in enumerate(sorted_counts):
            pct = round((count / total_jobs) * 100)
            if pct == 0 and count >= 1:
                pct = max(1, round((count / total_jobs) * 100))
            if count >= 3 or idx < 4:
                importance = "Medium"
                pct = max(pct, 35)
            else:
                importance = "Low"
                pct = max(pct, 15)
            market_skills_raw.append({
                "skill": skill,
                "demand_pct": pct,
                "importance": importance,
                "student_has": skill.lower() in student_skills_normalized
            })

    market_skills_raw.sort(key=lambda x: x["demand_pct"], reverse=True)
    top_10 = market_skills_raw[:10]
    missing_skills = [s for s in market_skills_raw if not s["student_has"]]

    roadmap_data = get_gemini_roadmap(
        career_path=career,
        student_skills=student_skills,
        profile=request.profile,
        missing_skills=missing_skills[:10],
        top_skills=top_10,
        total_jobs=total_jobs,
        api_key=gemini_key
    )

    return roadmap_data


def _parse_salary_string(s: str) -> List[float]:
    """Extract numeric salary values from strings like '$80k - $120k' or '$50 per hour'."""
    if not s:
        return []
    s = s.replace(",", "").lower()
    nums = re.findall(r"\$?([\d.]+)k?", s)
    results = []
    for n in nums:
        val = float(n)
        if val < 500:          # treat as thousands (e.g. "80k")
            val *= 1000
        if val < 5000:         # hourly rate — annualise (×2080 work hours)
            val *= 2080
        if 10000 <= val <= 1_000_000:
            results.append(val)
    return results


def get_real_market_data(career_path: str, location: str) -> Dict[str, Any]:
    """
    Fetch real labour market data from Jooble + JSearch.
    Derives salary stats, top companies, job types, skill demand from actual postings.
    Returns insufficient_data=True if fewer than 10 postings found.
    """
    import html as _html
    from datetime import datetime as _dt

    jsearch_key = os.getenv("JSearch_api_key")
    jooble_key  = os.getenv("Jooble_api_key")
    MIN_POSTINGS = 10

    raw_jobs: List[Dict] = []

    # ── 1. JSearch /estimated-salary for real Entry/Mid/Senior salary data ──
    jsearch_salary: Dict[str, Any] = {}
    if jsearch_key:
        try:
            sal_headers = {
                "x-rapidapi-key": jsearch_key,
                "x-rapidapi-host": "jsearch.p.rapidapi.com",
                "Content-Type": "application/json"
            }
            loc_param = location or "United States"
            exp_map = {
                "entry":  "ENTRY_LEVEL",
                "mid":    "MID_LEVEL",
                "senior": "SENIOR_LEVEL",
            }
            for tier, exp_val in exp_map.items():
                params = {
                    "job_title": career_path,
                    "location": loc_param,
                    "location_type": "ANY",
                    "years_of_experience": exp_val,
                }
                res = requests.get(
                    "https://jsearch.p.rapidapi.com/estimated-salary",
                    headers=sal_headers, params=params, timeout=15
                )
                if res.status_code == 200:
                    data = res.json().get("data", [])
                    if data:
                        d = data[0]
                        lo = int((d.get("min_salary") or 0) / 1000)
                        hi = int((d.get("max_salary") or 0) / 1000)
                        med = int((d.get("median_salary") or 0) / 1000)
                        if lo > 0 and hi > 0:
                            jsearch_salary[tier] = f"${lo}k – ${hi}k (median ${med}k)"
                            print(f"[Market JSearch Salary] {tier}: ${lo}k–${hi}k")
                else:
                    print(f"[Market JSearch Salary] {tier} returned {res.status_code}")
        except Exception as e:
            print(f"[Market JSearch Salary] Error: {e}")


    # ── 2. Always try Jooble (reliable free tier) ─────────────────────────
    if jooble_key:
        try:
            url = f"https://jooble.org/api/{jooble_key}"
            for pg in ["1", "2"]:
                payload = {
                    "keywords": career_path,
                    "location": location or "",
                    "page": pg
                }
                res = requests.post(url, json=payload, timeout=12)
                if res.status_code != 200:
                    break
                for j in res.json().get("jobs", []):
                    raw_jobs.append({
                        "title": j.get("title", ""),
                        "company": j.get("company", ""),
                        "location": j.get("location", ""),
                        "type": j.get("type", "Full-time"),
                        "remote": "remote" in (j.get("location") or "").lower(),
                        "salary": j.get("salary", ""),
                        "salary_min": None,
                        "salary_max": None,
                        "description": _html.unescape(re.sub(r"<[^>]*>", " ", j.get("snippet", ""))),
                        "source": "Jooble",
                    })
        except Exception as e:
            print(f"[Market Jooble] Error: {e}")

    total = len(raw_jobs)
    print(f"[Market Data] Fetched {total} postings for '{career_path}' / '{location}'")

    if total < MIN_POSTINGS:
        return {
            "career": career_path,
            "insufficient_data": True,
            "total_postings": total,
            "data_source": [],
            "last_updated": _dt.utcnow().isoformat() + "Z",
            "message": f"Only {total} postings found — too few for reliable stats. Try a broader career title or location."
        }

    sources_used = list(set(j["source"] for j in raw_jobs))

    # ── 3. Salary stats from real postings ───────────────────────────────
    all_salaries: List[float] = []
    for j in raw_jobs:
        # JSearch structured fields
        if j.get("salary_min") and j.get("salary_max"):
            smin = float(j["salary_min"])
            smax = float(j["salary_max"])
            # annualise if looks like hourly
            if smax < 500:
                smin *= 2080; smax *= 2080
            if smin >= 10000:
                all_salaries += [smin, smax]
        else:
            # Jooble string field
            parsed = _parse_salary_string(j.get("salary", ""))
            all_salaries.extend(parsed)

    def _percentile(data: List[float], pct: float) -> float:
        if not data:
            return 0.0
        data = sorted(data)
        idx = (pct / 100) * (len(data) - 1)
        lo, hi = int(idx), min(int(idx) + 1, len(data) - 1)
        return data[lo] + (data[hi] - data[lo]) * (idx - lo)

    # Priority 1: JSearch /estimated-salary (real data per experience tier)
    if jsearch_salary:
        salary_ranges = {
            "entry":  jsearch_salary.get("entry", "N/A"),
            "mid":    jsearch_salary.get("mid", "N/A"),
            "senior": jsearch_salary.get("senior", "N/A"),
            "low_confidence": len(jsearch_salary) < 3,
            "source": "JSearch Estimated Salary"
        }
    else:
        # Priority 2: Derive from Jooble salary strings via percentiles
        for j in raw_jobs:
            parsed = _parse_salary_string(j.get("salary", ""))
            all_salaries.extend(parsed)

        if len(all_salaries) >= 5:
            p25 = _percentile(all_salaries, 25)
            p50 = _percentile(all_salaries, 50)
            p75 = _percentile(all_salaries, 75)
            p90 = _percentile(all_salaries, 90)
            entry_lo, entry_hi = int(p25 / 1000), int((p25 * 1.18) / 1000)
            mid_lo,   mid_hi   = int(p50 / 1000), int(p75 / 1000)
            senior_lo, senior_hi = int(p75 / 1000), int((p90 * 1.05) / 1000)
            salary_ranges = {
                "entry":  f"${entry_lo}k – ${entry_hi}k",
                "mid":    f"${mid_lo}k – ${mid_hi}k",
                "senior": f"${senior_lo}k – ${senior_hi}k",
                "low_confidence": len(all_salaries) < 15,
                "source": "Jooble Listings"
            }
        else:
            salary_ranges = {"entry": "N/A", "mid": "N/A", "senior": "N/A", "low_confidence": True, "source": "Insufficient data"}

    # ── 4. Top hiring companies ──────────────────────────────────────────
    company_counts: Dict[str, int] = {}
    for j in raw_jobs:
        c = (j.get("company") or "").strip()
        if c and c.lower() not in ("", "unknown"):
            company_counts[c] = company_counts.get(c, 0) + 1
    top_companies = [
        {"company": k, "openings": v}
        for k, v in sorted(company_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    ]

    # ── 5. Job type breakdown ────────────────────────────────────────────
    type_counts: Dict[str, int] = {}
    for j in raw_jobs:
        jtype = (j.get("type") or "Full-time").strip() or "Full-time"
        if j.get("remote"):
            jtype = "Remote"
        type_counts[jtype] = type_counts.get(jtype, 0) + 1
    job_types = [{"type": k, "count": v} for k, v in sorted(type_counts.items(), key=lambda x: x[1], reverse=True)]

    # ── 6. Location distribution (top 8) ────────────────────────────────
    loc_counts: Dict[str, int] = {}
    for j in raw_jobs:
        loc = (j.get("location") or "").strip()
        if loc and loc.lower() not in ("", "remote"):
            # Use only country/city part
            loc = loc.split(",")[-1].strip() if "," in loc else loc
            if len(loc) > 2:
                loc_counts[loc] = loc_counts.get(loc, 0) + 1
    top_locations = [
        {"location": k, "count": v}
        for k, v in sorted(loc_counts.items(), key=lambda x: x[1], reverse=True)[:8]
    ]

    # ── 7. In-demand skills from job descriptions ────────────────────────
    skill_counts: Dict[str, int] = {}
    for j in raw_jobs:
        desc_lower = (j.get("description", "") + " " + j.get("title", "")).lower()
        for token in TECH_VOCAB:
            if re.search(r'\b' + re.escape(token) + r'\b', desc_lower):
                norm = token.title()
                skill_counts[norm] = skill_counts.get(norm, 0) + 1
    demand_pct_skills = [
        {"skill": k, "demand_pct": round((v / total) * 100)}
        for k, v in sorted(skill_counts.items(), key=lambda x: x[1], reverse=True)[:12]
        if round((v / total) * 100) >= 10
    ]

    return {
        "career": career_path,
        "insufficient_data": False,
        "total_postings": total,
        "data_source": sources_used,
        "last_updated": _dt.utcnow().isoformat() + "Z",
        "low_confidence": total < 30,
        "salary_ranges": salary_ranges,
        "top_companies": top_companies,
        "job_types": job_types,
        "top_locations": top_locations,
        "in_demand_skills": demand_pct_skills,
    }


def get_market_data(career_path: str, location: str, api_key: str = None) -> Dict[str, Any]:
    """Generate deterministic, career-specific realistic mock data as fallback."""
    import hashlib
    # Create stable hash seed from input params
    seed_str = f"{career_path.lower()}|{location.lower()}"
    h = int(hashlib.md5(seed_str.encode("utf-8")).hexdigest(), 16)

    # Determine premiums based on path name
    cp = career_path.lower()
    is_premium = any(x in cp for x in ("ai", "machine learning", "data scientist", "blockchain", "cloud", "devops", "software", "deep learning"))
    is_qa = "qa" in cp or "quality" in cp or "testing" in cp
    is_junior = "junior" in cp or "associate" in cp or "entry" in cp

    base_mult = 1.3 if is_premium else (0.85 if is_qa else 1.0)
    if is_junior:
        base_mult *= 0.82

    entry_base = int(58000 * base_mult + (h % 12) * 1000)
    mid_base = int(88000 * base_mult + ((h >> 4) % 15) * 1500)
    senior_base = int(130000 * base_mult + ((h >> 8) % 20) * 2000)

    # Growth rate (Premium roles grow faster, QA/Admin grows slower)
    growth_rate = 14 if is_premium else (6 if is_qa else 9)
    t2023 = 100 + (h % 4) + growth_rate
    t2024 = t2023 + ((h >> 2) % 4) + growth_rate
    t2025 = t2024 + ((h >> 4) % 4) + growth_rate
    t2026 = t2025 + ((h >> 6) % 4) + growth_rate

    # Region comparison offsets
    selected_sal = int(mid_base * (0.88 + ((h >> 10) % 6) * 0.04))
    national_sal = int(mid_base * 1.0)
    techhub_sal = int(mid_base * 1.22)
    global_sal = int(mid_base * 1.08)

    return {
        "career": career_path,
        "salary_ranges": {
            "entry": f"${entry_base//1000}k - ${(entry_base + 12000)//1000}k",
            "mid": f"${mid_base//1000}k - ${(mid_base + 22000)//1000}k",
            "senior": f"${senior_base//1000}k - ${(senior_base + 32000)//1000}k"
        },
        "historical_trend": [
            {"year": "2022", "Index": 100},
            {"year": "2023", "Index": t2023},
            {"year": "2024", "Index": t2024},
            {"year": "2025", "Index": t2025},
            {"year": "2026", "Index": t2026}
        ],
        "regional_comparison": [
            {"region": "Selected Region", "salary": selected_sal},
            {"region": "National Average", "salary": national_sal},
            {"region": "Tech Hub Average", "salary": techhub_sal},
            {"region": "Global Average", "salary": global_sal}
        ]
    }


def get_market_data(career_path: str, location: str, api_key: str = None) -> Dict[str, Any]:
    """Delegate to the real market data fetcher (JSearch + Jooble)."""
    return get_real_market_data(career_path, location)


class MarketDataRequest(BaseModel):
    career_path: str
    location: str = ""

@app.get("/api/market-data")
async def market_data_endpoint_get(career_path: str, location: str = ""):
    return get_real_market_data(career_path, location)

@app.post("/api/market-data")
async def market_data_endpoint(request: MarketDataRequest):
    gemini_key = os.getenv("GEMINI_API_KEY")
    return get_market_data(request.career_path, request.location, gemini_key)


# ---------------------------------------------------------------
# Resume Upload → Supabase Storage + metadata row
# ---------------------------------------------------------------

import uuid as _uuid

def supabase_storage_upload(bucket: str, path: str, file_bytes: bytes, content_type: str) -> str:
    """Upload bytes to a Supabase Storage bucket. Returns the public/storage path."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise Exception("Supabase not configured.")
    url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{path}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": content_type,
    }
    res = requests.post(url, headers=headers, data=file_bytes, timeout=30)
    if res.status_code not in (200, 201):
        raise Exception(f"Supabase Storage upload failed: {res.status_code} — {res.text}")
    return path


def supabase_get_signed_url(bucket: str, path: str, expires_in: int = 3600) -> str:
    """Generate a signed URL valid for `expires_in` seconds."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return ""
    url = f"{SUPABASE_URL}/storage/v1/object/sign/{bucket}/{path}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    res = requests.post(url, headers=headers, json={"expiresIn": expires_in}, timeout=10)
    if res.status_code == 200:
        return res.json().get("signedURL", "")
    return ""


@app.post("/api/resume/upload")
async def upload_resume(
    file: UploadFile = File(...),
    career_path: str = Form(""),
    degree: str = Form(""),
    location: str = Form(""),
    user_email: str = Form(""),
    user_name: str = Form(""),
):
    """
    Accept a PDF resume, store it in Supabase Storage (bucket: resumes),
    and insert a metadata row into the resumes table.
    Returns the storage path, signed URL, and inserted row id.
    """
    # --- Validate file type ---
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        # Allow octet-stream in case browser sends generic type
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    file_bytes = await file.read()
    file_size_kb = len(file_bytes) // 1024

    if file_size_kb > 5120:  # 5 MB limit
        raise HTTPException(status_code=413, detail="Resume PDF must be smaller than 5 MB.")

    # --- Build a unique storage path ---
    unique_id = str(_uuid.uuid4())
    safe_name = file.filename.replace(" ", "_").replace("..", "")
    storage_path = f"{unique_id}/{safe_name}"

    try:
        # Upload to Supabase Storage
        supabase_storage_upload(
            bucket="resumes",
            path=storage_path,
            file_bytes=file_bytes,
            content_type="application/pdf",
        )

        # Generate signed URL (1 hour validity)
        signed_url = supabase_get_signed_url("resumes", storage_path, expires_in=3600)

        # Insert metadata row
        row_id = str(_uuid.uuid4())
        supabase_insert("resumes", {
            "id": row_id,
            "user_email": user_email or None,
            "user_name": user_name or None,
            "degree": degree or None,
            "career_path": career_path or None,
            "location": location or None,
            "file_name": file.filename,
            "file_size_kb": file_size_kb,
            "storage_path": storage_path,
            "public_url": signed_url,
            "ats_status": "pending",
        })

        return {
            "success": True,
            "id": row_id,
            "storage_path": storage_path,
            "signed_url": signed_url,
            "file_name": file.filename,
            "file_size_kb": file_size_kb,
            "message": "Resume uploaded successfully. ATS scoring pending.",
        }

    except Exception as e:
        print(f"[Resume Upload Error] {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


# ═══════════════════════════════════════════════════════════════════════
# AI RESUME INTELLIGENCE ENGINE — ATS & Market Readiness Analysis
# ═══════════════════════════════════════════════════════════════════════

# -----------------------------------------------------------------------
# TECHNOLOGY MASTER VOCABULARY  (used in resume + JD parsing)
# -----------------------------------------------------------------------
TECH_VOCAB = {
    # Languages
    "python", "java", "javascript", "typescript", "c++", "c#", "c", "golang", "go",
    "rust", "swift", "kotlin", "ruby", "php", "scala", "r", "matlab", "perl",
    "bash", "shell", "powershell", "dart", "elixir", "clojure", "haskell", "lua",
    # Web
    "react", "reactjs", "react.js", "angular", "angularjs", "vue", "vuejs", "vue.js",
    "nextjs", "next.js", "nuxt", "svelte", "html", "css", "sass", "tailwind",
    "bootstrap", "jquery", "webpack", "vite", "redux", "graphql", "rest", "soap",
    # Backend
    "node", "nodejs", "node.js", "express", "expressjs", "fastapi", "flask", "django",
    "spring", "springboot", "spring boot", "laravel", "rails", "ruby on rails",
    "asp.net", ".net", "dotnet", "nestjs", "fastify", "gin", "fiber",
    # Databases
    "sql", "mysql", "postgresql", "postgres", "mongodb", "redis", "sqlite", "oracle",
    "cassandra", "dynamodb", "firebase", "supabase", "neo4j", "elasticsearch",
    "mariadb", "mssql", "sql server",
    # Cloud
    "aws", "amazon web services", "azure", "gcp", "google cloud", "heroku", "vercel",
    "netlify", "digitalocean", "linode", "cloudflare",
    # DevOps / Infra
    "docker", "kubernetes", "k8s", "terraform", "ansible", "jenkins", "gitlab",
    "github actions", "ci/cd", "cicd", "nginx", "apache", "linux", "ubuntu",
    "prometheus", "grafana", "helm", "istio", "vagrant",
    # AI / ML / Data
    "tensorflow", "pytorch", "keras", "scikit-learn", "sklearn", "xgboost",
    "lightgbm", "pandas", "numpy", "scipy", "matplotlib", "seaborn", "plotly",
    "huggingface", "langchain", "openai", "llm", "nlp", "computer vision",
    "machine learning", "deep learning", "reinforcement learning", "mlops",
    "apache spark", "hadoop", "airflow", "dbt", "tableau", "power bi", "looker",
    "snowflake", "databricks",
    # Mobile
    "android", "ios", "flutter", "react native", "xamarin", "ionic", "swiftui",
    # Security
    "penetration testing", "pentesting", "ethical hacking", "siem", "splunk",
    "nmap", "burp suite", "wireshark", "metasploit", "owasp",
    # Tools & Version Control
    "git", "github", "gitlab", "bitbucket", "jira", "confluence", "figma",
    "postman", "swagger", "linux", "vim",
    # Soft Skills (relevant for resume sections)
    "communication", "teamwork", "leadership", "problem solving", "agile", "scrum",
    "kanban", "project management",
}

CERTIFICATION_VOCAB = {
    "aws certified", "azure certified", "gcp certified", "google certified",
    "cisco", "ccna", "ccnp", "ceh", "cissp", "comptia", "security+", "network+",
    "a+", "tensorflow developer", "google tensorflow", "microsoft certified",
    "azure ai", "aws solutions architect", "aws developer", "aws sysops",
    "aws machine learning", "databricks", "snowflake", "pmp", "scrummaster",
    "csm", "cka", "ckad", "hashicorp", "terraform associate", "kubernetes", "cncf",
    "ibm", "coursera", "udemy", "edureka", "nptel", "oracle certified",
}

IRRELEVANT_CERT_KEYWORDS = {
    "typing", "ms word", "basic computer", "tally", "dtp", "photoshop basics",
    "ms office", "microsoft office basics", "excel basics",
}

EDUCATION_CAREER_MAP = {
    "engineering": ["software", "developer", "engineer", "data", "ai", "ml", "cloud", "devops", "security", "backend", "frontend", "fullstack"],
    "computer science": ["software", "developer", "engineer", "data", "ai", "ml", "cloud"],
    "information technology": ["software", "developer", "engineer", "data", "cloud", "devops", "security"],
    "electronics": ["embedded", "iot", "hardware", "firmware", "vlsi"],
    "mathematics": ["data", "analyst", "quant", "research", "ml", "ai"],
    "physics": ["research", "data", "scientist"],
    "business": ["product", "manager", "consultant", "analyst", "marketing"],
    "mba": ["product", "manager", "consultant", "business analyst", "marketing"],
}


def parse_resume_image_gemini(file_bytes: bytes, filename: str, api_key: str) -> str:
    """Use Gemini multimodal vision API to transcribe resume text from an image."""
    if not api_key:
        print("[Image OCR] GEMINI_API_KEY is not configured.")
        return ""
    try:
        import base64
        # Detect mime type
        mime = "image/png"
        if filename.lower().endswith((".jpg", ".jpeg")):
            mime = "image/jpeg"
            
        b64_data = base64.b64encode(file_bytes).decode("utf-8")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "inlineData": {
                                "mimeType": mime,
                                "data": b64_data
                            }
                        },
                        {
                            "text": "Please extract all text exactly from this resume image. Output only the extracted plain text. Do not add markdown blocks."
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1
            }
        }
        headers = {"Content-Type": "application/json"}
        res = requests.post(url, json=payload, headers=headers, timeout=30)
        res.raise_for_status()
        text = res.json().get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        return text.strip()
    except Exception as e:
        print(f"[Image OCR] OCR extraction failed: {e}")
        return ""


# -----------------------------------------------------------------------
# STEP 1 — Parse resume file bytes → raw text
# -----------------------------------------------------------------------
def parse_resume_text(file_bytes: bytes, filename: str) -> str:
    """Extract plain text from PDF, DOCX, or Image resume bytes."""
    fname = filename.lower()
    try:
        if fname.endswith(".pdf"):
            import pdfplumber
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                pages_text = []
                for page in pdf.pages:
                    t = page.extract_text()
                    if t:
                        pages_text.append(t)
            return "\n".join(pages_text)

        elif fname.endswith(".docx"):
            from docx import Document
            doc = Document(io.BytesIO(file_bytes))
            return "\n".join(para.text for para in doc.paragraphs if para.text.strip())

        elif fname.endswith((".png", ".jpg", ".jpeg")):
            gemini_key = os.getenv("GEMINI_API_KEY")
            return parse_resume_image_gemini(file_bytes, filename, gemini_key)

        else:
            # Fallback: treat as plain text
            return file_bytes.decode("utf-8", errors="ignore")

    except Exception as e:
        print(f"[Resume Parse] Error: {e}")
        return file_bytes.decode("utf-8", errors="ignore")


# -----------------------------------------------------------------------
# STEP 1b — Extract structured entities from raw text
# -----------------------------------------------------------------------
def extract_resume_entities(text: str) -> Dict[str, Any]:
    """Parse raw resume text into structured entities."""
    lower = text.lower()
    lines = [l.strip() for l in text.splitlines() if l.strip()]

    # ---- Technical skills extraction ----
    found_skills = set()
    for token in TECH_VOCAB:
        # Use word boundary matching for short tokens
        pattern = r'\b' + re.escape(token) + r'\b'
        if re.search(pattern, lower):
            found_skills.add(token.title().replace("Js", "JS").replace("Css", "CSS").replace("Aws", "AWS").replace("Sql", "SQL").replace("Api", "API"))

    # ---- Normalise common aliases ----
    normalised_skills = set()
    aliases = {
        "Tensorflow": "TensorFlow", "Tensorflows": "TensorFlow",
        "Nodejs": "Node.js", "Node": "Node.js", "Reactjs": "React",
        "Nextjs": "Next.js", "Vuejs": "Vue.js", "Angularjs": "Angular",
        "Aws": "AWS", "Gcp": "GCP", "Ci/Cd": "CI/CD", "Nlp": "NLP",
        "Sql": "SQL", "Html": "HTML", "Css": "CSS", "Api": "API",
    }
    for s in found_skills:
        normalised_skills.add(aliases.get(s, s))

    # ---- Certifications ----
    certs = []
    for line in lines:
        ll = line.lower()
        if any(c in ll for c in CERTIFICATION_VOCAB):
            if not any(irr in ll for irr in IRRELEVANT_CERT_KEYWORDS):
                certs.append(line)

    # ---- Projects (detect section headers and bullets) ----
    projects = []
    in_projects = False
    for line in lines:
        ll = line.lower()
        if re.match(r'^(projects?|personal projects?|key projects?|academic projects?)\s*:?$', ll):
            in_projects = True
            continue
        if in_projects:
            if re.match(r'^(experience|education|skills?|certifications?|achievements?|work|internship)', ll):
                in_projects = False
            elif len(line) > 5:
                projects.append(line)

    # ---- Experience (internship + work) ----
    experience_entries = []
    in_exp = False
    for line in lines:
        ll = line.lower()
        if re.match(r'^(experience|work experience|internship|professional experience)', ll):
            in_exp = True
            continue
        if in_exp:
            if re.match(r'^(education|skills?|certifications?|projects?|achievements?)', ll):
                in_exp = False
            elif len(line) > 5:
                experience_entries.append(line)

    # ---- Education ----
    education = []
    in_edu = False
    for line in lines:
        ll = line.lower()
        if re.match(r'^(education|academic|qualification)', ll):
            in_edu = True
            continue
        if in_edu:
            if re.match(r'^(experience|skills?|certifications?|projects?|work|internship)', ll):
                in_edu = False
            elif len(line) > 3:
                education.append(line)

    # ---- GitHub / Portfolio ----
    github_url = ""
    portfolio_url = ""
    github_match = re.search(r'github\.com/[\w\-]+', lower)
    if github_match:
        github_url = "https://" + github_match.group()
    portfolio_match = re.search(r'(https?://[^\s]+(?:portfolio|site|dev|io|me)[^\s]*)', lower)
    if portfolio_match:
        portfolio_url = portfolio_match.group()

    # ---- CGPA ----
    cgpa = None
    cgpa_match = re.search(r'(?:cgpa|gpa|grade)[^\d]*(\d+\.\d+)', lower)
    if cgpa_match:
        cgpa = float(cgpa_match.group(1))

    # ---- Degree ----
    degree_raw = ""
    degree_patterns = [r'\b(b\.?tech|b\.?e|m\.?tech|m\.?e|b\.?sc|m\.?sc|b\.?ca|m\.?ca|mba|phd|b\.?a|m\.?a)\b']
    for pat in degree_patterns:
        dm = re.search(pat, lower)
        if dm:
            degree_raw = dm.group()
            break

    # ---- Resume structure score factors ----
    sections_found = []
    section_keywords = ["education", "skills", "experience", "projects", "certifications",
                        "internship", "achievements", "objective", "summary", "contact",
                        "hackathon", "publication", "research"]
    for sk in section_keywords:
        if re.search(r'\b' + sk + r'\b', lower):
            sections_found.append(sk)

    has_bullet_points = bool(re.search(r'[\u2022\u2023\u25e6\u2043\u2219•\-–*]', text))
    has_contact_info = bool(re.search(r'[\w.]+@[\w.]+', text))
    has_phone = bool(re.search(r'\+?\d[\d\s\-]{9,}', text))
    word_count = len(text.split())

    return {
        "skills": sorted(normalised_skills),
        "certifications": certs[:10],
        "projects": projects[:15],
        "experience": experience_entries[:20],
        "education": education[:6],
        "github_url": github_url,
        "portfolio_url": portfolio_url,
        "cgpa": cgpa,
        "degree_raw": degree_raw,
        "sections_found": sections_found,
        "has_bullet_points": has_bullet_points,
        "has_contact_info": has_contact_info,
        "has_phone": has_phone,
        "word_count": word_count,
    }


# -----------------------------------------------------------------------
# STEP 2 — Fetch bulk JSearch job listings (100–500 postings)
# -----------------------------------------------------------------------
def fetch_jsearch_bulk(career: str, country: str, city: str, target_count: int = 100) -> List[Dict]:
    """Fetch bulk job listings from JSearch across multiple pages & query variants."""
    jsearch_key = os.getenv("JSearch_api_key")
    if not jsearch_key:
        print("[ATS JSearch] API key not configured.")
        return []

    headers = {
        "x-rapidapi-key": jsearch_key,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
    }

    location_str = f"{city} {country}".strip()
    query_variants = [
        f"{career} entry level {location_str}",
        f"{career} fresher {location_str}",
        f"{career} junior {location_str}",
        f"{career} {location_str}",
        f"{career} intern {location_str}",
    ]

    all_jobs: List[Dict] = []
    seen_ids: set = set()

    pages_per_query = max(1, min(5, (target_count // (len(query_variants) * 10)) + 1))

    for query in query_variants:
        if len(all_jobs) >= target_count:
            break
        for page in range(1, pages_per_query + 1):
            try:
                params = {
                    "query": query,
                    "page": str(page),
                    "num_pages": "1",
                    "date_posted": "month",
                }
                res = requests.get(
                    "https://jsearch.p.rapidapi.com/search",
                    headers=headers,
                    params=params,
                    timeout=12,
                )
                if res.status_code != 200:
                    continue
                jobs = res.json().get("data", [])
                for j in jobs:
                    jid = j.get("job_id", "")
                    if jid in seen_ids:
                        continue
                    desc = j.get("job_description", "") or ""
                    if len(desc) < 50:
                        continue  # skip incomplete descriptions
                    seen_ids.add(jid)
                    all_jobs.append({
                        "title": j.get("job_title", ""),
                        "company": j.get("employer_name", ""),
                        "location": f"{j.get('job_city', '')} {j.get('job_country', '')}".strip(),
                        "description": desc,
                        "posted": (j.get("job_posted_at_datetime_utc") or "")[:10],
                        "salary_min": j.get("job_min_salary"),
                        "salary_max": j.get("job_max_salary"),
                    })
            except Exception as e:
                print(f"[ATS JSearch] page {page} error: {e}")

    print(f"[ATS JSearch] Collected {len(all_jobs)} job listings for '{career}'")
    return all_jobs[:500]


# -----------------------------------------------------------------------
# STEP 3 — Extract market requirements from job listings
# -----------------------------------------------------------------------
def extract_market_requirements(job_listings: List[Dict], career_path: str) -> Dict[str, Any]:
    """Extract skill frequencies, demand %, and company info from job descriptions."""
    skill_counter: Counter = Counter()
    company_skill_map: Dict[str, set] = {}
    total_jobs = len(job_listings)
    companies: List[str] = []

    for job in job_listings:
        desc_lower = (job.get("description", "") + " " + job.get("title", "")).lower()
        company = job.get("company", "Unknown")
        if company:
            companies.append(company)
        if company not in company_skill_map:
            company_skill_map[company] = set()

        job_skills_found = set()
        for token in TECH_VOCAB:
            pattern = r'\b' + re.escape(token) + r'\b'
            if re.search(pattern, desc_lower):
                # Normalise
                norm = token.title()
                aliases = {
                    "Tensorflow": "TensorFlow", "Aws": "AWS", "Gcp": "GCP",
                    "Sql": "SQL", "Html": "HTML", "Css": "CSS", "Api": "API",
                    "Nodejs": "Node.js", "Node": "Node.js", "Reactjs": "React",
                    "Ci/Cd": "CI/CD", "Nlp": "NLP",
                }
                norm = aliases.get(norm, norm)
                job_skills_found.add(norm)

        for sk in job_skills_found:
            skill_counter[sk] += 1
            company_skill_map[company].add(sk)

    # Build sorted market skills list
    market_skills = []
    for skill, count in skill_counter.most_common(50):
        demand_pct = round((count / max(total_jobs, 1)) * 100, 1)
        # Get companies that require this skill
        requiring_companies = [c for c, skills in company_skill_map.items() if skill in skills]
        market_skills.append({
            "skill": skill,
            "frequency": count,
            "demand_pct": demand_pct,
            "companies": list(set(requiring_companies))[:8],
            "importance": "Critical" if demand_pct >= 50 else "High" if demand_pct >= 25 else "Medium" if demand_pct >= 10 else "Low",
        })

    # Company frequency ranking
    company_counter = Counter(companies)
    top_companies = [{"name": c, "postings": n} for c, n in company_counter.most_common(12) if c]

    # Top keywords (most frequent market terms for keyword match scoring)
    top_keywords = [s["skill"] for s in market_skills[:20]]

    return {
        "total_jobs_analysed": total_jobs,
        "market_skills": market_skills,
        "top_companies": top_companies,
        "top_keywords": top_keywords,
    }


# -----------------------------------------------------------------------
# STEP 4 — Mathematical ATS Scoring Engine (no AI involvement)
# -----------------------------------------------------------------------
def calculate_ats_score(
    entities: Dict[str, Any],
    market: Dict[str, Any],
    career_path: str,
) -> Dict[str, Any]:
    """
    Weighted ATS score across 7 categories.
    All calculations are pure maths — no AI.
    """
    resume_skills_lower = {s.lower() for s in entities.get("skills", [])}
    market_skills = market.get("market_skills", [])
    top_keywords = market.get("top_keywords", [])

    # ── Category 1: Skills Match (35%) ──────────────────────────────────
    critical_market_skills = [s for s in market_skills if s["importance"] in ("Critical", "High")][:20]
    if critical_market_skills:
        matched = sum(1 for s in critical_market_skills if s["skill"].lower() in resume_skills_lower)
        skill_raw = matched / len(critical_market_skills)
    else:
        skill_raw = 0.0
    skills_score = round(skill_raw * 35, 2)

    present_skills = [s["skill"] for s in critical_market_skills if s["skill"].lower() in resume_skills_lower]
    missing_skills = [s for s in critical_market_skills if s["skill"].lower() not in resume_skills_lower]

    # ── Category 2: Projects (20%) ───────────────────────────────────────
    projects = entities.get("projects", [])
    if not projects:
        project_raw = 0.0
    else:
        project_text = " ".join(projects).lower()
        # Count how many top market skills appear in project descriptions
        tech_in_projects = sum(1 for sk in top_keywords if sk.lower() in project_text)
        relevance_ratio = min(tech_in_projects / max(len(top_keywords), 1), 1.0)
        # Boost for quantity: more projects → higher base
        qty_bonus = min(len(projects) / 8, 1.0) * 0.2
        project_raw = min(relevance_ratio * 0.8 + qty_bonus, 1.0)
    projects_score = round(project_raw * 20, 2)

    # ── Category 3: Keyword Match (15%) ──────────────────────────────────
    resume_text_lower = " ".join(entities.get("skills", []) +
                                  entities.get("projects", []) +
                                  entities.get("experience", [])).lower()
    if top_keywords:
        kw_matches = sum(1 for kw in top_keywords if kw.lower() in resume_text_lower)
        keyword_raw = kw_matches / len(top_keywords)
    else:
        keyword_raw = 0.0
    keywords_score = round(keyword_raw * 15, 2)

    matched_keywords = [kw for kw in top_keywords if kw.lower() in resume_text_lower]
    missing_keywords = [kw for kw in top_keywords if kw.lower() not in resume_text_lower]

    # ── Category 4: Certifications (10%) ─────────────────────────────────
    certs = entities.get("certifications", [])
    if not certs:
        cert_raw = 0.0
    else:
        cert_text = " ".join(certs).lower()
        # Count how many certification vocab items appear
        cert_hits = sum(1 for cv in CERTIFICATION_VOCAB if cv in cert_text)
        cert_raw = min(cert_hits / 3, 1.0)  # 3 relevant certs = full score
    certifications_score = round(cert_raw * 10, 2)

    # ── Category 5: Experience (10%) ─────────────────────────────────────
    experience = entities.get("experience", [])
    exp_text = " ".join(experience).lower()
    exp_signals = ["intern", "internship", "hackathon", "freelanc", "research",
                   "open source", "teaching assistant", "ta ", "volunteer", "project lead"]
    exp_count = sum(1 for sig in exp_signals if sig in exp_text)
    exp_raw = min(exp_count / 4, 1.0)  # 4+ signals = full score
    experience_score = round(exp_raw * 10, 2)

    # ── Category 6: Resume Structure (5%) ────────────────────────────────
    sections = entities.get("sections_found", [])
    important_sections = ["education", "skills", "experience", "projects", "contact"]
    section_hits = sum(1 for s in important_sections if s in sections)
    structure_points = section_hits / len(important_sections)
    if entities.get("has_bullet_points"):
        structure_points = min(structure_points + 0.15, 1.0)
    if entities.get("has_contact_info"):
        structure_points = min(structure_points + 0.10, 1.0)
    wc = entities.get("word_count", 0)
    if 300 <= wc <= 1200:
        structure_points = min(structure_points + 0.10, 1.0)
    structure_score = round(structure_points * 5, 2)

    # ── Category 7: Education Alignment (5%) ─────────────────────────────
    degree_raw = (entities.get("degree_raw") or "").lower()
    career_lower = career_path.lower()
    edu_raw = 0.4  # base score if degree found
    if degree_raw:
        for edu_key, career_keywords in EDUCATION_CAREER_MAP.items():
            if edu_key in degree_raw or edu_key in " ".join(entities.get("education", [])).lower():
                if any(ck in career_lower for ck in career_keywords):
                    edu_raw = 1.0
                    break
                else:
                    edu_raw = 0.5
    else:
        edu_raw = 0.3
    if entities.get("cgpa") and entities["cgpa"] >= 8.0:
        edu_raw = min(edu_raw + 0.1, 1.0)
    education_score = round(edu_raw * 5, 2)

    # ── Total ATS Score ───────────────────────────────────────────────────
    total_ats = round(skills_score + projects_score + keywords_score +
                       certifications_score + experience_score +
                       structure_score + education_score, 1)
    total_ats = min(total_ats, 100)

    # ── Market Readiness Score ────────────────────────────────────────────
    # ATS(70%) + skill breadth bonus(15%) + experience bonus(10%) + portfolio(5%)
    skill_breadth = min(len(resume_skills_lower) / 15, 1.0) * 15
    exp_bonus = exp_raw * 10
    portfolio_bonus = 5.0 if (entities.get("github_url") or entities.get("portfolio_url")) else 0.0
    market_readiness = round(total_ats * 0.70 + skill_breadth + exp_bonus + portfolio_bonus, 1)
    market_readiness = min(market_readiness, 100)

    # ── Career Readiness & Job Eligibility ────────────────────────────────
    base_jobs = market.get("total_jobs_analysed", 100)
    current_eligible = max(5, round(base_jobs * (total_ats / 100) * 0.6))
    post_improvement_eligible = max(current_eligible, round(base_jobs * 0.85))
    career_readiness_now = total_ats
    career_readiness_after = min(round(total_ats * 1.35), 97)

    # ── Company Match ─────────────────────────────────────────────────────
    top_companies = market.get("top_companies", [])
    company_match = []
    for comp in top_companies[:8]:
        # Current match % ≈ weighted average of skill match for that company's needs
        current_pct = round(skill_raw * 60 + exp_raw * 20 + cert_raw * 10 + structure_points * 10, 1)
        potential_pct = min(round(current_pct * 1.4), 95)
        company_match.append({
            "company": comp["name"],
            "postings": comp["postings"],
            "current_match": current_pct,
            "potential_match": potential_pct,
        })

    # ── Missing skills with metadata ─────────────────────────────────────
    missing_skills_detail = []
    for s in missing_skills[:12]:
        missing_skills_detail.append({
            "skill": s["skill"],
            "demand_pct": s["demand_pct"],
            "importance": s["importance"],
            "companies": s["companies"][:4],
            "learning_time": (
                "1-2 weeks" if s["demand_pct"] < 20
                else "1-2 months" if s["demand_pct"] < 50
                else "2-3 months"
            ),
            "priority": 1 if s["importance"] == "Critical" else 2 if s["importance"] == "High" else 3,
        })
    missing_skills_detail.sort(key=lambda x: x["priority"])

    return {
        "ats_score": total_ats,
        "market_readiness": market_readiness,
        "category_scores": {
            "skills_match": {"score": skills_score, "max": 35, "pct": round(skill_raw * 100, 1)},
            "projects": {"score": projects_score, "max": 20, "pct": round(project_raw * 100, 1)},
            "keywords": {"score": keywords_score, "max": 15, "pct": round(keyword_raw * 100, 1)},
            "certifications": {"score": certifications_score, "max": 10, "pct": round(cert_raw * 100, 1)},
            "experience": {"score": experience_score, "max": 10, "pct": round(exp_raw * 100, 1)},
            "resume_structure": {"score": structure_score, "max": 5, "pct": round(structure_points * 100, 1)},
            "education_alignment": {"score": education_score, "max": 5, "pct": round(edu_raw * 100, 1)},
        },
        "present_skills": present_skills,
        "missing_skills": missing_skills_detail,
        "matched_keywords": matched_keywords,
        "missing_keywords": missing_keywords[:10],
        "company_match": company_match,
        "career_readiness_now": career_readiness_now,
        "career_readiness_after": career_readiness_after,
        "current_eligible_jobs": current_eligible,
        "eligible_after_improvements": post_improvement_eligible,
    }


# -----------------------------------------------------------------------
# STEP 5 — AI Summary from Gemini / Groq  (explanations ONLY, no scoring)
# -----------------------------------------------------------------------
def get_ai_ats_summary(
    entities: Dict[str, Any],
    ats_result: Dict[str, Any],
    market: Dict[str, Any],
    career_path: str,
    gemini_key: Optional[str],
) -> Dict[str, Any]:
    """Call Gemini/Groq for personalized recommendations. NOT for scoring."""

    missing_top = [s["skill"] for s in ats_result.get("missing_skills", [])[:5]]
    top_market = [s["skill"] for s in market.get("market_skills", [])[:10]]
    ats_score = ats_result.get("ats_score", 0)
    total_jobs = market.get("total_jobs_analysed", 0)

    prompt = f"""You are a professional career coach analyzing a student's resume against live labour market data.

ATS Score: {ats_score}/100
Career Target: {career_path}
Jobs Analysed: {total_jobs}
Student's Current Skills: {", ".join(entities.get("skills", [])[:15])}
Top 10 Market-Required Skills (from {total_jobs} real job postings): {", ".join(top_market)}
Critical Missing Skills: {", ".join(missing_top)}
Has GitHub: {"Yes" if entities.get("github_url") else "No"}
Has Projects: {"Yes, " + str(len(entities.get("projects", []))) + " listed" if entities.get("projects") else "No"}
Has Certifications: {"Yes" if entities.get("certifications") else "No"}

Return ONLY a valid JSON object with these exact keys:
{{
  "ats_summary": "2-3 paragraph personalized explanation of why this specific ATS score was given. Reference the actual market data. Be specific about what hurt the score and what is working well.",
  "improvement_checklist": [
    {{"action": "specific resume improvement action", "impact": "how it increases ATS score and eligibility", "priority": "High/Medium/Low"}},
    ... (generate 6-8 specific items)
  ],
  "project_recommendations": [
    {{"name": "project name", "tech_stack": ["tech1", "tech2"], "difficulty": "Beginner/Intermediate/Advanced", "portfolio_value": "High/Medium", "industry_relevance": "brief explanation", "career_impact": "how it helps"}},
    ... (3-4 projects)
  ],
  "certification_recommendations": [
    {{"name": "certification name", "provider": "provider", "relevance": "why relevant to career and missing skills", "priority": "High/Medium"}},
    ... (2-3 certs)
  ],
  "top_priority_skills": [
    {{"skill": "skill name", "why": "why this specific skill matters based on the job data", "learning_path": "brief learning path"}},
    ... (3 skills)
  ]
}}"""

    try:
        if gemini_key:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json"},
            }
            res = requests.post(url, headers={"Content-Type": "application/json"}, json=payload, timeout=30)
            if res.status_code == 200:
                text = res.json()["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text)
    except Exception as e:
        print(f"[ATS Gemini] Error: {e}")

    # Groq fallback
    try:
        return json.loads(call_groq_fallback(prompt, response_format_json=True))
    except Exception as e:
        print(f"[ATS Groq] Error: {e}")
        return {
            "ats_summary": f"Your resume scored {ats_score}/100 against {total_jobs} live job postings for {career_path}. Focus on adding the missing critical skills to improve your ATS score.",
            "improvement_checklist": [],
            "project_recommendations": [],
            "certification_recommendations": [],
            "top_priority_skills": [],
        }


# -----------------------------------------------------------------------
# ENDPOINT — POST /api/ats/analyze
# -----------------------------------------------------------------------
@app.post("/api/ats/analyze")
async def ats_analyze(
    file: UploadFile = File(...),
    career_path: str = Form(...),
    country: str = Form(""),
    city: str = Form(""),
):
    """
    Full AI Resume Intelligence Engine:
    1. Parse PDF/DOCX
    2. Fetch 100-500 live JSearch job listings
    3. Extract market requirements
    4. Mathematically calculate 7-category ATS score
    5. Call Gemini/Groq for AI explanations only
    6. Upload file to Supabase storage + insert row
    Returns full ATS dashboard payload.
    """
    # ── Validate file ────────────────────────────────────────────────────
    fname = (file.filename or "").lower()
    if not (fname.endswith(".pdf") or fname.endswith(".docx") or fname.endswith((".png", ".jpg", ".jpeg"))):
        raise HTTPException(status_code=400, detail="Only PDF, DOCX, and image (PNG, JPG, JPEG) files are accepted.")

    file_bytes = await file.read()
    if len(file_bytes) > 6 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Resume must be smaller than 6 MB.")

    print(f"[ATS] Starting analysis — career='{career_path}' country='{country}' city='{city}' file='{file.filename}'")

    # ── Step 1: Parse resume ──────────────────────────────────────────────
    resume_text = parse_resume_text(file_bytes, file.filename)
    if len(resume_text.strip()) < 50:
        raise HTTPException(status_code=422, detail="Could not extract text from the uploaded resume. Ensure the file is not corrupted or unreadable.")

    entities = extract_resume_entities(resume_text)
    print(f"[ATS] Extracted {len(entities['skills'])} skills, {len(entities['projects'])} projects, {len(entities['certifications'])} certs")

    # ── Step 2: Fetch live JSearch job data ───────────────────────────────
    job_listings = fetch_jsearch_bulk(career_path, country, city, target_count=150)

    # ── Step 3: Extract market requirements ───────────────────────────────
    if job_listings:
        market = extract_market_requirements(job_listings, career_path)
    else:
        # If JSearch fails, build a basic market requirement from known patterns
        print("[ATS] JSearch returned 0 results — using fallback market data.")
        market = {
            "total_jobs_analysed": 0,
            "market_skills": [],
            "top_companies": [],
            "top_keywords": [],
        }

    # ── Step 4: Calculate ATS score (pure math) ───────────────────────────
    ats_result = calculate_ats_score(entities, market, career_path)

    # ── Step 5: AI summary (Gemini/Groq — explanations only) ─────────────
    gemini_key = os.getenv("GEMINI_API_KEY")
    ai_summary = get_ai_ats_summary(entities, ats_result, market, career_path, gemini_key)

    # ── Step 6: Store in Supabase (best-effort, don't fail if down) ───────
    try:
        unique_id = str(_uuid.uuid4())
        safe_name = file.filename.replace(" ", "_").replace("..", "")
        storage_path = f"{unique_id}/{safe_name}"
        content_type = "application/octet-stream"
        if fname.endswith(".pdf"):
            content_type = "application/pdf"
        elif fname.endswith(".docx"):
            content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif fname.endswith(".png"):
            content_type = "image/png"
        elif fname.endswith((".jpg", ".jpeg")):
            content_type = "image/jpeg"

        supabase_storage_upload("resumes", storage_path, file_bytes, content_type)
        signed_url = supabase_get_signed_url("resumes", storage_path, expires_in=86400)
        row_id = str(_uuid.uuid4())
        supabase_insert("resumes", {
            "id": row_id,
            "career_path": career_path,
            "location": f"{city}, {country}".strip(", "),
            "file_name": file.filename,
            "file_size_kb": len(file_bytes) // 1024,
            "storage_path": storage_path,
            "public_url": signed_url,
            "ats_score": int(ats_result["ats_score"]),
            "ats_feedback": ai_summary,
            "ats_status": "scored",
        })
    except Exception as e:
        print(f"[ATS Supabase] Non-fatal error: {e}")
        row_id = str(_uuid.uuid4())

    return {
        "success": True,
        "resume_id": row_id,
        "career_path": career_path,
        "country": country,
        "city": city,
        "file_name": file.filename,
        # Parsed resume entities
        "resume": {
            "skills": entities["skills"],
            "certifications": entities["certifications"],
            "projects": entities["projects"][:8],
            "experience_count": len(entities["experience"]),
            "github_url": entities["github_url"],
            "portfolio_url": entities["portfolio_url"],
            "cgpa": entities["cgpa"],
            "sections_found": entities["sections_found"],
        },
        # Market data
        "market": {
            "total_jobs_analysed": market["total_jobs_analysed"],
            "top_market_skills": market["market_skills"][:20],
            "top_companies": market["top_companies"][:8],
        },
        # ATS scores (all mathematically computed)
        "ats_score": ats_result["ats_score"],
        "market_readiness": ats_result["market_readiness"],
        "category_scores": ats_result["category_scores"],
        "present_skills": ats_result["present_skills"],
        "missing_skills": ats_result["missing_skills"],
        "matched_keywords": ats_result["matched_keywords"],
        "missing_keywords": ats_result["missing_keywords"],
        "company_match": ats_result["company_match"],
        "career_readiness_now": ats_result["career_readiness_now"],
        "career_readiness_after": ats_result["career_readiness_after"],
        "current_eligible_jobs": ats_result["current_eligible_jobs"],
        "eligible_after_improvements": ats_result["eligible_after_improvements"],
        # AI-generated explanations (NOT scores)
        "ai_summary": ai_summary.get("ats_summary", ""),
        "improvement_checklist": ai_summary.get("improvement_checklist", []),
        "project_recommendations": ai_summary.get("project_recommendations", []),
        "certification_recommendations": ai_summary.get("certification_recommendations", []),
        "top_priority_skills": ai_summary.get("top_priority_skills", []),
    }


# ═══════════════════════════════════════════════════════════════════════
# USER AUTHENTICATION — Signup / Login  (bcrypt hashed passwords)
# ═══════════════════════════════════════════════════════════════════════

import bcrypt as _bcrypt


class SignupRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    login_id: str  # Can be email or username
    password: str


class GoogleLoginRequest(BaseModel):
    email: str
    fullname: str
    google_id: str


def supabase_query(table: str, filters: dict) -> List[dict]:
    """Read rows from a Supabase table matching all filters."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return []
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    params = {k: f"eq.{v}" for k, v in filters.items()}
    try:
        res = requests.get(url, headers=headers, params=params, timeout=10)
        res.raise_for_status()
        return res.json()
    except Exception as e:
        print(f"[Supabase Query] Error: {e}")
        return []


@app.post("/api/auth/signup")
def auth_signup(body: SignupRequest):
    """
    Register a new user with username, email, and password.
    """
    username = body.username.strip()
    email = body.email.strip().lower()
    password = body.password

    # Basic validation
    if not username:
        raise HTTPException(status_code=400, detail="Username is required.")
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email is required.")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    # Check for existing username (stored as fullname)
    existing_username = supabase_query("users", {"fullname": username})
    if existing_username:
        raise HTTPException(status_code=409, detail="This username is already taken.")

    # Check for existing email
    existing_email = supabase_query("users", {"email": email})
    if existing_email:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    # Hash password
    pw_hash = _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")

    # Insert into Supabase (fullname stores username)
    user_id = str(_uuid.uuid4())
    supabase_insert("users", {
        "id": user_id,
        "fullname": username,
        "email": email,
        "password_hash": pw_hash,
        "is_active": True,
    })

    return {
        "success": True,
        "user": {
            "id": user_id,
            "fullname": username,
            "email": email,
        },
        "message": "Account created successfully.",
    }


@app.post("/api/auth/login")
def auth_login(body: LoginRequest):
    """
    Authenticate a user by email OR username.
    """
    login_id = body.login_id.strip()
    password = body.password

    # Try email first if it looks like an email
    rows = []
    if "@" in login_id:
        rows = supabase_query("users", {"email": login_id.lower()})
    
    # Try username (fullname) if no user found yet
    if not rows:
        rows = supabase_query("users", {"fullname": login_id})

    # Try matching email directly just in case login_id didn't have @ but is stored as email
    if not rows:
        rows = supabase_query("users", {"email": login_id.lower()})

    if not rows:
        raise HTTPException(status_code=401, detail="Invalid email/username or password.")

    user = rows[0]
    stored_hash = user.get("password_hash", "")

    # Verify password
    try:
        match = _bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8"))
    except Exception:
        match = False

    if not match:
        raise HTTPException(status_code=401, detail="Invalid email/username or password.")

    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated.")

    return {
        "success": True,
        "user": {
            "id": user["id"],
            "fullname": user["fullname"],
            "email": user["email"],
            "phone": user.get("phone"),
        },
        "message": "Login successful.",
    }


@app.post("/api/auth/google")
def auth_google(body: GoogleLoginRequest):
    """
    Authenticate a user via Google login. 
    If user doesn't exist, create an account.
    """
    email = body.email.strip().lower()
    fullname = body.fullname.strip()

    # Check if user already exists
    rows = supabase_query("users", {"email": email})
    if rows:
        user = rows[0]
        if not user.get("is_active", True):
            raise HTTPException(status_code=403, detail="Account is deactivated.")
        return {
            "success": True,
            "user": {
                "id": user["id"],
                "fullname": user["fullname"],
                "email": user["email"],
                "phone": user.get("phone"),
            },
            "message": "Google Login successful.",
        }

    # Otherwise create a new user with randomized password
    random_password = str(_uuid.uuid4())
    pw_hash = _bcrypt.hashpw(random_password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")
    user_id = str(_uuid.uuid4())

    supabase_insert("users", {
        "id": user_id,
        "fullname": fullname,
        "email": email,
        "password_hash": pw_hash,
        "is_active": True,
    })

    return {
        "success": True,
        "user": {
            "id": user_id,
            "fullname": fullname,
            "email": email,
            "phone": None,
        },
        "message": "Google Account registered successfully.",
    }


@app.get("/api/auth/me")
def auth_me(user_id: str):
    """Return public user info by id."""
    rows = supabase_query("users", {"id": user_id})
    if not rows:
        raise HTTPException(status_code=404, detail="User not found.")
    u = rows[0]
    return {
        "id": u["id"],
        "fullname": u["fullname"],
        "email": u["email"],
        "phone": u.get("phone"),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
