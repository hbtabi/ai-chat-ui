export type Role = "system" | "user" | "assistant";

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  /** Set when streaming failed or was stopped. */
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export type ProviderKind = "mock" | "openai";
export type Theme = "dark" | "light";

export interface Settings {
  provider: ProviderKind;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  /** Mock backend speed in tokens per second. */
  mockSpeed: number;
  theme: Theme;
}

export const DEFAULT_SETTINGS: Settings = {
  provider: import.meta.env.VITE_LLM_API_KEY ? "openai" : "mock",
  baseUrl: import.meta.env.VITE_LLM_BASE_URL ?? "https://api.openai.com/v1",
  apiKey: import.meta.env.VITE_LLM_API_KEY ?? "",
  model: import.meta.env.VITE_LLM_MODEL ?? "gpt-4o-mini",
  temperature: 0.7,
  systemPrompt: "You are a helpful, concise assistant. Use Markdown for structure and code.",
  mockSpeed: 45,
  theme: "dark",
};
