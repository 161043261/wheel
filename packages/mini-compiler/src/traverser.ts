//! traverser 深度优先遍历 AST 抽象语法树
import { AstNodeType, IAstNode } from "./parser";

interface IVisitorOptions {
  enter?: (node: IAstNode, parent?: IAstNode) => void;
  exit?: (node: IAstNode, parent?: IAstNode) => void;
}

export interface IVisitor {
  Program?: IVisitorOptions;
  NumberLiteral?: IVisitorOptions;
  CallExpression?: IVisitorOptions;
  // todo: Support StringLiteral
  // StringLiteral?: IVisitorOptions;
}

/**
 *
 * @param astRoot 抽象语法树根节点
 * @param visitor 访问者模式
 * @link https://refactoringguru.cn/design-patterns/visitor
 */
export function traverser(astRoot: IAstNode, visitor: IVisitor) {
  //! 1. 深度优先搜索
  const dfs = (astNode: IAstNode, parent?: IAstNode) => {
    const visitorOptions = visitor[astNode.type];
    visitorOptions?.enter?.(astNode, parent);
    // console.log("astNode:", astNode);
    // if (astNode.type === AstNodeType.Program) {
    //   for (const child of astNode.body!) {
    //     dfs(child);
    //   }
    // } else if (astNode.type === AstNodeType.NumberLiteral) {
    // } else if (astNode.type === AstNodeType.CallExpression) {
    //   for (const child of astNode.params!) {
    //     dfs(child);
    //   }
    // }

    switch (astNode.type) {
      case AstNodeType.Program:
        for (const child of astNode.body!) {
          dfs(child, astNode);
        }
        break;

      case AstNodeType.NumberLiteral:
        break;

      case AstNodeType.CallExpression:
        for (const child of astNode.params!) {
          dfs(child, astNode);
        }
        break;
    } // switch

    visitorOptions?.exit?.(astNode, parent);
  };

  dfs(astRoot);
}
