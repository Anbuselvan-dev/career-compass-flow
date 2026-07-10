with open("c:/Users/deves/OneDrive/project_main/PROJECTS/career-compass-flow/backend/main.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

with open("c:/Users/deves/OneDrive/project_main/PROJECTS/career-compass-flow/scratch/auth_code.txt", "w", encoding="utf-8") as f_out:
    for i in range(2880, 3031):
        if i < len(lines):
            f_out.write(f"{i+1}: {lines[i]}")

print("Saved auth_code.txt")
