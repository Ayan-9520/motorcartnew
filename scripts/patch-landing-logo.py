import re
from pathlib import Path

p = Path(__file__).resolve().parents[1] / "index.html"
t = p.read_text(encoding="utf-8")
new, n = re.subn(
    r'src="data:image/png;base64,[^"]+"',
    'src="motorcart-logo.png"',
    t,
)
print("logo replacements", n)
if "motorcart-icon.png" not in new[:900]:
    new = new.replace(
        "<title>",
        '<link rel="icon" type="image/png" href="motorcart-icon.png" />\n  <title>',
        1,
    )
    print("added favicon")
p.write_text(new, encoding="utf-8")
print("ok", p)
