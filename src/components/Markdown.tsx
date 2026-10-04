import { memo, useState, type ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CheckIcon, CopyIcon } from "./icons";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="ghost-btn small"
      aria-label={copied ? "Copied" : label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable (http / permissions) */
        }
      }}
    >
      {copied ? <CheckIcon width={14} height={14} /> : <CopyIcon width={14} height={14} />}
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}

function CodeBlock({ className, children }: ComponentProps<"code">) {
  const lang = /language-(\w+)/.exec(className ?? "")?.[1];
  const text = String(children ?? "").replace(/\n$/, "");
  return (
    <div className="code-block">
      <div className="code-head">
        <span>{lang ?? "code"}</span>
        <CopyButton text={text} />
      </div>
      <pre>
        <code className={className}>{text}</code>
      </pre>
    </div>
  );
}

/**
 * Markdown renderer. react-markdown builds React elements (no innerHTML), so model
 * output can't inject scripts; raw HTML in the Markdown is shown as text.
 */
export const Markdown = memo(function Markdown({ content }: { content: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children, ...rest }) => {
            const isBlock = /language-/.test(className ?? "") || String(children).includes("\n");
            return isBlock ? <CodeBlock className={className}>{children}</CodeBlock> : <code {...rest}>{children}</code>;
          },
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="table-wrap">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
