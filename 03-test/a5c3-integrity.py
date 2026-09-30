from pathlib import Path
import hashlib, json, re, subprocess, sys

R = Path(__file__).resolve().parents[1]
O = R / "03-test/a5c3-evidence"
O.mkdir(parents=True, exist_ok=True)
OLD = R / "03-test/a5a1-evidence/index-protected-functions.json"
V2 = O / "index-protected-functions-v2.json"

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
            elif c == close: state = "code"; regex_allowed = False
            elif state == "regex" and c == "[":
                i += 1
                while i < len(source) and source[i] != "]":
                    if source[i] == "\\": i += 1
                    i += 1
        elif c == "/" and n == "/": state, i = "line", i + 1
        elif c == "/" and n == "*": state, i = "block", i + 1
        elif c in "'\"`": state = {"'":"single", '"':"double", "`":"template"}[c]
        elif c == "/" and regex_allowed: state = "regex"
        elif c == "{": depth += 1; regex_allowed = True
        elif c == "}":
            depth -= 1
            if depth == 0: return source[match.start():i + 1]
            regex_allowed = False
        elif not c.isspace(): regex_allowed = c in "(=:[,!&|?;{}"
        i += 1
    raise ValueError(f"unclosed function: {symbol}")

symbols = [x["symbol"] for x in json.loads(OLD.read_text(encoding="utf-8"))["functions"]]
if "--generate" in sys.argv:
    baseline_source = subprocess.check_output(["git", "show", "5ce6f28:index.html"], cwd=R).decode("utf-8")
    V2.write_text(json.dumps({"extraction":"balanced function body; strings/regex/comments ignored", "edgeCases":["template literal interpolation braces are treated as string content; protected set has no such boundary case"], "functions":[{"symbol":name,"sha256":sha(function_segment(baseline_source,name))} for name in symbols]}, indent=2, ensure_ascii=False), encoding="utf-8")

baseline = json.loads(V2.read_text(encoding="utf-8"))
live = (R / "index.html").read_text(encoding="utf-8")
rows = [{"name":x["symbol"], "pass":sha(function_segment(live,x["symbol"])) == x["sha256"]} for x in baseline["functions"]]
result = {"rule":"balanced function body", "checks":len(rows), "failed":[x for x in rows if not x["pass"]], "rows":rows, "edgeCases":["quoted strings, regex literals, line/block comments ignored", "template literal interpolation braces are not parsed; protected set has no such boundary case"]}
(O / "integrity-v2.json").write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
print(json.dumps({"checks":len(rows), "failed":result["failed"]}, ensure_ascii=False))
assert not result["failed"]
