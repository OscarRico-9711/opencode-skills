import argparse
import csv
import math
import random
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf


def seconds_to_tag(seconds: float) -> str:
    total = int(round(seconds))
    minutes, secs = divmod(total, 60)
    return f"{minutes:02d}m{secs:02d}s"


def safe_name(value: str) -> str:
    keep = []
    for char in value:
        keep.append(char if char.isalnum() or char in "._- " else "_")
    return "".join(keep).strip().replace(" ", "_")


def short_output_prefix(stem: str) -> str:
    parts = []
    current = []
    for char in stem:
        if char.isdigit():
            current.append(char)
        elif current:
            parts.append("".join(current))
            current = []
    if current:
        parts.append("".join(current))

    if len(parts) >= 3 and len(parts[2]) == 4:
        day = parts[0].zfill(2)[-2:]
        month = parts[1].zfill(2)[-2:]
        year = parts[2][-2:]
        return f"drums_{day}{month}{year}"

    compact = safe_name(stem).lower()
    compact = "".join(char for char in compact if char.isalnum() or char == "_")
    return compact[:18] or "drums"


def normalize_audio(audio: np.ndarray) -> np.ndarray:
    peak = float(np.max(np.abs(audio))) if audio.size else 0.0
    if peak <= 0:
        return audio.astype(np.float32)
    return (audio / peak * 0.98).astype(np.float32)


def frame_intervals(active: np.ndarray, frame_times: np.ndarray, merge_gap: float, min_duration: float) -> list[tuple[float, float]]:
    intervals = []
    start = None
    last = None
    frame_step = float(np.median(np.diff(frame_times))) if len(frame_times) > 1 else 0.05

    for is_active, time in zip(active, frame_times):
        if is_active and start is None:
            start = float(time)
        if is_active:
            last = float(time)
        if not is_active and start is not None:
            intervals.append((start, float(last or start) + frame_step))
            start = None
            last = None
    if start is not None:
        intervals.append((start, float(last or start) + frame_step))

    merged = []
    for start, end in intervals:
        if not merged or start - merged[-1][1] > merge_gap:
            merged.append([start, end])
        else:
            merged[-1][1] = end

    return [(start, end) for start, end in merged if end - start >= min_duration]


def score_window(onset_env: np.ndarray, rms: np.ndarray, frame_times: np.ndarray, start: float, end: float, silence_floor: float) -> tuple[float, float]:
    mask = (frame_times >= start) & (frame_times < end)
    if not np.any(mask):
        return -999.0, 1.0
    onset_score = float(np.mean(onset_env[mask]) + np.max(onset_env[mask]) * 0.35)
    energy_score = float(np.mean(rms[mask]) + np.max(rms[mask]) * 0.35)
    silence_ratio = float(np.mean(rms[mask] < silence_floor))
    return (onset_score * 0.75) + (energy_score * 25.0) - (silence_ratio * 0.75), silence_ratio


def local_strength(values: np.ndarray, frame_times: np.ndarray, start: float, end: float) -> float:
    mask = (frame_times >= start) & (frame_times < end)
    if not np.any(mask):
        return 0.0
    return float(np.max(values[mask]))


def density_above(values: np.ndarray, frame_times: np.ndarray, start: float, end: float, threshold: float) -> float:
    mask = (frame_times >= start) & (frame_times < end)
    if not np.any(mask):
        return 0.0
    return float(np.mean(values[mask] > threshold))


def spectral_drum_metrics(audio: np.ndarray, sr: int) -> tuple[float, float, float]:
    if audio.size < 128:
        return 0.0, 0.0, 0.0
    spectrum = np.abs(librosa.stft(audio, n_fft=2048, hop_length=512))
    harmonic, percussive = librosa.decompose.hpss(spectrum)
    total = float(np.sum(spectrum)) + 1e-9
    percussive_ratio = float(np.sum(percussive) / (np.sum(harmonic) + np.sum(percussive) + 1e-9))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
    low_ratio = float(np.sum(spectrum[freqs < 180]) / total)
    mid_ratio = float(np.sum(spectrum[(freqs >= 180) & (freqs < 2500)]) / total)
    return percussive_ratio, low_ratio, mid_ratio


def attack_kick_metrics(audio: np.ndarray, sr: int) -> tuple[float, float, float, float]:
    if audio.size < 128:
        return 0.0, 0.0, 0.0, 0.0
    spectrum = np.abs(librosa.stft(audio, n_fft=2048, hop_length=512))
    total = float(np.sum(spectrum)) + 1e-9
    freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
    sub_ratio = float(np.sum(spectrum[freqs < 90]) / total)
    low_ratio = float(np.sum(spectrum[freqs < 140]) / total)
    mid_ratio = float(np.sum(spectrum[(freqs >= 180) & (freqs < 2500)]) / total)
    high_ratio = float(np.sum(spectrum[freqs >= 2500]) / total)
    return sub_ratio, low_ratio, mid_ratio, high_ratio


def snap_to_drum_start(
    onset_env: np.ndarray,
    rms: np.ndarray,
    frame_times: np.ndarray,
    start: float,
    search_before: float,
    search_after: float,
) -> tuple[float, float, float]:
    search_start = max(0.0, start - search_before)
    search_end = start + search_after
    mask = (frame_times >= search_start) & (frame_times <= search_end)
    if not np.any(mask):
        return start, 0.0, 0.0

    local_onsets = onset_env[mask]
    local_rms = rms[mask]
    local_times = frame_times[mask]
    combined = local_onsets + (local_rms * 20.0)
    best_idx = int(np.argmax(combined))
    snapped = float(local_times[best_idx])
    return snapped, float(local_onsets[best_idx]), float(snapped - start)


def adjust_tempo_and_beats(tempo: float, beat_times: np.ndarray) -> tuple[float, np.ndarray, str]:
    note = "normal"
    if tempo >= 160 and len(beat_times) > 8:
        return tempo / 2.0, beat_times[::2], "half-time"
    if tempo < 60 and len(beat_times) > 2:
        return tempo * 2.0, beat_times, "double-time-label"
    return tempo, beat_times, note


def detect_section_candidates(y: np.ndarray, sr: int, args: argparse.Namespace) -> tuple[list[dict], float]:
    hop_length = 512
    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop_length)
    rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]
    frame_times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop_length)

    rms_threshold = max(float(np.percentile(rms, args.energy_percentile)), 1e-6)
    onset_threshold = max(float(np.percentile(onset_env, args.onset_percentile)), 1e-6)
    active = (rms >= rms_threshold) | (onset_env >= onset_threshold)
    intervals = frame_intervals(active, frame_times, args.merge_gap, args.min_section_seconds)
    silence_floor = max(float(np.percentile(rms, 30)), 1e-6)
    transient_floor = max(float(np.percentile(onset_env, 75)), 1e-6)

    candidates = []
    for section_index, (section_start, section_end) in enumerate(intervals, start=1):
        start_sample = max(0, int(section_start * sr))
        end_sample = min(len(y), int(section_end * sr))
        section = y[start_sample:end_sample]
        if len(section) < sr * args.min_section_seconds:
            continue

        tempo, beat_frames = librosa.beat.beat_track(y=section, sr=sr, units="frames", trim=False)
        tempo = float(np.asarray(tempo).reshape(-1)[0])
        local_beats = librosa.frames_to_time(beat_frames, sr=sr)
        tempo, local_beats, tempo_note = adjust_tempo_and_beats(tempo, local_beats)
        beat_times = local_beats + section_start

        min_required_beats = 2 if args.allow_half_bar else args.min_bars * 4
        if len(beat_times) < min_required_beats + 1:
            continue

        possible_lengths = [
            (f"{bars}bars", bars * 4, bars)
            for bars in [8, 4, 2, 1]
            if args.min_bars <= bars <= args.max_bars and len(beat_times) >= bars * 4 + 1
        ]
        if args.allow_half_bar and len(beat_times) >= 3:
            possible_lengths.append(("halfbar", 2, 0.5))
        if not possible_lengths:
            continue

        best = None
        for length_label, beats_per_loop, bars in possible_lengths:
            for start_idx in range(0, len(beat_times) - beats_per_loop):
                raw_start = float(beat_times[start_idx])
                raw_end = float(beat_times[start_idx + beats_per_loop])
                raw_duration = raw_end - raw_start
                snapped_start, first_onset, start_offset = snap_to_drum_start(
                    onset_env,
                    rms,
                    frame_times,
                    raw_start,
                    args.snap_before,
                    args.snap_after,
                )
                loop_start = max(0.0, snapped_start - args.pre_roll)
                loop_end = loop_start + raw_duration
                if loop_start < section_start - 0.1 or loop_end > section_end + 0.35 or loop_end <= loop_start:
                    continue
                score, silence_ratio = score_window(onset_env, rms, frame_times, loop_start, loop_end, silence_floor)
                attack_energy = local_strength(rms, frame_times, loop_start, loop_start + 0.18)
                if first_onset < args.min_start_onset and attack_energy < silence_floor * 1.8:
                    continue
                first_second_onset_density = density_above(onset_env, frame_times, loop_start, min(loop_end, loop_start + 1.0), transient_floor)
                loop_onset_density = density_above(onset_env, frame_times, loop_start, loop_end, transient_floor)
                if first_second_onset_density < args.min_first_second_onset_density:
                    continue
                first_start_sample = max(0, int(loop_start * sr))
                first_end_sample = min(len(y), int(min(loop_end, loop_start + 1.0) * sr))
                first_percussive_ratio, first_low_ratio, first_mid_ratio = spectral_drum_metrics(y[first_start_sample:first_end_sample], sr)
                attack_end_sample = min(len(y), int(min(loop_end, loop_start + args.attack_window) * sr))
                attack_sub_ratio, attack_low_ratio, attack_mid_ratio, attack_high_ratio = attack_kick_metrics(y[first_start_sample:attack_end_sample], sr)
                if first_percussive_ratio < args.min_first_second_percussive_ratio:
                    continue
                if first_low_ratio < args.min_first_second_low_ratio:
                    continue
                if first_mid_ratio > args.max_first_second_mid_ratio:
                    continue
                if attack_low_ratio < args.min_attack_low_ratio:
                    continue
                if attack_mid_ratio > args.max_attack_mid_ratio:
                    continue
                loop_start_sample = max(0, int(loop_start * sr))
                loop_end_sample = min(len(y), int(loop_end * sr))
                loop_percussive_ratio, loop_low_ratio, loop_mid_ratio = spectral_drum_metrics(y[loop_start_sample:loop_end_sample], sr)
                harmonic_penalty = max(0.0, 1.0 - loop_percussive_ratio)
                clean_score = (loop_percussive_ratio * 2.0) + loop_low_ratio - (loop_mid_ratio * 1.4) - (harmonic_penalty * 0.6)
                if clean_score < args.min_clean_score:
                    continue
                if silence_ratio > args.max_silence_ratio:
                    continue
                score += first_onset * 0.9 + attack_energy * 15.0 + first_second_onset_density * 5.0 + loop_onset_density * 2.0 + first_low_ratio * 8.0 + first_percussive_ratio * 4.0 + clean_score * 8.0
                score += beats_per_loop * 0.15
                item = {
                    "section": section_index,
                    "tempo": tempo,
                    "tempo_note": tempo_note,
                    "bars": bars,
                    "length_label": length_label,
                    "start": loop_start,
                    "end": loop_end,
                    "duration": loop_end - loop_start,
                    "score": score,
                    "silence_ratio": silence_ratio,
                    "start_offset": start_offset,
                    "first_onset": first_onset,
                    "first_second_onset_density": first_second_onset_density,
                    "loop_onset_density": loop_onset_density,
                    "first_second_percussive_ratio": first_percussive_ratio,
                    "first_second_low_ratio": first_low_ratio,
                    "first_second_mid_ratio": first_mid_ratio,
                    "attack_sub_ratio": attack_sub_ratio,
                    "attack_low_ratio": attack_low_ratio,
                    "attack_mid_ratio": attack_mid_ratio,
                    "attack_high_ratio": attack_high_ratio,
                    "loop_percussive_ratio": loop_percussive_ratio,
                    "loop_low_ratio": loop_low_ratio,
                    "loop_mid_ratio": loop_mid_ratio,
                    "clean_score": clean_score,
                    "section_start": section_start,
                    "section_end": section_end,
                }
                if best is None or item["score"] > best["score"]:
                    best = item

        if best is not None:
            candidates.append(best)

    limit = None if args.max_candidates == 0 else args.max_candidates
    if args.random_sample:
        rng = random.Random(args.random_seed)
        selected = candidates[:]
        rng.shuffle(selected)
        if limit is not None:
            selected = selected[:limit]
    else:
        candidates.sort(key=lambda item: item["score"], reverse=True)
        selected = candidates if limit is None else candidates[:limit]
    selected = sorted(selected, key=lambda item: item["start"])
    return selected, silence_floor


def main() -> int:
    parser = argparse.ArgumentParser(description="Detect 4/4 loop candidates by active sections from one long audio file.")
    parser.add_argument("--input", required=True, help="Input WAV/audio file")
    parser.add_argument("--output", default=r"C:\Users\oscar\OneDrive\Escritorio\samplebase", help="Output folder")
    parser.add_argument("--max-candidates", type=int, default=0, help="Maximum loops to export; 0 exports all valid section candidates")
    parser.add_argument("--random-sample", action="store_true", help="Randomly sample candidates that pass filters instead of taking the top scores")
    parser.add_argument("--random-seed", type=int, default=None, help="Optional seed for repeatable random sampling")
    parser.add_argument("--min-bars", type=int, default=4, choices=[1, 2, 4], help="Minimum complete 4/4 bars to export")
    parser.add_argument("--max-bars", type=int, default=4, choices=[1, 2, 4, 8], help="Prefer the longest complete loop up to this many bars")
    parser.add_argument("--allow-half-bar", action=argparse.BooleanOptionalAction, default=False, help="Allow 2-beat half-bar fallback when a full 4/4 bar is not available")
    parser.add_argument("--output-prefix", default=None, help="Short filename prefix for exported WAVs")
    parser.add_argument("--min-section-seconds", type=float, default=4.0, help="Ignore active sections shorter than this")
    parser.add_argument("--merge-gap", type=float, default=2.0, help="Merge active regions separated by short gaps")
    parser.add_argument("--max-silence-ratio", type=float, default=0.45, help="Reject loops with too much silence")
    parser.add_argument("--snap-before", type=float, default=0.12, help="Seconds before a beat to search for the real drum start")
    parser.add_argument("--snap-after", type=float, default=0.28, help="Seconds after a beat to search for the real drum start")
    parser.add_argument("--pre-roll", type=float, default=0.05, help="Seconds to include before the detected drum hit")
    parser.add_argument("--min-start-onset", type=float, default=0.15, help="Reject starts without a clear drum/onset unless attack energy is high")
    parser.add_argument("--min-first-second-onset-density", type=float, default=0.30, help="Reject starts that do not keep enough transients in the first second")
    parser.add_argument("--min-first-second-percussive-ratio", type=float, default=0.35, help="Reject starts that are too harmonic/melodic in the first second")
    parser.add_argument("--min-first-second-low-ratio", type=float, default=0.28, help="Reject starts without enough low-frequency drum energy in the first second")
    parser.add_argument("--max-first-second-mid-ratio", type=float, default=0.42, help="Reject starts dominated by mid-range melodic content in the first second")
    parser.add_argument("--attack-window", type=float, default=0.35, help="Seconds used to verify the first hit behaves like a kick/drum attack")
    parser.add_argument("--min-attack-low-ratio", type=float, default=0.36, help="Reject starts whose first hit has too little kick/low-frequency energy")
    parser.add_argument("--max-attack-mid-ratio", type=float, default=0.30, help="Reject starts whose first hit is dominated by snare/melodic midrange")
    parser.add_argument("--min-clean-score", type=float, default=0.25, help="Reject loops with too much melody/harmonic content compared to drums")
    parser.add_argument("--write-report", action="store_true", help="Write CSV report next to exported WAV files")
    parser.add_argument("--energy-percentile", type=float, default=58.0, help="RMS percentile used to find active sections")
    parser.add_argument("--onset-percentile", type=float, default=65.0, help="Onset percentile used to find active sections")
    parser.add_argument("--sr", type=int, default=44100, help="Analysis/export sample rate")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_dir = Path(args.output)
    if not input_path.exists():
        raise FileNotFoundError(f"No existe el audio: {input_path}")
    output_dir.mkdir(parents=True, exist_ok=True)

    y, sr = librosa.load(str(input_path), sr=args.sr, mono=True)
    if y.size == 0:
        raise RuntimeError("El audio esta vacio o no se pudo leer.")

    base = safe_name(input_path.stem)
    output_prefix = safe_name(args.output_prefix) if args.output_prefix else short_output_prefix(input_path.stem)
    selected, _ = detect_section_candidates(y, sr, args)
    report_path = output_dir / f"{base}_loop_candidates.csv"
    report_rows = []

    for index, item in enumerate(selected, start=1):
        start_sample = max(0, int(math.floor(item["start"] * sr)))
        end_sample = min(len(y), int(math.ceil(item["end"] * sr)))
        clip = normalize_audio(y[start_sample:end_sample])
        out_name = f"{output_prefix}_{index:03d}.wav"
        out_path = output_dir / out_name
        sf.write(str(out_path), clip, sr, subtype="PCM_24")
        report_rows.append(
            {
                "file": str(out_path),
                "section": item["section"],
                "tempo_bpm": round(item["tempo"], 2),
                "tempo_note": item["tempo_note"],
                "bars": item["bars"],
                "length_label": item["length_label"],
                "start_seconds": round(item["start"], 3),
                "end_seconds": round(item["end"], 3),
                "duration_seconds": round(item["duration"], 3),
                "section_start": round(item["section_start"], 3),
                "section_end": round(item["section_end"], 3),
                "score": round(item["score"], 6),
                "silence_ratio": round(item["silence_ratio"], 4),
                "start_offset": round(item["start_offset"], 4),
                "first_onset": round(item["first_onset"], 4),
                "first_second_onset_density": round(item["first_second_onset_density"], 4),
                "loop_onset_density": round(item["loop_onset_density"], 4),
                "first_second_percussive_ratio": round(item["first_second_percussive_ratio"], 4),
                "first_second_low_ratio": round(item["first_second_low_ratio"], 4),
                "first_second_mid_ratio": round(item["first_second_mid_ratio"], 4),
                "attack_sub_ratio": round(item["attack_sub_ratio"], 4),
                "attack_low_ratio": round(item["attack_low_ratio"], 4),
                "attack_mid_ratio": round(item["attack_mid_ratio"], 4),
                "attack_high_ratio": round(item["attack_high_ratio"], 4),
                "loop_percussive_ratio": round(item["loop_percussive_ratio"], 4),
                "loop_low_ratio": round(item["loop_low_ratio"], 4),
                "loop_mid_ratio": round(item["loop_mid_ratio"], 4),
                "clean_score": round(item["clean_score"], 4),
            }
        )

    if args.write_report:
        with report_path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(report_rows[0].keys()) if report_rows else ["file"])
            writer.writeheader()
            writer.writerows(report_rows)

    print(f"Secciones/candidatos exportados: {len(selected)}")
    print(f"Salida: {output_dir}")
    if args.write_report:
        print(f"Reporte: {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
