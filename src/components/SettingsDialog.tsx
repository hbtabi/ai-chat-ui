import { useEffect, useRef, useState } from "react";
import type { Settings } from "../lib/types";
import { DownloadIcon, TrashIcon } from "./icons";

interface Props {
  open: boolean;
  settings: Settings;
  onClose: () => void;
  onSave: (s: Settings) => void;
  onClearHistory: () => void;
  onExport: () => void;
}

export function SettingsDialog({ open, settings, onClose, onSave, onClearHistory, onExport }: Props) {
  const [draft, setDraft] = useState(settings);
  const firstField = useRef<HTMLDivElement>(null);

  useEffect(() => setDraft(settings), [settings, open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    firstField.current?.querySelector<HTMLElement>("input, button")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setDraft((d) => ({ ...d, [key]: value }));

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div ref={firstField} className="settings" role="dialog" aria-modal="true" aria-label="Settings">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(draft);
          onClose();
        }}
      >
        <header>
          <h2>Settings</h2>
          <button type="button" className="ghost-btn" onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </header>

        <fieldset>
          <legend>Provider</legend>
          <div className="segmented" role="radiogroup">
            {(["mock", "openai"] as const).map((p) => (
              <label key={p} className={draft.provider === p ? "on" : ""}>
                <input type="radio" name="provider" value={p} checked={draft.provider === p} onChange={() => set("provider", p)} />
                {p === "mock" ? "Mock (offline)" : "OpenAI-compatible"}
              </label>
            ))}
          </div>
          {draft.provider === "mock" ? (
            <label className="field">
              <span>Mock speed: {draft.mockSpeed} tokens/s</span>
              <input type="range" min={5} max={200} step={5} value={draft.mockSpeed} onChange={(e) => set("mockSpeed", Number(e.target.value))} />
            </label>
          ) : (
            <>
              <label className="field">
                <span>Base URL</span>
                <input value={draft.baseUrl} onChange={(e) => set("baseUrl", e.target.value)} placeholder="https://api.openai.com/v1" />
              </label>
              <label className="field">
                <span>API key</span>
                <input type="password" value={draft.apiKey} onChange={(e) => set("apiKey", e.target.value)} placeholder="sk-… (leave empty for local servers)" autoComplete="off" />
              </label>
              <label className="field">
                <span>Model</span>
                <input value={draft.model} onChange={(e) => set("model", e.target.value)} placeholder="gpt-4o-mini" />
              </label>
              <p className="note">The key is stored only in this browser's localStorage and sent directly to the URL above.</p>
            </>
          )}
        </fieldset>

        <fieldset>
          <legend>Behaviour</legend>
          <label className="field">
            <span>Temperature: {draft.temperature.toFixed(1)}</span>
            <input type="range" min={0} max={2} step={0.1} value={draft.temperature} onChange={(e) => set("temperature", Number(e.target.value))} />
          </label>
          <label className="field">
            <span>System prompt</span>
            <textarea rows={3} value={draft.systemPrompt} onChange={(e) => set("systemPrompt", e.target.value)} />
          </label>
        </fieldset>

        <fieldset>
          <legend>Data</legend>
          <div className="row">
            <button type="button" className="ghost-btn" onClick={onExport}>
              <DownloadIcon width={14} height={14} /> Export chats (JSON)
            </button>
            <button
              type="button"
              className="ghost-btn danger"
              onClick={() => {
                if (confirm("Delete all conversations from this browser?")) onClearHistory();
              }}
            >
              <TrashIcon width={14} height={14} /> Clear history
            </button>
          </div>
        </fieldset>

        <footer>
          <button type="button" className="ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary-btn">
            Save
          </button>
        </footer>
      </form>
    </div>
    </div>
  );
}
