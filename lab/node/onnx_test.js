// Transcribe one clip with a quantized ONNX model, using transformers.js:
// the same library, the same files and the same code path the browser app will
// use. What this script measures for accuracy is what users will get.
//
// Its counterpart is ../benchmark.py, which runs full precision PyTorch models.
// Two differences are unavoidable:
//   1. transformers.js has no sequential long form mode, only chunking, so
//      audio over 30 seconds is cut into overlapping pieces.
//   2. Node runs ONNX on the CPU. Accuracy matches the browser, speed does not:
//      phones may use WebGPU, which is faster, or WebAssembly, which is slower.
//
// Usage:
//   cd lab/node
//   node onnx_test.js
//
// Writes ../data/transcripts/<clip>_<model>_<dtype>.txt

import fs from "node:fs";
import path from "node:path";

import { pipeline, env } from "@huggingface/transformers";
// wavefile is a CommonJS module, so it cannot be imported by name.
import wavefile from "wavefile";
const { WaveFile } = wavefile;

// ------------------------------------------------------------------ settings --
// Uncomment one model, one dtype and one clip.

const modelId = "onnx-community/whisper-large-v3-turbo";
// const modelId = "onnx-community/whisper-large-fa-v1-ONNX";
// const modelId = "onnx-community/whisper-small-fa-ONNX";
// const modelId = "onnx-community/whisper-tiny-fa-ONNX";
// "onnx-community/whisper-large-v3-turbo" Best one after testing

// How much the weights are compressed. Sizes for whisper-large-v3-turbo:
//   fp32 3236 MB | fp16 1619 MB | q8 1085 MB | q4 759 MB | q4f16 563 MB
const dtype = "q4f16";
// const dtype = "q4";
// const dtype = "q8";
// const dtype = "fp16";
// const dtype = "fp32";
// q4f16 Best one after testing

const clipName = "mic3_airpods";
// const clipName = "pod1_full";
// const clipName = "mic1";
// const clipName = "mic2";
// pod1_ex

// ----------------------------------------------------------------- locations --
// Paths are resolved from this file, so the script works from any directory.
const labDir = path.join(import.meta.dirname, "..");
const clipPath = path.join(labDir, "data", "clips", `${clipName}.wav`);
const outDir = path.join(labDir, "data", "transcripts");

// By default transformers.js caches downloaded models inside node_modules,
// where the next npm install would wipe them. Keep them under data/ instead,
// which is git ignored.
env.cacheDir = path.join(labDir, "data", "onnx-cache");

// --------------------------------------------------------------- read audio --
const wav = new WaveFile(fs.readFileSync(clipPath));
wav.toBitDepth("32f"); // convert the samples to floating point
if (wav.fmt.sampleRate !== 16000) {
    throw new Error(`${clipName}.wav is ${wav.fmt.sampleRate} Hz, Whisper needs 16000 Hz`);
}

let samples = wav.getSamples();
// A stereo file returns one array per channel. Our clips are mono, but guard anyway.
if (Array.isArray(samples)) samples = samples[0];
const audio = Float32Array.from(samples);
const audioSeconds = audio.length / 16000;

// ----------------------------------------------------------------- the model --
// dtype can be set per part, so the encoder and decoder may use different
// compression. Here both use the same one.
console.log(`loading ${modelId} (${dtype}), first run downloads the model`);

let lastReport = 0;
const transcriber = await pipeline("automatic-speech-recognition", modelId, {
    dtype: { encoder_model: dtype, decoder_model_merged: dtype },
    device: "cpu", // Node has no WebGPU
    progress_callback: (item) => {
        // Fires often during download. Print at most once a second.
        if (item.status === "progress" && Date.now() - lastReport > 1000) {
            lastReport = Date.now();
            const mb = (item.loaded / 1e6).toFixed(0);
            const total = (item.total / 1e6).toFixed(0);
            console.log(`  ${item.file}  ${mb}/${total} MB`);
        }
    },
});

// -------------------------------------------------------------- transcribe --
const startTime = Date.now();
const result = await transcriber(audio, {
    language: "persian",
    task: "transcribe",
    // Required for audio longer than 30 seconds. Without it the audio is
    // silently truncated at the model's 30 second window.
    chunk_length_s: 30,
    // Overlap between consecutive chunks, so a word cut in half by one chunk
    // boundary still appears whole in its neighbour.
    stride_length_s: 5,
    return_timestamps: true,
});
const elapsed = (Date.now() - startTime) / 1000;

// ------------------------------------------------------------------ report --
function clock(seconds) {
    // The last chunk sometimes has no end time.
    if (seconds === null || seconds === undefined) return " ? ";
    const total = Math.floor(seconds);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

const report = [
    `model      : ${modelId}`,
    `dtype      : ${dtype}`,
    `clip       : ${clipName}.wav`,
    `mode       : chunked (transformers.js has no sequential mode)`,
    `device     : cpu (node)`,
    `audio      : ${audioSeconds.toFixed(1)} s`,
    `took       : ${elapsed.toFixed(1)} s`,
    `speed      : ${(elapsed / audioSeconds).toFixed(2)} x real time`,
    "",
    "=".repeat(60),
    "SEGMENTS (listen along with these timestamps)",
    "=".repeat(60),
    "",
];

for (const chunk of result.chunks ?? []) {
    const [startAt, endAt] = chunk.timestamp;
    report.push(`[${clock(startAt)} - ${clock(endAt)}]  ${chunk.text.trim()}`);
}

report.push("", "=".repeat(60), "FULL TEXT", "=".repeat(60), "", result.text.trim(), "");

const outPath = path.join(outDir, `${clipName}_${modelId.split("/").pop()}_${dtype}.txt`);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, report.join("\n"), "utf-8");

console.log(report.join("\n"));
console.log(`written to ${outPath}`);
