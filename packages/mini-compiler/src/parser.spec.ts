import { expect, test } from "vitest";
import { TokenTypes } from "./tokenizer";
import { AstNodeType, IAstNode, parser } from "./parser";

// (add 1 (subtract 5 3))
test("parser", () => {
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

  const ast /** abstract syntax tree */ = {
    type: AstNodeType.Program,
    body: [
      {
        type: AstNodeType.CallExpression,
        name: "add",
        params: [
          {
            type: AstNodeType.NumberLiteral,
            value: "1",
          },
          {
            type: AstNodeType.CallExpression,
            name: "subtract",
            params: [
              {
                type: AstNodeType.NumberLiteral,
                value: "5",
              },
              {
                type: AstNodeType.NumberLiteral,
                value: "3",
              },
            ],
          },
        ],
      },
    ],
  };

  expect(parser(tokens)).toEqual(ast);
});

test("number", () => {
  const tokens = [
    {
      type: TokenTypes.Number,
      value: "22",
    },
  ];

  const ast = {
    type: AstNodeType.Program,
    body: [{ type: AstNodeType.NumberLiteral, value: "22" }],
  };

  expect(parser(tokens)).toEqual(ast);
});

test("(add 1 2)", () => {
  const tokens = [
    { type: TokenTypes.Paren, value: "(" },
    { type: TokenTypes.Name, value: "add" },
    { type: TokenTypes.Number, value: "1" },
    { type: TokenTypes.Number, value: "2" },
    { type: TokenTypes.Paren, value: ")" },
  ];

  const ast: IAstNode = {
    type: AstNodeType.Program,
    body: [
      {
        type: AstNodeType.CallExpression,
        name: "add",
        params: [
          { type: AstNodeType.NumberLiteral, value: "1" },
          { type: AstNodeType.NumberLiteral, value: "2" },
        ],
      },
    ],
  };
  expect(parser(tokens)).toEqual(ast);
});
