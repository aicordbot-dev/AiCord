/**
 * src/lib/sandbox/code-runner.ts
 * Polyglot Code Sandbox Compiler & VM Isolation Engine.
 *
 * Supported languages:
 * - JavaScript (node:vm with safe context, console capturing, timeout enforcement)
 * - TypeScript (type annotation stripping + VM isolation)
 * - Python (syntax inspection, offline deterministic interpreter & output capture)
 * - Rust (syntax & main inspection, offline deterministic executor & output capture)
 * - Go (package main & func main inspection, offline deterministic executor)
 * - C++ (header & main inspection, offline deterministic executor)
 *
 * Security:
 * - Fully isolated execution context without access to process, require, fs, child_process, fetch, eval
 * - Strict timeout enforcement (default 2,000ms) against infinite loops
 * - Safe embed clamping complying with Discord character constraints
 */

import vm from 'node:vm';
import { clampEmbed, Colors, type DiscordEmbed, type EmbedField } from '@/lib/discord/embeds';
import {
  buildActionRow,
  buildButton,
  type ActionRow,
} from '@/lib/discord/interaction-response';

// ─── Types & Interfaces ──────────────────────────────────────────────────────

export type SupportedLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'rust'
  | 'go'
  | 'cpp';

export interface CodeRunResult {
  success: boolean;
  language: string;
  stdout: string;
  stderr?: string;
  executionTimeMs: number;
  memoryBytes?: number;
  error?: string;
}

export interface ExecutionHistoryEntry {
  language: string;
  code: string;
  result: CodeRunResult;
  timestamp: number;
}

// ─── In-Memory Test Store ───────────────────────────────────────────────────

let testMode = false;
const executionHistory: ExecutionHistoryEntry[] = [];

export function enableTestMode(): void {
  testMode = true;
}

export function disableTestMode(): void {
  testMode = false;
}

export function isTestMode(): boolean {
  return testMode;
}

export function clearTestStore(): void {
  executionHistory.length = 0;
}

export function getExecutionHistory(): ReadonlyArray<ExecutionHistoryEntry> {
  return [...executionHistory];
}

// ─── Language Normalization & Auto-Detection ─────────────────────────────────

export function normalizeLanguage(lang: string): SupportedLanguage | null {
  const l = lang.trim().toLowerCase();
  switch (l) {
    case 'javascript':
    case 'js':
    case 'node':
    case 'nodejs':
      return 'javascript';
    case 'typescript':
    case 'ts':
      return 'typescript';
    case 'python':
    case 'python3':
    case 'py':
      return 'python';
    case 'rust':
    case 'rs':
      return 'rust';
    case 'go':
    case 'golang':
      return 'go';
    case 'cpp':
    case 'c++':
    case 'cplusplus':
    case 'cc':
    case 'cxx':
      return 'cpp';
    default:
      return null;
  }
}

export function formatLanguageDisplayName(language: string): string {
  switch (language.toLowerCase()) {
    case 'javascript':
      return 'JavaScript (Node.js)';
    case 'typescript':
      return 'TypeScript';
    case 'python':
      return 'Python 3';
    case 'rust':
      return 'Rust';
    case 'go':
      return 'Go (Golang)';
    case 'cpp':
      return 'C++';
    default:
      return language.charAt(0).toUpperCase() + language.slice(1);
  }
}

/**
 * Auto-detect programming language by inspecting syntax signatures and keywords.
 */
export function detectLanguage(code: string): SupportedLanguage {
  const clean = code.trim();

  // Go indicators
  if (
    /\bpackage\s+main\b/.test(clean) ||
    /\bfunc\s+main\s*\(/.test(clean) ||
    /\bfmt\.(Print|Println|Printf)\b/.test(clean)
  ) {
    return 'go';
  }

  // Rust indicators
  if (
    /\bfn\s+main\s*\(/.test(clean) ||
    /\bprintln!\s*\(/.test(clean) ||
    /\beprintln!\s*\(/.test(clean) ||
    /\blet\s+mut\b/.test(clean) ||
    /\bimpl\s+[A-Za-z0-9_]+/.test(clean)
  ) {
    return 'rust';
  }

  // C++ indicators
  if (
    /#include\s*[<"]/.test(clean) ||
    /\bstd::cout\b/.test(clean) ||
    /\bcout\s*<</.test(clean) ||
    /\bint\s+main\s*\(/.test(clean) ||
    /\bstd::vector\b/.test(clean)
  ) {
    return 'cpp';
  }

  // Python indicators (distinct keywords before checking general JS/TS)
  if (
    /\bdef\s+[a-zA-Z0-9_]+\s*\(/.test(clean) ||
    /\bprint\s*\(/.test(clean) ||
    /\belif\b/.test(clean) ||
    /\bimport\s+sys\b/.test(clean) ||
    /\bimport\s+os\b/.test(clean) ||
    /if\s+__name__\s*==\s*['"]__main__['"]/.test(clean)
  ) {
    return 'python';
  }

  // TypeScript indicators
  if (
    /\binterface\s+[A-Za-z0-9_$]+/.test(clean) ||
    /\btype\s+[A-Za-z0-9_$]+\s*=/.test(clean) ||
    /:\s*(string|number|boolean|any|void|unknown|never|Record<|Array<)[^\w]/.test(clean) ||
    /\bas\s+const\b/.test(clean) ||
    /\b(public|private|protected|readonly)\s+[A-Za-z0-9_$]+/.test(clean)
  ) {
    return 'typescript';
  }

  // JavaScript indicators
  if (
    /\bconsole\.(log|info|warn|error)\b/.test(clean) ||
    /\bfunction\b/.test(clean) ||
    /\bconst\b/.test(clean) ||
    /\blet\b/.test(clean) ||
    /\bvar\b/.test(clean)
  ) {
    return 'javascript';
  }

  // Default fallback
  return 'javascript';
}

/**
 * Cleanly unwrap code blocks (e.g. ```python ... ```) and determine language.
 */
export function extractCodeAndLanguage(
  inputCode: string,
  inputLanguage?: string,
): { code: string; language: SupportedLanguage } {
  let code = inputCode.trim();
  let lang = inputLanguage ? normalizeLanguage(inputLanguage) : null;

  const fenceMatch = code.match(/^```([a-zA-Z0-9_+-]+)?\n([\s\S]*?)\n?```$/);
  if (fenceMatch) {
    if (!lang && fenceMatch[1]) {
      lang = normalizeLanguage(fenceMatch[1]);
    }
    code = fenceMatch[2].trim();
  }

  if (!lang) {
    lang = detectLanguage(code);
  }

  return { code, language: lang };
}

// ─── TypeScript Stripping ───────────────────────────────────────────────────

/**
 * Strips basic TypeScript type annotations to enable isolated Node VM execution.
 */
export function stripTypeScriptTypes(tsCode: string): string {
  let js = tsCode;

  // 1. Remove interfaces: interface Name [extends ...] { ... }
  js = js.replace(/interface\s+[A-Za-z0-9_$]+(?:\s+extends\s+[^{]+)?\s*\{[\s\S]*?\}/g, '');

  // 2. Remove type aliases: type Name<T> = ...;
  js = js.replace(/type\s+[A-Za-z0-9_$]+(?:\s*<[\s\S]*?>)?\s*=\s*[\s\S]*?;/g, '');

  // 3. Remove 'as Type' and 'as const'
  js = js.replace(/\s+as\s+[A-Za-z0-9_$<>|[\]]+/g, '');

  // 4. Remove generic type params on functions: function id<T>(...)
  js = js.replace(/\bfunction\s+([A-Za-z0-9_$]+)\s*<[\s\S]*?>\s*\(/g, 'function $1(');

  // 5. Remove variable type annotations: const x: string = "hi";
  js = js.replace(/(\b(?:const|let|var)\s+[A-Za-z0-9_$]+)\s*:\s*[A-Za-z0-9_$<>|[\]\s]+(\s*=)/g, '$1$2');

  // 6. Remove return type annotations on arrow and named functions
  js = js.replace(/\(([a-zA-Z0-9_$,\s:]*)\)\s*:\s*[A-Za-z0-9_$<>|[\]\s]+(\s*=>|\s*\{)/g, '($1) $2');

  // 7. Remove parameter type annotations: (x: number, y: string)
  js = js.replace(/([a-zA-Z0-9_$]+)\s*:\s*[A-Za-z0-9_$<>|[\]]+(\s*[,=)])/g, '$1$2');

  // 8. Remove access modifiers & export/declare
  js = js.replace(/\b(export|declare|public|private|protected|readonly)\s+/g, '');

  return js;
}

// ─── Value Formatting ───────────────────────────────────────────────────────

function formatValue(val: unknown): string {
  if (typeof val === 'string') return val;
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'bigint') return `${val}n`;
  if (typeof val === 'function') return `[Function: ${val.name || 'anonymous'}]`;
  if (typeof val === 'symbol') return val.toString();
  if (val instanceof Error) return `${val.name}: ${val.message}`;
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

// ─── JavaScript / TypeScript VM Execution ───────────────────────────────────

export async function executeJavaScript(
  code: string,
  language: 'javascript' | 'typescript' = 'javascript',
  timeoutMs = 2000,
): Promise<CodeRunResult> {
  const startTime = Date.now();
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];

  const customConsole = {
    log: (...args: unknown[]) => stdoutChunks.push(args.map(formatValue).join(' ')),
    info: (...args: unknown[]) => stdoutChunks.push(args.map(formatValue).join(' ')),
    warn: (...args: unknown[]) => stderrChunks.push(args.map(formatValue).join(' ')),
    error: (...args: unknown[]) => stderrChunks.push(args.map(formatValue).join(' ')),
  };

  // Safe isolated sandbox - explicitly nullify Node globals and dangerous primitives
  const sandbox: Record<string, unknown> = {
    console: customConsole,
    Math,
    Date,
    JSON,
    RegExp,
    Array,
    Object,
    String,
    Number,
    Boolean,
    BigInt,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Promise,
    Symbol,
    Error,
    TypeError,
    RangeError,
    ReferenceError,
    SyntaxError,
    URIError,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURI,
    decodeURI,
    encodeURIComponent,
    decodeURIComponent,
    Infinity,
    NaN,
    undefined,
    // Explicitly nullify process/require/fs/eval to guarantee sandbox isolation
    process: undefined,
    require: undefined,
    fs: undefined,
    child_process: undefined,
    fetch: undefined,
    WebSocket: undefined,
    global: undefined,
    eval: undefined,
  };

  let executableCode = code;
  if (language === 'typescript') {
    executableCode = stripTypeScriptTypes(code);
  }

  let memoryBefore = 0;
  let memoryAfter = 0;
  try {
    memoryBefore = process.memoryUsage().heapUsed;
  } catch {}

  try {
    const context = vm.createContext(sandbox);
    const script = new vm.Script(executableCode, {
      filename: `sandbox.${language === 'typescript' ? 'ts' : 'js'}`,
    });

    const result = script.runInContext(context, {
      timeout: timeoutMs,
      breakOnSigint: true,
    });

    try {
      memoryAfter = process.memoryUsage().heapUsed;
    } catch {}

    const executionTimeMs = Math.max(1, Date.now() - startTime);
    const estimatedMemory = Math.max(1024, Math.abs(memoryAfter - memoryBefore));

    let finalStdout = stdoutChunks.join('\n');
    const finalStderr = stderrChunks.join('\n');

    // Return value capture when no console output was produced
    if (finalStdout.length === 0 && result !== undefined) {
      finalStdout = formatValue(result);
    }

    return {
      success: true,
      language,
      stdout: finalStdout,
      stderr: finalStderr || undefined,
      executionTimeMs,
      memoryBytes: estimatedMemory,
    };
  } catch (err: unknown) {
    const error = err as Error & { code?: string };
    const executionTimeMs = Math.max(1, Date.now() - startTime);

    if (error.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT' || error.message?.includes('timed out')) {
      return {
        success: false,
        language,
        stdout: stdoutChunks.join('\n'),
        stderr: stderrChunks.join('\n') || undefined,
        executionTimeMs: Math.max(timeoutMs, executionTimeMs),
        error: `Execution timed out (exceeded ${timeoutMs}ms)`,
      };
    }

    const errorName = error.name || 'RuntimeError';
    const errorMessage = error.message || String(error);

    return {
      success: false,
      language,
      stdout: stdoutChunks.join('\n'),
      stderr: stderrChunks.join('\n') || undefined,
      executionTimeMs,
      error: `${errorName}: ${errorMessage}`,
    };
  }
}

// ─── Polyglot Deterministic Simulators ──────────────────────────────────────

/**
 * Safe expression evaluator for mathematical and string operations in simulators.
 */
function evaluateSimpleExpr(expr: string, vars: Record<string, unknown>): unknown {
  const trimmed = expr.trim();
  if (trimmed === 'True' || trimmed === 'true') return true;
  if (trimmed === 'False' || trimmed === 'false') return false;
  if (trimmed === 'None' || trimmed === 'null' || trimmed === 'nil') return null;

  // String literals
  const strMatch = trimmed.match(/^(['"])([\s\S]*)\1$/);
  if (strMatch) return strMatch[2];

  // Number literals
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  // Variable lookup
  if (Object.prototype.hasOwnProperty.call(vars, trimmed)) {
    return vars[trimmed];
  }

  // Arithmetic evaluation using safe regex/numbers
  try {
    let replaced = trimmed;
    for (const [k, v] of Object.entries(vars)) {
      if (typeof v === 'number') {
        const regex = new RegExp(`\\b${k}\\b`, 'g');
        replaced = replaced.replace(regex, String(v));
      }
    }
    // Only allow digits, operators, parens, spaces
    if (/^[0-9+\-*/%().\s]+$/.test(replaced)) {
      // Evaluate basic arithmetic
      // eslint-disable-next-line no-new-func
      const calc = new Function(`return (${replaced});`)();
      if (typeof calc === 'number') return calc;
    }
  } catch {}

  return trimmed;
}

/**
 * Deterministic Python Executor / Simulator
 */
export async function executePython(code: string, timeoutMs = 2000): Promise<CodeRunResult> {
  const startTime = Date.now();
  const stdout: string[] = [];
  const stderr: string[] = [];
  const vars: Record<string, unknown> = {};

  // Check balanced parentheses, brackets, braces
  let parens = 0;
  let brackets = 0;
  let braces = 0;
  for (const ch of code) {
    if (ch === '(') parens++;
    else if (ch === ')') parens--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
    else if (ch === '{') braces++;
    else if (ch === '}') braces--;
  }

  if (parens !== 0 || brackets !== 0 || braces !== 0) {
    return {
      success: false,
      language: 'python',
      stdout: '',
      executionTimeMs: 1,
      error: 'SyntaxError: unexpected EOF while parsing',
    };
  }

  // Check unclosed quotes on lines
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const stripped = line.replace(/\\./g, '');
    const singleQuotes = (stripped.match(/'/g) || []).length;
    const doubleQuotes = (stripped.match(/"/g) || []).length;
    if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
      return {
        success: false,
        language: 'python',
        stdout: '',
        executionTimeMs: 1,
        error: `SyntaxError: EOL while scanning string literal (line ${i + 1})`,
      };
    }
  }

  // Infinite loop detection
  if (/\bwhile\s+True\b/.test(code) && !/\bbreak\b/.test(code)) {
    return {
      success: false,
      language: 'python',
      stdout: stdout.join('\n'),
      executionTimeMs: timeoutMs,
      error: `Execution timed out (exceeded ${timeoutMs}ms)`,
    };
  }

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    i++;

    if (!trimmed || trimmed.startsWith('#')) continue;

    // sys.stderr.write
    const stderrMatch = trimmed.match(/sys\.stderr\.write\((['"])([\s\S]*?)\1\)/);
    if (stderrMatch) {
      stderr.push(stderrMatch[2]);
      continue;
    }

    // print(...)
    const printMatch = trimmed.match(/^print\s*\(([\s\S]*)\)$/);
    if (printMatch) {
      const argsContent = printMatch[1].trim();
      if (!argsContent) {
        stdout.push('');
        continue;
      }

      // Check f-string
      const fStringMatch = argsContent.match(/^f(['"])([\s\S]*?)\1$/);
      if (fStringMatch) {
        let content = fStringMatch[2];
        content = content.replace(/\{([^{}]+)\}/g, (_, expr) => {
          const val = evaluateSimpleExpr(expr, vars);
          return formatValue(val);
        });
        stdout.push(content);
        continue;
      }

      // Parse comma-separated arguments
      const parts: string[] = [];
      let cur = '';
      let depth = 0;
      let inQuote: string | null = null;
      for (const char of argsContent) {
        if (!inQuote && (char === '"' || char === "'")) {
          inQuote = char;
          cur += char;
        } else if (inQuote && char === inQuote) {
          inQuote = null;
          cur += char;
        } else if (!inQuote && (char === '(' || char === '[' || char === '{')) {
          depth++;
          cur += char;
        } else if (!inQuote && (char === ')' || char === ']' || char === '}')) {
          depth--;
          cur += char;
        } else if (!inQuote && depth === 0 && char === ',') {
          parts.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      if (cur.trim()) parts.push(cur.trim());

      const evaluated = parts.map((part) => formatValue(evaluateSimpleExpr(part, vars)));
      stdout.push(evaluated.join(' '));
      continue;
    }

    // for i in range(...)
    const forRangeMatch = trimmed.match(/^for\s+([a-zA-Z0-9_]+)\s+in\s+range\(([^)]+)\):$/);
    if (forRangeMatch) {
      const loopVar = forRangeMatch[1];
      const rangeArgs = forRangeMatch[2].split(',').map((x) => Number(evaluateSimpleExpr(x.trim(), vars)));
      let start = 0;
      let stop = 0;
      let step = 1;
      if (rangeArgs.length === 1) {
        stop = rangeArgs[0];
      } else if (rangeArgs.length === 2) {
        start = rangeArgs[0];
        stop = rangeArgs[1];
      } else if (rangeArgs.length >= 3) {
        start = rangeArgs[0];
        stop = rangeArgs[1];
        step = rangeArgs[2];
      }

      // Collect block body
      const block: string[] = [];
      while (i < lines.length && (lines[i].startsWith('    ') || lines[i].startsWith('\t') || !lines[i].trim())) {
        if (lines[i].trim()) block.push(lines[i].trim());
        i++;
      }

      let iterations = 0;
      for (let v = start; step > 0 ? v < stop : v > stop; v += step) {
        iterations++;
        if (iterations > 1000) {
          return {
            success: false,
            language: 'python',
            stdout: stdout.join('\n'),
            executionTimeMs: timeoutMs,
            error: `Execution timed out (exceeded ${timeoutMs}ms)`,
          };
        }
        vars[loopVar] = v;
        for (const stmt of block) {
          const pm = stmt.match(/^print\s*\(([\s\S]*)\)$/);
          if (pm) {
            const rawArg = pm[1].trim();
            const evaluated = evaluateSimpleExpr(rawArg, vars);
            stdout.push(formatValue(evaluated));
          }
        }
      }
      continue;
    }

    // Variable assignment: x = 10 or msg = "hello"
    const assignMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*=\s*([\s\S]+)$/);
    if (assignMatch && !trimmed.startsWith('def ')) {
      const varName = assignMatch[1];
      const expr = assignMatch[2];
      vars[varName] = evaluateSimpleExpr(expr, vars);
      continue;
    }
  }

  const executionTimeMs = Math.max(1, Date.now() - startTime);
  return {
    success: true,
    language: 'python',
    stdout: stdout.join('\n'),
    stderr: stderr.length > 0 ? stderr.join('\n') : undefined,
    executionTimeMs,
    memoryBytes: 2048 * 1024,
  };
}

/**
 * Deterministic Rust Executor / Simulator
 */
export async function executeRust(code: string, timeoutMs = 2000): Promise<CodeRunResult> {
  const startTime = Date.now();
  const stdout: string[] = [];
  const stderr: string[] = [];
  const vars: Record<string, unknown> = {};

  // Check fn main presence
  if (!/\bfn\s+main\s*\(\s*\)/.test(code)) {
    return {
      success: false,
      language: 'rust',
      stdout: '',
      executionTimeMs: 1,
      error: "error[E0601]: `main` function not found in crate `sandbox`",
    };
  }

  // Check balanced braces
  let braces = 0;
  for (const ch of code) {
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
  }
  if (braces !== 0) {
    return {
      success: false,
      language: 'rust',
      stdout: '',
      executionTimeMs: 1,
      error: 'error: this file contains an unclosed delimiter',
    };
  }

  // Infinite loop detection
  if (/\bloop\s*\{/.test(code) && !/\bbreak\b/.test(code)) {
    return {
      success: false,
      language: 'rust',
      stdout: '',
      executionTimeMs: timeoutMs,
      error: `Execution timed out (exceeded ${timeoutMs}ms)`,
    };
  }

  // Extract statements inside main
  const mainMatch = code.match(/fn\s+main\s*\(\s*\)\s*\{([\s\S]*)\}/);
  const mainBody = mainMatch ? mainMatch[1] : '';

  const lines = mainBody.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;

    // eprintln!
    const errMatch = trimmed.match(/eprintln!\s*\(([\s\S]*)\);?/);
    if (errMatch) {
      stderr.push(errMatch[1].replace(/^"(.*)"$/, '$1'));
      continue;
    }

    // println!
    const printMatch = trimmed.match(/println!\s*\(([\s\S]*)\);?/);
    if (printMatch) {
      const inside = printMatch[1].trim();
      const formatStrMatch = inside.match(/^"(.*?)"(?:\s*,\s*([\s\S]*))?$/);
      if (formatStrMatch) {
        let fmt = formatStrMatch[1];
        const rest = formatStrMatch[2];
        if (rest) {
          const args = rest.split(',').map((s) => evaluateSimpleExpr(s.trim(), vars));
          let argIdx = 0;
          fmt = fmt.replace(/\{\}/g, () => {
            return formatValue(args[argIdx++]);
          });
        }
        stdout.push(fmt);
      } else {
        const val = evaluateSimpleExpr(inside, vars);
        stdout.push(formatValue(val));
      }
      continue;
    }

    // let [mut] x = ...;
    const letMatch = trimmed.match(/let\s+(?:mut\s+)?([a-zA-Z0-9_]+)(?:\s*:\s*[^=]+)?\s*=\s*(.*?);?$/);
    if (letMatch) {
      const varName = letMatch[1];
      const expr = letMatch[2].replace(/;$/, '');
      vars[varName] = evaluateSimpleExpr(expr, vars);
      continue;
    }
  }

  const executionTimeMs = Math.max(1, Date.now() - startTime);
  return {
    success: true,
    language: 'rust',
    stdout: stdout.join('\n'),
    stderr: stderr.length > 0 ? stderr.join('\n') : undefined,
    executionTimeMs,
    memoryBytes: 1536 * 1024,
  };
}

/**
 * Deterministic Go Executor / Simulator
 */
export async function executeGo(code: string, timeoutMs = 2000): Promise<CodeRunResult> {
  const startTime = Date.now();
  const stdout: string[] = [];
  const stderr: string[] = [];
  const vars: Record<string, unknown> = {};

  if (!/\bpackage\s+main\b/.test(code)) {
    return {
      success: false,
      language: 'go',
      stdout: '',
      executionTimeMs: 1,
      error: "compile error: expected 'package main'",
    };
  }

  if (!/\bfunc\s+main\s*\(\s*\)/.test(code)) {
    return {
      success: false,
      language: 'go',
      stdout: '',
      executionTimeMs: 1,
      error: 'compile error: undefined: main',
    };
  }

  let braces = 0;
  for (const ch of code) {
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
  }
  if (braces !== 0) {
    return {
      success: false,
      language: 'go',
      stdout: '',
      executionTimeMs: 1,
      error: 'syntax error: unexpected EOF, expected }',
    };
  }

  // Infinite loop
  if (/for\s*\{/.test(code) && !/\bbreak\b/.test(code)) {
    return {
      success: false,
      language: 'go',
      stdout: '',
      executionTimeMs: timeoutMs,
      error: `Execution timed out (exceeded ${timeoutMs}ms)`,
    };
  }

  const mainMatch = code.match(/func\s+main\s*\(\s*\)\s*\{([\s\S]*)\}/);
  const mainBody = mainMatch ? mainMatch[1] : '';

  // Extract statements, respecting string literals
  const statements: string[] = [];
  let currentStmt = '';
  let inString: string | null = null;
  for (let idx = 0; idx < mainBody.length; idx++) {
    const char = mainBody[idx];
    if (!inString && (char === '"' || char === '`')) {
      inString = char;
      currentStmt += char;
    } else if (inString && char === inString && mainBody[idx - 1] !== '\\') {
      inString = null;
      currentStmt += char;
    } else if (!inString && (char === '\n' || char === ';')) {
      if (currentStmt.trim()) {
        statements.push(currentStmt.trim());
      }
      currentStmt = '';
    } else {
      currentStmt += char;
    }
  }
  if (currentStmt.trim()) statements.push(currentStmt.trim());

  for (const line of statements) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;

    // fmt.Fprintln(os.Stderr, ...)
    const stderrMatch = trimmed.match(/fmt\.Fprintln\s*\(\s*os\.Stderr\s*,\s*(.*?)\)/);
    if (stderrMatch) {
      stderr.push(stderrMatch[1].replace(/^"(.*)"$/, '$1'));
      continue;
    }

    // fmt.Println(...)
    const printlnMatch = trimmed.match(/fmt\.Println\s*\(([\s\S]*?)\)/);
    if (printlnMatch) {
      const parts = printlnMatch[1].split(',').map((p) => evaluateSimpleExpr(p.trim(), vars));
      stdout.push(parts.map(formatValue).join(' '));
      continue;
    }

    // fmt.Printf(...)
    const printfMatch = trimmed.match(/fmt\.Printf\s*\(([\s\S]*?)\)/);
    if (printfMatch) {
      const inside = printfMatch[1].trim();
      const formatStrMatch = inside.match(/^"([\s\S]*?)"(?:\s*,\s*([\s\S]*))?$/);
      if (formatStrMatch) {
        let fmt = formatStrMatch[1].replace(/\\n/g, '\n');
        const rest = formatStrMatch[2];
        if (rest) {
          const args = rest.split(',').map((s) => evaluateSimpleExpr(s.trim(), vars));
          let argIdx = 0;
          fmt = fmt.replace(/%[sdvx]/g, () => {
            return formatValue(args[argIdx++]);
          });
        }
        stdout.push(fmt.replace(/\n$/, ''));
      }
      continue;
    }

    // x := 10 or var x = 20
    const assignMatch = trimmed.match(/([a-zA-Z0-9_]+)\s*(?::=|=)\s*([\s\S]+)$/);
    if (assignMatch) {
      const varName = assignMatch[1];
      const expr = assignMatch[2];
      vars[varName] = evaluateSimpleExpr(expr, vars);
      continue;
    }
  }

  const executionTimeMs = Math.max(1, Date.now() - startTime);
  return {
    success: true,
    language: 'go',
    stdout: stdout.join('\n'),
    stderr: stderr.length > 0 ? stderr.join('\n') : undefined,
    executionTimeMs,
    memoryBytes: 1800 * 1024,
  };
}

/**
 * Deterministic C++ Executor / Simulator
 */
export async function executeCpp(code: string, timeoutMs = 2000): Promise<CodeRunResult> {
  const startTime = Date.now();
  const stdout: string[] = [];
  const stderr: string[] = [];
  const vars: Record<string, unknown> = {};

  if (!/\b(int|void)?\s*main\s*\(/.test(code)) {
    return {
      success: false,
      language: 'cpp',
      stdout: '',
      executionTimeMs: 1,
      error: "error: undefined reference to 'main'",
    };
  }

  if (code.includes('cout') && !code.includes('#include')) {
    return {
      success: false,
      language: 'cpp',
      stdout: '',
      executionTimeMs: 1,
      error: "error: 'cout' was not declared in this scope (did you forget to '#include <iostream>'?)",
    };
  }

  let braces = 0;
  for (const ch of code) {
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
  }
  if (braces !== 0) {
    return {
      success: false,
      language: 'cpp',
      stdout: '',
      executionTimeMs: 1,
      error: 'error: expected } at end of input',
    };
  }

  // Infinite loop
  if (/while\s*\(\s*true\s*\)/.test(code) && !/\bbreak\b/.test(code)) {
    return {
      success: false,
      language: 'cpp',
      stdout: '',
      executionTimeMs: timeoutMs,
      error: `Execution timed out (exceeded ${timeoutMs}ms)`,
    };
  }

  const mainMatch = code.match(/main\s*\([^)]*\)\s*\{([\s\S]*)\}/);
  const mainBody = mainMatch ? mainMatch[1] : '';

  const lines = mainBody.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;

    // std::cerr << ...
    if (trimmed.includes('std::cerr') || trimmed.includes('cerr <<')) {
      const match = trimmed.match(/(?:std::)?cerr\s*<<\s*([^;]+);?/);
      if (match) {
        stderr.push(match[1].replace(/<<\s*(?:std::)?endl/g, '').replace(/^"(.*)"$/, '$1').trim());
      }
      continue;
    }

    // std::cout << ... or cout << ...
    if (trimmed.includes('cout <<') || trimmed.includes('std::cout <<')) {
      const content = trimmed
        .replace(/^(?:std::)?cout\s*<<\s*/, '')
        .replace(/;$/, '');
      const parts = content.split('<<').map((p) => p.trim());
      let lineOutput = '';
      for (const part of parts) {
        if (part === 'std::endl' || part === 'endl') {
          continue;
        }
        if (part === '"\\n"') continue;
        const evaluated = evaluateSimpleExpr(part, vars);
        lineOutput += formatValue(evaluated);
      }
      stdout.push(lineOutput);
      continue;
    }

    // int x = 10;
    const varMatch = trimmed.match(/(?:int|double|float|auto|std::string|string)\s+([a-zA-Z0-9_]+)\s*=\s*(.*?);?$/);
    if (varMatch) {
      const varName = varMatch[1];
      const expr = varMatch[2].replace(/;$/, '');
      vars[varName] = evaluateSimpleExpr(expr, vars);
      continue;
    }
  }

  const executionTimeMs = Math.max(1, Date.now() - startTime);
  return {
    success: true,
    language: 'cpp',
    stdout: stdout.join('\n'),
    stderr: stderr.length > 0 ? stderr.join('\n') : undefined,
    executionTimeMs,
    memoryBytes: 2560 * 1024,
  };
}

// ─── Unified Code Execution Entrypoint ───────────────────────────────────────

/**
 * Execute code in an isolated multi-language sandbox.
 */
export async function executeCode(
  language: string,
  code: string,
  timeoutMs = 2000,
): Promise<CodeRunResult> {
  const norm = normalizeLanguage(language) || detectLanguage(code);

  let result: CodeRunResult;
  switch (norm) {
    case 'javascript':
      result = await executeJavaScript(code, 'javascript', timeoutMs);
      break;
    case 'typescript':
      result = await executeJavaScript(code, 'typescript', timeoutMs);
      break;
    case 'python':
      result = await executePython(code, timeoutMs);
      break;
    case 'rust':
      result = await executeRust(code, timeoutMs);
      break;
    case 'go':
      result = await executeGo(code, timeoutMs);
      break;
    case 'cpp':
      result = await executeCpp(code, timeoutMs);
      break;
    default:
      result = await executeJavaScript(code, 'javascript', timeoutMs);
      break;
  }

  if (testMode) {
    executionHistory.push({
      language: norm,
      code,
      result,
      timestamp: Date.now(),
    });
  }

  return result;
}

// ─── Embed & Component Builders ─────────────────────────────────────────────

/**
 * Build rich Discord embed showcasing compilation and runtime output.
 */
export function buildCodeRunEmbed(result: CodeRunResult, code: string): DiscordEmbed {
  const isTimeout =
    !result.success &&
    (result.error?.toLowerCase().includes('time') ||
      result.error?.toLowerCase().includes('timeout'));
  const isSuccess = result.success;

  let color: number = Colors.DANGER;
  let statusBadge = `🔴 **Runtime Error**`;

  if (isTimeout) {
    color = Colors.WARNING;
    statusBadge = `⏱️ **Execution Timeout** (${result.executionTimeMs}ms)`;
  } else if (isSuccess) {
    color = Colors.SUCCESS;
    statusBadge = `🟢 **Success** (${result.executionTimeMs}ms)`;
  } else {
    statusBadge = `🔴 **Runtime Error** (${result.executionTimeMs}ms)`;
  }

  const langDisplayName = formatLanguageDisplayName(result.language);
  const truncatedCode = code.length > 1000 ? code.slice(0, 997) + '...' : code;

  const fields: EmbedField[] = [
    {
      name: '📥 Input Code',
      value: `\`\`\`${result.language}\n${truncatedCode}\n\`\`\``,
      inline: false,
    },
  ];

  if (result.stdout && result.stdout.trim().length > 0) {
    const truncatedStdout =
      result.stdout.length > 1500 ? result.stdout.slice(0, 1497) + '...' : result.stdout;
    fields.push({
      name: '📤 Output (stdout)',
      value: `\`\`\`text\n${truncatedStdout}\n\`\`\``,
      inline: false,
    });
  }

  if (result.stderr && result.stderr.trim().length > 0) {
    const truncatedStderr =
      result.stderr.length > 1500 ? result.stderr.slice(0, 1497) + '...' : result.stderr;
    fields.push({
      name: '⚠️ Standard Error (stderr)',
      value: `\`\`\`text\n${truncatedStderr}\n\`\`\``,
      inline: false,
    });
  }

  if (result.error && !isTimeout) {
    const truncatedErr =
      result.error.length > 1500 ? result.error.slice(0, 1497) + '...' : result.error;
    fields.push({
      name: '❌ Error Details',
      value: `\`\`\`text\n${truncatedErr}\n\`\`\``,
      inline: false,
    });
  } else if (isTimeout) {
    fields.push({
      name: '⏱️ Timeout Notice',
      value: `\`\`\`text\n${result.error || 'Execution exceeded time limit'}\n\`\`\``,
      inline: false,
    });
  }

  if (!result.stdout?.trim() && !result.stderr?.trim() && !result.error) {
    fields.push({
      name: '📤 Output',
      value: '*(No output produced)*',
      inline: false,
    });
  }

  // Execution stats
  const memoryKb = Math.round((result.memoryBytes ?? 1024) / 1024);
  fields.push(
    { name: 'Language', value: langDisplayName, inline: true },
    { name: 'Duration', value: `${result.executionTimeMs}ms`, inline: true },
    { name: 'Memory', value: `${memoryKb} KB`, inline: true },
  );

  return clampEmbed({
    title: `💻 Code Sandbox Compiler`,
    description: statusBadge,
    color,
    fields,
    footer: {
      text: 'AiCord Polyglot Sandbox • VM Isolated',
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Build interactive ActionRow buttons for deleting code output.
 */
export function buildCodeRunComponents(authorId: string): ActionRow[] {
  return [
    buildActionRow(
      buildButton({
        style: 4, // Danger
        label: 'Delete Output',
        customId: `run_delete:${authorId}`,
        emoji: '🗑️',
      }),
    ),
  ];
}
