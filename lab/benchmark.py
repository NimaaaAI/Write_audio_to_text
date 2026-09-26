import time
from pathlib import Path
import soundfile as sf
import torch
from transformers import pipeline

if torch.cuda.is_available():
    device = "cuda:0"                      # NVIDIA, not present on a Mac
elif torch.backends.mps.is_available():
    device = "mps"                         # the Mac's own GPU
else:
    device = "cpu"

model_name = "openai/whisper-large-v3-turbo"
# model_name = "openai/whisper-large-v3"
# model_name = "vhdm/whisper-large-fa-v1"
# model_name = "aictsharif/whisper-small-fa"
# model_name = "aictsharif/whisper-tiny-fa"
# model_name = "openai/whisper-small"
# model_name = "openai/whisper-base"

clip_name = "pod1_ex"

pipe = pipeline(
    "automatic-speech-recognition",
    model=model_name,
    device=device,
    generate_kwargs={
        "language": "persian",
        "task": "transcribe",
        "temperature": 0.0,
        "condition_on_prev_tokens": True,
    },
)

audio, samplerate = sf.read(f"data/clips/{clip_name}.wav", dtype="float32")

start_time = time.time()
result = pipe(
    {"raw": audio, "sampling_rate": samplerate},
    return_timestamps=True,
)
elapsed = time.time() - start_time

audio_seconds = len(audio) / samplerate


def clock(seconds):
    """Seconds as m:ss. The last segment sometimes has no end time, hence None."""
    if seconds is None:
        return " ? "
    return f"{int(seconds) // 60}:{int(seconds) % 60:02d}"


report = [
    f"model      : {model_name}",
    f"clip       : {clip_name}.wav",
    f"device     : {device}",
    f"audio      : {audio_seconds:.1f} s",
    f"took       : {elapsed:.1f} s",
    # Below 1.0 means faster than real time: 0.5 is twice as fast as listening.
    f"speed      : {elapsed / audio_seconds:.2f} x real time",
    "",
    "=" * 60,
    "SEGMENTS (listen along with these timestamps)",
    "=" * 60,
    "",
]

for chunk in result["chunks"]:
    start_at, end_at = chunk["timestamp"]
    report.append(f"[{clock(start_at)} - {clock(end_at)}]  {chunk['text'].strip()}")

report += ["", "=" * 60, "FULL TEXT", "=" * 60, "", result["text"].strip(), ""]

out_path = Path("data/transcripts") / f"{clip_name}_{model_name.split('/')[-1]}.txt"
out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text("\n".join(report), encoding="utf-8")

print("\n".join(report))
print(f"written to {out_path}")
