//! parser 语法分析, 生成 AST 抽象语法树
import { IToken, TokenTypes } from "./tokenizer";

export enum AstNodeType {
  Program = "Program",
  CallExpression = "CallExpression",
  NumberLiteral = "NumberLiteral",
  // todo: Support StringLiteral
  // StringLiteral = "StringLiteral",
}

export type IAstNodeType = AstNodeType;

export interface IAstNode {
  //! for Program: type, body
  //! for CallExpression: type, name, params
  //! for NumberLiteral: type, value
  type:
    | AstNodeType.Program
    | AstNodeType.CallExpression
    | AstNodeType.NumberLiteral;
  // 等价于
  //  type: IAstNodeType;
  body?: IAstNode[];
  name?: string;
  params?: IAstNode[];
  value?: string;
  context?: unknown[];
}

function createAstRoot(): IAstNode {
  return {
    type: AstNodeType.Program,
    body: [],
  };
}

function createAstNode(options: IAstNode): IAstNode {
  const { type, name, params, value } = options;
  if (name) {
    return { type, name, params };
  }
  return { type, value };
}

export function parser(tokens: IToken[]): IAstNode {
  const astRoot = createAstRoot();
  let cur = 0;

  const recursiveParse = () => {
    if (tokens[cur].type === TokenTypes.Number) {
      return createAstNode({
        type: AstNodeType.NumberLiteral,
        value: tokens[cur++].value,
      });
    }

    if (tokens[cur].type === TokenTypes.Paren && tokens[cur].value === "(") {
      cur++; // 跳过 '('
      const expressionNode = createAstNode({
        type: AstNodeType.CallExpression,
        name: tokens[cur].value,
        params: [],
      });
      cur++;
      while (
        !(tokens[cur].type === TokenTypes.Paren && tokens[cur].value === ")")
      ) {
        expressionNode.params!.push(recursiveParse()!);
      }
      cur++; // 跳过 ')'
      return expressionNode;
    }
  };

  while (cur < tokens.length) {
    astRoot.body!.push(recursiveParse()!);
  }
  return astRoot;
}
