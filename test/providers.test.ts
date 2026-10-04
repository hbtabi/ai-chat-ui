import { describe, expect, it } from "vitest";
import { mockReply, tokenize } from "../src/lib/mockReplies";
import { MockProvider, OpenAICompatibleProvider, createProvider } from "../src/lib/providers";
import { DEFAULT_SETTINGS } from "../src/lib/types";

async function drain(gen: AsyncGenerator<string>) {
  let s = "";
  for await (const c of gen) s += c;
  return s;
}

describe("mock backend", () => {
  it("tokenize is lossless", () => {
    const text = "Hello  world\n\n```ts\nconst x = 1;\n```\n";
    expect(tokenize(text).join("")).toBe(text);
  });

  it("chooses replies by intent", () => {
    expect(mockReply("hello there")).toMatch(/offline mock model/);
    expect(mockReply("write a python function")).toMatch(/```python/);
    expect(mockReply("compare cats vs dogs")).toMatch(/\| Criterion \|/);
    expect(mockReply("explain recursion")).toMatch(/### 1\. The intuition/);
    expect(mockReply("zebra")).toMatch(/Settings → Provider/);
  });

  it("streams the full reply for the last user message", async () => {
    const p = new MockProvider(0, 0);
    const text = await drain(p.stream([{ role: "user", content: "hi" }]));
    expect(text).toBe(mockReply("hi"));
  });

  it("can be aborted mid-stream", async () => {
    const p = new MockProvider(1000, 0);
    const ctrl = new AbortController();
    let received = "";
    await expect(
      (async () => {
        for await (const c of p.stream([{ role: "user", content: "explain things" }], { signal: ctrl.signal })) {
          received += c;
          if (received.length > 10) ctrl.abort();
        }
      })(),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(received.length).toBeLessThan(mockReply("explain things").length);
  });
});

describe("OpenAI-compatible provider", () => {
  it("posts a streaming chat request and yields deltas", async () => {
    let body: Record<string, unknown> = {};
    let url = "";
    let auth = "";
    const fakeFetch = (async (u: string, init: RequestInit) => {
      url = u;
      body = JSON.parse(String(init.body));
      auth = (init.headers as Record<string, string>).Authorization;
      const sse = ['{"choices":[{"delta":{"content":"Hel"}}]}', '{"choices":[{"delta":{"content":"lo"}}]}', "[DONE]"]
        .map((d) => `data: ${d}\n\n`)
        .join("");
      return new Response(sse, { status: 200, headers: { "Content-Type": "text/event-stream" } });
    }) as unknown as typeof fetch;
    const p = new OpenAICompatibleProvider({ baseUrl: "http://localhost:11434/v1/", apiKey: "k", model: "llama3", fetchImpl: fakeFetch });
    const text = await drain(p.stream([{ role: "user", content: "hi" }], { temperature: 0.2 }));
    expect(text).toBe("Hello");
    expect(url).toBe("http://localhost:11434/v1/chat/completions");
    expect(body).toMatchObject({ model: "llama3", stream: true, temperature: 0.2 });
    expect(auth).toBe("Bearer k");
  });

  it("surfaces HTTP errors", async () => {
    const fakeFetch = (async () => new Response("bad key", { status: 401 })) as unknown as typeof fetch;
    const p = new OpenAICompatibleProvider({ baseUrl: "http://x", apiKey: "", model: "m", fetchImpl: fakeFetch });
    await expect(drain(p.stream([{ role: "user", content: "hi" }]))).rejects.toThrow("HTTP 401: bad key");
  });

  it("createProvider falls back to mock", () => {
    expect(createProvider({ ...DEFAULT_SETTINGS, provider: "mock" }).name).toBe("mock");
    expect(createProvider({ ...DEFAULT_SETTINGS, provider: "openai", model: "gpt-x" }).name).toBe("gpt-x");
  });
});
