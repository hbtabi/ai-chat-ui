/**
 * Minimal Server-Sent Events reader for OpenAI-style streaming responses.
 * Yields the `data:` payload of each event, handling events split across
 * network chunks, CRLF line endings, comments and multi-line data fields.
 */
export async function* readSSE(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      buffer = buffer.replace(/\r\n/g, "\n");
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const event = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const data = parseEvent(event);
        if (data !== null) yield data;
      }
      if (done) {
        const data = parseEvent(buffer);
        if (data !== null) yield data;
        return;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseEvent(event: string): string | null {
  const lines = event.split("\n").filter((l) => l.startsWith("data:"));
  if (lines.length === 0) return null;
  return lines.map((l) => l.slice(5).replace(/^ /, "")).join("\n");
}

/** Pull the text delta out of one OpenAI chat-completions stream chunk. */
export function deltaFromChunk(data: string): string {
  if (data === "[DONE]") return "";
  try {
    const json = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
    return json.choices?.[0]?.delta?.content ?? "";
  } catch {
    return "";
  }
}
