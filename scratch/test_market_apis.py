import os, requests, json
from dotenv import load_dotenv
load_dotenv('backend/.env')

jooble_key = os.getenv('Jooble_api_key')
url = f'https://jooble.org/api/{jooble_key}'
payload = {'keywords': 'software engineer', 'location': 'India', 'page': '1'}
res = requests.post(url, json=payload, timeout=12)
jobs = res.json().get('jobs', [])
print(f'Jooble jobs: {len(jobs)}')

for j in jobs[:5]:
    title = j.get('title', '')
    salary = j.get('salary', '')
    location = j.get('location', '')
    print(f'  title={repr(title)}, salary={repr(salary)}, loc={repr(location)}')

with_salary = [j for j in jobs if j.get('salary') and str(j.get('salary', '')).strip()]
print(f'Jobs with salary data: {len(with_salary)}/{len(jobs)}')

# Now check JSearch v2 API format
jsearch_key = os.getenv('JSearch_api_key')
headers = {'x-rapidapi-key': jsearch_key, 'x-rapidapi-host': 'jsearch.p.rapidapi.com'}
# Try correct URL with /v2
for endpoint in ['/search', '/v2/search']:
    url2 = f'https://jsearch.p.rapidapi.com{endpoint}'
    r = requests.get(url2, headers=headers, params={'query': 'software engineer', 'page': '1'}, timeout=10)
    print(f'JSearch {endpoint}: status={r.status_code}')
    if r.status_code == 200:
        d = r.json().get('data', [])
        print(f'  Jobs: {len(d)}')
        if d:
            print('  Keys:', list(d[0].keys()))
            salary_f = {k:v for k,v in d[0].items() if 'salary' in k.lower()}
            print('  Salary fields:', salary_f)
        break
