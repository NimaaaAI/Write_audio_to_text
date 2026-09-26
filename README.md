# Voice Writer (صدانویس)

Persian speech to text that runs entirely in your browser.

**Status: under construction.** The web app cannot transcribe yet. Model selection is
finished, and the audio and transcription work is next. See the plan and progress
checklist in [CLAUDE.md](CLAUDE.md).

## What it will do

Record your voice or upload an audio file, get Persian text back, and download it as
`.txt` or `.docx`. A "copy for summary" button copies the transcript together with a
ready made Persian prompt, so you can paste it into any chatbot and get a summary.

## How it works

Speech recognition runs on your own device using
[transformers.js](https://github.com/huggingface/transformers.js). There is no backend
server. Your audio and your text never leave your browser, and nothing is uploaded
anywhere.

The only download is the speech recognition model itself, fetched once from Hugging
Face and then cached. After that the app works offline.

## Done so far

**Setup.** Vite project, deployment to GitHub Pages by GitHub Actions, and a
placeholder page live at
[nimaaaai.github.io/Write_audio_to_text](https://nimaaaai.github.io/Write_audio_to_text/)
that reports which features a visitor's browser supports. WebGPU is present on recent
devices (Safari 26 on macOS and on an iPhone 15 Pro) and absent on older ones (an
iPhone 8, which can never have it).

**Model lab.** Python and Node scripts that read model sizes from the Hugging Face API,
transcribe test clips with full precision models, and transcribe the same clips with the
quantized ONNX files the browser will actually load.

**Model chosen.** `whisper-large-v3-turbo`, quantized to q4f16, a 563 MB download. Four
larger models are offered as alternatives. All are loaded straight from the
`onnx-community` repositories at pinned revisions.

Two findings from that work, both recorded in CLAUDE.md section 6:

1. **Small models do not work for Persian.** Multilingual `base` and `small`, and
   Persian fine tuned `small`, all produced unreadable text or lost whole passages to
   repetition. So there is no lightweight option for older phones.
2. **Recording quality matters more than model choice.** The same model produced clean
   Persian from a studio podcast and nonsense from a muffled phone recording. The
   consonants that Persian relies on live between 2 and 8 kHz, and a distant or
   Bluetooth recording loses that band.

## Left to do

- Microphone recording and audio file upload in the browser
- Transcription in a Web Worker, with model download progress
- Long audio handling and progress reporting
- Testing on Android Chrome and iPhone Safari, including memory limits
- `.txt` and `.docx` download
- Persian and English interface, right to left layout, Vazirmatn font, model picker
- Installable as a progressive web app, working offline
- Copy for summary

## License

Code: MIT, see [LICENSE](LICENSE).

The speech recognition models are third party. Whisper was made by OpenAI, and the ONNX
exports used here are published by the `onnx-community` organisation on Hugging Face.
Their licences will be credited exactly once verified, before the first release.
