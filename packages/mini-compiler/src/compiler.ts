/**
 *
 * @param inputCode 输入代码
 * @returns outputCode 输出代码
 * @description
 * 1. inputCode -> `tokenizer` -> tokens 对输入代码词法分析, 生成 tokens
 * 2. tokens -> `parser` -> originalAst 对 tokens 语法分析, 生成 AST 抽象语法树
 * 3. `traverser` 遍历 AST 抽象语法树, 使用深度优先遍历
 * 4. originalAst -> `transformer` -> transformedAst 转换 AST 抽象语法树, 使用访问者模式
 * 5. transformedAst -> `generator` -> outputCode 遍历转换后的 AST 抽象语法树, 生成输出代码
 */

import { generator } from "./generator";
import { parser } from "./parser";
import { tokenizer } from "./tokenizer";
import { transformer } from "./transformer";

export function compiler(inputCode: string): string {
  const tokens = tokenizer(inputCode);
  const originalAst = parser(tokens);
  const transformedAst = transformer(originalAst);
  return generator(transformedAst) /** outputCode */;
}
