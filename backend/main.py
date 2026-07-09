import os
import re
import math
import json
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List
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


class AnalysisRequest(BaseModel):
    basicInfo: Dict[str, Any] = {}
    education: Dict[str, Any] = {}
    workExperience: Dict[str, Any] = {}
    strengthsInterests: Dict[str, Any] = {}
    satisfaction: Dict[str, Any] = {}
    preferredRole: Dict[str, Any] = {}
    cognitiveProfile: Dict[str, Any] = {}
    coreCharacter: Dict[str, Any] = {}


# ─────────────────────────────────────────────────────────────
# GEMINI AI — Career Analysis (NO FALLBACK, throws on failure)
# ─────────────────────────────────────────────────────────────
def get_gemini_analysis(answers: Dict[str, Any], api_key: str) -> Dict[str, Any]:
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not set in backend/.env. Add your Google AI Studio key."
        )

    basic_info   = answers.get("basicInfo", {})
    education    = answers.get("education", {})
    work         = answers.get("workExperience", {})
    strengths    = answers.get("strengthsInterests", {})
    satisfaction = answers.get("satisfaction", {})
    pref_role    = answers.get("preferredRole", {})
    cog_profile  = answers.get("cognitiveProfile", {})
    char         = answers.get("coreCharacter", {})

    cog_traits = "Skipped" if cog_profile.get("skipped") else ", ".join(cog_profile.get("selections", []))
    work_exp = (
        f"{work.get('years')} years of {work.get('type')} work"
        if work.get("hasExperience") in ("yes", "freelance", "current")
        else "None"
    )

    prompt = f"""You are a Career Counselor and Psychologist. Analyze the candidate's questionnaire answers:
- Name: {basic_info.get("name", "Candidate")}
- Gender: {basic_info.get("gender", "N/A")}
- Age: {basic_info.get("ageRange", "N/A")}
- Education Status: {education.get("status", "N/A")}
- Field of study: {education.get("fieldOfStudy", "N/A")}
- Institution: {education.get("institutionType", "N/A")}
- Work Experience: {work_exp}
- Primary Strength: {strengths.get("primaryStrength", "N/A")}
- Energizing Tasks: {strengths.get("energizingTasks", "N/A")}
- Matters in work: {satisfaction.get("duringWork", "N/A")}
- Matters outside work: {satisfaction.get("afterWork", "N/A")}
- Role preference in mind: {pref_role.get("freeText", "None")}
- Broad area of interest: {pref_role.get("category", "None")}
- Cognitive traits selected: {cog_traits}
- Personal open response: {char.get("openResponse", "N/A")}

Create a realistic career compatibility report. Return ONLY a raw JSON object (no markdown, no code fences):
{{
  "summary": "Short professional summary of the candidate's career persona (2-3 sentences, mention their name).",
  "careerPaths": [
    {{
      "title": "Specific Real Job Title 1",
      "matchScore": 95,
      "salaryRange": "$75k - $110k",
      "scope": "High",
      "growthPercentage": 18,
      "whyItFits": "Detailed explanation of why this role aligns with their specific strengths and preferences.",
      "searchQuery": "Exact job search keyword (e.g. 'React Developer')"
    }},
    {{
      "title": "Specific Real Job Title 2",
      "matchScore": 85,
      "salaryRange": "$65k - $95k",
      "scope": "Medium",
      "growthPercentage": 12,
      "whyItFits": "Detailed alignment explanation.",
      "searchQuery": "Search keyword"
    }},
    {{
      "title": "Specific Real Job Title 3",
      "matchScore": 75,
      "salaryRange": "$55k - $85k",
      "scope": "Medium",
      "growthPercentage": 9,
      "whyItFits": "Detailed alignment explanation.",
      "searchQuery": "Search keyword"
    }}
  ],
  "growthOutlook": [
    {{"year": "2026", "Path1": 100, "Path2": 100, "Path3": 100}},
    {{"year": "2027", "Path1": 112, "Path2": 108, "Path3": 105}},
    {{"year": "2028", "Path1": 126, "Path2": 118, "Path3": 112}},
    {{"year": "2029", "Path1": 142, "Path2": 130, "Path3": 120}},
    {{"year": "2030", "Path1": 160, "Path2": 144, "Path3": 130}}
  ],
  "strengthsAlignment": "Two sentences about their cognitive profile and how it aligns with the suggested careers.",
  "actionItems": [
    "Specific action item 1 based on their background",
    "Specific action item 2",
    "Specific action item 3"
  ]
}}"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"}
    }

    try:
        res = requests.post(url, headers=headers, json=payload, timeout=30)
        res.raise_for_status()
    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=504,
            detail="Gemini API timed out. Check your API key or network connection and try again."
        )
    except requests.exceptions.HTTPError as e:
        status = res.status_code if res else 500
        raise HTTPException(
            status_code=status,
            detail=f"Gemini API returned an error: {res.text if res else str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API call failed: {str(e)}")

    try:
        data = res.json()
        text_content = data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text_content)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse Gemini response: {str(e)}. Raw: {res.text[:300]}"
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
async def analyze_career(request: AnalysisRequest):
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
            cog_selections = ", ".join(answers.get("cognitiveProfile", {}).get("selections", []))
            candidate_text = f"""
Name: {answers.get("basicInfo", {}).get("name", "")}
Preferred Role: {answers.get("preferredRole", {}).get("freeText", "")} ({answers.get("preferredRole", {}).get("category", "")})
Strengths: {answers.get("strengthsInterests", {}).get("primaryStrength", "")}
Cognitive Profile: {cog_selections}
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
    supabase_insert("career_reports", {
        "candidate_name": answers.get("basicInfo", {}).get("name", "Guest"),
        "answers": answers,
        "analysis": analysis,
        "jobs": jobs,
    })

    return {"analysis": analysis, "jobs": jobs}


class CompareRequest(BaseModel):
    career_a: str
    career_b: str


def get_gemini_comparison(career_a: str, career_b: str, api_key: str) -> Dict[str, Any]:
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not set in backend/.env. Add your Google AI Studio key."
        )

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
        raise HTTPException(
            status_code=500,
            detail=f"Gemini Comparison API call failed: {str(e)}"
        )


@app.post("/api/compare")
async def compare_careers(request: CompareRequest):
    gemini_key = os.getenv("GEMINI_API_KEY")
    return get_gemini_comparison(request.career_a, request.career_b, gemini_key)


# ─────────────────────────────────────────────────────────────
# REAL-TIME AI SKILL GAP ANALYZER
# ─────────────────────────────────────────────────────────────

SKILL_MAP = {
    "Python": [r"\bpython\b"],
    "SQL": [r"\bsql\b"],
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
}


class SkillGapRequest(BaseModel):
    career_path: str
    location: str
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
    jsearch_key = os.getenv("JSearch_api_key")
    if not jsearch_key:
        print("[JSearch] Key not configured. Using empty list.")
        return []

    full_query = f"{query} in {location}"
    jobs_list = []
    
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
                            "description": desc,
                            "url": apply_link
                        })
            else:
                print(f"[JSearch Skill Gap] Page {page} returned status {res.status_code}")
                break
    except Exception as e:
        print(f"[JSearch Skill Gap] Exception during fetch: {e}")
        
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
        print(f"[Gemini Skill Gap] Error: {e}")
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


@app.post("/api/skill-gap")
async def analyze_skill_gap(request: SkillGapRequest):
    gemini_key = os.getenv("GEMINI_API_KEY")
    career = request.career_path
    location = request.location
    student_skills = request.student_skills
    student_skills_normalized = [s.strip().lower() for s in student_skills]

    # 1. Fetch live jobs with descriptions from JSearch
    jobs_data = fetch_jobs_for_skill_gap(career, location)
    if not jobs_data:
        raise HTTPException(
            status_code=400,
            detail=f"No live job postings could be found for '{career}' in '{location}'. Check your connection or location parameters."
        )

    total_jobs = len(jobs_data)
    confidence_low = total_jobs < 15

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
        "jobs_analyzed": total_jobs
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
