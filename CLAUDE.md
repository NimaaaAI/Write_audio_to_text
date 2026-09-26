# CLAUDE.md

Instructions for the Claude agent working on this repository. Read this whole file before doing anything, and follow it in every session.

Repository: https://github.com/NimaaaAI/Write_audio_to_text
Owner: Nima (AI and Automation engineer, strong in Python and deep learning, newer to JavaScript and web apps)
App display name: Voice Writer (Persian: صدانویس)

---

## 1. What we are building

A web app that turns Persian speech into Persian text, running entirely inside the user's browser.

The user either records their voice with the microphone or uploads an audio file. When they are done, the app transcribes it to Persian text, shows the text, and lets the user download it as `.txt` or `.docx`. A "copy for summary" button prepares the transcript together with a ready prompt, so the user can paste it into any chatbot to get a summary.

Core principles:

1. **The user's device does all the work.** There is no backend server. Speech recognition runs in the browser with transformers.js. The owner pays for nothing and hosts no compute.
2. **Privacy.** Audio and text never leave the user's device.
3. **Zero setup for users.** A friend opens a link, optionally taps "Add to Home Screen" or "Install", and uses it. No Python, no installs, no accounts.
4. **Works on phones and computers.** Android Chrome, iPhone Safari, desktop Chrome, Edge and Safari.
5. **Offline after first use.** The app shell and the model are cached, so it works in airplane mode once loaded.

---

## 2. How to work with the owner (most important section)

The owner is building this project to **learn**. Speed matters less than understanding. Follow these rules strictly:

1. **Concept before code.** Before writing any file, explain in plain words what the file does, why it is needed, and any new concept it introduces (for example: what a Web Worker is, why audio must be 16 kHz mono, what a service worker caches). Keep explanations short and concrete.
2. **One file per turn.** Create or change exactly one file, then stop. Do not create several files at once, and do not jump ahead to the next step.
3. **Wait for review.** After each file, stop and wait. The owner reads the file, asks questions, and approves before anything else happens.
4. **Give the git commands, do not run them.** After each approved file, give the exact commands, in this style:

   ```bash
   git add README.md
   git commit -m "Add README with project overview"
   git push origin main
   ```

   Rules for git: commit straight to `main`, no branches. Use `git add` with the specific file name, never `git add .` or `git add -A`. Commit messages in English, short, describing what changed. Never run git commands yourself, never force push, never rewrite history.
5. **Say how to test it.** After each step, tell the owner how to check that it works (a command to run, a page to open, what they should see).
6. **Follow the plan in section 9.** Work through the steps in order. At the start of a session, look at the checklist in section 9 to see where we are, and confirm with the owner before starting the next step. If you think the plan should change, say so and explain why, but do not change direction on your own.
7. **Be honest.** If something will not work well (a browser limitation, a model that is too weak, a memory problem on phones), say it directly. The owner prefers direct feedback over reassurance.
8. **Ask when unsure.** If a decision is not covered in this file, ask instead of guessing.

### Writing style for docs, README and comments

1. English for all code, comments, docs, README and commit messages. Persian appears only in the app interface texts, the summary prompt template, and test data.
2. **No em dashes, and no dashes joining words** in prose (write "right to left", not "right-to-left"; use commas, periods or parentheses instead). This does not apply to code, file names, package names or URLs.
3. Plain, clear sentences. No marketing tone.

---

## 3. Decisions already made

| Topic | Decision | Reason |
|---|---|---|
| Platform | Web app in the browser, installable as a PWA | Works on phones and computers with zero setup |
| Hosting (app) | GitHub Pages, deployed by GitHub Actions | Free, HTTPS (required for microphone access) |
| Hosting (model) | Loaded straight from the `onnx-community` repositories on Hugging Face, each with a pinned `revision`. No copy in the owner's account. | Keeps the GitHub repo small and avoids the 100 MB per file limit. Pinning a commit protects the app from re-exports and changes to their `main`. Copying five models would mean uploading 3 to 4 GB from Iran for very little gain, and `onnx-community` is Hugging Face's own organisation. Hugging Face is reachable from Iran without a VPN. |
| Transcription language | **Persian only.** Always force `language: "persian"` and `task: "transcribe"` | No auto detection, so no wrong guesses |
| Interface language | Persian and English with a toggle. Default: Persian | Persian is right to left, English is left to right |
| Input | Microphone recording and audio file upload | Upload also covers phone call recordings made with the phone's own recorder |
| Output | User chooses `.txt` or `.docx` | PDF skipped: Persian shaping in PDF is painful |
| Summary | v1 only: "copy for summary" button with a Persian prompt template | No LLM inside the app for now. The owner has ideas for a later v2. |
| Model size | **Five models in the interface**, the smallest one recommended and used by default. The other four are stronger and larger, chosen by the user. See the decision table in section 6. | Measured in the lab. Everything smaller than the recommended model was unusable in Persian, so there is no light variant. Browser tab memory on phones is still the real limit and must be tested in step 20 |
| Frontend | Vite with plain JavaScript (no React, no TypeScript) | Simple, easy to learn |
| Git | Straight to `main`, one commit per step | Owner's choice |
| License | MIT (already in the repo) | |

---

## 4. Architecture

```
User's browser (phone or computer)
│
├─ UI (main thread)
│   ├─ Language toggle: Persian (RTL) / English (LTR)
│   ├─ Record / Stop / timer / playback      (getUserMedia + MediaRecorder)
│   ├─ Upload audio file                      (<input type="file">)
│   ├─ Audio conversion to 16 kHz mono Float32 (Web Audio API)
│   ├─ Transcript view
│   ├─ Download .txt / .docx
│   └─ Copy for summary
│
├─ Web Worker (background thread)
│   └─ transformers.js ASR pipeline (Whisper, ONNX)
│       ├─ device: WebGPU if available, else WASM
│       ├─ dtype chosen per model part (see section 6)
│       └─ long audio handled in chunks
│
└─ Service worker
    ├─ caches the app files (offline use)
    └─ model files cached by transformers.js in browser Cache Storage

Static files: GitHub Pages   https://nimaaaai.github.io/Write_audio_to_text/
Model files:  Hugging Face   onnx-community repositories, pinned revisions
```

Why a Web Worker: transcription is heavy. Running it on the main thread would freeze the page. The worker runs it in the background and sends progress messages back to the UI.

---

## 5. Repository structure (target)

```
Write_audio_to_text/
├─ CLAUDE.md                 this file
├─ LICENSE                   MIT (exists)
├─ README.md                 English, written in phase 9 (a short placeholder earlier)
├─ .gitignore
├─ .github/workflows/
│   └─ deploy.yml            builds the app and deploys to GitHub Pages
├─ lab/                      model lab (runs only on the owner's Mac)
│   ├─ README.md             test data layout and conversion commands
│   ├─ requirements.txt
│   ├─ normalize.py          Persian text normalization (unused while there are no references)
│   ├─ model_info.py         reads model variants and sizes from the HF API
│   ├─ benchmark.py          full precision PyTorch transcription
│   ├─ node/                 quantized ONNX transcription with transformers.js
│   │   ├─ package.json
│   │   └─ onnx_test.js      the same runtime the browser uses
│   ├─ data/                 clips, transcripts, model cache (all git ignored)
│   └─ results/              generated tables (committed)
└─ app/                      the web app (Vite project)
    ├─ index.html
    ├─ package.json
    ├─ vite.config.js
    ├─ public/               icons, manifest, fonts
    └─ src/
        ├─ main.js           UI wiring
        ├─ i18n.js           Persian and English interface texts
        ├─ recorder.js       microphone recording
        ├─ audio.js          decoding and conversion to 16 kHz mono
        ├─ worker.js         transformers.js transcription
        ├─ export.js         .txt and .docx downloads
        ├─ summary.js        copy for summary
        └─ style.css
```

This is a target. Files are created one at a time, following the plan.

---

## 6. Technical details and known pitfalls

### Environment
1. Development machine: Mac mini, macOS, VS Code.
2. Python work happens only inside a venv at the repo root. The macOS system Python is 3.9 and is too old: torch, transformers, onnxruntime and librosa all refuse it, and pip silently installs ancient versions instead of failing. Use the Homebrew Python 3.14 explicitly: `python3.14 -m venv .venv`, then `source .venv/bin/activate`. Never install Python packages globally.
3. Node.js LTS (installed with Homebrew if missing). The app lives in `app/`, so npm commands run inside `app/`.

### GitHub Pages
1. The site is served under a subpath: `https://nimaaaai.github.io/Write_audio_to_text/`. In `vite.config.js`, set `base: "/Write_audio_to_text/"`, or every asset path breaks.
2. Deploy with the official GitHub Pages actions (build `app/`, upload `app/dist`). The owner must set Settings, Pages, Source to "GitHub Actions" once. Tell him when.

### Model loading (transformers.js)
1. Package: `@huggingface/transformers` (transformers.js v3 or newer).
2. Use the `automatic-speech-recognition` pipeline with `language: "persian"`, `task: "transcribe"`.
3. Long audio: use the pipeline's chunking options (`chunk_length_s: 30`, with a stride/overlap) and report progress to the UI.
4. `device`: try `"webgpu"`, fall back to `"wasm"` when WebGPU is not available.
5. `dtype`: can be set per model part, for example `{ encoder_model: "fp32", decoder_model_merged: "q4" }`. Final values come from the model lab.
6. Always show the model download size and a progress bar before and during the first download. On Iranian mobile data this matters.
7. Load from the `onnx-community` repositories with a pinned `revision` (see the table in this section), never from a moving `main`.

### Model sizes (checked Sept 2026, onnx-community exports)
| Model | Variant | Encoder | Decoder merged |
|---|---|---|---|
| whisper-base | int8 | 23 MB | 54 MB |
| whisper-base | fp16 | 41 MB | 105 MB |
| whisper-small | fp32 | 353 MB | 615 MB |
| whisper-small | int8 | 92 MB | 157 MB |
| whisper-small | q4 | 66 MB | 233 MB |

Note: q4 is not always smaller than int8 in these exports. Always check real sizes.
The reason: q4 quantizes only matrix multiplications and leaves the decoder's token embedding table (106 MB in base, fp32) untouched, while int8 quantizes it too.

### Model decision (step 13, September 2026)

Measured in the lab on a 150 second excerpt of an Iranian podcast (`pod1_ex`) and on the owner's own recordings. The five models offered in the interface, all loaded straight from `onnx-community` with a pinned revision:

| # | Repository | dtype | Download | Revision | Tested |
|---|---|---|---|---|---|
| **1** | `onnx-community/whisper-large-v3-turbo` | **q4f16** | **563 MB** | `360ebcde2559d60bb474678be3c1de9ef347d01a` | yes, **default and recommended** |
| 2 | `onnx-community/whisper-large-fa-v1-ONNX` (Persian fine tune) | q4f16 | 601 MB | `7086057933227d590821e4690bb41cb9d9c417a4` | no |
| 3 | `onnx-community/whisper-large-v3-turbo` | q4 | 759 MB | as row 1 | no |
| 4 | `onnx-community/whisper-large-v3-ONNX` | q4f16 | 980 MB | `3b6257ad5e67aa523c7c07f4fea04d445eecc4a6` | no |
| 5 | `onnx-community/whisper-large-v3-turbo` | q8 | 1085 MB | as row 1 | yes, 95 percent identical to row 1 |

Rows 3 and 5 need no extra repository, only a different `dtype`.

What the measurements showed:

1. **Multilingual `base` and `small` are unusable for Persian.** `base` produced syllable soup and runaway loops. `small` produced real words with about a third wrong. This killed the plan for a light variant for old phones.
2. **Persian fine tunes of small are also unusable.** `aictsharif/whisper-small-fa` at q8 lost 52 seconds of a 150 second clip to a repetition loop, and its timestamps drifted.
3. **Quantization is cheap, model choice is not.** turbo q8 (1085 MB) and turbo q4f16 (563 MB) agreed 95 percent, differing in two `ذ` versus `ز` errors and one burst of Latin characters. Halving the download again is worth far more than those three errors.
4. **`large-v3` is better but impractical.** In PyTorch it was the only run with no loops (4 percent repeated phrases against 26 to 34 percent for others), but it is 980 MB at q4f16 and has 32 decoder layers against turbo's 4, so roughly four times slower. Offered as an option, not as the default.
5. **Sequential long form beats chunking on quality but does not exist in transformers.js.** The Python library walks through audio using predicted timestamps; the JavaScript library only cuts fixed 30 second chunks. So the browser always uses chunking, and lab numbers from sequential mode are optimistic.
6. **The temperature fallback cannot be used in the Python lab.** `transformers==5.17.0` crashes when Whisper samples: `generation/utils.py:476 for layer in self.cache.layers`, `AttributeError: 'EncoderDecoderCache' object has no attribute 'layers'`. Keep `temperature` a single `0.0`. This does not affect the browser.

### Recording quality dominates model choice
The single most important finding of Phase 1. The same model, same settings, same script:

| Audio | Energy above 2 kHz | Result |
|---|---|---|
| Studio podcast | 3.5 percent | clean, readable Persian |
| Owner's muffled phone clip | 1.2 percent | nonsense: `چه به خونم جبونم رفت` |

`ک`, `چ` and `ط` are distinguished from `گ`, `ج` and `د` almost entirely by a burst of energy between 2 and 8 kHz. A recording made from too far away, through clothing, or over a Bluetooth voice link loses that band, and no model can recover it. Every model tested failed in the same way on the same clips.

Consequences for the app:
1. The interface should tell users to record close to the microphone, in a quiet room, and to prefer the phone's own microphone over Bluetooth earbuds.
2. Poor transcripts are often the recording, not the model. Say so in the README, so users do not conclude the app is broken.

### Memory on phones
Big phone storage does not mean a browser tab can use lots of RAM. Mobile browsers, especially iPhone Safari, kill tabs that use too much memory (often somewhere around 1 to 2 GB). Full precision Whisper small (about 1 GB) may crash on phones. Step 20 tests this on real devices. If it crashes, the app offers a lighter variant as "fast mode".

### Measured browser capabilities (step 8, September 2026)
Measured with the capability readout in `app/src/main.js`, on the live GitHub Pages site.

| Device | Browser | WebGPU |
|---|---|---|
| Mac mini | Safari 26.6 | yes |
| iPhone 15 Pro | Safari 26 | yes |
| iPhone 8 | Safari 16 | **no** |

Secure context, microphone API, MediaRecorder, Web Worker and WebAssembly passed on every device tested.

iPhone 8 cannot ever gain WebGPU: Safari shipped it in version 26, and iOS 16 is the highest version that phone runs. This is not an edge case to ignore. Many users will be in Iran on older iPhones and mid range Android phones, where a tab killed by memory pressure looks like a broken app rather than a slow one.

Two consequences:
1. The WebAssembly fallback is a real code path, not a theoretical one, and must be tested.
2. WebGPU support and available memory are separate limits. A phone can have WebGPU and still lack the headroom for full precision Whisper small. Do not treat one as a proxy for the other.

### Audio
1. Microphone access needs HTTPS (GitHub Pages provides it) or `localhost` during development.
2. `MediaRecorder` output format differs by browser: webm/opus in Chrome, mp4/aac in Safari. Do not assume one format. Always decode with `AudioContext.decodeAudioData`.
3. Whisper needs 16 kHz, mono, Float32. Convert with an `OfflineAudioContext` (resample and mix down to mono).
4. On iPhone Safari, an `AudioContext` must be created or resumed inside a user gesture (a tap).
5. Uploaded files: support at least mp3, m4a, wav, ogg, webm. Show a clear error if the browser cannot decode a file.

### Export
1. `.txt`: UTF-8, with a BOM so older Windows editors show Persian correctly.
2. `.docx`: use the `docx` npm package. Paragraphs must be right to left (`bidirectional: true`, and `rightToLeft: true` on text runs). Use a Persian friendly font name (Vazirmatn, falling back to Tahoma).
3. File names: `transcript_YYYYMMDD_HHMM.txt` / `.docx`.

### Interface
1. Persian mode: `dir="rtl"`, `lang="fa"`. English mode: `dir="ltr"`, `lang="en"`. The toggle switches both, and all interface texts live in `i18n.js`.
2. The transcript area is always right to left, since the text is always Persian.
3. Font: Vazirmatn (SIL Open Font License), self hosted in `public/fonts/`. Do not load fonts from Google Fonts or any CDN: it can be blocked in Iran and breaks offline use.
4. Mobile first layout, large tap targets.
5. A model picker listing the five models from section 6 with their download sizes, the recommended one selected by default.
6. A short recording hint, since recording quality matters more than model choice: record close to the microphone, in a quiet room, and prefer the phone's own microphone over Bluetooth earbuds.

### Summary v1
1. A button copies this to the clipboard: a Persian instruction (summarize, key points, decisions, action items, in Persian) followed by the transcript.
2. Show a short note telling the user to paste it into any chatbot they use.

### Never do
1. Never commit model files, test audio, `.venv/`, `node_modules/` or `dist/`.
2. Never send audio or text to any server or third party API.
3. Never add analytics or tracking.
4. Never load scripts or fonts from CDNs in the app. Bundle everything with Vite. (The only network request besides GitHub Pages is the model download from Hugging Face.)
5. Never run git commands for the owner.

---

## 7. Model lab (Python) details

Goal: pick the model and variant with data, not guesses.

1. **Test data**: 5 to 10 Persian clips recorded by the owner (different voices, some background noise, one long clip of about 5 minutes), plus hand typed reference transcripts, in `lab/data/` (git ignored). Optionally, a sample from the Common Voice Persian test split for a bigger check.
   Actual set (step 9): two owner recordings (`mic1`, `mic2`) and four podcast episodes (`pod1` to `pod4`, 9 to 15 minutes, some with background music), mapped to their original files in `lab/data/sources.txt`.
   Podcast accuracy is reviewed on a fixed excerpt, **03:00 to 05:30** of each episode, so nobody has to pick times or review ten minute transcripts. Full episodes are used for speed only.
   **Evaluation method (owner's decision, step 12):** no reference transcripts are typed. The owner, a native Persian speaker, judges accuracy by listening to each clip while reading the candidate transcripts side by side. WER and CER are therefore not computed, and the step 13 decision rests on this review plus measured speed and size.
   The owner also records targeted mic clips (`mic3` and on) that say hard cases on purpose: numbers, dates, times, English words, names, fast speech. Podcasts rarely contain these, and they are where models fail.
   Conversion is automatic: `benchmark.py` decodes the originals in `raw/` through ffmpeg in memory and cuts the excerpts itself. No manual ffmpeg step. Update `lab/README.md` to match when step 12 is built.
2. **Normalization** (`normalize.py`), applied to both reference and prediction before scoring:
   - Arabic ي and ى to Persian ی, Arabic ك to Persian ک
   - Arabic and Persian digits to one consistent form
   - remove diacritics (harakat) and tatweel (ـ)
   - unify half spaces (ZWNJ, U+200C) and collapse extra spaces
   - remove punctuation for scoring
   Explain to the owner why each rule matters, since without it the error rates are misleading.
   Not used for scoring while there are no reference transcripts (see point 1). Kept for when references are added.
   NFKC runs first, so presentation forms are folded and آ stays composed (otherwise the diacritic rule strips its madda).
   Limitation: `میروم` versus `می روم` is not fixable without a word segmenter, which is why CER is reported next to WER.
3. **Candidates**:
   - Whisper base and Whisper small (multilingual, onnx-community exports)
   - The best Persian fine-tuned Whisper on Hugging Face (search models fine tuned for Persian/fa, check the license, reported WER and whether an ONNX version exists)
     Searched in step 11 (September 2026). Findings:
     - None of the Persian fine tunes has an ONNX version, so any winner needs step 14.
     - The best reported WERs (8.7, 14.1) are fine tunes of large-v3 and large-v3-turbo, 3 to 6 GB. Too large for the browser.
     - Realistic candidates, all Apache 2.0: `AmirMohseni/whisper-small-persian` (small, reports 25.8 on FLEURS), `steja/whisper-small-persian` (small, reports 32.9 on Common Voice 11), `C1Tech/whisper_base_persian` and `Paulwalker4884/whisper-persian` (base, no WER reported).
     - Excluded: `hezarai/whisper-small-fa` (no license declared, and in the hezar library's own format), `AmirMohseni/whisper-large-v3-persian-ct2-int8` (CTranslate2 format, not usable in a browser).
     - Reported WERs use each author's own test set and are not comparable. Test the fine tunes in PyTorch as they are, and convert only the winner.
   - Vosk small Persian model (runs in the browser via vosk-browser, very light).
     Not testable in Python: the `vosk` pip package ships no macOS build, and the
     browser WebAssembly build is a different compile whose accuracy would not match
     the Python one anyway. Vosk is evaluated with a small browser test page at step 12.
4. **Variants**: fp32, fp16, int8, q4 where available.
5. **Metrics**: real time factor (processing time divided by audio duration) and file sizes (`model_info.py`). Accuracy is judged by the owner's side by side review instead of WER and CER (see point 1).
6. **Important**: quality in the lab should be measured with the same ONNX variant the browser will load, where possible, because quantization changes accuracy.
7. **Output**: a results table in `lab/results/`, and the decision with reasoning in `docs/model-decision.md`. The decision names **two** variants, not one: a quality variant for devices with WebGPU, and a light variant for devices without it or with little memory. See section 6.
8. **Step 14 (conversion)** happens only if the winner has no ONNX version. Then convert with `optimum`, and re-measure accuracy after conversion.

Python packages are pinned in `lab/requirements.txt`: `torch`, `transformers`, `onnxruntime`, `huggingface-hub`, `soundfile`, `soxr`, `jiwer`, `numpy`. `optimum` is added only if step 14 is needed.

`librosa` is deliberately not used. The lab only loads audio and resamples it to 16 kHz, and Whisper's own feature extractor computes the mel spectrogram, so librosa would pull in numba, llvmlite, scipy and scikit-learn (about 400 MB) for nothing. `soxr` is the same resampler librosa calls internally.

ffmpeg is a system dependency, not a pip package. libsndfile cannot decode m4a or aac, which is what iPhone Voice Memos produces, so those clips are converted to wav with ffmpeg first (`brew install ffmpeg`).

---

## 8. Definition of done for v1

1. The app is live at the GitHub Pages URL.
2. A user on Android Chrome, iPhone Safari and desktop Chrome can record or upload audio and get Persian text.
3. `.txt` and `.docx` downloads show Persian correctly (right to left, correct letters).
4. The interface switches between Persian and English.
5. The app installs to the home screen and works offline after the first model download.
6. "Copy for summary" works.
7. The README explains usage, privacy, known limits, and credits the model and its license.

---

## 9. Plan and progress checklist

Tick a box (`[x]`) as part of the commit that completes that step.

**Phase 0: Setup**
- [x] 1. Create the public repo with an MIT license (done by the owner)
- [x] 2. Clone the repo on the Mac mini, open it in VS Code, add this CLAUDE.md
- [x] 3. Check or install tools: Homebrew, Node.js LTS, Python 3
- [x] 4. `.gitignore` (venv, node_modules, dist, model files, lab/data, .DS_Store)
- [x] 5. Short placeholder `README.md`
- [x] 6. Create the venv and `lab/requirements.txt`
- [x] 7. Vite skeleton (plain JavaScript) in `app/`, with the correct `base` path; run it locally
- [x] 8. GitHub Actions deploy workflow; "hello world" live on GitHub Pages and opened on the owner's phone

**Phase 1: Model lab (Python)**
- [x] 9. Record test clips and write reference transcripts (owner does this, agent explains the format). References dropped by the owner's decision, see section 7
- [x] 10. `normalize.py`
- [x] 11. `model_info.py` (variants and sizes from the HF API)
- [x] 12. `benchmark.py` (full precision PyTorch) and `lab/node/onnx_test.js` (quantized ONNX, the exact browser runtime)
- [x] 13. Model decision. Recorded in section 6 of this file ("Model decision" and "Recording quality dominates model choice") instead of a separate `docs/model-decision.md`

**Phase 2: Model preparation**
- [x] 14. Not needed: `onnx-community` already publishes ONNX exports of every chosen model
- [x] 15. Not needed by the owner's decision: the app loads from `onnx-community` directly with pinned revisions (see section 3)

**Phase 3: Audio input**
- [ ] 16. Microphone recording: permission, record, stop, timer, playback
- [ ] 17. File upload and conversion of any audio to 16 kHz mono

**Phase 4: Transcription**
- [ ] 18. Web Worker with transformers.js, model download progress with size shown
- [ ] 19. Chunking for long audio, transcription progress
- [ ] 20. Test on Mac Chrome, Android Chrome, iPhone Safari (including memory); add "fast mode" if needed

**Phase 5: Export**
- [ ] 21. `.txt` download
- [ ] 22. `.docx` download, right to left

**Phase 6: UI**
- [ ] 23. Persian/English toggle, RTL/LTR layout, Vazirmatn font, mobile friendly design, model picker with the five models and their download sizes

**Phase 7: PWA**
- [ ] 24. Manifest, icons, service worker, offline test in airplane mode

**Phase 8: Summary v1**
- [ ] 25. Copy for summary button with the Persian prompt template

**Phase 9: Release**
- [ ] 26. Full English README: live link, how to install, privacy, limits, model credits and licenses
- [ ] 27. Tag `v1.0.0` and create a GitHub Release

**Later (not in v1)**
- [ ] 28. Tab audio capture for online meetings (desktop Chrome and Edge only)
- [ ] 29. Summary v2 (owner will describe his ideas)
