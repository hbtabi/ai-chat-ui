import type { Message } from "../lib/types";
import { RefreshIcon, SparkIcon } from "./icons";
import { CopyButton, Markdown } from "./Markdown";

interface Props {
  message: Message;
  streaming: boolean;
  canRegenerate: boolean;
  onRegenerate: () => void;
}

export function MessageItem({ message, streaming, canRegenerate, onRegenerate }: Props) {
  const isUser = message.role === "user";
  return (
    <article className={`message ${isUser ? "user" : "assistant"}`} aria-label={isUser ? "You" : "Assistant"}>
      {!isUser && (
        <div className="avatar" aria-hidden>
          <SparkIcon width={16} height={16} />
        </div>
      )}
      <div className="bubble-wrap">
        <div className="bubble">
          {isUser ? (
            <p className="user-text">{message.content}</p>
          ) : message.content ? (
            <Markdown content={message.content} />
          ) : streaming ? (
            <div className="typing" aria-label="Assistant is typing">
              <span />
              <span />
              <span />
            </div>
          ) : null}
          {streaming && message.content && <span className="caret" aria-hidden />}
          {message.error && <div className={`msg-error ${message.error === "Stopped" ? "muted" : ""}`}>{message.error}</div>}
        </div>
        {!isUser && !streaming && message.content && (
          <div className="msg-actions">
            <CopyButton text={message.content} />
            {canRegenerate && (
              <button type="button" className="ghost-btn small" onClick={onRegenerate}>
                <RefreshIcon width={14} height={14} />
                <span>Regenerate</span>
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
