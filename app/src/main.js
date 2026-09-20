// Vite entry point. index.html loads this file with <script type="module">,
// and Vite follows the imports from here to discover the rest of the app.
//
// Module scripts are deferred automatically: the browser finishes parsing the
// HTML before running this, so elements can be read straight away with no
// DOMContentLoaded listener.

const statusEl = document.getElementById("status");

// Replaces the "loading" tripwire in index.html. If the Persian word below
// appears, the whole chain worked: Vite built the module, the browser fetched
// and ran it, and the DOM updated.
statusEl.textContent = "آماده";

// ---------------------------------------------------------------------------
// TEMPORARY diagnostics, removed when the real interface is built in step 23.
//
// Step 8 opens this page on a real phone. Without this block that test only
// proves the deploy worked. With it, the test also answers what steps 18 and
// 20 depend on: does this device have WebGPU (fast) or only WebAssembly
// (slow), and is the microphone reachable.
//
// These are feature checks, not browser checks. We ask whether the capability
// exists rather than trying to identify the browser by name.
// ---------------------------------------------------------------------------

const capabilities = [
  // getUserMedia and the model cache only work over HTTPS or on localhost.
  ["Secure context", window.isSecureContext],

  // Microphone access. The optional chaining (?.) guards against
  // navigator.mediaDevices being undefined on insecure origins.
  ["Microphone API", Boolean(navigator.mediaDevices?.getUserMedia)],

  // Records the microphone stream. Output format differs per browser.
  ["MediaRecorder", typeof MediaRecorder !== "undefined"],

  // Runs transcription off the main thread so the page does not freeze.
  ["Web Worker", typeof Worker !== "undefined"],

  // How the ONNX model runs when there is no WebGPU. Always present today.
  ["WebAssembly", typeof WebAssembly !== "undefined"],

  // The fast path. Missing here means transcription falls back to WebAssembly,
  // which is several times slower.
  ["WebGPU", "gpu" in navigator],
];

const list = document.createElement("ul");

// The page is dir="rtl" for Persian, but these labels are English, so this
// one element is switched back to left to right. Mixing directions without
// saying so is what produces sentences with the punctuation on the wrong side.
list.dir = "ltr";
list.style.textAlign = "left";

for (const [label, supported] of capabilities) {
  const item = document.createElement("li");
  item.textContent = `${supported ? "yes" : "NO"} : ${label}`;
  list.append(item);
}

const device = document.createElement("p");
device.dir = "ltr";
device.style.textAlign = "left";
device.style.fontSize = "0.8em";
device.textContent = navigator.userAgent;

document.body.append(list, device);
