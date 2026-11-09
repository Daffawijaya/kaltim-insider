import test from "node:test";
import assert from "node:assert/strict";
import { eventInput, localDate } from "./events.ts";

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ title: "Lomba Artikel", organizer: "Diskominfo Kukar", description: "Menulis tentang layanan publik.", requirements: "Minimal 500 kata dan karya asli.", starts_on: "2026-11-10", ends_on: "2026-11-20", ...overrides })) data.set(key, value);
  return data;
}

test("eventInput accepts a complete event period", () => {
  assert.deepEqual(eventInput(form()), { value: { title: "Lomba Artikel", organizer: "Diskominfo Kukar", description: "Menulis tentang layanan publik.", requirements: "Minimal 500 kata dan karya asli.", starts_on: "2026-11-10", ends_on: "2026-11-20" } });
});

test("eventInput rejects an inverted period", () => {
  assert.equal(eventInput(form({ ends_on: "2026-11-09" })).error, "Periode event tidak valid.");
});

test("localDate uses WITA calendar date", () => {
  assert.equal(localDate(new Date("2026-11-09T16:30:00Z")), "2026-11-10");
});
