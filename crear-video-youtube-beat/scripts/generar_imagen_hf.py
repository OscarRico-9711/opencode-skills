import argparse, sys, json, os
from huggingface_hub import InferenceClient

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--prompt', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--width', type=int, default=1344)
    parser.add_argument('--height', type=int, default=768)
    parser.add_argument('--api-key')
    args = parser.parse_args()

    api_key = args.api_key or os.environ.get('HF_TOKEN')
    if not api_key:
        api_keys_file = os.path.join(os.environ.get('USERPROFILE', ''), '.opencode', 'api_keys.json')
        if os.path.exists(api_keys_file):
            with open(api_keys_file) as f:
                keys = json.load(f)
            api_key = keys.get('huggingface')

    if not api_key:
        print("FAIL:No HuggingFace API key found", file=sys.stderr)
        sys.exit(1)

    attempts = [
        {'provider': 'together', 'model': 'black-forest-labs/FLUX.1-schnell'},
        {'provider': None, 'model': None},
        {'provider': 'hf-inference', 'model': None},
    ]

    for attempt in attempts:
        try:
            client = InferenceClient(
                token=api_key,
                provider=attempt['provider'] if attempt['provider'] else None
            )
            kwargs = {'prompt': args.prompt, 'width': args.width, 'height': args.height}
            if attempt['model']:
                kwargs['model'] = attempt['model']
            image = client.text_to_image(**kwargs)
            os.makedirs(os.path.dirname(args.output), exist_ok=True)
            image.save(args.output)
            print(f"OK:{args.output}")
            return
        except Exception as e:
            print(f"Attempt {attempt} failed: {e}", file=sys.stderr)
            continue

    print("FAIL:All image generation attempts failed", file=sys.stderr)
    sys.exit(1)

if __name__ == '__main__':
    main()
