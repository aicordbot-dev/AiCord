/**
 * src/lib/engines/template-engine.ts
 * Safe template and variable substitution engine for Discord messages.
 * STRICTLY NO eval(), NO Function(), NO vulnerable regex execution.
 * Enforces Discord character limits and safely handles missing variables.
 */

export interface TemplateUser {
  id?: string;
  name?: string;
  username?: string;
  tag?: string;
  mention?: string;
  avatar?: string;
  created_at?: Date | string | number;
  joined_at?: Date | string | number;
}

export interface TemplateServer {
  id?: string;
  name?: string;
  members?: number | string;
  icon?: string;
  boost_count?: number;
  boost_tier?: number;
}

export interface TemplateChannel {
  id?: string;
  name?: string;
  mention?: string;
}

export interface TemplateStats {
  level?: number | string;
  xp?: number | string;
  rank?: number | string;
  age?: number | string;
}

export interface TemplateInviter {
  id?: string;
  name?: string;
  mention?: string;
}

export interface TemplateTicket {
  number?: number | string;
  id?: string;
  channelId?: string;
}

export interface TemplateContext {
  user?: TemplateUser;
  server?: TemplateServer;
  channel?: TemplateChannel;
  stats?: TemplateStats;
  date?: Date | string | number;
  time?: Date | string | number;
  timestamp?: Date | string | number;
  inviter?: TemplateInviter;
  ticket?: TemplateTicket;
  reason?: string;
  level?: number | string;
  xp?: number | string;
  rank?: number | string;
  age?: number | string;
  custom?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface RenderOptions {
  maxLength?: number; // Defaults to 2000 (Discord message limit)
  fallback?: string; // Fallback for undefined variables (default: '')
  randomChoiceFn?: (choices: string[]) => string; // Injectable for deterministic testing
}

type Comparator = '>=' | '<=' | '!=' | '==' | '=' | '>' | '<';

interface ParsedCondition {
  key: string;
  comparator?: Comparator;
  value?: string;
  negated?: boolean;
}

type ASTNode =
  | { type: 'text'; value: string }
  | { type: 'var'; path: string; format?: string }
  | { type: 'random'; choices: string[] }
  | { type: 'if'; condition: ParsedCondition; thenBranch: ASTNode[]; elseBranch?: ASTNode[] };

/**
 * Format a Date object to ISO date part YYYY-MM-DD
 */
function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * Format a Date object to UTC time HH:mm:ss
 */
function formatTime(d: Date): string {
  return d.toISOString().split('T')[1].split('.')[0];
}

/**
 * Safely parse any Date/string/number to a valid Date, or current Date if invalid.
 */
function toValidDate(val?: Date | string | number): Date {
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === 'string' || typeof val === 'number') {
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

/**
 * Safely fetch a nested property from an object using a dot-path.
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined) return undefined;
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Resolve a variable path into a string value from TemplateContext.
 */
function resolveVariable(path: string, format: string | undefined, ctx: TemplateContext, fallback: string): string {
  const normalizedPath = path.trim().toLowerCase();

  // 1. User variables
  if (normalizedPath === 'user') {
    if (ctx.user?.mention) return ctx.user.mention;
    if (ctx.user?.id) return `<@${ctx.user.id}>`;
    if (ctx.user?.name || ctx.user?.username) return `@${ctx.user.name ?? ctx.user.username}`;
    return fallback;
  }
  if (normalizedPath === 'user.mention') {
    if (ctx.user?.mention) return ctx.user.mention;
    if (ctx.user?.id) return `<@${ctx.user.id}>`;
    return fallback;
  }
  if (normalizedPath === 'user.name' || normalizedPath === 'user.username') {
    return ctx.user?.name ?? ctx.user?.username ?? fallback;
  }
  if (normalizedPath === 'user.id') {
    return ctx.user?.id ?? fallback;
  }
  if (normalizedPath === 'user.avatar') {
    return ctx.user?.avatar ?? fallback;
  }
  if (normalizedPath === 'user.tag') {
    if (ctx.user?.tag) return ctx.user.tag;
    if (ctx.user?.name) return `@${ctx.user.name}`;
    return fallback;
  }
  if (normalizedPath === 'user.created_at') {
    if (!ctx.user?.created_at) return fallback;
    const d = toValidDate(ctx.user.created_at);
    return `<t:${Math.floor(d.getTime() / 1000)}:R>`;
  }
  if (normalizedPath === 'user.joined_at') {
    if (!ctx.user?.joined_at) return fallback;
    const d = toValidDate(ctx.user.joined_at);
    return `<t:${Math.floor(d.getTime() / 1000)}:R>`;
  }

  // 2. Server variables
  if (normalizedPath === 'server' || normalizedPath === 'server.name') {
    return ctx.server?.name ?? fallback;
  }
  if (normalizedPath === 'server.id') {
    return ctx.server?.id ?? fallback;
  }
  if (normalizedPath === 'server.members') {
    return ctx.server?.members !== undefined ? String(ctx.server.members) : fallback;
  }
  if (normalizedPath === 'server.icon') {
    return ctx.server?.icon ?? fallback;
  }
  if (normalizedPath === 'server.boost_count') {
    return ctx.server?.boost_count !== undefined ? String(ctx.server.boost_count) : '0';
  }
  if (normalizedPath === 'server.boost_tier') {
    return ctx.server?.boost_tier !== undefined ? String(ctx.server.boost_tier) : '0';
  }

  // 3. Channel variables
  if (normalizedPath === 'channel') {
    if (ctx.channel?.mention) return ctx.channel.mention;
    if (ctx.channel?.id) return `<#${ctx.channel.id}>`;
    if (ctx.channel?.name) return `#${ctx.channel.name}`;
    return fallback;
  }
  if (normalizedPath === 'channel.name') {
    return ctx.channel?.name ?? fallback;
  }
  if (normalizedPath === 'channel.id') {
    return ctx.channel?.id ?? fallback;
  }
  if (normalizedPath === 'channel.mention') {
    if (ctx.channel?.mention) return ctx.channel.mention;
    if (ctx.channel?.id) return `<#${ctx.channel.id}>`;
    return fallback;
  }

  // 4. Stats variables
  if (normalizedPath === 'level') {
    const val = ctx.stats?.level ?? ctx.level;
    return val !== undefined ? String(val) : fallback;
  }
  if (normalizedPath === 'xp') {
    const val = ctx.stats?.xp ?? ctx.xp;
    return val !== undefined ? String(val) : fallback;
  }
  if (normalizedPath === 'rank') {
    const val = ctx.stats?.rank ?? ctx.rank;
    return val !== undefined ? String(val) : fallback;
  }
  if (normalizedPath === 'age') {
    const val = ctx.stats?.age ?? ctx.age;
    return val !== undefined ? String(val) : fallback;
  }

  // 5. Date/Time variables
  if (normalizedPath === 'date') {
    const d = toValidDate(ctx.date ?? ctx.timestamp);
    return formatDate(d);
  }
  if (normalizedPath === 'time') {
    const d = toValidDate(ctx.time ?? ctx.timestamp);
    return formatTime(d);
  }
  if (normalizedPath === 'timestamp') {
    const d = toValidDate(ctx.timestamp ?? ctx.date);
    const unix = Math.floor(d.getTime() / 1000);
    return format ? `<t:${unix}:${format}>` : `<t:${unix}>`;
  }

  // 6. Extras
  if (normalizedPath === 'inviter') {
    if (ctx.inviter?.mention) return ctx.inviter.mention;
    if (ctx.inviter?.id) return `<@${ctx.inviter.id}>`;
    if (ctx.inviter?.name) return ctx.inviter.name;
    return fallback;
  }
  if (normalizedPath === 'inviter.name') {
    return ctx.inviter?.name ?? fallback;
  }
  if (normalizedPath === 'inviter.mention') {
    if (ctx.inviter?.mention) return ctx.inviter.mention;
    if (ctx.inviter?.id) return `<@${ctx.inviter.id}>`;
    return fallback;
  }
  if (normalizedPath === 'ticket.number') {
    return ctx.ticket?.number !== undefined ? String(ctx.ticket.number) : fallback;
  }
  if (normalizedPath === 'reason') {
    return ctx.reason ?? fallback;
  }

  // 7. Generic path lookup from context (case-preserving first, then case-insensitive)
  const val = getNestedValue(ctx, path.trim());
  if (val !== undefined && val !== null) {
    if (val instanceof Date) {
      return format ? `<t:${Math.floor(val.getTime() / 1000)}:${format}>` : val.toISOString();
    }
    return String(val);
  }

  return fallback;
}

/**
 * Parse condition expression, e.g.:
 * "level>=10" -> { key: "level", comparator: ">=", value: "10" }
 * "user.name=Alice" -> { key: "user.name", comparator: "=", value: "Alice" }
 * "!ticket" -> { key: "ticket", negated: true }
 * "reason" -> { key: "reason" }
 */
function parseCondition(expr: string): ParsedCondition {
  const trimmed = expr.trim();

  // Check for negation prefix
  if (trimmed.startsWith('!')) {
    return { key: trimmed.slice(1).trim(), negated: true };
  }

  // Check comparators in order of longest symbol first
  const comparators: Comparator[] = ['>=', '<=', '!=', '==', '=', '>', '<'];
  for (const cmp of comparators) {
    const idx = trimmed.indexOf(cmp);
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + cmp.length).trim();
      return { key, comparator: cmp, value };
    }
  }

  // Simple existence/truthiness
  return { key: trimmed };
}

/**
 * Evaluate condition safely without eval() or Function().
 */
function evaluateCondition(cond: ParsedCondition, ctx: TemplateContext): boolean {
  // Resolve raw left-side value
  let rawValue: unknown;

  const keyLower = cond.key.toLowerCase();
  if (keyLower === 'level') rawValue = ctx.stats?.level ?? ctx.level;
  else if (keyLower === 'xp') rawValue = ctx.stats?.xp ?? ctx.xp;
  else if (keyLower === 'rank') rawValue = ctx.stats?.rank ?? ctx.rank;
  else if (keyLower === 'age') rawValue = ctx.stats?.age ?? ctx.age;
  else if (keyLower === 'reason') rawValue = ctx.reason;
  else if (keyLower === 'ticket.number') rawValue = ctx.ticket?.number;
  else if (keyLower === 'server.members') rawValue = ctx.server?.members;
  else rawValue = getNestedValue(ctx, cond.key);

  // If no comparator, evaluate truthiness
  if (!cond.comparator) {
    const isTruthy =
      rawValue !== undefined &&
      rawValue !== null &&
      rawValue !== false &&
      rawValue !== '' &&
      rawValue !== 0 &&
      rawValue !== '0' &&
      rawValue !== 'false';
    return cond.negated ? !isTruthy : isTruthy;
  }

  const strValue = rawValue !== undefined && rawValue !== null ? String(rawValue).trim() : '';
  const targetValue = cond.value ?? '';

  // Numeric comparison if both sides look numeric
  const numA = Number(strValue);
  const numB = Number(targetValue);
  const isNumeric = strValue !== '' && targetValue !== '' && !isNaN(numA) && !isNaN(numB);

  switch (cond.comparator) {
    case '=':
    case '==':
      return isNumeric ? numA === numB : strValue === targetValue;
    case '!=':
      return isNumeric ? numA !== numB : strValue !== targetValue;
    case '>=':
      return isNumeric ? numA >= numB : strValue.localeCompare(targetValue) >= 0;
    case '<=':
      return isNumeric ? numA <= numB : strValue.localeCompare(targetValue) <= 0;
    case '>':
      return isNumeric ? numA > numB : strValue.localeCompare(targetValue) > 0;
    case '<':
      return isNumeric ? numA < numB : strValue.localeCompare(targetValue) < 0;
    default:
      return false;
  }
}

/**
 * AST Tokenizer and Parser:
 * Scans input text linearly, constructing AST nodes without regex back-tracking.
 */
function parseTemplate(template: string): ASTNode[] {
  let index = 0;
  const length = template.length;

  function parseNodes(stopAt: ('{/if}' | '{else}')[]): ASTNode[] {
    const nodes: ASTNode[] = [];
    let textBuffer = '';

    const flushText = () => {
      if (textBuffer.length > 0) {
        nodes.push({ type: 'text', value: textBuffer });
        textBuffer = '';
      }
    };

    while (index < length) {
      // Check for stop tokens
      let matchedStop = false;
      for (const stop of stopAt) {
        if (template.startsWith(stop, index)) {
          matchedStop = true;
          break;
        }
      }
      if (matchedStop) {
        break;
      }

      if (template[index] === '{') {
        const closeIdx = template.indexOf('}', index);
        if (closeIdx === -1) {
          // Unclosed brace: treat as literal
          textBuffer += template[index];
          index++;
          continue;
        }

        const tagContent = template.slice(index + 1, closeIdx);

        // Check for conditional open: {if:condition}
        if (tagContent.startsWith('if:')) {
          flushText();
          const conditionExpr = tagContent.slice(3);
          const condition = parseCondition(conditionExpr);
          index = closeIdx + 1;

          // Parse then-branch (stops at {else} or {/if})
          const thenBranch = parseNodes(['{else}', '{/if}']);
          let elseBranch: ASTNode[] | undefined;

          if (index < length && template.startsWith('{else}', index)) {
            index += '{else}'.length;
            elseBranch = parseNodes(['{/if}']);
          }

          if (index < length && template.startsWith('{/if}', index)) {
            index += '{/if}'.length;
          }

          nodes.push({
            type: 'if',
            condition,
            thenBranch,
            elseBranch,
          });
          continue;
        }

        // Check for random helper: {random:opt1|opt2|opt3}
        if (tagContent.startsWith('random:')) {
          flushText();
          const optionsStr = tagContent.slice(7);
          const choices = optionsStr
            .split('|')
            .map((c) => c.trim())
            .filter((c) => c.length > 0);
          nodes.push({
            type: 'random',
            choices: choices.length > 0 ? choices : [''],
          });
          index = closeIdx + 1;
          continue;
        }

        // Check for variables with optional format style, e.g. {timestamp:R}
        flushText();
        const colonIdx = tagContent.indexOf(':');
        let varPath = tagContent;
        let format: string | undefined;

        if (colonIdx !== -1) {
          varPath = tagContent.slice(0, colonIdx);
          format = tagContent.slice(colonIdx + 1);
        }

        nodes.push({
          type: 'var',
          path: varPath,
          format,
        });
        index = closeIdx + 1;
        continue;
      }

      textBuffer += template[index];
      index++;
    }

    flushText();
    return nodes;
  }

  return parseNodes([]);
}

/**
 * Render AST nodes into string with context.
 */
function renderNodes(
  nodes: ASTNode[],
  ctx: TemplateContext,
  fallback: string,
  pickChoice: (choices: string[]) => string,
): string {
  let result = '';

  for (const node of nodes) {
    if (node.type === 'text') {
      result += node.value;
    } else if (node.type === 'var') {
      result += resolveVariable(node.path, node.format, ctx, fallback);
    } else if (node.type === 'random') {
      result += pickChoice(node.choices);
    } else if (node.type === 'if') {
      const isTrue = evaluateCondition(node.condition, ctx);
      if (isTrue) {
        result += renderNodes(node.thenBranch, ctx, fallback, pickChoice);
      } else if (node.elseBranch) {
        result += renderNodes(node.elseBranch, ctx, fallback, pickChoice);
      }
    }
  }

  return result;
}

/**
 * Main Template Renderer:
 * Safely parses and renders a template string with the provided context.
 *
 * @param template The template string to render
 * @param ctx The context variables
 * @param options Render options (maxLength default 2000, fallback default '')
 * @returns The rendered string, clamped to maxLength
 */
export function renderTemplate(
  template: string,
  ctx: TemplateContext = {},
  options: RenderOptions = {},
): string {
  if (!template || typeof template !== 'string') {
    return '';
  }

  const maxLength = options.maxLength ?? 2000;
  const fallback = options.fallback ?? '';
  const pickChoice =
    options.randomChoiceFn ??
    ((choices: string[]) => choices[Math.floor(Math.random() * choices.length)] ?? '');

  try {
    const ast = parseTemplate(template);
    const rendered = renderNodes(ast, ctx, fallback, pickChoice);

    // Enforce maxLength
    if (rendered.length > maxLength) {
      return rendered.slice(0, maxLength);
    }

    return rendered;
  } catch (err) {
    console.error('[TemplateEngine] Render error:', err);
    // Never crash: return safe truncated template or fallback
    return template.slice(0, maxLength);
  }
}

/**
 * Utility to extract all unique variable names from a template string.
 */
export function extractTemplateVariables(template: string): string[] {
  if (!template || typeof template !== 'string') return [];
  const vars = new Set<string>();
  const regex = /\{([a-zA-Z0-9_.]+)(?::[^}]+)?\}/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(template)) !== null) {
    const tag = match[1];
    if (tag !== 'if' && tag !== 'else' && tag !== '/if' && tag !== 'random') {
      vars.add(tag);
    }
  }

  return Array.from(vars);
}
