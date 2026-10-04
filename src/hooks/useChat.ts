import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { chatReducer, newConversation, type ChatState } from "../lib/chatReducer";
import { uid } from "../lib/id";
import { createProvider, type ChatProvider } from "../lib/providers";
import { loadConversations, saveConversations } from "../lib/storage";
import type { Message, Settings } from "../lib/types";

function initialState(): ChatState {
  const conversations = loadConversations();
  if (conversations.length === 0) {
    const c = newConversation();
    return { conversations: [c], activeId: c.id };
  }
  return { conversations, activeId: conversations[0].id };
}

export interface UseChatOptions {
  settings: Settings;
  /** Inject a provider (tests); otherwise one is created from settings. */
  provider?: ChatProvider;
}

export function useChat({ settings, provider }: UseChatOptions) {
  const [state, dispatch] = useReducer(chatReducer, undefined, initialState);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Persist on every change. Streaming updates are frequent, so skip writes
  // while a reply is in flight and save once it finishes.
  useEffect(() => {
    if (!streamingId) saveConversations(state.conversations);
  }, [state.conversations, streamingId]);

  const active = useMemo(
    () => state.conversations.find((c) => c.id === state.activeId) ?? null,
    [state.conversations, state.activeId],
  );

  const runCompletion = useCallback(
    async (conversationId: string, history: Pick<Message, "role" | "content">[]) => {
      const assistant: Message = { id: uid("m_"), role: "assistant", content: "", createdAt: Date.now() };
      dispatch({ type: "add-message", conversationId, message: assistant });
      const controller = new AbortController();
      abortRef.current = controller;
      setStreamingId(assistant.id);
      const p = provider ?? createProvider(settings);
      const messages = settings.systemPrompt ? [{ role: "system" as const, content: settings.systemPrompt }, ...history] : history;
      try {
        for await (const chunk of p.stream(messages, { signal: controller.signal, temperature: settings.temperature })) {
          dispatch({ type: "append", conversationId, messageId: assistant.id, chunk });
        }
      } catch (err) {
        const aborted = (err as Error).name === "AbortError";
        dispatch({
          type: "fail",
          conversationId,
          messageId: assistant.id,
          error: aborted ? "Stopped" : `Request failed: ${(err as Error).message}`,
        });
      } finally {
        abortRef.current = null;
        setStreamingId(null);
      }
    },
    [provider, settings],
  );

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || abortRef.current) return;
      let conversationId = stateRef.current.activeId;
      if (!conversationId) {
        const c = newConversation();
        dispatch({ type: "replace-all", conversations: [c, ...stateRef.current.conversations], activeId: c.id });
        conversationId = c.id;
      }
      const current = stateRef.current.conversations.find((c) => c.id === conversationId);
      const user: Message = { id: uid("m_"), role: "user", content, createdAt: Date.now() };
      dispatch({ type: "add-message", conversationId, message: user });
      const history = [...(current?.messages ?? []), user].filter((m) => !m.error).map(({ role, content }) => ({ role, content }));
      await runCompletion(conversationId, history);
    },
    [runCompletion],
  );

  /** Drop the last assistant reply and ask again. */
  const regenerate = useCallback(async () => {
    const c = stateRef.current.conversations.find((x) => x.id === stateRef.current.activeId);
    if (!c || abortRef.current) return;
    const lastAssistant = [...c.messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return;
    dispatch({ type: "truncate-from", conversationId: c.id, messageId: lastAssistant.id });
    const history = c.messages.slice(0, c.messages.indexOf(lastAssistant)).filter((m) => !m.error).map(({ role, content }) => ({ role, content }));
    await runCompletion(c.id, history);
  }, [runCompletion]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  return { state, active, dispatch, send, regenerate, stop, streamingId, isStreaming: streamingId !== null };
}
