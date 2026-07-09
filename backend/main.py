import os
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
