import { expect, test } from "vitest";
import { AstNodeType, IAstNode, IAstNodeType } from "./parser";
import { IVisitor, traverser } from "./traverser";

//! (add 1 (subtract 5 3))
test("traverser", () => {
  const ast: IAstNode /** abstract syntax tree */ = {
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

  // 具名元组
  const callArr: [
    action: string,
    nodeType: IAstNodeType,
    parentType?: IAstNodeType,
  ][] = [];
  const visitor: IVisitor = {
    Program: {
      enter(node: IAstNode, parent?: IAstNode) {
        //! null?.type === undefined
        //! undefined?.type === undefined
        callArr.push(["program-enter", node.type, parent?.type]);
      },
      exit(node: IAstNode, parent?: IAstNode) {
        callArr.push(["program-exit", node.type, parent?.type]);
      },
    },
    CallExpression: {
      enter(node: IAstNode, parent?: IAstNode) {
        callArr.push(["call-expression-enter", node.type, parent?.type]);
      },
      exit(node: IAstNode, parent?: IAstNode) {
        callArr.push(["call-expression-exit", node.type, parent?.type]);
      },
    },
    NumberLiteral: {
      enter(node: IAstNode, parent?: IAstNode) {
        callArr.push(["number-literal-enter", node.type, parent?.type]);
      },
      exit(node: IAstNode, parent?: IAstNode) {
        callArr.push(["number-literal-exit", node.type, parent?.type]);
      },
    },
  };

  traverser(ast, visitor);
  expect(callArr).toEqual([
    ["program-enter", AstNodeType.Program, undefined], // enter program
    ["call-expression-enter", AstNodeType.CallExpression, AstNodeType.Program], // enter add
    [
      "number-literal-enter",
      AstNodeType.NumberLiteral,
      AstNodeType.CallExpression,
    ], // enter 1
    [
      "number-literal-exit",
      AstNodeType.NumberLiteral,
      AstNodeType.CallExpression,
    ], // exit 1
    [
      "call-expression-enter",
      AstNodeType.CallExpression,
      AstNodeType.CallExpression,
    ], // enter subtract
    [
      "number-literal-enter",
      AstNodeType.NumberLiteral,
      AstNodeType.CallExpression,
    ], // enter 5
    [
      "number-literal-exit",
      AstNodeType.NumberLiteral,
      AstNodeType.CallExpression,
    ], // exit 5
    [
      "number-literal-enter",
      AstNodeType.NumberLiteral,
      AstNodeType.CallExpression,
    ], // exit 3
    [
      "number-literal-exit",
      AstNodeType.NumberLiteral,
      AstNodeType.CallExpression,
    ], // exit 3
    [
      "call-expression-exit",
      AstNodeType.CallExpression,
      AstNodeType.CallExpression,
    ], // exit subtract
    ["call-expression-exit", AstNodeType.CallExpression, AstNodeType.Program], // exit add
    ["program-exit", AstNodeType.Program, undefined], // exit program
  ]);
});
