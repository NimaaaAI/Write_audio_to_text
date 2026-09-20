import { defineConfig } from "vite";

// Vite reads this file at startup. Everything not set here keeps Vite's default.
//
// defineConfig does nothing at runtime, it just returns the object unchanged.
// Its only purpose is to tell the editor what shape the object should have, so
// VS Code can autocomplete option names and warn about typos.
export default defineConfig({
  // The site is served from a subfolder on GitHub Pages:
  //
  //   https://nimaaaai.github.io/Write_audio_to_text/
  //                             ^^^^^^^^^^^^^^^^^^^^
  //
  // Without this, Vite writes asset links starting with "/", the browser looks
  // for them at the domain root, every file 404s, and the page renders blank
  // with no visible error.
  //
  // This string must match the GitHub repository name exactly, including
  // capital letters, and needs both the leading and the trailing slash.
  base: "/Write_audio_to_text/",
});
