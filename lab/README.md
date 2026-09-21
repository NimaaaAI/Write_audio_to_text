# Model lab

Python scripts that measure which speech recognition model and variant to ship in
the app. They run only on the development Mac. Nothing here is used by the web app
at runtime. See CLAUDE.md section 7 for the goals and the candidate models.

## Setup

```bash
source .venv/bin/activate
pip install -r lab/requirements.txt
```

## Test data layout

Everything under `lab/data/` is git ignored. It holds private recordings and
third party podcasts, so it must never be committed or moved elsewhere.

```
lab/data/
├─ raw/          originals exactly as downloaded or recorded, any format
└─ clips/        converted 16 kHz mono wav files, plus reference transcripts
   ├─ mic1.wav
   ├─ mic1.txt       reference transcript for mic1.wav
   ├─ pod1_ex.wav
   ├─ pod1_ex.txt    reference transcript for the excerpt
   └─ pod1_full.wav  no .txt: measured for speed only
```

A clip and its transcript are paired by file name. A `.wav` with a matching `.txt`
is scored for accuracy (WER, CER) and speed. A `.wav` without one is measured for
speed only.

## File naming

Lowercase letters, digits and underscores only. No spaces, no Persian characters in
file names.

| Name | Meaning |
|---|---|
| `mic1`, `mic2`, ... | recorded by the owner on a phone or in the browser |
| `pod1_full`, `pod2_full`, ... | a whole podcast episode, speed only |
| `pod1_ex`, `pod2_ex`, ... | a 2 to 3 minute excerpt of that episode, with a transcript |

The prefix lets the benchmark report results per source, since studio podcasts and
phone recordings are expected to behave differently.

## Converting audio

Every clip is converted once to 16 kHz, mono, 16 bit PCM wav, the input Whisper
expects. After that, every model reads identical audio, so decoding differences
cannot affect the comparison.

Run these from the repository root.

Whole file:

```bash
ffmpeg -i lab/data/raw/episode.mp3 -vn -ac 1 -ar 16000 -c:a pcm_s16le lab/data/clips/pod1_full.wav
```

Excerpt, here 150 seconds starting at 3 minutes:

```bash
ffmpeg -ss 00:03:00 -t 150 -i lab/data/raw/episode.mp3 -vn -ac 1 -ar 16000 -c:a pcm_s16le lab/data/clips/pod1_ex.wav
```

What the options do:

| Option | Meaning |
|---|---|
| `-ss 00:03:00` | start at 3 minutes (placed before `-i` so ffmpeg seeks quickly) |
| `-t 150` | keep 150 seconds |
| `-vn` | drop any video stream (needed for `.mp4` files, harmless otherwise) |
| `-ac 1` | mix down to one channel |
| `-ar 16000` | resample to 16 kHz |
| `-c:a pcm_s16le` | uncompressed 16 bit wav |

Check a result with:

```bash
ffprobe -hide_banner lab/data/clips/pod1_ex.wav
```

It should report `16000 Hz, mono`.

## Choosing excerpts

1. 2 to 3 minutes each. Long enough for a stable error rate, short enough to type.
2. Start and end at a sentence boundary, so no word is cut in half.
3. Skip intros and jingles. Pick ordinary conversation.
4. At least one excerpt with music playing under the speech. That is where models
   differ most.
5. If a section contains words you cannot make out yourself, choose a different
   section rather than guessing.

## Writing reference transcripts

One UTF-8 plain text file per clip, in Persian, same name as the clip with `.txt`.
Line breaks are allowed anywhere and are ignored during scoring.

Be strict about **words**:

1. Type what was said, not the formal written form. If the speaker said چطوره,
   write چطوره, not چطور است.
2. Leave out filler sounds such as اِم and اِه. Keep real words, including words a
   speaker repeats.
3. Write English words the way a Persian writer would, in Persian script.
4. Write numbers the way you would normally write them in Persian text.

Do not worry about **spelling details**. `normalize.py` removes all of these from
both the transcript and the model output before scoring:

1. Arabic ي and ك versus Persian ی and ک
2. half spaces versus full spaces
3. punctuation
4. diacritics and tatweel
5. Persian versus Latin digits

A useful habit: play the audio at 0.75 speed while typing, then listen once more at
normal speed while reading your transcript.
