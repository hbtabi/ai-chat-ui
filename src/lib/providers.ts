import { mockReply, tokenize } from "./mockReplies";
import { deltaFromChunk, readSSE } from "./sse";
import type { Message, Settings } from "./types";

export interface StreamOptions {
  signal?: AbortSignal;
  temperature?: number;
}

/** Anything that can turn a conversation into a stream of text chunks. */
export interface ChatProvider {
  readonly name: string;
  stream(messages: Pick<Message, "role" | "content">[], opts?: StreamOptions): AsyncGenerator<string>;
}

function abortError(): DOMException {
  return new DOMException("The response was stopped.", "AbortError");
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Offline backend that streams canned Markdown replies with realistic pacing. */
export class MockProvider implements ChatProvider {
  readonly name = "mock";
  constructor(private readonly tokensPerSecond = 45, private readonly firstTokenDelayMs = 350) {}

  async *stream(messages: Pick<Message, "role" | "content">[], opts: StreamOptions = {}): AsyncGenerator<string> {
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const tokens = tokenize(mockReply(lastUser));
    const delay = this.tokensPerSecond > 0 ? 1000 / this.tokensPerSecond : 0;
    if (this.firstTokenDelayMs) await sleep(this.firstTokenDelayMs, opts.signal);
    for (const token of tokens) {
      if (opts.signal?.aborted) throw abortError();
      // Slight jitter so the stream feels organic rather than metronomic.
      if (delay) await sleep(delay * (0.6 + ((token.length * 7) % 9) / 10), opts.signal);
      yield token;
    }
  }
}

export interface OpenAIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  fetchImpl?: typeof fetch;
}

/** Streams from any OpenAI-compatible /chat/completions endpoint (OpenAI, Groq, OpenRouter, Ollama, LM Studio…). */
export class OpenAICompatibleProvider implements ChatProvider {
  readonly name: string;
  constructor(private readonly cfg: OpenAIConfig) {
    this.name = cfg.model;
  }

  async *stream(messages: Pick<Message, "role" | "content">[], opts: StreamOptions = {}): AsyncGenerator<string> {
    const doFetch = this.cfg.fetchImpl ?? fetch;
    const res = await doFetch(`${this.cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: opts.signal,
      headers: {
        "Content-Type": "application/json",
        ...(this.cfg.apiKey ? { Authorization: `Bearer ${this.cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.cfg.model,
        stream: true,
        temperature: opts.temperature,
        messages: messages.map(({ role, content }) => ({ role, content })),
      }),
    });
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
    }
    for await (const data of readSSE(res.body)) {
      if (data === "[DONE]") return;
      const delta = deltaFromChunk(data);
      if (delta) yield delta;
    }
  }
}

export function createProvider(settings: Settings): ChatProvider {
  if (settings.provider === "openai" && settings.baseUrl) {
    return new OpenAICompatibleProvider({ baseUrl: settings.baseUrl, apiKey: settings.apiKey, model: settings.model });
  }
  return new MockProvider(settings.mockSpeed);
}
