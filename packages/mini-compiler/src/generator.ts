import { AstNodeType } from "./parser";
import { ITransformedAstNode, TransformedAstNodeType } from "./transformer";

export function generator(node: ITransformedAstNode): string {
  switch (node.type) {
    case AstNodeType.NumberLiteral:
      return node.value!;

    case AstNodeType.CallExpression:
      return (
        node.callee?.name +
        "(" +
        node.arguments?.map(generator).join(", ") +
        ")"
      );

    case TransformedAstNodeType.ExpressionStatement:
      return generator(node.expression!) + ";";

    case AstNodeType.Program:
      return node.body?.map(generator).join("\n")!;

    default:
      throw new TypeError(node.type);
  }
}
