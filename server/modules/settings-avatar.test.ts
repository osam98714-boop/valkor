import { describe, expect, it } from "vitest";
import { isValidStoreAvatarUrl } from "./settings-router";

describe("store avatar URL validation", () => {
  it("accepts the store's managed storage path", () => {
    expect(isValidStoreAvatarUrl("/manus-storage/valkor/store/avatar.webp")).toBe(true);
  });

  it("accepts a direct HTTPS image URL from imgbb", () => {
    expect(isValidStoreAvatarUrl("https://i.ibb.co/jvf1nVhT/IMG-20261125-WA0025-1.jpg")).toBe(true);
  });

  it("allows an empty optional avatar", () => {
    expect(isValidStoreAvatarUrl("")).toBe(true);
  });

  it.each([
    "http://i.ibb.co/example.jpg",
    "https://ibb.co/example.jpg",
    "https://i.ibb.co.evil.example/example.jpg",
    "https://user@i.ibb.co/example.jpg",
    "https://i.ibb.co/",
    `https://i.ibb.co/${"a".repeat(1024)}.jpg`,
  ])("rejects an unsupported avatar URL: %s", url => {
    expect(isValidStoreAvatarUrl(url)).toBe(false);
  });
});
