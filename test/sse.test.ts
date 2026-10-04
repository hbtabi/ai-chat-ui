import { describe, expect, it } from "vitest";
import { deltaFromChunk, readSSE } from "../src/lib/sse";

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      chunks.forEach((ch) => c.enqueue(enc.encode(ch)));
      c.close();
    },
  });
}

async function collect(s: ReadableStream<Uint8Array>) {
  const out: string[] = [];
  for await (const d of readSSE(s)) out.push(d);
  return out;
}

describe("readSSE", () => {
  it("yields data payloads, even when events are split across chunks", async () => {
    const out = await collect(streamOf('data: {"a":1}\n\nda', 'ta: {"a":2}\n', "\ndata: [DONE]\n\n"));
    expect(out).toEqual(['{"a":1}', '{"a":2}', "[DONE]"]);
  });

  it("handles CRLF, comments, multi-line data and a trailing event without blank line", async () => {
    const out = await collect(streamOf(": keep-alive\r\n\r\ndata: line1\r\ndata: line2\r\n\r\ndata: tail"));
    expect(out).toEqual(["line1\nline2", "tail"]);
  });
});

describe("deltaFromChunk", () => {
  it("extracts content deltas and ignores everything else", () => {
    expect(deltaFromChunk('{"choices":[{"delta":{"content":"Hi"}}]}')).toBe("Hi");
    expect(deltaFromChunk('{"choices":[{"delta":{"role":"assistant"}}]}')).toBe("");
    expect(deltaFromChunk("[DONE]")).toBe("");
    expect(deltaFromChunk("not json")).toBe("");
  });
});
