import requests, json

key = '76ead5d0a3mshaba47ec74bbfd79p190634jsn1401ebad9129'
headers = {
    'Content-Type': 'application/json',
    'x-rapidapi-host': 'jsearch.p.rapidapi.com',
    'x-rapidapi-key': key
}

# Test 1: job-details (from the user's curl)
res = requests.get(
    'https://jsearch.p.rapidapi.com/job-details',
    headers=headers,
    params={'job_id': 'qIsPjUMr0Em0hqHoAAAAAA==', 'country': 'us'},
    timeout=15
)
print(f'job-details status: {res.status_code}')
if res.status_code == 200:
    data = res.json()
    print('Keys:', list(data.keys()))
    if data.get('data'):
        job = data['data'][0]
        print('Job keys:', list(job.keys()))
        print('Title:', job.get('job_title'))
        print('Min salary:', job.get('job_min_salary'))
        print('Max salary:', job.get('job_max_salary'))
        print('Remote:', job.get('job_is_remote'))
        print('Employment type:', job.get('job_employment_type'))
else:
    print('Response:', res.text[:300])

print()

# Test 2: search endpoint
res2 = requests.get(
    'https://jsearch.p.rapidapi.com/search',
    headers=headers,
    params={'query': 'software engineer', 'page': '1', 'num_pages': '1'},
    timeout=15
)
print(f'search status: {res2.status_code}')
if res2.status_code == 200:
    jobs = res2.json().get('data', [])
    print(f'Jobs returned: {len(jobs)}')
    if jobs:
        j = jobs[0]
        print('Title:', j.get('job_title'))
        print('Salary min:', j.get('job_min_salary'))
        print('Salary max:', j.get('job_max_salary'))
else:
    print('Response:', res2.text[:200])

print()

# Test 3: estimated-salary
res3 = requests.get(
    'https://jsearch.p.rapidapi.com/estimated-salary',
    headers=headers,
    params={'job_title': 'software engineer', 'location': 'United States', 'location_type': 'ANY', 'years_of_experience': 'ALL'},
    timeout=15
)
print(f'estimated-salary status: {res3.status_code}')
if res3.status_code == 200:
    data3 = res3.json().get('data', [{}])
    if data3:
        d = data3[0]
        print('Min:', d.get('min_salary'))
        print('Median:', d.get('median_salary'))
        print('Max:', d.get('max_salary'))
else:
    print('Response:', res3.text[:200])
