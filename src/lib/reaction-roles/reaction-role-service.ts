/**
 * src/lib/reaction-roles/reaction-role-service.ts
 * Button & Dropdown Reaction Roles Engine for AiCord.
 *
 * Capabilities:
 * - In-memory test store (enableTestMode, clearTestStore, isTestMode, setTestPanel, getTestPanel)
 * - Create, update, list, and delete reaction role panels
 * - Add and remove roles to/from panel (enforcing Discord's 25-role hard limit)
 * - Discord embed & component builder:
 *   - Buttons chunked into up to 5 ActionRows of 5 buttons (customId: rr_toggle:<panelId>:<roleId>)
 *   - String select dropdown (customId: rr_select:<panelId>)
 * - 4 operational modes:
 *   - 'normal': toggles role on/off (supports maxRoles cap)
 *   - 'unique': removes previous panel roles and assigns new role
 *   - 'verify': grants role only (cannot be toggled off)
 *   - 'drop': removes role only (cannot be toggled on)
 * - Role prerequisite check (requiredRoleId enforcement)
 * - Select dropdown diffing & resolution
 */

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import {
  RolePanel,
  type IRolePanel,
  type RolePanelEntry,
  type RolePanelMode,
} from '@/models';
import { Colors, clampEmbed, type DiscordEmbed } from '@/lib/discord/embeds';
import {
  buildButton,
  buildActionRow,
  type ActionRow,
  type ButtonComponent,
  type StringSelectComponent,
  type StringSelectOption,
} from '@/lib/discord/interaction-response';

// ─── Test Store ───────────────────────────────────────────────────────────────

let testMode = false;
const testPanels = new Map<string, IRolePanel>();

export function enableTestMode(enabled: boolean = true): void {
  testMode = enabled;
}

export function clearTestStore(): void {
  testPanels.clear();
}

export function isTestMode(): boolean {
  return testMode;
}

export function setTestPanel(panel: IRolePanel): void {
  const id =
    (panel as unknown as { id?: string }).id ||
    panel._id?.toString() ||
    `panel_${Math.random().toString(36).substring(2, 9)}`;
  testPanels.set(id, panel);
}

export function getTestPanel(panelId: string): IRolePanel | undefined {
  return testPanels.get(panelId);
}

// ─── Result Interfaces ────────────────────────────────────────────────────────

export interface ReactionRoleToggleResult {
  action: 'added' | 'removed' | 'swapped' | 'denied';
  roleId: string;
  removedRoleIds?: string[];
  message: string;
}

export interface ReactionRoleSelectResult {
  action: 'applied' | 'denied';
  addedRoleIds: string[];
  removedRoleIds: string[];
  message: string;
}

// ─── 1. Create Reaction Role Panel ───────────────────────────────────────────

export async function createReactionRolePanel(
  guildId: string,
  data: Partial<IRolePanel>,
): Promise<IRolePanel> {
  if (!guildId) {
    throw new Error('guildId is required to create a reaction role panel');
  }
  if (!data.title?.trim()) {
    throw new Error('Panel title is required');
  }

  const title = data.title.trim();
  const description = data.description?.trim();
  const color = data.color ?? Colors.PRIMARY;
  const mode: RolePanelMode = data.mode ?? 'normal';
  const style = data.style ?? 'buttons';
  const entries: RolePanelEntry[] = data.entries ? [...data.entries] : [];
  const maxRoles = data.maxRoles;
  const requiredRoleId = data.requiredRoleId;
  const channelId = data.channelId;
  const messageId = data.messageId;

  if (isTestMode()) {
    const id =
      (data as unknown as { id?: string }).id ||
      data._id?.toString() ||
      `panel_${Math.random().toString(36).substring(2, 9)}`;

    const panelObj = {
      _id: id,
      id,
      guildId,
      channelId,
      messageId,
      title,
      description,
      color,
      mode,
      style,
      entries,
      maxRoles,
      requiredRoleId,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as IRolePanel;

    testPanels.set(id, panelObj);
    return panelObj;
  }

  await connectDB();
  const panel = await RolePanel.create({
    guildId,
    channelId,
    messageId,
    title,
    description,
    color,
    mode,
    style,
    entries,
    maxRoles,
    requiredRoleId,
  });

  return panel;
}

// ─── 2. Get Reaction Role Panel ───────────────────────────────────────────────

export async function getReactionRolePanel(
  guildId: string,
  panelId: string,
): Promise<IRolePanel | null> {
  if (isTestMode()) {
    const direct = testPanels.get(panelId);
    if (direct && direct.guildId === guildId) {
      return direct;
    }
    for (const panel of testPanels.values()) {
      if (
        panel.guildId === guildId &&
        ((panel as unknown as { id?: string }).id === panelId ||
          panel._id?.toString() === panelId)
      ) {
        return panel;
      }
    }
    return null;
  }

  await connectDB();
  let panel: IRolePanel | null = null;
  if (mongoose.Types.ObjectId.isValid(panelId)) {
    panel = await RolePanel.findOne({ guildId, _id: panelId });
  }
  if (!panel) {
    panel = await RolePanel.findOne({
      guildId,
      $or: [{ _id: panelId }, { messageId: panelId }],
    } as any);
  }
  return panel;
}

// ─── 3. List Reaction Role Panels ─────────────────────────────────────────────

export async function listReactionRolePanels(guildId: string): Promise<IRolePanel[]> {
  if (isTestMode()) {
    return Array.from(testPanels.values()).filter((p) => p.guildId === guildId);
  }

  await connectDB();
  return RolePanel.find({ guildId }).sort({ createdAt: -1 });
}

// ─── 4. Delete Reaction Role Panel ─────────────────────────────────────────────

export async function deleteReactionRolePanel(
  guildId: string,
  panelId: string,
): Promise<boolean> {
  if (isTestMode()) {
    const existing = await getReactionRolePanel(guildId, panelId);
    if (!existing) return false;
    const key =
      (existing as unknown as { id?: string }).id ||
      existing._id?.toString() ||
      panelId;
    testPanels.delete(key);
    testPanels.delete(panelId);
    return true;
  }

  await connectDB();
  const res = await RolePanel.deleteOne({ guildId, _id: panelId });
  return (res.deletedCount ?? 0) > 0;
}

// ─── 5. Add Role To Panel ─────────────────────────────────────────────────────

export async function addRoleToPanel(
  guildId: string,
  panelId: string,
  entry: RolePanelEntry,
): Promise<IRolePanel> {
  const panel = await getReactionRolePanel(guildId, panelId);
  if (!panel) {
    throw new Error(`Reaction role panel "${panelId}" not found`);
  }

  if (panel.entries.length >= 25) {
    throw new Error('Cannot add more than 25 roles to a panel');
  }

  if (!entry.roleId?.trim()) {
    throw new Error('roleId is required');
  }

  if (!entry.label?.trim()) {
    throw new Error('label is required');
  }

  const roleId = entry.roleId.trim();
  const existing = panel.entries.find((e) => e.roleId === roleId);
  if (existing) {
    throw new Error(`Role <@&${roleId}> is already in this panel`);
  }

  const cleanEntry: RolePanelEntry = {
    roleId,
    label: entry.label.trim(),
    emoji: entry.emoji?.trim() || undefined,
    description: entry.description?.trim() || undefined,
  };

  panel.entries.push(cleanEntry);

  if (isTestMode()) {
    panel.updatedAt = new Date();
    const key =
      (panel as unknown as { id?: string }).id ||
      panel._id?.toString() ||
      panelId;
    testPanels.set(key, panel);
    return panel;
  }

  await connectDB();
  await RolePanel.updateOne(
    { guildId, _id: panel._id },
    { entries: panel.entries, updatedAt: new Date() },
  );
  return panel;
}

// ─── 6. Remove Role From Panel ─────────────────────────────────────────────────

export async function removeRoleFromPanel(
  guildId: string,
  panelId: string,
  roleId: string,
): Promise<IRolePanel> {
  const panel = await getReactionRolePanel(guildId, panelId);
  if (!panel) {
    throw new Error(`Reaction role panel "${panelId}" not found`);
  }

  const index = panel.entries.findIndex((e) => e.roleId === roleId);
  if (index === -1) {
    throw new Error(`Role <@&${roleId}> not found in this panel`);
  }

  panel.entries.splice(index, 1);

  if (isTestMode()) {
    panel.updatedAt = new Date();
    const key =
      (panel as unknown as { id?: string }).id ||
      panel._id?.toString() ||
      panelId;
    testPanels.set(key, panel);
    return panel;
  }

  await connectDB();
  await RolePanel.updateOne(
    { guildId, _id: panel._id },
    { entries: panel.entries, updatedAt: new Date() },
  );
  return panel;
}

// ─── 7. Update Panel Message Link ─────────────────────────────────────────────

export async function updateReactionRolePanelMessage(
  guildId: string,
  panelId: string,
  channelId: string,
  messageId: string,
): Promise<IRolePanel> {
  const panel = await getReactionRolePanel(guildId, panelId);
  if (!panel) {
    throw new Error(`Reaction role panel "${panelId}" not found`);
  }

  panel.channelId = channelId;
  panel.messageId = messageId;

  if (isTestMode()) {
    panel.updatedAt = new Date();
    const key =
      (panel as unknown as { id?: string }).id ||
      panel._id?.toString() ||
      panelId;
    testPanels.set(key, panel);
    return panel;
  }

  await connectDB();
  await RolePanel.updateOne(
    { guildId, _id: panel._id },
    { channelId, messageId, updatedAt: new Date() },
  );
  return panel;
}

// ─── 8. Build Reaction Role Embed ─────────────────────────────────────────────

export function buildReactionRoleEmbed(panel: IRolePanel): DiscordEmbed {
  const modeInstruction: Record<RolePanelMode, string> = {
    normal: 'Click a button or select an option to toggle the role on or off.',
    unique:
      'Select a role below. Choosing a new role will automatically remove any other role from this panel.',
    verify: 'Click below to verify and receive the role. (Cannot be toggled off).',
    drop: 'Click below to remove or leave the role.',
  };

  let description = '';
  if (panel.description?.trim()) {
    description += `${panel.description.trim()}\n\n`;
  }
  description += `ℹ️ **Instructions:** ${modeInstruction[panel.mode] ?? modeInstruction.normal}`;

  if (panel.requiredRoleId) {
    description += `\n🔒 **Prerequisite:** Requires role <@&${panel.requiredRoleId}>`;
  }

  if (panel.maxRoles && panel.mode === 'normal') {
    description += `\n⚙️ **Limit:** Maximum ${panel.maxRoles} role${panel.maxRoles > 1 ? 's' : ''}`;
  }

  const fields = [];
  if (panel.entries && panel.entries.length > 0) {
    const entryLines = panel.entries.map((e) => {
      const emojiPrefix = e.emoji ? `${e.emoji} ` : '';
      const desc = e.description ? `\n> *${e.description}*` : '';
      return `${emojiPrefix}**${e.label}** → <@&${e.roleId}>${desc}`;
    });

    fields.push({
      name: '📋 Available Roles',
      value: entryLines.join('\n'),
      inline: false,
    });
  }

  return clampEmbed({
    title: panel.title,
    description,
    color: panel.color ?? Colors.PRIMARY,
    fields: fields.length > 0 ? fields : undefined,
    footer: {
      text: `AiCord Reaction Roles • Style: ${panel.style} • Mode: ${panel.mode}`,
    },
  });
}

// ─── 9. Build Reaction Role Components ─────────────────────────────────────────

export function buildReactionRoleComponents(panel: IRolePanel): ActionRow[] {
  const panelId =
    (panel as unknown as { id?: string }).id ||
    panel._id?.toString() ||
    'panel_0';

  if (!panel.entries || panel.entries.length === 0) {
    return [];
  }

  if (panel.style === 'buttons') {
    const rows: ActionRow[] = [];
    const entries = panel.entries.slice(0, 25);

    for (let i = 0; i < entries.length; i += 5) {
      const chunk = entries.slice(i, i + 5);
      const buttons: ButtonComponent[] = chunk.map((entry) =>
        buildButton({
          style: 1, // Primary (Blurple)
          label: entry.label,
          customId: `rr_toggle:${panelId}:${entry.roleId}`,
          emoji: entry.emoji,
        }),
      );
      rows.push(buildActionRow(...buttons));
    }

    return rows;
  }

  if (panel.style === 'select') {
    const entries = panel.entries.slice(0, 25);
    const options: StringSelectOption[] = entries.map((entry) => ({
      label: entry.label.slice(0, 100),
      value: entry.roleId,
      description: entry.description ? entry.description.slice(0, 100) : undefined,
      emoji: entry.emoji ? { name: entry.emoji } : undefined,
    }));

    let maxValues = 1;
    if (panel.mode === 'unique') {
      maxValues = 1;
    } else {
      maxValues = panel.maxRoles
        ? Math.min(panel.maxRoles, options.length)
        : options.length;
    }

    const selectComponent: StringSelectComponent = {
      type: 3,
      custom_id: `rr_select:${panelId}`,
      options,
      placeholder: 'Select your role(s)...',
      min_values: 0,
      max_values: maxValues,
    };

    return [
      {
        type: 1,
        components: [selectComponent],
      },
    ];
  }

  return [];
}

// ─── 10. Handle Reaction Role Toggle (Buttons) ────────────────────────────────

export async function handleReactionRoleToggle(
  guildId: string,
  userId: string,
  panelId: string,
  roleId: string,
  currentMemberRoleIds: string[],
): Promise<ReactionRoleToggleResult> {
  const panel = await getReactionRolePanel(guildId, panelId);
  if (!panel) {
    return {
      action: 'denied',
      roleId,
      message: 'Reaction role panel not found.',
    };
  }

  const entry = panel.entries.find((e) => e.roleId === roleId);
  if (!entry) {
    return {
      action: 'denied',
      roleId,
      message: 'This role is not part of this reaction role panel.',
    };
  }

  // Check prerequisite role if set
  if (panel.requiredRoleId && !currentMemberRoleIds.includes(panel.requiredRoleId)) {
    return {
      action: 'denied',
      roleId,
      message: `You need the <@&${panel.requiredRoleId}> role before you can claim roles from this panel.`,
    };
  }

  // Handle according to operational mode
  switch (panel.mode) {
    case 'verify': {
      if (currentMemberRoleIds.includes(roleId)) {
        return {
          action: 'denied',
          roleId,
          message: `You already have the <@&${roleId}> role.`,
        };
      }
      return {
        action: 'added',
        roleId,
        message: `Verified! You have received the <@&${roleId}> role.`,
      };
    }

    case 'drop': {
      if (currentMemberRoleIds.includes(roleId)) {
        return {
          action: 'removed',
          roleId,
          message: `You have removed the <@&${roleId}> role.`,
        };
      }
      return {
        action: 'denied',
        roleId,
        message: `You do not have the <@&${roleId}> role.`,
      };
    }

    case 'unique': {
      const currentPanelRoles = panel.entries
        .map((e) => e.roleId)
        .filter((id) => currentMemberRoleIds.includes(id));

      if (currentMemberRoleIds.includes(roleId)) {
        // Untoggle currently held role
        return {
          action: 'removed',
          roleId,
          message: `Removed the <@&${roleId}> role.`,
        };
      }

      const otherRoles = currentPanelRoles.filter((id) => id !== roleId);
      if (otherRoles.length > 0) {
        return {
          action: 'swapped',
          roleId,
          removedRoleIds: otherRoles,
          message: `Swapped role to <@&${roleId}> (removed previous role: ${otherRoles.map((id) => `<@&${id}>`).join(', ')}).`,
        };
      }

      return {
        action: 'added',
        roleId,
        message: `Granted the <@&${roleId}> role.`,
      };
    }

    case 'normal':
    default: {
      if (currentMemberRoleIds.includes(roleId)) {
        return {
          action: 'removed',
          roleId,
          message: `Removed the <@&${roleId}> role.`,
        };
      }

      if (panel.maxRoles) {
        const currentCount = panel.entries.filter((e) =>
          currentMemberRoleIds.includes(e.roleId),
        ).length;
        if (currentCount >= panel.maxRoles) {
          return {
            action: 'denied',
            roleId,
            message: `You can only select up to ${panel.maxRoles} role${panel.maxRoles > 1 ? 's' : ''} from this panel.`,
          };
        }
      }

      return {
        action: 'added',
        roleId,
        message: `Granted the <@&${roleId}> role.`,
      };
    }
  }
}

// ─── 11. Handle Reaction Role Select (Dropdown) ───────────────────────────────

export async function handleReactionRoleSelect(
  guildId: string,
  userId: string,
  panelId: string,
  selectedRoleIds: string[],
  currentMemberRoleIds: string[],
): Promise<ReactionRoleSelectResult> {
  const panel = await getReactionRolePanel(guildId, panelId);
  if (!panel) {
    return {
      action: 'denied',
      addedRoleIds: [],
      removedRoleIds: [],
      message: 'Reaction role panel not found.',
    };
  }

  // Check prerequisite role if set
  if (panel.requiredRoleId && !currentMemberRoleIds.includes(panel.requiredRoleId)) {
    return {
      action: 'denied',
      addedRoleIds: [],
      removedRoleIds: [],
      message: `You need the <@&${panel.requiredRoleId}> role before you can claim roles from this panel.`,
    };
  }

  // Mode constraints
  if (panel.mode === 'unique' && selectedRoleIds.length > 1) {
    return {
      action: 'denied',
      addedRoleIds: [],
      removedRoleIds: [],
      message: 'You can only select one role from this unique panel.',
    };
  }

  if (panel.maxRoles && selectedRoleIds.length > panel.maxRoles) {
    return {
      action: 'denied',
      addedRoleIds: [],
      removedRoleIds: [],
      message: `You can only select up to ${panel.maxRoles} role${panel.maxRoles > 1 ? 's' : ''} from this panel.`,
    };
  }

  const panelRoleIds = panel.entries.map((e) => e.roleId);
  const validSelected = selectedRoleIds.filter((id) => panelRoleIds.includes(id));
  const currentPanelRoles = currentMemberRoleIds.filter((id) =>
    panelRoleIds.includes(id),
  );

  if (panel.mode === 'verify') {
    const rolesToAdd = validSelected.filter((id) => !currentPanelRoles.includes(id));
    return {
      action: 'applied',
      addedRoleIds: rolesToAdd,
      removedRoleIds: [],
      message:
        rolesToAdd.length > 0
          ? `Verified! Granted: ${rolesToAdd.map((id) => `<@&${id}>`).join(', ')}`
          : 'No new roles were added.',
    };
  }

  if (panel.mode === 'drop') {
    const rolesToRemove = validSelected.filter((id) =>
      currentPanelRoles.includes(id),
    );
    return {
      action: 'applied',
      addedRoleIds: [],
      removedRoleIds: rolesToRemove,
      message:
        rolesToRemove.length > 0
          ? `Dropped: ${rolesToRemove.map((id) => `<@&${id}>`).join(', ')}`
          : 'No roles were removed.',
    };
  }

  // 'normal' or 'unique'
  const rolesToAdd = validSelected.filter((id) => !currentPanelRoles.includes(id));
  const rolesToRemove = currentPanelRoles.filter(
    (id) => !validSelected.includes(id),
  );

  const parts: string[] = [];
  if (rolesToAdd.length > 0) {
    parts.push(`Added: ${rolesToAdd.map((id) => `<@&${id}>`).join(', ')}`);
  }
  if (rolesToRemove.length > 0) {
    parts.push(`Removed: ${rolesToRemove.map((id) => `<@&${id}>`).join(', ')}`);
  }

  return {
    action: 'applied',
    addedRoleIds: rolesToAdd,
    removedRoleIds: rolesToRemove,
    message: parts.length > 0 ? parts.join('\n') : 'No role changes made.',
  };
}
