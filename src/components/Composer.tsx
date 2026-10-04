import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { SendIcon, StopIcon } from "./icons";

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  providerLabel: string;
  autoFocusKey?: string | null;
}

export function Composer({ onSend, onStop, isStreaming, providerLabel, autoFocusKey }: Props) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grow the textarea with its content, up to a max height (set in CSS).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [text]);

  useEffect(() => ref.current?.focus(), [autoFocusKey]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (isStreaming || !text.trim()) return;
    onSend(text);
    setText("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form className="composer" onSubmit={submit}>
      <div className="composer-box">
        <textarea
          ref={ref}
          rows={1}
          value={text}
          placeholder="Message the assistant…"
          aria-label="Message"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />
        {isStreaming ? (
          <button type="button" className="send-btn stop" onClick={onStop} aria-label="Stop generating">
            <StopIcon width={16} height={16} />
          </button>
        ) : (
          <button type="submit" className="send-btn" disabled={!text.trim()} aria-label="Send message">
            <SendIcon width={18} height={18} />
          </button>
        )}
      </div>
      <p className="composer-hint">
        <kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line · {providerLabel}
      </p>
    </form>
  );
}
