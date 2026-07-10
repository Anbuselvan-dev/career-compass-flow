import os, requests
from dotenv import load_dotenv
load_dotenv('backend/.env')

key = os.getenv('JSearch_api_key')
print(f'Key loaded: {key}')

headers = {
    'x-rapidapi-key': key,
    'x-rapidapi-host': 'jsearch.p.rapidapi.com'
}
params = {'query': 'software engineer', 'page': '1', 'num_pages': '1', 'date_posted': 'month'}
res = requests.get('https://jsearch.p.rapidapi.com/search', headers=headers, params=params, timeout=15)
print(f'Status: {res.status_code}')

if res.status_code == 200:
    jobs = res.json().get('data', [])
    print(f'Jobs returned: {len(jobs)}')
    if jobs:
        j = jobs[0]
        title = j.get('job_title')
        company = j.get('employer_name')
        sal_min = j.get('job_min_salary')
        sal_max = j.get('job_max_salary')
        remote = j.get('job_is_remote')
        print(f'Title: {title}')
        print(f'Company: {company}')
        print(f'Salary min: {sal_min}')
        print(f'Salary max: {sal_max}')
        print(f'Remote: {remote}')
    print('SUCCESS: JSearch key is working.')
else:
    print(f'FAILED: {res.text[:300]}')
