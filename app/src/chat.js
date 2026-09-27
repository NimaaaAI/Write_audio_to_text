// Asks a question about the saved records, using the user's own API key.
//
// The key belongs to the user and never leaves their device except in the request
// to the service they chose. It is kept in localStorage, so it survives reloads
// on this device and is not shared with anyone.
//
// Any service with an OpenAI compatible endpoint works (that includes GapGPT),
// because they all accept POST {baseUrl}/chat/completions with the same shape.

const SETTINGS_KEY = "voice-writer-chat-settings";

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) ?? {};
  } catch {
    return {};
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function forgetSettings() {
  localStorage.removeItem(SETTINGS_KEY);
}

// Only the records go to the service, never the audio.
//
// The cap exists because every record becomes part of the request, and you pay
// per word sent. 500 short records is roughly 25,000 words, which most models
// accept and which costs a fraction of a cent. Beyond that, sending everything
// stops being sensible and choosing the relevant records (embeddings, pgvector)
// starts to pay off.
const MAX_RECORDS = 500;

export function asContext(rows) {
  return rows
    .slice(0, MAX_RECORDS)
    .map((row) => {
      const date = new Date(row.created_at).toISOString().slice(0, 10);
      return `- [${date}] ${row.person || "بدون نام"}: ${row.text}`;
    })
    .join("\n");
}

export async function ask({ baseUrl, apiKey, model }, question, rows) {
  const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "تو یک دستیار فارسی‌زبان هستی. فقط بر پایه‌ی رکوردهای زیر پاسخ بده. " +
            "اگر پاسخ در رکوردها نیست، صادقانه بگو که اطلاعاتی موجود نیست و حدس نزن.\n\n" +
            `رکوردها:\n${asContext(rows)}`,
        },
        { role: "user", content: question },
      ],
    }),
  });

  if (!response.ok) {
    // The body usually explains the problem: a wrong key, an unknown model name,
    // or no credit. Show it rather than a bare status code.
    throw new Error(`${response.status}: ${(await response.text()).slice(0, 300)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "پاسخی برنگشت";
}
