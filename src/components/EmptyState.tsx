import { SparkIcon } from "./icons";

const SUGGESTIONS = [
  { title: "Write code", prompt: "Write a Python function that splits a list into chunks" },
  { title: "Compare options", prompt: "Compare REST vs GraphQL in a table" },
  { title: "Explain a concept", prompt: "Explain how attention works in transformers" },
  { title: "Make a plan", prompt: "Give me a launch plan for a side project" },
];

export function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="empty">
      <div className="empty-logo" aria-hidden>
        <SparkIcon width={28} height={28} />
      </div>
      <h1>How can I help today?</h1>
      <p>Replies stream in real time. Everything stays in your browser.</p>
      <div className="suggestions">
        {SUGGESTIONS.map((s) => (
          <button key={s.title} type="button" className="suggestion" onClick={() => onPick(s.prompt)}>
            <strong>{s.title}</strong>
            <span>{s.prompt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
