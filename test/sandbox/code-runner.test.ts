/**
 * test/sandbox/code-runner.test.ts
 * Comprehensive unit tests for Polyglot Code Sandbox Compiler & VM Isolation Engine.
 */

import '../test-env';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectLanguage,
  extractCodeAndLanguage,
  stripTypeScriptTypes,
  executeCode,
  executeJavaScript,
  executePython,
  executeRust,
  executeGo,
  executeCpp,
  buildCodeRunEmbed,
  buildCodeRunComponents,
  enableTestMode,
  disableTestMode,
  isTestMode,
  clearTestStore,
  getExecutionHistory,
  normalizeLanguage,
} from '@/lib/sandbox/code-runner';
import { Colors } from '@/lib/discord/embeds';

describe('Polyglot Code Sandbox — Code Runner Engine', () => {
  beforeEach(() => {
    enableTestMode();
    clearTestStore();
  });

  afterEach(() => {
    clearTestStore();
    disableTestMode();
  });

  describe('Test Store Lifecycle', () => {
    it('tracks test mode state and records execution history', async () => {
      assert.equal(isTestMode(), true);
      const res = await executeCode('javascript', 'console.log("test store");');
      assert.equal(res.success, true);

      const history = getExecutionHistory();
      assert.equal(history.length, 1);
      assert.equal(history[0].language, 'javascript');
      assert.equal(history[0].result.stdout, 'test store');

      clearTestStore();
      assert.equal(getExecutionHistory().length, 0);

      disableTestMode();
      assert.equal(isTestMode(), false);
      await executeCode('javascript', 'console.log("no history");');
      assert.equal(getExecutionHistory().length, 0);
    });
  });

  describe('Language Normalization & Auto-Detection', () => {
    it('normalizes common language aliases', () => {
      assert.equal(normalizeLanguage('js'), 'javascript');
      assert.equal(normalizeLanguage('node'), 'javascript');
      assert.equal(normalizeLanguage('ts'), 'typescript');
      assert.equal(normalizeLanguage('py'), 'python');
      assert.equal(normalizeLanguage('python3'), 'python');
      assert.equal(normalizeLanguage('rs'), 'rust');
      assert.equal(normalizeLanguage('golang'), 'go');
      assert.equal(normalizeLanguage('c++'), 'cpp');
      assert.equal(normalizeLanguage('unknown_lang'), null);
    });

    it('auto-detects Go code from signatures', () => {
      const code = 'package main\nimport "fmt"\nfunc main() {\n  fmt.Println("Hi")\n}';
      assert.equal(detectLanguage(code), 'go');
    });

    it('auto-detects Rust code from signatures', () => {
      const code = 'fn main() {\n  let mut x = 10;\n  println!("Value: {}", x);\n}';
      assert.equal(detectLanguage(code), 'rust');
    });

    it('auto-detects C++ code from signatures', () => {
      const code = '#include <iostream>\nint main() {\n  std::cout << "Hello" << std::endl;\n}';
      assert.equal(detectLanguage(code), 'cpp');
    });

    it('auto-detects Python code from signatures', () => {
      const code1 = 'def calculate(a, b):\n    return a + b\nprint(calculate(2, 3))';
      assert.equal(detectLanguage(code1), 'python');

      const code2 = 'import sys\nprint("Running python script")';
      assert.equal(detectLanguage(code2), 'python');
    });

    it('auto-detects TypeScript code from signatures', () => {
      const code1 = 'interface Config {\n  debug: boolean;\n}\nconst c: Config = { debug: true };';
      assert.equal(detectLanguage(code1), 'typescript');

      const code2 = 'type UserRole = "admin" | "member";\nlet role: UserRole = "admin";';
      assert.equal(detectLanguage(code2), 'typescript');

      const code3 = 'function add(a: number, b: number): number { return a + b; }';
      assert.equal(detectLanguage(code3), 'typescript');
    });

    it('auto-detects JavaScript code by default or from keywords', () => {
      const code1 = 'console.log("Hello from JavaScript!");';
      assert.equal(detectLanguage(code1), 'javascript');

      const code2 = 'const x = [1, 2, 3];\nlet y = x.map(n => n * 2);';
      assert.equal(detectLanguage(code2), 'javascript');
    });

    it('extracts language and unwraps code from markdown code fences', () => {
      const snippet = '```python\nprint("Hello in fence")\n```';
      const extracted = extractCodeAndLanguage(snippet);
      assert.equal(extracted.language, 'python');
      assert.equal(extracted.code, 'print("Hello in fence")');

      const plainSnippet = 'console.log("bare js");';
      const extractedPlain = extractCodeAndLanguage(plainSnippet);
      assert.equal(extractedPlain.language, 'javascript');
      assert.equal(extractedPlain.code, 'console.log("bare js");');
    });
  });

  describe('JavaScript VM Execution & Isolation', () => {
    it('executes JavaScript code and captures console.log output', async () => {
      const result = await executeCode('javascript', 'console.log("Hello, World!");');
      assert.equal(result.success, true);
      assert.equal(result.language, 'javascript');
      assert.equal(result.stdout, 'Hello, World!');
      assert.ok(result.executionTimeMs >= 0);
      assert.ok(result.memoryBytes && result.memoryBytes > 0);
    });

    it('captures multiple console.log and console.error streams', async () => {
      const code = `
        console.log("Step 1: start");
        console.warn("Step 2: warning emitted");
        console.error("Step 3: error logged");
        console.log("Step 4: complete");
      `;
      const result = await executeCode('javascript', code);
      assert.equal(result.success, true);
      assert.ok(result.stdout.includes('Step 1: start'));
      assert.ok(result.stdout.includes('Step 4: complete'));
      assert.ok(result.stderr?.includes('Step 2: warning'));
      assert.ok(result.stderr?.includes('Step 3: error'));
    });

    it('captures script return value when no console output is produced', async () => {
      const code = 'const a = 12; const b = 8; a * b;';
      const result = await executeCode('javascript', code);
      assert.equal(result.success, true);
      assert.equal(result.stdout, '96');

      const arrayCode = '[1, 2, 3].map(n => n * 10);';
      const arrayResult = await executeCode('javascript', arrayCode);
      assert.equal(arrayResult.success, true);
      assert.ok(arrayResult.stdout.includes('10'));
      assert.ok(arrayResult.stdout.includes('20'));
      assert.ok(arrayResult.stdout.includes('30'));
    });

    it('handles syntax errors gracefully without crashing process', async () => {
      const badCode = 'const x = ;';
      const result = await executeCode('javascript', badCode);
      assert.equal(result.success, false);
      assert.ok(result.error?.includes('SyntaxError'));
    });

    it('handles runtime ReferenceError and TypeError gracefully', async () => {
      const refErrorCode = 'undefinedFunctionCall();';
      const refResult = await executeCode('javascript', refErrorCode);
      assert.equal(refResult.success, false);
      assert.ok(refResult.error?.includes('ReferenceError'));

      const typeErrorCode = 'const obj = null; obj.test();';
      const typeResult = await executeCode('javascript', typeErrorCode);
      assert.equal(typeResult.success, false);
      assert.ok(typeResult.error?.includes('TypeError'));
    });

    it('enforces timeout and rejects infinite loops', async () => {
      const infiniteLoop = 'while (true) {}';
      const result = await executeJavaScript(infiniteLoop, 'javascript', 100);
      assert.equal(result.success, false);
      assert.ok(result.error?.toLowerCase().includes('timed out'));
      assert.ok(result.executionTimeMs >= 100);
    });

    it('enforces sandbox security: process, require, fs, eval are undefined and inaccessible', async () => {
      const securityCheck = `
        const checks = {
          processType: typeof process,
          requireType: typeof require,
          fsType: typeof fs,
          evalType: typeof eval,
          childProcessType: typeof child_process,
          fetchType: typeof fetch,
        };
        console.log(JSON.stringify(checks));
      `;
      const result = await executeCode('javascript', securityCheck);
      assert.equal(result.success, true);

      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.processType, 'undefined');
      assert.equal(parsed.requireType, 'undefined');
      assert.equal(parsed.fsType, 'undefined');
      assert.equal(parsed.evalType, 'undefined');
      assert.equal(parsed.childProcessType, 'undefined');
      assert.equal(parsed.fetchType, 'undefined');
    });

    it('rejects attempts to invoke require or access process properties', async () => {
      const attemptRequire = 'require("fs");';
      const resultRequire = await executeCode('javascript', attemptRequire);
      assert.equal(resultRequire.success, false);
      assert.ok(resultRequire.error?.includes('TypeError'));

      const attemptProcess = 'process.exit(1);';
      const resultProcess = await executeCode('javascript', attemptProcess);
      assert.equal(resultProcess.success, false);
      assert.ok(resultProcess.error?.includes('TypeError'));
    });
  });

  describe('TypeScript Stripping & Execution', () => {
    it('strips interfaces, type aliases, and annotations cleanly', () => {
      const ts = `
        interface Person {
          name: string;
          age: number;
        }
        type UserID = string | number;
        function greet(person: Person): string {
          return "Hello " + person.name;
        }
        const user: Person = { name: "AiCord", age: 2 };
      `;
      const stripped = stripTypeScriptTypes(ts);
      assert.ok(!stripped.includes('interface Person'));
      assert.ok(!stripped.includes('type UserID'));
      assert.ok(!stripped.includes(': Person'));
    });

    it('executes TypeScript code with type annotations', async () => {
      const tsCode = `
        interface MathOp {
          (a: number, b: number): number;
        }
        const multiply: MathOp = (a: number, b: number): number => a * b;
        const result: number = multiply(6, 7);
        console.log("Calculated:", result);
      `;
      const result = await executeCode('typescript', tsCode);
      assert.equal(result.success, true);
      assert.equal(result.language, 'typescript');
      assert.ok(result.stdout.includes('Calculated: 42'));
    });
  });

  describe('Polyglot Execution Simulators', () => {
    describe('Python Simulator', () => {
      it('executes print statements and arithmetic', async () => {
        const pyCode = `
          x = 15
          y = 25
          print("Sum is:", x + y)
        `;
        const result = await executePython(pyCode);
        assert.equal(result.success, true);
        assert.equal(result.language, 'python');
        assert.ok(result.stdout.includes('Sum is: 40'));
      });

      it('executes for loops with range', async () => {
        const loopCode = `
          for i in range(3):
              print(i)
        `;
        const result = await executePython(loopCode);
        assert.equal(result.success, true);
        assert.equal(result.stdout, '0\n1\n2');
      });

      it('captures sys.stderr.write output in stderr stream', async () => {
        const errCode = `
          print("Normal log")
          sys.stderr.write("Critical error occurred")
        `;
        const result = await executePython(errCode);
        assert.equal(result.success, true);
        assert.ok(result.stdout.includes('Normal log'));
        assert.ok(result.stderr?.includes('Critical error occurred'));
      });

      it('rejects Python syntax errors with unclosed parens or quotes', async () => {
        const badParens = 'print("Hello"';
        const res1 = await executePython(badParens);
        assert.equal(res1.success, false);
        assert.ok(res1.error?.includes('SyntaxError'));

        const badQuote = 'print("Unclosed quote)\n';
        const res2 = await executePython(badQuote);
        assert.equal(res2.success, false);
        assert.ok(res2.error?.includes('SyntaxError'));
      });

      it('rejects Python infinite loops with timeout', async () => {
        const infLoop = 'while True:\n    x = 1';
        const res = await executePython(infLoop, 100);
        assert.equal(res.success, false);
        assert.ok(res.error?.includes('timed out'));
      });
    });

    describe('Rust Simulator', () => {
      it('executes println! with formatting and math', async () => {
        const rustCode = `
          fn main() {
              let x = 10;
              let y = 32;
              println!("Result: {}", x + y);
          }
        `;
        const result = await executeRust(rustCode);
        assert.equal(result.success, true);
        assert.equal(result.language, 'rust');
        assert.ok(result.stdout.includes('Result: 42'));
      });

      it('captures eprintln! in stderr', async () => {
        const rustCode = `
          fn main() {
              println!("Rust standard output");
              eprintln!("Rust warning stream");
          }
        `;
        const result = await executeRust(rustCode);
        assert.equal(result.success, true);
        assert.ok(result.stdout.includes('Rust standard output'));
        assert.ok(result.stderr?.includes('Rust warning stream'));
      });

      it('fails with compilation error when fn main is missing', async () => {
        const noMain = 'println!("No main function");';
        const result = await executeRust(noMain);
        assert.equal(result.success, false);
        assert.ok(result.error?.includes('main'));
      });

      it('fails when braces are unbalanced', async () => {
        const badBraces = 'fn main() { println!("Oops");';
        const result = await executeRust(badBraces);
        assert.equal(result.success, false);
        assert.ok(result.error?.includes('unclosed delimiter'));
      });
    });

    describe('Go Simulator', () => {
      it('executes fmt.Println and fmt.Printf with variable evaluation', async () => {
        const goCode = `
          package main
          import "fmt"
          func main() {
              x := 50
              fmt.Println("Score:", x)
              fmt.Printf("Hex: %d\n", 255)
          }
        `;
        const result = await executeGo(goCode);
        assert.equal(result.success, true);
        assert.equal(result.language, 'go');
        assert.ok(result.stdout.includes('Score: 50'));
        assert.ok(result.stdout.includes('Hex: 255'));
      });

      it('captures fmt.Fprintln to os.Stderr', async () => {
        const goCode = `
          package main
          import (
              "fmt"
              "os"
          )
          func main() {
              fmt.Println("Normal go output")
              fmt.Fprintln(os.Stderr, "Go error warning")
          }
        `;
        const result = await executeGo(goCode);
        assert.equal(result.success, true);
        assert.ok(result.stdout.includes('Normal go output'));
        assert.ok(result.stderr?.includes('Go error warning'));
      });

      it('fails when package main or func main is missing', async () => {
        const noPkg = 'func main() { fmt.Println("No package"); }';
        const res1 = await executeGo(noPkg);
        assert.equal(res1.success, false);
        assert.ok(res1.error?.includes('package main'));

        const noMain = 'package main\nfunc test() {}';
        const res2 = await executeGo(noMain);
        assert.equal(res2.success, false);
        assert.ok(res2.error?.includes('main'));
      });
    });

    describe('C++ Simulator', () => {
      it('executes std::cout with chaining and expressions', async () => {
        const cppCode = `
          #include <iostream>
          int main() {
              int a = 10;
              int b = 25;
              std::cout << "Sum: " << a + b << std::endl;
              return 0;
          }
        `;
        const result = await executeCpp(cppCode);
        assert.equal(result.success, true);
        assert.equal(result.language, 'cpp');
        assert.ok(result.stdout.includes('Sum: 35'));
      });

      it('captures std::cerr in stderr', async () => {
        const cppCode = `
          #include <iostream>
          int main() {
              std::cout << "Standard C++ output" << std::endl;
              std::cerr << "C++ error notice" << std::endl;
              return 0;
          }
        `;
        const result = await executeCpp(cppCode);
        assert.equal(result.success, true);
        assert.ok(result.stdout.includes('Standard C++ output'));
        assert.ok(result.stderr?.includes('C++ error notice'));
      });

      it('fails when main is missing or cout is used without include', async () => {
        const noInclude = 'int main() { cout << "test"; }';
        const res1 = await executeCpp(noInclude);
        assert.equal(res1.success, false);
        assert.ok(res1.error?.includes('#include'));

        const noMain = '#include <iostream>\nvoid other() {}';
        const res2 = await executeCpp(noMain);
        assert.equal(res2.success, false);
        assert.ok(res2.error?.includes('main'));
      });
    });
  });

  describe('Embed & Component Generation', () => {
    it('builds success embed with green badge and stats', () => {
      const result = {
        success: true,
        language: 'javascript',
        stdout: 'Hello World',
        executionTimeMs: 4,
        memoryBytes: 2048 * 1024,
      };
      const embed = buildCodeRunEmbed(result, 'console.log("Hello World");');
      assert.equal(embed.color, Colors.SUCCESS);
      assert.ok(embed.description?.includes('🟢'));
      assert.ok(embed.description?.includes('Success'));
      assert.ok(embed.fields?.some((f) => f.name === '📥 Input Code'));
      assert.ok(embed.fields?.some((f) => f.name === '📤 Output (stdout)'));
      assert.ok(embed.fields?.some((f) => f.name === 'Duration' && f.value === '4ms'));
    });

    it('builds runtime error embed with red badge', () => {
      const result = {
        success: false,
        language: 'javascript',
        stdout: '',
        error: 'ReferenceError: x is not defined',
        executionTimeMs: 2,
      };
      const embed = buildCodeRunEmbed(result, 'x.foo();');
      assert.equal(embed.color, Colors.DANGER);
      assert.ok(embed.description?.includes('🔴'));
      assert.ok(embed.description?.includes('Runtime Error'));
      assert.ok(embed.fields?.some((f) => f.name === '❌ Error Details'));
    });

    it('builds timeout embed with yellow badge and timeout notice', () => {
      const result = {
        success: false,
        language: 'javascript',
        stdout: '',
        error: 'Execution timed out (exceeded 2000ms)',
        executionTimeMs: 2000,
      };
      const embed = buildCodeRunEmbed(result, 'while (true) {}');
      assert.equal(embed.color, Colors.WARNING);
      assert.ok(embed.description?.includes('⏱️'));
      assert.ok(embed.description?.includes('Execution Timeout'));
      assert.ok(embed.fields?.some((f) => f.name === '⏱️ Timeout Notice'));
    });

    it('truncates very long input and output to preserve Discord limits', () => {
      const longCode = 'a'.repeat(2000);
      const longOutput = 'b'.repeat(3000);
      const result = {
        success: true,
        language: 'javascript',
        stdout: longOutput,
        executionTimeMs: 5,
      };
      const embed = buildCodeRunEmbed(result, longCode);
      const inputField = embed.fields?.find((f) => f.name === '📥 Input Code');
      const outputField = embed.fields?.find((f) => f.name === '📤 Output (stdout)');
      assert.ok(inputField && inputField.value.length < 1050);
      assert.ok(outputField && outputField.value.length < 1550);
    });

    it('builds action row components with Delete Output button', () => {
      const components = buildCodeRunComponents('user_12345');
      assert.equal(components.length, 1);
      const row = components[0];
      assert.equal(row.type, 1);
      assert.equal(row.components.length, 1);
      const btn = row.components[0] as {
        type: number;
        custom_id?: string;
        label: string;
        style: number;
      };
      assert.equal(btn.type, 2);
      assert.equal(btn.style, 4); // Danger
      assert.equal(btn.custom_id, 'run_delete:user_12345');
      assert.equal(btn.label, 'Delete Output');
    });
  });
});
