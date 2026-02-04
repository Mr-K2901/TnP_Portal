import re
import os

files = [
    r"d:\Workspace\TnP_Portal\frontend\app\admin\students\page.tsx",
    r"d:\Workspace\TnP_Portal\frontend\app\admin\jobs\page.tsx",
    r"d:\Workspace\TnP_Portal\frontend\app\student\page.tsx",
    r"d:\Workspace\TnP_Portal\frontend\app\student\dashboard\page.tsx",
    r"d:\Workspace\TnP_Portal\frontend\app\student\applications\page.tsx",
    r"d:\Workspace\TnP_Portal\frontend\app\student\profile\page.tsx"
]

def decrease_fontsize(match):
    prefix = match.group(1)
    val = match.group(2)
    suffix = match.group(3)
    try:
        new_val = max(0, int(val) - 2)
        return f"{prefix}{new_val}{suffix}"
    except:
        return match.group(0)

# Pattern for fontSize: '14px' or fontSize: 14
pattern = re.compile(r"(fontSize:\s*['\"]?)(\d+)(px['\"]?|['\"]?)")

for file_path in files:
    if not os.path.exists(file_path):
        print(f"Skipping {file_path}, not found.")
        continue
        
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    new_content = pattern.sub(decrease_fontsize, content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Updated {file_path}")
