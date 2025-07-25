import { isReadonly, readonly } from "../reactive";
import { describe, it, expect, vi } from "vitest";

describe("readonly", () => {
  it("test1", () => {
    const original = { foo: 1, bar: { baz: 2 } };
    const wrapped = readonly(original);
    expect(wrapped).not.toBe(original);
    expect(wrapped.foo).toBe(1);

    expect(isReadonly(wrapped)).toBe(true);
    expect(isReadonly(wrapped.bar)).toBe(true);
    expect(isReadonly(original)).toBe(false);
    expect(isReadonly(original.bar)).toBe(false);
  });

  it("test2", () => {
    console.warn = vi.fn();
    const user = readonly({ age: 10 });
    user.age = 11;
    expect(console.warn).toHaveBeenCalled();
  });
});
