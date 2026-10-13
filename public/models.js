// Curated models for the talk. `cutoff` is the training-data cutoff published
// by the model's maker; null if not published.
// Probability and reasoning support are read live from OpenRouter by server.js.
export default [
  { id: "openai/gpt-3.5-turbo", name: "GPT-3.5 Turbo (2023 ChatGPT)", cutoff: "Sep 2021" },
  { id: "meta-llama/llama-3.2-3b-instruct", name: "Llama 3.2 3B (tiny)", cutoff: "Dec 2023" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o mini", cutoff: "Oct 2023" },
  { id: "openai/gpt-4o", name: "GPT-4o", cutoff: "Oct 2023" },
  { id: "google/gemma-3-27b-it", name: "Gemma 3 27B", cutoff: "Aug 2024" },
  { id: "google/gemma-4-31b-it", name: "Gemma 4 31B (2026)", cutoff: null },
  { id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash (2026)", cutoff: null },
  { id: "qwen/qwen3.7-flash", name: "Qwen 3.7 Flash (2026)", cutoff: null },
];
