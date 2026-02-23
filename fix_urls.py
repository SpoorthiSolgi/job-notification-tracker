import re

with open("src/data.js", "r", encoding="utf-8") as f:
    content = f.read()

def replace_url(match):
    company = match.group(1)
    title = match.group(2)
    # Generate a LinkedIn search URL instead of a fake 404 URL
    import urllib.parse
    query = urllib.parse.quote(f"{company} {title}")
    return f'company: "{company}",\n        location:{match.group(3)}mode:{match.group(4)}experience:{match.group(5)}skills:{match.group(6)}source:{match.group(7)}postedDaysAgo:{match.group(8)}salaryRange:{match.group(9)}applyUrl: "https://www.linkedin.com/jobs/search/?keywords={query}"'

# A more robust regex replacement instead of the one above:
# Let's just find the company block:
def process_data(text):
    blocks = text.split('{')
    for i in range(1, len(blocks)):
        if 'company: "' in blocks[i] and 'title: "' in blocks[i]:
            company = re.search(r'company:\s*"([^"]+)"', blocks[i])
            title = re.search(r'title:\s*"([^"]+)"', blocks[i])
            if company and title:
                c_val = company.group(1)
                t_val = title.group(1)
                import urllib.parse
                search = urllib.parse.quote(f"{c_val} {t_val} jobs")
                new_url = f'https://www.linkedin.com/jobs/search/?keywords={search}'
                # Replace the applyUrl field
                blocks[i] = re.sub(r'applyUrl:\s*"[^"]+"', f'applyUrl: "{new_url}"', blocks[i])
    return "{".join(blocks)

new_content = process_data(content)
with open("src/data.js", "w", encoding="utf-8") as f:
    f.write(new_content)

print("Updated data.js with real LinkedIn search URLs.")
