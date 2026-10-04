import { uid } from "./id";
import { makeTitle } from "./title";
import type { Conversation, Message } from "./types";

export interface ChatState {
  conversations: Conversation[];
  activeId: string | null;
}

export type ChatAction =
  | { type: "new"; id?: string }
  | { type: "select"; id: string }
  | { type: "delete"; id: string }
  | { type: "rename"; id: string; title: string }
  | { type: "add-message"; conversationId: string; message: Message }
  | { type: "append"; conversationId: string; messageId: string; chunk: string }
  | { type: "fail"; conversationId: string; messageId: string; error: string }
  | { type: "truncate-from"; conversationId: string; messageId: string }
  | { type: "replace-all"; conversations: Conversation[]; activeId?: string | null }
  | { type: "clear" };

export function newConversation(id = uid("c_")): Conversation {
  const now = Date.now();
  return { id, title: "New chat", messages: [], createdAt: now, updatedAt: now };
}

function updateConversation(state: ChatState, id: string, fn: (c: Conversation) => Conversation): ChatState {
  return { ...state, conversations: state.conversations.map((c) => (c.id === id ? fn(c) : c)) };
}

/** Pure state transitions for the chat app; easy to unit test and to persist. */
export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "new": {
      // Reuse an existing empty chat rather than piling up blank ones.
      const empty = state.conversations.find((c) => c.messages.length === 0);
      if (empty) return { ...state, activeId: empty.id };
      const c = newConversation(action.id);
      return { conversations: [c, ...state.conversations], activeId: c.id };
    }
    case "select":
      return state.conversations.some((c) => c.id === action.id) ? { ...state, activeId: action.id } : state;
    case "delete": {
      const conversations = state.conversations.filter((c) => c.id !== action.id);
      const activeId = state.activeId === action.id ? (conversations[0]?.id ?? null) : state.activeId;
      return { conversations, activeId };
    }
    case "rename":
      return updateConversation(state, action.id, (c) => ({ ...c, title: action.title.trim() || c.title }));
    case "add-message": {
      const next = updateConversation(state, action.conversationId, (c) => ({
        ...c,
        title: c.messages.length === 0 && action.message.role === "user" ? makeTitle(action.message.content) : c.title,
        messages: [...c.messages, action.message],
        updatedAt: Date.now(),
      }));
      // Most recently active conversation floats to the top of the sidebar.
      const idx = next.conversations.findIndex((c) => c.id === action.conversationId);
      if (idx > 0) {
        const [moved] = next.conversations.splice(idx, 1);
        next.conversations.unshift(moved);
      }
      return next;
    }
    case "append":
      return updateConversation(state, action.conversationId, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === action.messageId ? { ...m, content: m.content + action.chunk } : m)),
      }));
    case "fail":
      return updateConversation(state, action.conversationId, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === action.messageId ? { ...m, error: action.error } : m)),
      }));
    case "truncate-from":
      return updateConversation(state, action.conversationId, (c) => {
        const i = c.messages.findIndex((m) => m.id === action.messageId);
        return i === -1 ? c : { ...c, messages: c.messages.slice(0, i) };
      });
    case "replace-all":
      return { conversations: action.conversations, activeId: action.activeId ?? action.conversations[0]?.id ?? null };
    case "clear":
      return { conversations: [], activeId: null };
  }
}
