import { useMemo, useState } from "react";
import { relativeDay } from "../lib/title";
import type { Conversation } from "../lib/types";
import { PlusIcon, SearchIcon, SettingsIcon, SparkIcon, TrashIcon } from "./icons";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  open: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
  providerLabel: string;
}

const GROUP_ORDER = ["Today", "Yesterday", "Previous 7 days", "Older"] as const;

export function Sidebar({ conversations, activeId, open, onNew, onSelect, onDelete, onOpenSettings, providerLabel }: Props) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = conversations.filter(
      (c) => !q || c.title.toLowerCase().includes(q) || c.messages.some((m) => m.content.toLowerCase().includes(q)),
    );
    const map = new Map<string, Conversation[]>();
    for (const c of visible) {
      const g = relativeDay(c.updatedAt);
      map.set(g, [...(map.get(g) ?? []), c]);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => [g, map.get(g)!] as const);
  }, [conversations, query]);

  return (
    <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Conversations">
      <div className="brand">
        <div className="brand-mark" aria-hidden>
          <SparkIcon width={16} height={16} />
        </div>
        <span>AI Chat UI</span>
      </div>
      <button type="button" className="new-chat" onClick={onNew}>
        <PlusIcon width={16} height={16} /> New chat
      </button>
      <label className="search">
        <SearchIcon width={14} height={14} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search chats" aria-label="Search chats" />
      </label>
      <nav className="conv-list">
        {groups.length === 0 && <p className="conv-empty">No conversations found.</p>}
        {groups.map(([label, items]) => (
          <div key={label} className="conv-group">
            <h2>{label}</h2>
            {items.map((c) => (
              <div key={c.id} className={`conv ${c.id === activeId ? "active" : ""}`}>
                <button type="button" className="conv-title" onClick={() => onSelect(c.id)} title={c.title}>
                  {c.title}
                </button>
                <button type="button" className="conv-delete" aria-label={`Delete ${c.title}`} onClick={() => onDelete(c.id)}>
                  <TrashIcon width={14} height={14} />
                </button>
              </div>
            ))}
          </div>
        ))}
      </nav>
      <button type="button" className="sidebar-footer" onClick={onOpenSettings}>
        <SettingsIcon width={16} height={16} />
        <span>Settings</span>
        <span className="badge">{providerLabel}</span>
      </button>
    </aside>
  );
}
