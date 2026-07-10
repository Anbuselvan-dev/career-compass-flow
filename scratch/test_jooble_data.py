import os, requests, json
from dotenv import load_dotenv
load_dotenv('backend/.env')

key = os.getenv('Jooble_api_key')
url = f'https://jooble.org/api/{key}'

payload = {'keywords': 'software engineer', 'location': '', 'page': '1'}
res = requests.post(url, json=payload, timeout=12)
jobs = res.json().get('jobs', [])
print(f'Total jobs: {len(jobs)}')

if jobs:
    j = jobs[0]
    print('All keys:', list(j.keys()))
    print()
    
    for i, j in enumerate(jobs[:5]):
        print(f'Job {i+1}:')
        print(f'  title: {j.get("title")}')
        print(f'  company: {j.get("company")}')
        print(f'  salary: {repr(j.get("salary"))}')
        print(f'  location: {j.get("location")}')
        print(f'  type: {j.get("type")}')
        print(f'  source: {j.get("source")}')
        print(f'  snippet (first 100): {str(j.get("snippet",""))[:100]}')
        print()

    with_salary = [j for j in jobs if j.get('salary') and str(j.get('salary','')).strip() and str(j.get('salary','')) != '0']
    print(f'Jobs with salary: {len(with_salary)}/{len(jobs)}')
    
    companies = list(set(j.get('company','') for j in jobs if j.get('company')))
    print(f'Unique companies ({len(companies)}): {companies[:8]}')
    
    types = list(set(j.get('type','') for j in jobs if j.get('type')))
    print(f'Job types: {types}')
    
    locations = list(set(j.get('location','') for j in jobs if j.get('location')))
    print(f'Locations sample: {locations[:8]}')
