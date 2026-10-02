from pathlib import Path
import hashlib, json, re, sys

ROOT = Path(__file__).resolve().parents[1]
BASELINE = ROOT / "03-test/a5c3-evidence/index-protected-functions-v2.json"
ALLOWLIST = ROOT / "03-test/vector-integrity-allowlist.json"

def sha(text): return hashlib.sha256(text.encode()).hexdigest()

def function_segment(source, symbol):
    match = re.search(rf"^(?:async )?function {re.escape(symbol)}\(", source, re.M)
    if not match: raise ValueError(f"missing function: {symbol}")
    brace = source.find("{", match.end())
    depth, i, state, regex_allowed = 0, brace, "code", True
    while i < len(source):
        c, n = source[i], source[i + 1] if i + 1 < len(source) else ""
        if state == "line":
            if c == "\n": state = "code"
        elif state == "block":
            if c == "*" and n == "/": state, i = "code", i + 1
        elif state in ("single", "double", "template", "regex"):
            close = {"single":"'", "double":'"', "template":"`", "regex":"/"}[state]
            if c == "\\": i += 1
            elif c == close: state, regex_allowed = "code", False
            elif state == "regex" and c == "[":
                i += 1
                while i < len(source) and source[i] != "]":
                    if source[i] == "\\": i += 1
                    i += 1
        elif c == "/" and n == "/": state, i = "line", i + 1
        elif c == "/" and n == "*": state, i = "block", i + 1
        elif c in "'\"`": state = {"'":"single", '"':"double", "`":"template"}[c]
        elif c == "/" and regex_allowed: state = "regex"
        elif c == "{": depth, regex_allowed = depth + 1, True
        elif c == "}":
            depth -= 1
            if depth == 0: return source[match.start():i + 1]
            regex_allowed = False
        elif not c.isspace(): regex_allowed = c in "(=:[,!&|?;{}"
        i += 1
    raise ValueError(f"unclosed function: {symbol}")

baseline = json.loads(BASELINE.read_text(encoding="utf-8"))["functions"]
allow = json.loads(ALLOWLIST.read_text(encoding="utf-8"))["changes"]
allowed = {row["symbol"]: row for row in allow}
live = (ROOT / "index.html").read_text(encoding="utf-8")
changed = {row["symbol"]: sha(function_segment(live, row["symbol"])) for row in baseline if sha(function_segment(live, row["symbol"])) != row["sha256"]}
allowed_changed = [{"symbol": name, "sha256": digest} for name, digest in changed.items() if name in allowed and allowed[name]["new_sha256"] == digest]
unexpected_changed = [{"symbol": name, "sha256": digest} for name, digest in changed.items() if name not in allowed or allowed[name]["new_sha256"] != digest]
allowed_but_unchanged = [{"symbol": name} for name in allowed if name not in changed]
result = {"allowed_changed": allowed_changed, "unexpected_changed": unexpected_changed, "allowed_but_unchanged": allowed_but_unchanged}
print(json.dumps(result, ensure_ascii=False))
sys.exit(1 if unexpected_changed else 0)
