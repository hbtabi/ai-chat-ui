import { describe, expect, it } from "vitest";
import { chatReducer, newConversation, type ChatState } from "../src/lib/chatReducer";
import { exportConversations, loadConversations, loadSettings, saveConversations, saveSettings } from "../src/lib/storage";
import { makeTitle, relativeDay } from "../src/lib/title";
import { DEFAULT_SETTINGS, type Message } from "../src/lib/types";

const msg = (id: string, role: Message["role"], content: string): Message => ({ id, role, content, createdAt: 0 });

describe("chatReducer", () => {
  const base = (): ChatState => {
    const c = newConversation("a");
    return { conversations: [c], activeId: "a" };
  };

  it("titles a conversation from its first user message and streams into a reply", () => {
    let s = chatReducer(base(), { type: "add-message", conversationId: "a", message: msg("u1", "user", "How do I bake sourdough bread at home quickly?") });
    expect(s.conversations[0].title).toBe("How do I bake sourdough bread…");
    s = chatReducer(s, { type: "add-message", conversationId: "a", message: msg("r1", "assistant", "") });
    s = chatReducer(s, { type: "append", conversationId: "a", messageId: "r1", chunk: "Start " });
    s = chatReducer(s, { type: "append", conversationId: "a", messageId: "r1", chunk: "with flour." });
    expect(s.conversations[0].messages[1].content).toBe("Start with flour.");
  });

  it("reuses an empty chat instead of creating another", () => {
    const s = chatReducer(base(), { type: "new", id: "b" });
    expect(s.conversations).toHaveLength(1);
    expect(s.activeId).toBe("a");
  });

  it("creates, selects, renames, deletes and moves active conversation to top", () => {
    let s = chatReducer(base(), { type: "add-message", conversationId: "a", message: msg("u", "user", "hi") });
    s = chatReducer(s, { type: "new", id: "b" });
    expect(s.conversations.map((c) => c.id)).toEqual(["b", "a"]);
    s = chatReducer(s, { type: "select", id: "a" });
    s = chatReducer(s, { type: "add-message", conversationId: "a", message: msg("u2", "user", "again") });
    expect(s.conversations[0].id).toBe("a");
    s = chatReducer(s, { type: "rename", id: "a", title: "Renamed" });
    expect(s.conversations[0].title).toBe("Renamed");
    s = chatReducer(s, { type: "delete", id: "a" });
    expect(s.activeId).toBe("b");
    expect(chatReducer(s, { type: "select", id: "nope" })).toBe(s);
  });

  it("marks failures and truncates for regenerate", () => {
    let s = chatReducer(base(), { type: "add-message", conversationId: "a", message: msg("u", "user", "q") });
    s = chatReducer(s, { type: "add-message", conversationId: "a", message: msg("r", "assistant", "partial") });
    s = chatReducer(s, { type: "fail", conversationId: "a", messageId: "r", error: "Stopped" });
    expect(s.conversations[0].messages[1].error).toBe("Stopped");
    s = chatReducer(s, { type: "truncate-from", conversationId: "a", messageId: "r" });
    expect(s.conversations[0].messages.map((m) => m.id)).toEqual(["u"]);
  });
});

describe("storage", () => {
  it("round-trips conversations and survives corrupt data", () => {
    const c = { ...newConversation("x"), messages: [msg("1", "user", "hi")] };
    saveConversations([c]);
    expect(loadConversations()).toEqual([c]);
    localStorage.setItem("ai-chat-ui:v1:conversations", "{not json");
    expect(loadConversations()).toEqual([]);
    localStorage.setItem("ai-chat-ui:v1:conversations", JSON.stringify([{ bogus: true }, c]));
    expect(loadConversations()).toHaveLength(1);
  });

  it("merges saved settings over defaults", () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    saveSettings({ ...DEFAULT_SETTINGS, theme: "light" });
    expect(loadSettings().theme).toBe("light");
    expect(JSON.parse(exportConversations([])).app).toBe("ai-chat-ui");
  });
});

describe("titles and dates", () => {
  it("makes short, clean titles", () => {
    expect(makeTitle("## **Hello** world")).toBe("Hello world");
    expect(makeTitle("```js\ncode\n```\n")).toBe("New chat");
    expect(makeTitle("a".repeat(80)).length).toBeLessThanOrEqual(42);
  });

  it("groups by relative day", () => {
    const now = new Date("2026-10-04T12:00:00").getTime();
    expect(relativeDay(now - 60_000, now)).toBe("Today");
    expect(relativeDay(now - 86_400_000, now)).toBe("Yesterday");
    expect(relativeDay(now - 3 * 86_400_000, now)).toBe("Previous 7 days");
    expect(relativeDay(now - 30 * 86_400_000, now)).toBe("Older");
  });
});
