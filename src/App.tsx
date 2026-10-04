import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Composer } from "./components/Composer";
import { EmptyState } from "./components/EmptyState";
import { MenuIcon, MoonIcon, SunIcon } from "./components/icons";
import { MessageItem } from "./components/MessageItem";
import { SettingsDialog } from "./components/SettingsDialog";
import { Sidebar } from "./components/Sidebar";
import { useChat } from "./hooks/useChat";
import { demoConversations } from "./lib/demo";
import type { ChatProvider } from "./lib/providers";
import { exportConversations, loadSettings, saveSettings } from "./lib/storage";
import type { Settings } from "./lib/types";

export default function App({ provider }: { provider?: ChatProvider }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { state, active, dispatch, send, regenerate, stop, streamingId, isStreaming } = useChat({ settings, provider });
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    saveSettings(settings);
  }, [settings]);

  // `?demo` loads sample conversations (handy for screenshots and first-time visitors).
  useEffect(() => {
    if (new URLSearchParams(location.search).has("demo")) {
      dispatch({ type: "replace-all", conversations: demoConversations() });
      history.replaceState(null, "", location.pathname);
    }
  }, [dispatch]);

  // Auto-scroll while streaming, unless the user has scrolled up to read.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [active?.messages]);

  const providerLabel = settings.provider === "mock" ? "Mock model" : settings.model;
  const lastAssistantId = [...(active?.messages ?? [])].reverse().find((m) => m.role === "assistant")?.id;

  const download = () => {
    const blob = new Blob([exportConversations(state.conversations)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ai-chat-ui-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="app">
      <Sidebar
        conversations={state.conversations}
        activeId={state.activeId}
        open={sidebarOpen}
        providerLabel={providerLabel}
        onNew={() => {
          dispatch({ type: "new" });
          setSidebarOpen(false);
        }}
        onSelect={(id) => {
          dispatch({ type: "select", id });
          setSidebarOpen(false);
        }}
        onDelete={(id) => dispatch({ type: "delete", id })}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      {sidebarOpen && <div className="scrim" onClick={() => setSidebarOpen(false)} />}

      <main className="chat">
        <header className="chat-header">
          <button type="button" className="ghost-btn menu-btn" aria-label="Open sidebar" onClick={() => setSidebarOpen(true)}>
            <MenuIcon />
          </button>
          <h1 className="chat-title">{active?.title ?? "New chat"}</h1>
          <span className={`model-pill ${settings.provider}`}>
            <span className="dot" /> {providerLabel}
          </span>
          <button
            type="button"
            className="ghost-btn"
            aria-label="Toggle theme"
            onClick={() => setSettings((s) => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" }))}
          >
            {settings.theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </header>

        <div
          className="messages"
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
        >
          {!active || active.messages.length === 0 ? (
            <EmptyState onPick={send} />
          ) : (
            <div className="thread">
              {active.messages.map((m) => (
                <MessageItem
                  key={m.id}
                  message={m}
                  streaming={m.id === streamingId}
                  canRegenerate={m.id === lastAssistantId && !isStreaming}
                  onRegenerate={regenerate}
                />
              ))}
            </div>
          )}
        </div>

        <Composer onSend={send} onStop={stop} isStreaming={isStreaming} providerLabel={providerLabel} autoFocusKey={state.activeId} />
      </main>

      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={setSettings}
        onExport={download}
        onClearHistory={() => {
          dispatch({ type: "clear" });
          dispatch({ type: "new" });
        }}
      />
    </div>
  );
}
