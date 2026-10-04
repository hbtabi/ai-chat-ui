/** Derive a short sidebar title from the first user message. */
export function makeTitle(text: string, maxWords = 6, maxChars = 42): string {
  const firstLine = text.replace(/```[\s\S]*?```/g, " ").split("\n").find((l) => l.trim()) ?? "";
  const clean = firstLine.replace(/[#*_`>\[\]]/g, "").replace(/\s+/g, " ").trim();
  if (!clean) return "New chat";
  let title = clean.split(" ").slice(0, maxWords).join(" ");
  if (title.length > maxChars) title = title.slice(0, maxChars - 1).trimEnd() + "…";
  else if (clean.split(" ").length > maxWords) title += "…";
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function relativeDay(ts: number, now = Date.now()): "Today" | "Yesterday" | "Previous 7 days" | "Older" {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const day = 86_400_000;
  if (ts >= startOfToday.getTime()) return "Today";
  if (ts >= startOfToday.getTime() - day) return "Yesterday";
  if (ts >= startOfToday.getTime() - 7 * day) return "Previous 7 days";
  return "Older";
}
