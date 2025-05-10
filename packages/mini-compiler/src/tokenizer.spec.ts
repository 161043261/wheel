import { test, expect } from "vitest";
import { tokenizer, TokenTypes } from "./tokenizer";

test("tokenizer", () => {
  const code = "(add 1 (subtract 5 3))";
  const tokens = [
    { type: TokenTypes.Paren, value: "(" },
    { type: TokenTypes.Name, value: "add" },
    { type: TokenTypes.Number, value: "1" },
    { type: TokenTypes.Paren, value: "(" },
    { type: TokenTypes.Name, value: "subtract" },
    { type: TokenTypes.Number, value: "5" },
    { type: TokenTypes.Number, value: "3" },
    { type: TokenTypes.Paren, value: ")" },
    { type: TokenTypes.Paren, value: ")" },
  ];
  expect(tokenizer(code)).toEqual(tokens);
});

test("left paren", () => {
  const code = "(";
  const tokens = [{ type: TokenTypes.Paren, value: "(" }];
  expect(tokenizer(code)).toEqual(tokens);
});

test("right paren", () => {
  const code = ")";
  const tokens = [{ type: TokenTypes.Paren, value: ")" }];
  expect(tokenizer(code)).toEqual(tokens);
});

test("add", () => {
  const code = "add";
  const tokens = [{ type: TokenTypes.Name, value: "add" }];
  expect(tokenizer(code)).toEqual(tokens);
});

test("number", () => {
  const code = "22";
  const token = [{ type: TokenTypes.Number, value: "22" }];
  expect(tokenizer(code)).toEqual(token);
});

test("(add 1 2)", () => {
  const code = "(add 1 2)";
  const tokens = [
    { type: TokenTypes.Paren, value: "(" },
    { type: TokenTypes.Name, value: "add" },
    { type: TokenTypes.Number, value: "1" },
    { type: TokenTypes.Number, value: "2" },
    { type: TokenTypes.Paren, value: ")" },
  ];
  expect(tokenizer(code)).toEqual(tokens);
});
