export const warned = new Set<string>();

export const shouldWarn = (code: string) => !warned.has(code);

// Either a constructor function or class
export type Constructor = ((...a: any[]) => any) | { new (...a: any[]): any };

export const emitWarning = (
  warningMessage: string,
  type?: string,
  code?: string,
  constructor?: Constructor, // Constructor function or class
) => {
  typeof process.emitWarning === "function"
    ? process.emitWarning(warningMessage, type, code, constructor)
    : console.error(`[${code}] ${type}: ${warningMessage}`);
};

export const isPosInt = (n: any): n is number =>
  n && Number.isInteger(n) && n > 0;
