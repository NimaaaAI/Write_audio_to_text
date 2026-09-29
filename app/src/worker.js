// Runs speech recognition in a background thread.
//
// Transcription is heavy: it would freeze the page if it ran on the main thread,
// so it lives here and talks to the interface with messages.
//
// Messages in:  { model: "turbo-q4f16", audio: Float32Array }   16 kHz mono
// Messages out: { type: "progress" | "status" | "done" | "error", ... }

import { pipeline, env } from "@huggingface/transformers";

import { MODELS } from "./models.js";

// Never look for models on our own server, always fetch from Hugging Face.
env.allowLocalModels = false;

// Serve the ONNX Runtime files from our own site instead of a CDN.
// vite.config.js copies them into public/ort. BASE_URL is "/Write_audio_to_text/".
//
// Both keys are required: the runtime is a .wasm binary plus a .mjs loader, and
// giving only a prefix makes the loader import fail with
// "no available backend found. ERR: [webgpu] TypeError: Importing a module script failed".
//
// Which build: .asyncify is the default and supports WebGPU. Safari below
// version 26 cannot use asyncify without WebGPU, and needs the plain build.
const safariVersion = navigator.userAgent.match(/Version\/(\d+).*Safari/);
const suffix = !navigator.gpu && safariVersion && Number(safariVersion[1]) < 26 ? "" : ".asyncify";
const prefix = `${import.meta.env.BASE_URL}ort/ort-wasm-simd-threaded${suffix}`;

env.backends.onnx.wasm.wasmPaths = { mjs: `${prefix}.mjs`, wasm: `${prefix}.wasm` };

// Keeping the loaded model between requests means the second transcription does
// not download or initialise anything.
let loaded = null;

async function getTranscriber(key) {
  if (loaded?.key === key) return loaded.transcriber;

  const model = MODELS[key];
  const options = {
    revision: model.revision,
    dtype: { encoder_model: model.dtype, decoder_model_merged: model.dtype },
    progress_callback: (item) => postMessage({ type: "progress", item }),
  };

  let transcriber = null;
  if (await webgpuWorks()) {
    try {
      postMessage({ type: "status", text: "loading model on webgpu" });
      transcriber = await pipeline("automatic-speech-recognition", model.id, { ...options, device: "webgpu" });
    } catch (error) {
      // Asking for an adapter can succeed and the backend still fail to start.
      // Falling back costs a reload of an already downloaded model, not a redownload.
      postMessage({ type: "status", text: `webgpu failed (${error.message}), using wasm` });
    }
  }

  if (!transcriber) {
    postMessage({ type: "status", text: "loading model on wasm" });
    transcriber = await pipeline("automatic-speech-recognition", model.id, { ...options, device: "wasm" });
  }

  loaded = { key, transcriber };
  return transcriber;
}

// WebGPU is several times faster, but it is missing on older devices (an iPhone 8
// can never have it) and unreliable on Linux, where Chrome exposes navigator.gpu
// but refuses to give out an adapter unless started with --enable-unsafe-webgpu.
// So ask for a real adapter rather than trusting that the object exists.
async function webgpuWorks() {
  try {
    return Boolean(await navigator.gpu?.requestAdapter?.());
  } catch {
    return false;
  }
}

self.onmessage = async ({ data }) => {
  try {
    const transcriber = await getTranscriber(data.model);
    postMessage({ type: "status", text: "transcribing" });

    const result = await transcriber(data.audio, {
      // Persian is always forced. Auto detection guesses wrong on Persian and
      // produces Arabic or Latin nonsense.
      language: "persian",
      task: "transcribe",
      // The model only ever hears 30 seconds at a time. Without chunking,
      // longer audio is silently cut off at 30 seconds.
      chunk_length_s: 30,
      // Overlap, so a word split by one chunk boundary survives in its neighbour.
      stride_length_s: 5,
    });

    postMessage({ type: "done", text: result.text.trim() });
  } catch (error) {
    postMessage({ type: "error", message: String(error?.message ?? error) });
  }
};
