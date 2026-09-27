// Interface wiring: record or upload audio, convert it, hand it to the worker,
// show progress, save the result in the database, export things.

import * as db from "./db.js";
import { MODELS, DEFAULT_MODEL } from "./models.js";

const el = (id) => document.getElementById(id);
const modelSelect = el("model");
const recordButton = el("record");
const fileInput = el("file");
const statusText = el("status");
const progressBar = el("progress");
const cancelButton = el("cancel");
const transcript = el("transcript");
const recordsBody = el("records").querySelector("tbody");
const dbStatus = el("db-status");

// What the last transcription produced, so the export buttons have something.
let last = { text: "", seconds: 0, model: "", audioBlob: null, audioType: "" };

// ----------------------------------------------------------------- model list --
// Phones cannot run the largest models. The download library holds the whole file
// in memory, and inference needs it again, so a 1 GB model kills a mobile tab
// somewhere past 800 MB. Measured on iPhone Safari. Those options are disabled
// on touch devices rather than left to fail after a long download.
const isPhone = navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) < 500;

for (const [key, model] of Object.entries(MODELS)) {
  const option = document.createElement("option");
  option.value = key;
  option.textContent = `${model.label} – ${model.megabytes} مگابایت`;
  if (model.desktopOnly && isPhone) {
    option.disabled = true;
    option.textContent += " (فقط رایانه)";
  }
  modelSelect.append(option);
}
modelSelect.value = DEFAULT_MODEL;

// Ask the browser how much room is left, and refuse a download that cannot fit.
// Better a message now than a failure after twenty minutes on mobile data.
async function enoughSpaceFor(model) {
  const estimate = await navigator.storage?.estimate?.();
  if (!estimate?.quota) return true; // browser will not say, so let it try
  const free = estimate.quota - (estimate.usage ?? 0);
  // 1.3 because the file is held in memory and written to the cache as well.
  return free > model.megabytes * 1e6 * 1.3;
}

// --------------------------------------------------------------------- worker --
// Kept in a variable because cancelling a download means terminating the worker:
// the library has no way to abort a fetch, so killing the thread is the only stop.
let worker = null;
// Bytes per file, so progress can be shown in MB across both model files.
let downloaded = new Map();

function startWorker() {
  worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
  worker.onmessage = onWorkerMessage;
}

function onWorkerMessage({ data }) {
  if (data.type === "progress") {
    const item = data.item;
    if (item.status === "progress" && item.total) {
      downloaded.set(item.file, { loaded: item.loaded, total: item.total });
      let loaded = 0, total = 0;
      for (const f of downloaded.values()) {
        loaded += f.loaded;
        total += f.total;
      }
      const mb = (bytes) => (bytes / 1e6).toFixed(0);
      progressBar.hidden = false;
      cancelButton.hidden = false;
      progressBar.value = Math.round((loaded / total) * 100);
      // "312 of 563 MB downloaded, 251 MB left"
      setStatus(`دانلود مدل: ${mb(loaded)} از ${mb(total)} مگابایت، ${mb(total - loaded)} مگابایت مانده`);
    }
  } else if (data.type === "status") {
    const transcribing = data.text === "transcribing";
    progressBar.hidden = transcribing;
    cancelButton.hidden = transcribing;
    setStatus(transcribing ? "در حال تبدیل گفتار به متن…" : "در حال آماده‌سازی مدل…");
  } else if (data.type === "done") {
    finishTranscription(data.text);
  } else if (data.type === "error") {
    hideProgress();
    setStatus(`خطا: ${data.message}`);
    setBusy(false);
  }
}

startWorker();

cancelButton.addEventListener("click", () => {
  // Terminating the worker aborts the downloads with it. Files that had not
  // finished are not kept, so this cancels rather than pauses.
  worker.terminate();
  downloaded = new Map();
  startWorker();
  hideProgress();
  setStatus("دانلود لغو شد");
  setBusy(false);
});

function hideProgress() {
  progressBar.hidden = true;
  cancelButton.hidden = true;
}

function setStatus(text) {
  statusText.textContent = text;
}

function setBusy(busy) {
  recordButton.disabled = busy;
  fileInput.disabled = busy;
  modelSelect.disabled = busy;
}

function setExportsEnabled(enabled) {
  for (const id of ["save-db", "download-text", "download-json"]) el(id).disabled = !enabled;
  el("download-audio").disabled = !last.audioBlob;
}

// -------------------------------------------------------------- audio to 16k --
// Whisper needs 16 kHz, mono, floating point samples. Phones record at 44.1 or
// 48 kHz, in stereo, in different formats (webm/opus in Chrome, mp4/aac in
// Safari). The browser decodes any of them, and an OfflineAudioContext resamples
// and mixes down to one channel.
async function toMono16k(arrayBuffer) {
  // On iPhone Safari an AudioContext may only be created inside a user gesture,
  // so this runs after a tap or a file choice, never on page load.
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

async function transcribe(blob) {
  const model = MODELS[modelSelect.value];
  if (!(await enoughSpaceFor(model))) {
    setStatus(
      `فضای کافی در مرورگر نیست. این مدل ${model.megabytes} مگابایت است. ` +
      `مدل کوچک‌تری را انتخاب کنید یا فضای مرورگر را خالی کنید.`,
    );
    return;
  }

  setBusy(true);
  setExportsEnabled(false);
  transcript.value = "";
  setStatus("در حال آماده‌سازی صدا…");
  try {
    const audio = await toMono16k(await blob.arrayBuffer());
    last = {
      text: "",
      seconds: audio.length / 16000,
      model: modelSelect.value,
      audioBlob: blob,
      audioType: blob.type,
    };
    el("download-audio").disabled = false;
    worker.postMessage({ model: modelSelect.value, audio }, [audio.buffer]);
  } catch (error) {
    setStatus(`این فایل صوتی خوانده نشد: ${error.message}`);
    setBusy(false);
  }
}

function finishTranscription(text) {
  hideProgress();
  transcript.value = text;
  last.text = text;
  setStatus("انجام شد");
  setBusy(false);
  setExportsEnabled(Boolean(text));
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
      const type = recorder.mimeType;
      recorder = null;
      recordButton.textContent = "ضبط صدا";
      await transcribe(new Blob(chunks, { type }));
    };
    recorder.start();
    recordButton.textContent = "توقف ضبط";
    setStatus("در حال ضبط…");
  } catch (error) {
    setStatus(`دسترسی به میکروفون ممکن نشد: ${error.message}`);
  }
});

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (file) await transcribe(file);
});

// ------------------------------------------------------------------ downloads --
function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// transcript_20260927_1830
function stamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
}

el("download-text").addEventListener("click", () => {
  // The BOM (﻿) makes older Windows editors read the file as UTF-8, so
  // Persian is not shown as mojibake.
  download(new Blob(["﻿" + last.text], { type: "text/plain;charset=utf-8" }), `transcript_${stamp()}.txt`);
});

el("download-json").addEventListener("click", () => {
  const payload = {
    text: last.text,
    seconds: Math.round(last.seconds),
    model: MODELS[last.model]?.id,
    dtype: MODELS[last.model]?.dtype,
    created_at: new Date().toISOString(),
  };
  download(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `transcript_${stamp()}.json`);
});

el("download-audio").addEventListener("click", () => {
  // Chrome records webm, Safari records mp4. Keep whatever the browser produced.
  const extension = (last.audioType.includes("mp4") ? "mp4" : last.audioType.includes("webm") ? "webm" : "bin");
  download(last.audioBlob, `recording_${stamp()}.${extension}`);
});

// ------------------------------------------------------------------- database --
el("save-db").addEventListener("click", async () => {
  await db.addEntry({ text: last.text, seconds: Math.round(last.seconds), model: MODELS[last.model]?.id });
  await refreshRecords();
  setStatus("در پایگاه داده ذخیره شد");
});

async function refreshRecords() {
  const rows = await db.listEntries();
  dbStatus.textContent = `${rows.length} رکورد ذخیره شده`;
  recordsBody.replaceChildren();

  for (const row of rows) {
    const tr = document.createElement("tr");

    const date = document.createElement("td");
    date.textContent = new Date(row.created_at).toLocaleDateString("fa-IR");

    const person = document.createElement("td");
    const personInput = document.createElement("input");
    personInput.type = "text";
    personInput.value = row.person ?? "";
    personInput.placeholder = "نام شخص";
    // Saved when the field loses focus, so typing is not interrupted.
    personInput.addEventListener("change", () => db.setPerson(row.id, personInput.value.trim()));
    person.append(personInput);

    const text = document.createElement("td");
    text.textContent = row.text;

    const actions = document.createElement("td");
    const remove = document.createElement("button");
    remove.textContent = "حذف";
    remove.className = "danger";
    remove.addEventListener("click", async () => {
      await db.deleteEntry(row.id);
      await refreshRecords();
    });
    actions.append(remove);

    tr.append(date, person, text, actions);
    recordsBody.append(tr);
  }
}

el("export-csv").addEventListener("click", async () => {
  download(new Blob(["﻿" + (await db.toCsv())], { type: "text/csv;charset=utf-8" }), `records_${stamp()}.csv`);
});

el("export-json").addEventListener("click", async () => {
  download(new Blob([await db.toJson()], { type: "application/json" }), `records_${stamp()}.json`);
});

el("backup").addEventListener("click", async () => {
  dbStatus.textContent = "در حال ساختن فایل پشتیبان…";
  download(await db.dumpFile(), `voice-writer_${stamp()}.tar.gz`);
  await refreshRecords();
});

el("restore").addEventListener("click", (event) => {
  // Restoring throws away what is there now, so ask first.
  if (!confirm("همه‌ی رکوردهای فعلی جایگزین می‌شوند. مطمئن هستید؟")) event.preventDefault();
});

el("restore").addEventListener("change", async () => {
  const file = el("restore").files?.[0];
  if (!file) return;
  dbStatus.textContent = "در حال بازگرداندن…";
  try {
    await db.restoreFile(file);
    await refreshRecords();
  } catch (error) {
    dbStatus.textContent = `بازگرداندن انجام نشد: ${error.message}`;
  }
});

// Ask the browser to keep our data. Chrome usually agrees. Safari on iPhone is
// unreliable, which is why the app tells users to add it to the Home Screen.
navigator.storage?.persist?.().catch(() => {});

await refreshRecords();
setStatus("آماده");
