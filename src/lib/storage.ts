import { DEFAULT_SETTINGS, type Conversation, type Settings } from "./types";

const CONVERSATIONS_KEY = "ai-chat-ui:v1:conversations";
const SETTINGS_KEY = "ai-chat-ui:v1:settings";

function isConversation(x: unknown): x is Conversation {
  const c = x as Conversation;
  return !!c && typeof c.id === "string" && typeof c.title === "string" && Array.isArray(c.messages);
}

/** Load saved conversations, ignoring anything corrupt instead of crashing the app. */
export function loadConversations(storage: Storage = localStorage): Conversation[] {
  try {
    const raw = storage.getItem(CONVERSATIONS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isConversation) : [];
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[], storage: Storage = localStorage): void {
  try {
    storage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  } catch (err) {
    // Quota exceeded or storage disabled (e.g. private mode): keep working in memory.
    console.warn("Could not persist conversations", err);
  }
}

export function loadSettings(storage: Storage = localStorage): Settings {
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings, storage: Storage = localStorage): void {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function exportConversations(conversations: Conversation[]): string {
  return JSON.stringify({ app: "ai-chat-ui", version: 1, exportedAt: new Date().toISOString(), conversations }, null, 2);
}
