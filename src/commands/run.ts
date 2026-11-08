/**
 * src/commands/run.ts
 * Polyglot Code Sandbox Compiler Slash Command Suite (/run).
 *
 * Slash Command:
 * - /run code:<string> [language:<string>]
 *
 * Component Handler:
 * - handleCodeRunComponent: handles run_delete:<authorId>
 */

import {
  ApplicationCommandOptionType,
  type APIChatInputApplicationCommandInteraction,
  type APIMessageComponentInteraction,
} from 'discord-api-types/v10';
import type { RegisteredCommand } from '@/lib/discord/command-registry';
import {
  editInteractionResponse,
  sendFollowUp,
  deleteOriginalInteractionResponse,
} from '@/lib/discord/interaction-response';
import { errorEmbed, warningEmbed } from '@/lib/discord/embeds';
import { PermissionFlags, hasPermission } from '@/lib/discord/permissions';
import { checkUserRateLimit } from '@/lib/engines/rate-limiter';
import { getCachedGuildConfig, get as getCache } from '@/lib/engines/cache';
import {
  executeCode,
  buildCodeRunEmbed,
  buildCodeRunComponents,
  extractCodeAndLanguage,
  isTestMode,
} from '@/lib/sandbox/code-runner';

// ─── Slash Command Execution ─────────────────────────────────────────────────

export async function handleRunCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const token = interaction.token;
  const userId = interaction.member?.user?.id ?? interaction.user?.id ?? 'unknown';
  const guildId = interaction.guild_id;

  // 1. Rate Limiting: 5 executions per 10 seconds
  const rateLimitResult = await checkUserRateLimit(userId, 'run', {
    maxRequests: 5,
    windowMs: 10_000,
  });
  if (!rateLimitResult.success) {
    await editInteractionResponse(token, {
      embeds: [
        warningEmbed(
          'Rate Limit Exceeded',
          'You are compiling code too quickly. Please wait a few seconds before trying again.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  // 2. Server Configuration: Check if /run is disabled in GuildConfig
  if (guildId) {
    try {
      const guildConfig = isTestMode()
        ? await getCache<{ disabledCommands?: string[] }>(`guild_config:${guildId}`)
        : await getCachedGuildConfig(guildId);
      if (guildConfig?.disabledCommands?.includes('run')) {
        await editInteractionResponse(token, {
          embeds: [warningEmbed('Command Disabled', 'The `/run` command is disabled on this server.')],
          ephemeral: true,
        });
        return;
      }
    } catch {
      // Ignore cache/DB lookup errors gracefully
    }
  }

  // 3. Extract and validate options
  const options =
    (interaction.data as { options?: Array<{ name: string; value: unknown }> })?.options ?? [];

  const codeOpt = options.find((o) => o.name === 'code');
  const langOpt = options.find((o) => o.name === 'language');

  const rawCode = typeof codeOpt?.value === 'string' ? codeOpt.value : '';
  const rawLang = typeof langOpt?.value === 'string' ? langOpt.value : undefined;

  if (!rawCode || rawCode.trim().length === 0) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Invalid Code', 'Please provide a non-empty code snippet to execute.')],
      ephemeral: true,
    });
    return;
  }

  if (rawCode.length > 4000) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Code Too Long',
          'The provided code snippet exceeds the maximum permitted length of 4,000 characters.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  // 4. Resolve code and language
  const { code, language } = extractCodeAndLanguage(rawCode, rawLang);

  // 5. Execute code in sandbox
  const result = await executeCode(language, code);

  // 6. Build response embed and interactive components
  const embed = buildCodeRunEmbed(result, code);
  const components = buildCodeRunComponents(userId);

  await editInteractionResponse(token, {
    embeds: [embed],
    components,
  });
}

// ─── Interactive Component Handler ───────────────────────────────────────────

export async function handleCodeRunComponent(
  token: string,
  customId: string,
  userId: string,
  _guildId: string,
  component: APIMessageComponentInteraction,
): Promise<void> {
  const parts = customId.split(':');
  const action = parts[0];
  const authorId = parts[1];

  if (action !== 'run_delete') {
    return;
  }

  const isAuthor = userId === authorId;
  const permissions = component.member?.permissions;
  const isMod = permissions
    ? hasPermission(permissions, PermissionFlags.MANAGE_MESSAGES)
    : false;

  if (!isAuthor && !isMod) {
    await sendFollowUp(token, {
      embeds: [
        errorEmbed(
          'Permission Denied',
          'Only the code author or a moderator with Manage Messages can delete this output.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  await deleteOriginalInteractionResponse(token);
}

// ─── Registered Command Definition ──────────────────────────────────────────

export const runCommand: RegisteredCommand = {
  name: 'run',
  description: 'Execute code in an isolated multi-language compiler sandbox',
  category: 'utility',
  rateLimit: { limit: 5, windowMs: 10_000 },
  options: [
    {
      name: 'code',
      description: 'Code snippet to execute in sandbox',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: 'language',
      description: 'Programming language (auto-detected if omitted)',
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        { name: 'JavaScript', value: 'javascript' },
        { name: 'TypeScript', value: 'typescript' },
        { name: 'Python', value: 'python' },
        { name: 'Rust', value: 'rust' },
        { name: 'Go', value: 'go' },
        { name: 'C++', value: 'cpp' },
      ],
    },
  ],
  execute: handleRunCommand,
};
