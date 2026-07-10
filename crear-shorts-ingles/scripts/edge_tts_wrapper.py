import argparse
import asyncio
import sys
from pathlib import Path

try:
    import edge_tts
except ImportError:
    print("ERROR: edge-tts no instalado. pip install edge-tts", file=sys.stderr)
    sys.exit(1)


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--voice", required=True)
    parser.add_argument("--rate", default="+0%")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    text = Path(args.input).read_text(encoding="utf-8")
    communicate = edge_tts.Communicate(text, args.voice, rate=args.rate)
    await communicate.save(args.output)

    if not Path(args.output).exists():
        print(f"ERROR: No se genero audio: {args.output}", file=sys.stderr)
        sys.exit(1)


asyncio.run(main())
