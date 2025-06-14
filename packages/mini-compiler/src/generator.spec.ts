import { expect, test } from "vitest";
import { AstNodeType } from "./parser";
import { ITransformedAstNode, TransformedAstNodeType } from "./transformer";
import { generator } from "./generator";

test("generator", () => {
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

  expect(generator(transformedAst)).toMatchInlineSnapshot(
    '"add(1, subtract(5, 3));\nadd(1, subtract(5, 3));"',
  );
});
