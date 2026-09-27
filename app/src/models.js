// The five models offered in the interface, chosen in the model lab.
// See CLAUDE.md section 6, "Model decision", for the measurements behind this.
//
// Every entry pins a `revision`: a specific commit of the Hugging Face repository.
// Without it, a re-export by the publisher could change or break the app silently.
//
// `dtype` is how hard the weights are compressed. q4f16 means 4 bit weights with
// 16 bit arithmetic, which is the smallest download and, measured on Persian
// podcast audio, barely worse than the 8 bit version at double the size.

export const MODELS = {
  "turbo-q4f16": {
    label: "توربو (پیشنهادی)",
    id: "onnx-community/whisper-large-v3-turbo",
    revision: "360ebcde2559d60bb474678be3c1de9ef347d01a",
    dtype: "q4f16",
    megabytes: 563,
    recommended: true,
  },
  "persian-q4f16": {
    label: "فارسی (آزمایشی)",
    id: "onnx-community/whisper-large-fa-v1-ONNX",
    revision: "7086057933227d590821e4690bb41cb9d9c417a4",
    dtype: "q4f16",
    megabytes: 601,
  },
  "turbo-q4": {
    label: "توربو، دقت بیشتر",
    id: "onnx-community/whisper-large-v3-turbo",
    revision: "360ebcde2559d60bb474678be3c1de9ef347d01a",
    dtype: "q4",
    megabytes: 759,
  },
  "large-q4f16": {
    // Measured: fails on iPhone after roughly 800 MB. The library allocates the
    // whole file in memory while downloading, and inference needs it again.
    desktopOnly: true,
    label: "بزرگ، کندتر",
    id: "onnx-community/whisper-large-v3-ONNX",
    revision: "3b6257ad5e67aa523c7c07f4fea04d445eecc4a6",
    dtype: "q4f16",
    megabytes: 980,
  },
  "turbo-q8": {
    desktopOnly: true, // same reason as large-q4f16
    label: "توربو، فشرده‌سازی کمتر",
    id: "onnx-community/whisper-large-v3-turbo",
    revision: "360ebcde2559d60bb474678be3c1de9ef347d01a",
    dtype: "q8",
    megabytes: 1085,
  },
};

export const DEFAULT_MODEL = "turbo-q4f16";
