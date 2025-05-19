import { AstNodeType, IAstNode, IAstNodeType } from "./parser";
import { traverser } from "./traverser";

export const enum TransformedAstNodeType {
  ExpressionStatement = "ExpressionStatement",
  Identifier = "Identifier",
}
type ITransformedAstNodeType = TransformedAstNodeType;

export interface ITransformedAstNode {
  //! for Program: type, body
  //! for ExpressionStatement: type, expression
  //! for CallExpression: type, callee, arguments
  //! for Identifier: type, name
  //! for NumberLiteral: type, value
  type: IAstNodeType | ITransformedAstNodeType;
  body?: ITransformedAstNode[];
  expression?: ITransformedAstNode;
  callee?: ITransformedAstNode;
  arguments?: ITransformedAstNode[];
  name?: string;
  value?: string;
}

export function transformer(originalAst: IAstNode): ITransformedAstNode {
  const transformedAst: ITransformedAstNode = {
    type: AstNodeType.Program,
    body: [],
  };

  //////////////////////////////////////////
  originalAst.context = transformedAst.body;
  //////////////////////////////////////////

  traverser(originalAst, {
    // Program?: IVisitorOptions;
    // NumberLiteral?: IVisitorOptions;
    CallExpression: {
      enter(node: IAstNode, parent?: IAstNode) {
        if (node.type === AstNodeType.CallExpression) {
          //! 参考 ./transformer.spec.ts: [22-35] -> [57-73]
          let newNode: ITransformedAstNode = {
            type: AstNodeType.CallExpression,
            callee: {
              type: TransformedAstNodeType.Identifier,
              name: node.name,
            },
            arguments: [],
          };

          /////////////////////////////////
          node.context = newNode.arguments;
          /////////////////////////////////

          //! 参考 ./transformer.spec.ts: [14-37] -> [44-76]
          if (
            parent?.type === AstNodeType.Program
            // parent?.type !== AstNodeType.CallExpression
          ) {
            newNode = {
              type: TransformedAstNodeType.ExpressionStatement,
              expression: newNode,
            };
          }
          parent?.context?.push(newNode);
        }
      },
    },

    NumberLiteral: {
      enter(node, parent) {
        if (node.type === AstNodeType.NumberLiteral) {
          const newNode: ITransformedAstNode = {
            type: AstNodeType.NumberLiteral,
            value: node.value,
          };
          parent?.context?.push(newNode);
        }
      },
    },
  });

  return transformedAst;
}
