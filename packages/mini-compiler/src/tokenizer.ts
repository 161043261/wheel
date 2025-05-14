//! tokenizer 词法分析
const isLetter = /[a-z]/i; // 是不是字母, 忽略大小写
const isNumber = /[0-9]/; // 是不是数字
const whiteSpace = /\s/; // 是不是空格

export enum TokenTypes {
  Paren = "paren",
  Name = "name",
  Number = "number",
}

export interface IToken {
  type: TokenTypes;
  value: string;
}

export function tokenizer(code: string) {
  const tokens: IToken[] = [];
  let cur = 0;

  while (cur < code.length) {
    if (whiteSpace.test(code[cur])) {
      cur++;
      continue;
    }

    if (code[cur] === "(") {
      tokens.push({
        type: TokenTypes.Paren,
        value: code[cur],
      });

      cur++;
      continue;
    }

    if (code[cur] === ")") {
      tokens.push({
        type: TokenTypes.Paren,
        value: code[cur],
      });

      cur++;
      continue;
    }

    if (isLetter.test(code[cur])) {
      let value = "";
      while (isLetter.test(code[cur]) && cur < code.length) {
        value += code[cur];
        cur++;
      }
      tokens.push({
        type: TokenTypes.Name,
        value,
      });

      continue;
    }

    if (isNumber.test(code[cur])) {
      let value = "";
      while (isNumber.test(code[cur]) && cur < code.length) {
        value += code[cur];
        cur++;
      }
      tokens.push({
        type: TokenTypes.Number,
        value,
      });

      continue;
    }
  }
  return tokens;
}
