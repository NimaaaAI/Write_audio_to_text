# Voice Writer (صدانویس)

Persian speech to text that runs entirely in your browser, with a local database
for what you record.

**Live:** [nimaaaai.github.io/Write_audio_to_text](https://nimaaaai.github.io/Write_audio_to_text/)

## What it does

Record your voice or upload an audio file, and get Persian text back. Save each
transcript as a record with a person's name, edit or delete records, and export
them as CSV, JSON, or a full database backup file. You can also ask questions
about your records in plain Persian, using your own API key.

Speech recognition runs on your own device with
[transformers.js](https://github.com/huggingface/transformers.js), and the records
live in [PGlite](https://pglite.dev), which is PostgreSQL compiled to WebAssembly.
There is no server and no account. Your audio never leaves the device. The only
exception is the question feature below: if you use it, the text of your records
is sent to the service you chose, with your own key.

The only download is the speech recognition model, fetched once from Hugging Face
and then cached in the browser. The default model is 563 MB.

## Status

Working: recording, file upload, transcription, model choice, download progress
with a cancel button, exports for text, JSON and audio, the records database with
backup and restore, and asking questions about the records.

Not built yet: Word (`.docx`) export, the Persian and English interface toggle,
offline installation as an app, and search over records.

Two things to know before relying on it:

1. **Keep backups.** Records are stored in your browser on one device. Clearing
   browser data deletes them, and on iPhone Safari deletes them after 7 days
   without a visit unless the app is added to the Home Screen. Use the "download
   the database file" button.
2. **Recording quality matters more than the model.** A distant or Bluetooth
   recording loses the frequencies Persian consonants depend on, and no model can
   recover them. Record close to the microphone, in a quiet room.

## Asking questions about your records

This part needs an API key of your own, from any service with an OpenAI compatible
endpoint. Fill in the service address, the model name and your key, and ask
something like "how much does Morgan owe?".

- The key is stored in your browser on that device, and is sent only to the
  service you chose. There is a button to delete it.
- Only the text of your records is sent, never the audio, and at most 500 records
  per question. You can see exactly what was sent under the answer.
- The cost is on your own account.

## Running it yourself

You need [Node.js](https://nodejs.org) 22 or newer. Then, on any operating system:

```bash
git clone https://github.com/NimaaaAI/Write_audio_to_text.git
cd Write_audio_to_text/app
npm ci
npm run dev
```

Open the address it prints, which ends in `/Write_audio_to_text/`.

Installing Node, if you do not have it:

| System | Command |
|---|---|
| **macOS** | `brew install node` |
| **Ubuntu** | `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh \| bash`, then `nvm install 26` |
| **Windows** | `winget install OpenJS.NodeJS.LTS`, or the installer from nodejs.org |

Other commands:

```bash
npm run build     # produce the static site in app/dist
npm run preview   # serve that built site locally
```

Pushing to `main` builds and publishes the site automatically through GitHub
Actions.

## The model lab

`lab/` holds the scripts used to choose the model: file sizes from the Hugging
Face API, transcription with full precision PyTorch models, and transcription with
the quantized ONNX files the browser actually loads. It is not needed to run the
app. See [lab/README.md](lab/README.md), and
[CLAUDE.md](CLAUDE.md) section 6 for the measurements and the decision.

## License

Code: MIT, see [LICENSE](LICENSE).

Speech recognition uses OpenAI's Whisper models, in the ONNX exports published by
the `onnx-community` organisation on Hugging Face, loaded at pinned revisions.
Their licences will be credited exactly before the first tagged release.
