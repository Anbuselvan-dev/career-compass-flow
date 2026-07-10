import os, requests, json
from dotenv import load_dotenv
load_dotenv('backend/.env')

key = os.getenv('JSearch_api_key')
headers = {
    'x-rapidapi-key': key,
    'x-rapidapi-host': 'jsearch.p.rapidapi.com'
}

params = {
    'query': 'software engineer',
    'page': '1',
    'num_pages': '1',
    'date_posted': 'month'
}

res = requests.get('https://jsearch.p.rapidapi.com/search', headers=headers, params=params, timeout=12)
print(f'Status: {res.status_code}')

if res.status_code == 200:
    jobs = res.json().get('data', [])
    print(f'Jobs returned: {len(jobs)}')
    if jobs:
        j = jobs[0]
        print('Keys:', list(j.keys()))
        print()
        print('Salary fields:')
        for k in ['job_min_salary', 'job_max_salary', 'job_salary_currency', 'job_salary_period']:
            print(f'  {k}: {j.get(k)}')
        print()
        print('Other fields:')
        for k in ['job_title', 'employer_name', 'job_city', 'job_country', 'job_is_remote', 'job_employment_type', 'job_posted_at_datetime_utc']:
            print(f'  {k}: {j.get(k)}')

        # Count how many have salary data
        with_salary = [j for j in jobs if j.get('job_min_salary') or j.get('job_max_salary')]
        print(f'\nJobs with salary data: {len(with_salary)}/{len(jobs)}')
        
        # Remote count
        remote = sum(1 for j in jobs if j.get('job_is_remote'))
        print(f'Remote jobs: {remote}/{len(jobs)}')
        
        # Unique companies
        companies = list(set(j.get('employer_name', '') for j in jobs if j.get('employer_name')))
        print(f'Unique companies: {len(companies)} - {companies[:5]}')
else:
    print(f'Error: {res.text[:300]}')
