import argparse
import json
import os
import sys
import urllib.request
import urllib.parse
import time
from io import BytesIO
from PIL import Image


BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"


def load_api_key(field):
    f = os.path.join(os.environ.get("USERPROFILE", ""), ".opencode", "api_keys.json")
    if os.path.exists(f):
        try:
            with open(f, encoding="utf-8") as fh:
                return json.load(fh).get(field)
        except Exception:
            return None
    return None


def save_image(data, out_path):
    img = Image.open(BytesIO(data))
    img.load()
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    img.save(out_path, "PNG")
    return img.size


def pollinations(prompt, width, height, out_path, timeout):
    url = (
        "https://image.pollinations.ai/prompt/"
        + urllib.parse.quote(prompt)
        + f"?width={width}&height={height}&model=flux&nologo=true"
    )
    req = urllib.request.Request(url, headers={"User-Agent": BROWSER_UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = r.read()
    if len(data) < 2000:
        raise RuntimeError("Pollinations response too small")
    size = save_image(data, out_path)
    return size


def huggingface(prompt, width, height, out_path, token, timeout):
    try:
        from huggingface_hub import InferenceClient
    except ImportError as e:
        raise RuntimeError(f"huggingface_hub not installed: {e}")

    attempts = [
        {"provider": "together", "model": "black-forest-labs/FLUX.1-schnell"},
        {"provider": None, "model": None},
        {"provider": "hf-inference", "model": None},
    ]
    last = None
    for attempt in attempts:
        try:
            client = InferenceClient(token=token, provider=attempt["provider"] or None)
            kwargs = {"prompt": prompt, "width": width, "height": height}
            if attempt["model"]:
                kwargs["model"] = attempt["model"]
            image = client.text_to_image(**kwargs)
            image.save(out_path)
            return image.size
        except Exception as e:
            last = e
            continue
    raise RuntimeError(f"Hugging Face failed: {last}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--width", type=int, default=1344)
    parser.add_argument("--height", type=int, default=768)
    parser.add_argument("--api-key")
    parser.add_argument("--timeout", type=int, default=180)
    args = parser.parse_args()

    token = args.api_key or os.environ.get("HF_TOKEN") or load_api_key("huggingface")
    openai_key = load_api_key("openai")

    providers = []
    providers.append(("pollinations", lambda: pollinations(args.prompt, args.width, args.height, args.output, args.timeout)))
    if token:
        providers.append(("huggingface", lambda: huggingface(args.prompt, args.width, args.height, args.output, token, args.timeout)))
    if openai_key:
        providers.append(("openai", lambda: _openai(openai_key)))

    if not providers:
        print("FAIL:No API providers configured", file=sys.stderr)
        sys.exit(1)

    for name, fn in providers:
        try:
            size = fn()
            print(f"OK:{args.output}")
            print(f"PROVIDER:{name} SIZE:{size[0]}x{size[1]}")
            return
        except Exception as e:
            print(f"Attempt {name} failed: {e}", file=sys.stderr)
            continue

    print("FAIL:All image generation providers failed", file=sys.stderr)
    sys.exit(1)


def _openai(key):
    raise RuntimeError("OpenAI fallback not enabled (openai package not installed)")


if __name__ == "__main__":
    main()
