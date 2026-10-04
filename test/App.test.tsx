import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../src/App";
import { MockProvider } from "../src/lib/providers";

describe("<App />", () => {
  it("streams a mock reply, renders Markdown and persists the conversation", async () => {
    const user = userEvent.setup();
    render(<App provider={new MockProvider(0, 0)} />);
    expect(screen.getByText("How can I help today?")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Message"), "Write a python function{Enter}");

    const reply = await screen.findByRole("article", { name: "Assistant" });
    await waitFor(() => expect(within(reply).getByText("python")).toBeInTheDocument());
    expect(within(reply).getByText(/How it works/)).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "You" })).toHaveTextContent("Write a python function");

    // Sidebar shows the auto-generated title, and history is saved to localStorage.
    expect(screen.getByRole("button", { name: "Write a python function" })).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem("ai-chat-ui:v1:conversations")).toContain("Write a python function"));
  });

  it("suggestion cards send a prompt, and regenerate replaces the reply", async () => {
    const user = userEvent.setup();
    render(<App provider={new MockProvider(0, 0)} />);
    await user.click(screen.getByRole("button", { name: /Compare options/ }));
    await screen.findByRole("table");
    await user.click(await screen.findByRole("button", { name: "Regenerate" }));
    await waitFor(() => expect(screen.getAllByRole("article", { name: "Assistant" })).toHaveLength(1));
    await screen.findByRole("table");
  });

  it("stop button aborts a slow stream", async () => {
    const user = userEvent.setup();
    render(<App provider={new MockProvider(5, 0)} />);
    await user.type(screen.getByLabelText("Message"), "explain gravity{Enter}");
    await user.click(await screen.findByRole("button", { name: "Stop generating" }));
    expect(await screen.findByText("Stopped")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send message" })).toBeInTheDocument();
  });

  it("opens settings and toggles theme", async () => {
    const user = userEvent.setup();
    render(<App provider={new MockProvider(0, 0)} />);
    await user.click(screen.getByRole("button", { name: "Toggle theme" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    await user.click(screen.getByRole("button", { name: /Settings/ }));
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    await user.click(screen.getByLabelText("OpenAI-compatible"));
    expect(screen.getByText("Base URL")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("ai-chat-ui:v1:settings")!).provider).toBe("openai");
  });
});
