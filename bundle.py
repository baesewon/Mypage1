import re
import os

base_dir = r"C:\Users\Administrator\.gemini\antigravity\scratch\food-expiry-app\js"

def strip_exports_imports(content):
    # remove import statements
    content = re.sub(r"import\s+.*?from\s+['\"].*?['\"];?\n?", "", content)
    # remove export keywords
    content = re.sub(r"export\s+(const|let|var|function|class)\s+", r"\1 ", content)
    content = re.sub(r"export\s+default\s+", "", content)
    content = re.sub(r"export\s*\{[^}]*\};?\n?", "", content)
    return content

files = ["storage.js", "foodService.js", "sampleData.js", "notificationService.js", "views.js", "app.js"]

bundle_parts = []
bundle_parts.append("/**\n * FreshKeeper Bundle - File Protocol & HTTP Compatible\n */\n(function() {\n'use strict';\n")

for f in files:
    path = os.path.join(base_dir, f)
    with open(path, "r", encoding="utf-8") as fp:
        raw = fp.read()
    cleaned = strip_exports_imports(raw)
    bundle_parts.append(f"// --- {f} ---\n" + cleaned + "\n")

bundle_parts.append("\n})();\n")

bundle_content = "\n".join(bundle_parts)

out_path = os.path.join(base_dir, "bundle.js")
with open(out_path, "w", encoding="utf-8") as fp:
    fp.write(bundle_content)

print(f"bundle.js generated successfully! Size: {len(bundle_content)} bytes")
