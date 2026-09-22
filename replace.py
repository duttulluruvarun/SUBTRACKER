import os
import re

dir_path = "src"

for root, dirs, files in os.walk(dir_path):
    for file in files:
        if file.endswith(".tsx"):
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Replace $ with ₹ only if not followed by {
            new_content = re.sub(r'\$(?!\{)', '₹', content)
            
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(new_content)
print("Done replacing currency symbols")
