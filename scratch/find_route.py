import sys
sys.stdout.reconfigure(encoding='utf-8')

with open("c:/Users/deves/OneDrive/project_main/PROJECTS/career-compass-flow/backend/main.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(1, 62):
    print(f"Line {i+1}: {lines[i].rstrip()}")
