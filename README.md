# Voice Writer (صدانویس)

Persian speech to text that runs entirely in your browser.

**Status: under construction.** Not usable yet. See the plan and progress checklist in
[CLAUDE.md](CLAUDE.md).

## What it will do

Record your voice or upload an audio file, get Persian text back, and download it as
`.txt` or `.docx`. A "copy for summary" button copies the transcript together with a
ready made Persian prompt, so you can paste it into any chatbot and get a summary.

## How it works

Speech recognition runs on your own device using
[transformers.js](https://github.com/huggingface/transformers.js). There is no backend
server. Your audio and your text never leave your browser, and nothing is uploaded
anywhere.

The only download is the speech recognition model itself, fetched once from Hugging Face
and then cached. After that the app works offline.

## Planned support

Android Chrome, iPhone Safari, and desktop Chrome, Edge and Safari. Installable to the
home screen as a progressive web app.

## License

Code: MIT, see [LICENSE](LICENSE).

The speech recognition model is third party. Its name, source and license will be
credited here once it is chosen (see step 13 of the plan).
