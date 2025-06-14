# tiny compiler

## TDD

TDD, Test Driven Development: 测试驱动开发

## Current Supported

```lisp
(add 1 2)
```

```c
1 + 2;
```

```lisp
(subtract 2 1)
```

```c
2 - 1;
```

1. inputCode -> `tokenizer` -> tokens 对输入代码词法分析, 生成 tokens
2. tokens -> `parser` -> originalAst 对 tokens 语法分析, 生成 AST 抽象语法树
3. `traverser` 遍历 AST 抽象语法树, 使用深度优先遍历
4. originalAst -> `transformer` -> transformedAst 转换 AST 抽象语法树, 使用访问者模式
5. transformedAst -> `generator` -> outputCode 遍历转换后的 AST 抽象语法树, 生成输出代码

## Reference

1. (/^▽^)/ [tokenizer.ts](./src/tokenizer.ts) 对输入代码 **tokenizer 词法分析**, 生成 tokens
2. (/^▽^)/ [parser.ts](./src/parser.ts) 对 tokens **parser 语法分析**, 生成 AST 抽象语法树
3. (/^▽^)/ [traverser.ts](./src/traverser.ts) **traverser 遍历 AST 抽象语法树**, 使用深度优先遍历
4. (/^▽^)/ [transformer.ts](./src/transformer.ts) **transformer 转换 AST 抽象语法树**, 使用访问者模式
5. (/^▽^)/ [generator.ts](./src/generator.ts) 遍历转换后的 AST 抽象语法树, **generator 生成输出代码**
6. (/^▽^)/ [compiler.ts](./src/compiler.ts) Lisp -> C style
