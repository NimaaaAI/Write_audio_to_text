// Interface wiring: record or upload audio, convert it, hand it to the worker,
// show progress, show the transcript.

import { MODELS, DEFAULT_MODEL } from "./models.js";

const el = (id) => document.getElementById(id);
const modelSelect = el("model");
const recordButton = el("record");
const fileInput = el("file");
const statusText = el("status");
const progressBar = el("progress");
const transcript = el("transcript");

// ----------------------------------------------------------------- model list --
for (const [key, model] of Object.entries(MODELS)) {
  const option = document.createElement("option");
  option.value = key;
  option.textContent = `${model.label} – ${model.megabytes} مگابایت`;
  modelSelect.append(option);
}
modelSelect.value = DEFAULT_MODEL;

// --------------------------------------------------------------------- worker --
const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });

worker.onmessage = ({ data }) => {
  if (data.type === "progress" && data.item.status === "progress" && data.item.total) {
    const percent = Math.round((data.item.loaded / data.item.total) * 100);
    progressBar.hidden = false;
    progressBar.value = percent;
    setStatus(`دریافت مدل: ${percent}٪`);
  } else if (data.type === "status") {
    progressBar.hidden = data.text === "transcribing";
    setStatus(data.text === "transcribing" ? "در حال تبدیل گفتار به متن…" : "در حال آماده‌سازی مدل…");
  } else if (data.type === "done") {
    progressBar.hidden = true;
    transcript.value = data.text;
    setStatus("انجام شد");
    setBusy(false);
  } else if (data.type === "error") {
    progressBar.hidden = true;
    setStatus(`خطا: ${data.message}`);
    setBusy(false);
  }
};

function setStatus(text) {
  statusText.textContent = text;
}

function setBusy(busy) {
  recordButton.disabled = busy;
  fileInput.disabled = busy;
  modelSelect.disabled = busy;
}

// -------------------------------------------------------------- audio to 16k --
// Whisper needs 16 kHz, mono, floating point samples. Phones and browsers record
// at 44.1 or 48 kHz, in stereo, in different compressed formats (webm/opus in
// Chrome, mp4/aac in Safari). The browser decodes any of them for us, and an
// OfflineAudioContext resamples and mixes down to one channel.
async function toMono16k(arrayBuffer) {
  // On iPhone Safari an AudioContext may only be created inside a user gesture,
  // which is why this runs after a tap or a file choice, never on page load.
  const context = new AudioContext();
  const decoded = await context.decodeAudioData(arrayBuffer);
  await context.close();

  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

async function transcribe(arrayBuffer) {
  setBusy(true);
  transcript.value = "";
  setStatus("در حال آماده‌سازی صدا…");
  try {
    const audio = await toMono16k(arrayBuffer);
    worker.postMessage({ model: modelSelect.value, audio }, [audio.buffer]);
  } catch (error) {
    setStatus(`این فایل صوتی خوانده نشد: ${error.message}`);
    setBusy(false);
  }
}

// ------------------------------------------------------------------ recording --
let recorder = null;

recordButton.addEventListener("click", async () => {
  if (recorder) {
    recorder.stop();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (event) => chunks.push(event.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      recorder = null;
      recordButton.textContent = "ضبط صدا";
      await transcribe(await new Blob(chunks).arrayBuffer());
    };
    recorder.start();
    recordButton.textContent = "توقف ضبط";
    setStatus("در حال ضبط…");
  } catch (error) {
    setStatus(`دسترسی به میکروفون ممکن نشد: ${error.message}`);
  }
});

// --------------------------------------------------------------------- upload --
fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (file) await transcribe(await file.arrayBuffer());
});

setStatus("آماده");
