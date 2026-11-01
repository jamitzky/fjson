"""Run a JSON program with `python -m fjson program.json`."""

import argparse
import json
import sys
from pathlib import Path

from .interpreter import FjsonError, Interpreter


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate an FJ@ JSON program")
    parser.add_argument("program", type=Path, help="UTF-8 JSON program")
    args = parser.parse_args()
    try:
        source = args.program.read_text(encoding="utf-8")
        result = Interpreter().run(source)
        print(json.dumps(result, ensure_ascii=False, allow_nan=False))
    except (OSError, ValueError, FjsonError) as exc:
        print(f"fjson: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

