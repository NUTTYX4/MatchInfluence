import re

with open('Frontend snitch.xml', 'r', encoding='utf-8') as f:
    content = f.read()

files = re.findall(r'<file path="(.*?)">(.*?)</file>', content, re.DOTALL)

css_blocks = []

for path, file_content in files:
    if not path.endswith('.html'): continue
    print(f"Processing {path}...")
    
    # Extract style
    style_match = re.search(r'<style>(.*?)</style>', file_content, re.DOTALL)
    if style_match:
        css_blocks.append(f"/* From {path} */\n{style_match.group(1).strip()}")
    
    # Extract body
    body_match = re.search(r'<body[^>]*>(.*?)</body>', file_content, re.DOTALL)
    if body_match:
        body_content = body_match.group(1).strip()
        # Convert class= to className=
        body_content = re.sub(r'\bclass=', 'className=', body_content)
        # Convert for= to htmlFor=
        body_content = re.sub(r'\bfor=', 'htmlFor=', body_content)
        
        out_name = path.split('/')[0] + '.tsx_snippet'
        with open(out_name, 'w', encoding='utf-8') as out:
            out.write(body_content)

# Write aggregated CSS
with open('extracted_styles.css', 'w', encoding='utf-8') as out:
    out.write('\n\n'.join(css_blocks))

print("Extraction complete.")
