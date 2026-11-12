"""PreToolUse hook that requires user approval before any file write or edit."""

import json
import sys


def main() -> None:
    """Read tool call payload from stdin and emit a force_ask decision."""
    raw = sys.stdin.read().strip()
    target = ""
    if raw:
        try:
            payload = json.loads(raw)
            args = payload.get("toolCall", {}).get("args", {})
            target = (
                args.get("Path")
                or args.get("TargetFile")
                or args.get("AbsolutePath")
                or ""
            )
        except json.JSONDecodeError:
            pass

    reason = (
        f"Approve file modification: {target}"
        if target
        else "Approve file modification before writing."
    )
    print(json.dumps({"decision": "force_ask", "reason": reason}))


if __name__ == "__main__":
    main()

