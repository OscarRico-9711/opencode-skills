import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np


DEFAULT_FORMATS = "mp3,wav,flac,m4a,aiff,aif"
DEFAULT_FFMPEG = Path(r"D:\ffmpeg\bin\ffmpeg.exe")


def find_ffmpeg() -> str:
    if DEFAULT_FFMPEG.exists():
        return str(DEFAULT_FFMPEG)
    found = shutil.which("ffmpeg")
    if found:
        return found
    raise SystemExit("No encontre ffmpeg. Revisa D:\\ffmpeg\\bin\\ffmpeg.exe o instala ffmpeg en PATH.")


def split_terms(value: str) -> list[str]:
    return [x.strip() for x in value.split(",") if x.strip()]


def iter_candidates(folder: Path, formats: list[str], recursive: bool) -> list[Path]:
    files: list[Path] = []
    patterns = [f"*.{fmt.lower().lstrip('.')}" for fmt in formats]
    for pattern in patterns:
        files.extend(folder.rglob(pattern) if recursive else folder.glob(pattern))
    return sorted(set(files), key=lambda p: str(p).lower())


def keep_by_name(path: Path, exclude: list[str], include: list[str]) -> bool:
    name = path.name.lower()
    if any(term.lower() in name for term in exclude):
        return False
    if include and not any(term.lower() in name for term in include):
        return False
    return True


def load_audio(ffmpeg: str, path: Path, seconds: float, sr: int) -> np.ndarray | None:
    cmd = [
        ffmpeg,
        "-v",
        "error",
        "-t",
        str(seconds),
        "-i",
        str(path),
        "-ac",
        "1",
        "-ar",
        str(sr),
        "-f",
        "s16le",
        "-",
    ]
    try:
        raw = subprocess.check_output(cmd, stderr=subprocess.DEVNULL, timeout=60)
    except Exception:
        return None
    if len(raw) < sr * 2:
        return None
    return np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0


def energy_feature(audio: np.ndarray, sr: int) -> np.ndarray | None:
    hop = max(1, sr // 20)
    usable = (len(audio) // hop) * hop
    if usable < hop * 20:
        return None
    frames = audio[:usable].reshape(-1, hop)
    feat = np.sqrt(np.mean(frames * frames, axis=1) + 1e-9)
    return normalize(feat)


def spectral_feature(audio: np.ndarray, sr: int) -> np.ndarray | None:
    nfft = 1024
    hop = 512
    if len(audio) < nfft * 4:
        return None
    window = np.hanning(nfft).astype(np.float32)
    rows = []
    for start in range(0, len(audio) - nfft, hop):
        mag = np.abs(np.fft.rfft(audio[start : start + nfft] * window))
        bands = np.array_split(np.log1p(mag[3:260]), 24)
        rows.append([float(np.mean(band)) for band in bands])
    if not rows:
        return None
    matrix = np.array(rows, dtype=np.float32)
    return normalize(matrix, axis=0)


def normalize(value: np.ndarray, axis=None) -> np.ndarray:
    return (value - np.mean(value, axis=axis, keepdims=True)) / (np.std(value, axis=axis, keepdims=True) + 1e-9)


def mean_product(a: np.ndarray, b: np.ndarray) -> float:
    n = min(len(a), len(b))
    if n < 10:
        return -9.0
    return float(np.mean(a[:n] * b[:n]))


def best_match(reference: np.ndarray | None, candidate: np.ndarray | None) -> float:
    if reference is None or candidate is None:
        return -9.0
    if len(candidate) <= len(reference):
        return mean_product(reference, candidate)
    step = max(1, len(reference) // 20)
    best = -9.0
    limit = len(candidate) - len(reference) + 1
    for start in range(0, limit, step):
        best = max(best, mean_product(reference, candidate[start : start + len(reference)]))
    return best


def name_hint(path: Path) -> float:
    name = path.name.lower()
    score = 0.0
    if re.search(r"\b\d{2,3}\s*bpm\b", name):
        score += 0.03
    if re.search(r"\b\d{2,4}\b", name):
        score += 0.015
    if "pista" in name:
        score += 0.015
    return score


def copy_top(results: list[tuple[float, float, float, Path]], output: Path, amount: int) -> None:
    output.mkdir(parents=True, exist_ok=True)
    for idx, (_, _, _, path) in enumerate(results[:amount], 1):
        target = output / f"{idx:02d}_{path.name}"
        if not target.exists():
            shutil.copy2(path, target)


def main() -> int:
    parser = argparse.ArgumentParser(description="Busca audios locales parecidos a una muestra.")
    parser.add_argument("--sample", required=True, help="Audio de referencia")
    parser.add_argument("--folder", required=True, help="Carpeta donde buscar")
    parser.add_argument("--formats", default=DEFAULT_FORMATS, help="Formatos separados por coma")
    parser.add_argument("--exclude", default="", help="Palabras a omitir, separadas por coma")
    parser.add_argument("--include", default="", help="Palabras requeridas opcionales, separadas por coma")
    parser.add_argument("--top", type=int, default=3, help="Cantidad de resultados")
    parser.add_argument("--sample-seconds", type=float, default=60.0, help="Segundos de la muestra a usar")
    parser.add_argument("--candidate-seconds", type=float, default=240.0, help="Segundos de cada candidato a analizar")
    parser.add_argument("--sr", type=int, default=11025, help="Sample rate interno")
    parser.add_argument("--no-recursive", action="store_true", help="No buscar en subcarpetas")
    parser.add_argument("--copy-top", default="", help="Copia los mejores candidatos a esta carpeta")
    args = parser.parse_args()

    sample = Path(args.sample)
    folder = Path(args.folder)
    if not sample.exists():
        print(f"No existe la muestra: {sample}", file=sys.stderr)
        return 2
    if not folder.exists():
        print(f"No existe la carpeta: {folder}", file=sys.stderr)
        return 2

    ffmpeg = find_ffmpeg()
    formats = split_terms(args.formats)
    exclude = split_terms(args.exclude)
    include = split_terms(args.include)
    candidates = [p for p in iter_candidates(folder, formats, not args.no_recursive) if keep_by_name(p, exclude, include)]

    print(f"Candidatos despues del filtro: {len(candidates)}")
    if not candidates:
        return 0

    ref_audio = load_audio(ffmpeg, sample, args.sample_seconds, args.sr)
    if ref_audio is None:
        print("No pude leer la muestra con ffmpeg.", file=sys.stderr)
        return 3

    ref_energy = energy_feature(ref_audio, args.sr)
    ref_spectral = spectral_feature(ref_audio, args.sr)
    results: list[tuple[float, float, float, Path]] = []

    for idx, path in enumerate(candidates, 1):
        audio = load_audio(ffmpeg, path, args.candidate_seconds, args.sr)
        if audio is None:
            continue
        energy = best_match(ref_energy, energy_feature(audio, args.sr))
        spectral = best_match(ref_spectral, spectral_feature(audio, args.sr))
        total = (spectral * 0.70) + (energy * 0.30) + name_hint(path)
        results.append((total, spectral, energy, path))
        if idx % 100 == 0:
            print(f"Analizados: {idx}/{len(candidates)}")

    results.sort(reverse=True, key=lambda item: item[0])
    print("\nTOP CANDIDATOS")
    for total, spectral, energy, path in results[: args.top]:
        print(f"TOTAL:{total:.4f}\tSPEC:{spectral:.4f}\tENV:{energy:.4f}\t{path}")

    if args.copy_top:
        copy_top(results, Path(args.copy_top), min(args.top, len(results)))
        print(f"\nCopiados a: {args.copy_top}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
