import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// jsdom doesn't implement these; the app only uses them cosmetically.
Element.prototype.scrollIntoView ??= () => {};
