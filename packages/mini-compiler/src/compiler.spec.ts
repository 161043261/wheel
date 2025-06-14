import { expect, test } from "vitest";
import { compiler } from "./compiler";

test("compiler", () => {
  const originalCode = "(add 1 (subtract 5 3))";
  expect(compiler(originalCode)).toBe("add(1, subtract(5, 3));");
});
