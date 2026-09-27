import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import { defineConfig } from "vite";

const require = createRequire(import.meta.url);

// transformers.js runs models through ONNX Runtime Web, which needs a few large
// .wasm files. By default it fetches them from a CDN. CLAUDE.md forbids that:
// CDNs can be blocked in Iran, and a remote fetch breaks offline use. So we copy
// them out of node_modules into public/ort and serve them ourselves.
//
// public/ort is git ignored. The files are produced from node_modules on every
// build, including the GitHub Actions build, so they never enter the repository.
function copyOnnxRuntime() {
  return {
    name: "copy-onnxruntime-wasm",
    buildStart() {
      // onnxruntime-web does not expose its package.json, so resolve the package
      // entry point instead. Under Node that is dist/ort.node.min.js.
      const from = dirname(require.resolve("onnxruntime-web"));
      const to = join(import.meta.dirname, "public", "ort");
      mkdirSync(to, { recursive: true });
      for (const file of readdirSync(from)) {
        // Two builds are needed, matching what src/worker.js asks for:
        //   .asyncify  the default, and the one that supports WebGPU
        //   plain      the fallback for Safari below version 26 without WebGPU
        if (/^ort-wasm-simd-threaded(\.asyncify)?\.(wasm|mjs)$/.test(file)) {
          copyFileSync(join(from, file), join(to, file));
        }
      }
    },
  };
}

export default defineConfig({
  // The site is served from a subfolder on GitHub Pages:
  //   https://nimaaaai.github.io/Write_audio_to_text/
  // Without this, asset links start with "/", every file 404s, and the page
  // renders blank with no visible error. Must match the repository name exactly.
  base: "/Write_audio_to_text/",

  plugins: [copyOnnxRuntime()],

  worker: {
    // The transcription worker uses import statements, so it must be a module.
    format: "es",
  },
});
