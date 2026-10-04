/**
 * The offline "model". It is not intelligent; it recognises a few intents and
 * returns rich Markdown so every part of the UI (code blocks, tables, lists,
 * quotes) can be exercised without a network connection or API key.
 */

const pick = <T,>(arr: T[], seed: number): T => arr[Math.abs(seed) % arr.length];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h;
}

function topicOf(prompt: string): string {
  const cleaned = prompt.replace(/[?!.]+$/g, "").replace(/^(please\s+)?(can you|could you|explain|tell me about|what is|what's|how do i|how to)\s+/i, "");
  return cleaned.split(/\s+/).slice(0, 8).join(" ") || "that";
}

const replies: { test: RegExp; build: (prompt: string, seed: number) => string }[] = [
  {
    test: /^(hi|hello|hey|yo|good (morning|afternoon|evening))\b/i,
    build: (_p, seed) =>
      `${pick(["Hello!", "Hi there!", "Hey! 👋"], seed)} I'm the **offline mock model** that ships with AI Chat UI.\n\n` +
      "I stream replies token by token, just like a real LLM, so you can try the interface without an API key. Try asking me to:\n\n" +
      "- write some **code** (e.g. *a Python function to reverse a string*)\n" +
      "- **compare** two things in a table\n" +
      "- **explain** a concept step by step\n\n" +
      "Open **Settings** to connect any OpenAI-compatible API when you're ready.",
  },
  {
    test: /\b(code|function|script|python|typescript|javascript|regex|sql|implement|snippet)\b/i,
    build: (prompt) => {
      const lang = /python/i.test(prompt) ? "python" : /sql/i.test(prompt) ? "sql" : "typescript";
      const code = {
        python: 'def chunk(items: list, size: int) -> list[list]:\n    """Split items into lists of at most `size` elements."""\n    if size <= 0:\n        raise ValueError("size must be positive")\n    return [items[i : i + size] for i in range(0, len(items), size)]\n\n\nprint(chunk([1, 2, 3, 4, 5], 2))  # [[1, 2], [3, 4], [5]]',
        sql: "-- Top 5 products by revenue this month\nSELECT p.name, SUM(o.quantity * o.unit_price) AS revenue\nFROM orders o\nJOIN products p ON p.id = o.product_id\nWHERE o.created_at >= date_trunc('month', now())\nGROUP BY p.name\nORDER BY revenue DESC\nLIMIT 5;",
        typescript: "export function debounce<T extends (...args: never[]) => void>(fn: T, ms = 250) {\n  let timer: ReturnType<typeof setTimeout> | undefined;\n  return (...args: Parameters<T>) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), ms);\n  };\n}\n\nconst save = debounce((text: string) => console.log(\"saving\", text), 500);",
      }[lang];
      return `Here's a clean, well-typed starting point for **${topicOf(prompt)}**:\n\n\`\`\`${lang}\n${code}\n\`\`\`\n\n` +
        "**How it works**\n\n1. Inputs are validated up front, so bad calls fail fast.\n2. The core logic is a single expression, which keeps it easy to test.\n3. A usage example is included at the bottom.\n\n" +
        "> 💡 Tip: hover the code block and press **Copy** to grab it.";
    },
  },
  {
    test: /\b(compare|vs\.?|versus|difference|table|pros and cons)\b/i,
    build: (prompt) =>
      `Here's a quick comparison for **${topicOf(prompt)}**:\n\n` +
      "| Criterion | Option A | Option B |\n|---|---|---|\n| Learning curve | Gentle | Steeper |\n| Performance | Good | Excellent |\n| Ecosystem | Huge | Growing |\n| Best for | Prototypes, small teams | Large, long-lived systems |\n\n" +
      "**Bottom line:** start with *Option A* to move fast, and reach for *Option B* when scale or strictness starts to matter.",
  },
  {
    test: /\b(explain|what is|what's|how does|why|teach|eli5)\b/i,
    build: (prompt) =>
      `## ${topicOf(prompt).replace(/^./, (c) => c.toUpperCase())}\n\n` +
      "Let's break it down into three layers:\n\n" +
      "### 1. The intuition\nThink of it as a pipeline: something comes in, gets transformed step by step, and a result comes out. Each step only needs to understand its own small job.\n\n" +
      "### 2. The mechanics\n- **Inputs** are normalised into a common shape\n- **Processing** applies a sequence of simple, composable rules\n- **Outputs** are checked before they are returned\n\n" +
      "### 3. Why it matters\nSmall, well-defined steps are easier to test, reason about and replace, which is why this pattern shows up everywhere from compilers to neural networks.\n\n" +
      "Want me to go deeper on any of these layers?",
  },
  {
    test: /\b(plan|ideas?|steps|roadmap|checklist|launch)\b/i,
    build: (prompt) =>
      `A practical plan for **${topicOf(prompt)}**:\n\n` +
      "- [x] Define the goal and one measurable success metric\n- [x] Sketch the smallest version that delivers value\n- [ ] Build it in a week, not a month\n- [ ] Put it in front of five real users\n- [ ] Iterate on what they actually do, not what they say\n\n" +
      "*Ship small, learn fast.* 🚀",
  },
];

export function mockReply(prompt: string): string {
  const seed = hash(prompt);
  const match = replies.find((r) => r.test.test(prompt.trim()));
  if (match) return match.build(prompt, seed);
  return (
    `You asked about **${topicOf(prompt)}**. ${pick(["Good question.", "Interesting one.", "Let's think it through."], seed)}\n\n` +
    "Since I'm the offline mock model I can't truly reason about it, but here's how a good answer would be structured:\n\n" +
    "1. **Clarify** what outcome you actually need\n2. **Explore** two or three approaches with their trade-offs\n3. **Recommend** one, with a concrete next step\n\n" +
    "Connect a real model in **Settings → Provider** to get a genuine answer to this exact question."
  );
}

/**
 * Split text into stream-sized chunks: words with their trailing whitespace,
 * so the reconstructed stream is byte-for-byte identical to the original.
 */
export function tokenize(text: string): string[] {
  return text.match(/\S+\s*|\s+/g) ?? [];
}
