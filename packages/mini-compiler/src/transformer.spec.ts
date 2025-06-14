import { expect, test } from "vitest";
import { AstNodeType, IAstNode } from "./parser";
import {
  ITransformedAstNode,
  TransformedAstNodeType,
  transformer,
} from "./transformer";

//! (add 1 (subtract 5 3))
test("transformer", () => {
  const originalAst: IAstNode = {
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

  const transformedAst: ITransformedAstNode = {
    type: AstNodeType.Program,
    body: [
      {
        type: TransformedAstNodeType.ExpressionStatement,
        expression: {
          type: AstNodeType.CallExpression,
          callee: {
            type: TransformedAstNodeType.Identifier,
            name: "add",
          },
          arguments: [
            {
              type: AstNodeType.NumberLiteral,
              value: "1",
            },
            {
              type: AstNodeType.CallExpression,
              callee: {
                type: TransformedAstNodeType.Identifier,
                name: "subtract",
              },
              arguments: [
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
      },
    ],
  };

  expect(transformer(originalAst)).toEqual(transformedAst);
});
