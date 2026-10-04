import type { Conversation } from "./types";

/** Sample conversations loaded with `?demo` (used for screenshots and first-run exploration). */
export function demoConversations(now = Date.now()): Conversation[] {
  const t = (mins: number) => now - mins * 60_000;
  return [
    {
      id: "demo-1",
      title: "Debounce helper in TypeScript",
      createdAt: t(4),
      updatedAt: t(1),
      messages: [
        { id: "d1", role: "user", content: "Can you write a typed debounce function in TypeScript?", createdAt: t(4) },
        {
          id: "d2",
          role: "assistant",
          createdAt: t(3),
          content:
            "Here's a small, fully typed `debounce` that preserves the wrapped function's parameter types:\n\n" +
            "```typescript\nexport function debounce<T extends (...args: never[]) => void>(fn: T, ms = 250) {\n  let timer: ReturnType<typeof setTimeout> | undefined;\n  return (...args: Parameters<T>) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), ms);\n  };\n}\n```\n\n" +
            "**Why this shape?**\n\n1. `Parameters<T>` keeps call sites type-safe.\n2. The timer is reset on every call, so only the **last** call within `ms` runs.\n3. No dependencies, so it's tree-shakeable.\n\n> 💡 For search boxes, 250–400 ms usually feels responsive without spamming the API.",
        },
        { id: "d3", role: "user", content: "Compare debounce vs throttle in a table", createdAt: t(2) },
        {
          id: "d4",
          role: "assistant",
          createdAt: t(1),
          content:
            "| | Debounce | Throttle |\n|---|---|---|\n| Fires | After activity **stops** | At most once per interval |\n| Good for | Search input, autosave | Scroll, resize, mouse move |\n| Feels | Calm, delayed | Steady, live |\n\n**Rule of thumb:** debounce when you care about the *final* value; throttle when you care about *progress*.",
        },
      ],
    },
    {
      id: "demo-2",
      title: "Launch plan for a London AI studio",
      createdAt: t(60 * 26),
      updatedAt: t(60 * 26),
      messages: [
        { id: "e1", role: "user", content: "Give me a launch plan for a London AI studio", createdAt: t(60 * 26) },
        { id: "e2", role: "assistant", content: "- [x] Pick one niche\n- [ ] Ship three case studies\n- [ ] Talk to 20 founders", createdAt: t(60 * 26) },
      ],
    },
    {
      id: "demo-3",
      title: "Explain attention in transformers",
      createdAt: t(60 * 24 * 3),
      updatedAt: t(60 * 24 * 3),
      messages: [{ id: "f1", role: "user", content: "Explain attention in transformers", createdAt: t(60 * 24 * 3) }],
    },
  ];
}
