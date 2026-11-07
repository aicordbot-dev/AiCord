/**
 * src/lib/rpg/adventure-service.ts
 * Gemini AI Dynamic RPG (/adventure) Service Engine for AiCord.
 *
 * Capabilities:
 * - Zero-network in-memory test store (enableTestMode, clearTestStore, isTestMode, setTestPlayer, getTestPlayer)
 * - Class-specific starter kits (Warrior, Mage, Rogue, Cleric, Ranger)
 * - Player profile lifecycle & persistence (getOrCreatePlayer, getPlayer)
 * - Tavern healing mechanics with dynamic gold fees & free mercy tier
 * - Procedural dungeon generator with monsters, crypts, dragons, shrines, and mimic encounters
 * - Choice resolution engine: combat damage, armor absorption, leveling up, death penalty & respawn
 * - Thematic Discord Embed builder with visual ASCII HP bar and interactive choice buttons
 * - Guild adventure leaderboard ranking by level, XP, and gold
 */

import {
  ComponentType,
  ButtonStyle,
  type APIActionRowComponent,
  type APIButtonComponent,
} from 'discord-api-types/v10';
import { connectDB } from '@/lib/db';
import {
  AdventurePlayer,
  type IAdventurePlayer,
  type AdventureClass,
  type AdventureItem,
  type AdventureDungeonState,
} from '@/models';
import { type DiscordEmbed, clampEmbed } from '@/lib/discord/embeds';
import { env } from '@/lib/env';

// Re-export models and types
export type { IAdventurePlayer, AdventureClass, AdventureItem, AdventureDungeonState };

// ─── Constants & Starter Kits ─────────────────────────────────────────────────

export const RPG_COLOR = 0x8b5cf6; // Arcane Violet

export const CLASS_ICONS: Record<AdventureClass, string> = {
  warrior: '🛡️',
  mage: '🔮',
  rogue: '🗡️',
  cleric: '✨',
  ranger: '🏹',
};

export const CLASS_NAMES: Record<AdventureClass, string> = {
  warrior: 'Warrior',
  mage: 'Mage',
  rogue: 'Rogue',
  cleric: 'Cleric',
  ranger: 'Ranger',
};

export const STARTER_KITS: Record<AdventureClass, AdventureItem[]> = {
  warrior: [
    { id: 'starter_warrior_weapon', name: 'Iron Longsword', type: 'weapon', power: 10 },
    { id: 'starter_warrior_armor', name: 'Steel Shield', type: 'armor', power: 5 },
  ],
  mage: [
    { id: 'starter_mage_weapon', name: 'Arcane Wand', type: 'weapon', power: 12 },
    { id: 'starter_mage_armor', name: 'Mystic Robes', type: 'armor', power: 3 },
  ],
  rogue: [
    { id: 'starter_rogue_weapon', name: 'Twin Daggers', type: 'weapon', power: 11 },
    { id: 'starter_rogue_armor', name: 'Leather Armor', type: 'armor', power: 4 },
  ],
  cleric: [
    { id: 'starter_cleric_weapon', name: 'Holy Mace', type: 'weapon', power: 9 },
    { id: 'starter_cleric_armor', name: 'Blessed Vestments', type: 'armor', power: 6 },
    { id: 'starter_cleric_potion', name: 'Healing Draught', type: 'potion', power: 25 },
  ],
  ranger: [
    { id: 'starter_ranger_weapon', name: 'Recurve Bow', type: 'weapon', power: 10 },
    { id: 'starter_ranger_armor', name: 'Camouflage Cloak', type: 'armor', power: 4 },
  ],
};

// Rare procedural loot table
export const LOOT_TABLE: AdventureItem[] = [
  { id: 'loot_runic_sword', name: 'Runic Longsword', type: 'weapon', power: 18 },
  { id: 'loot_shadow_blade', name: 'Shadowfang Dagger', type: 'weapon', power: 20 },
  { id: 'loot_crystal_wand', name: 'Crystal Core Wand', type: 'weapon', power: 22 },
  { id: 'loot_dragon_bow', name: 'Dragonbone Recurve', type: 'weapon', power: 24 },
  { id: 'loot_mithril_mail', name: 'Mithril Chainmail', type: 'armor', power: 12 },
  { id: 'loot_aegis_shield', name: 'Aegis Guardian Shield', type: 'armor', power: 14 },
  { id: 'loot_dragon_scale', name: 'Dragon Scale Cuirass', type: 'armor', power: 18 },
  { id: 'loot_vitality_pot', name: 'Elixir of Vitality', type: 'potion', power: 50 },
  { id: 'loot_phoenix_relic', name: 'Phoenix Ash Amulet', type: 'relic', power: 25 },
  { id: 'loot_ancient_sigil', name: 'Sigil of the Void Walker', type: 'relic', power: 30 },
];

// ─── Test Store ───────────────────────────────────────────────────────────────

let testMode = false;
const testPlayers = new Map<string, IAdventurePlayer>();

export function enableTestMode(enabled: boolean = true): void {
  testMode = enabled;
}

export function clearTestStore(): void {
  testPlayers.clear();
}

export function isTestMode(): boolean {
  return testMode;
}

export function setTestPlayer(player: IAdventurePlayer): void {
  const key = `${player.guildId}:${player.userId}`;
  testPlayers.set(key, player);
}

export function getTestPlayer(guildId: string, userId: string): IAdventurePlayer | undefined {
  return testPlayers.get(`${guildId}:${userId}`);
}

// ─── Visual HP Bar & Embed Utilities ──────────────────────────────────────────

/**
 * Renders a visual ASCII health bar: [████████░░] 80/100 HP
 */
export function renderHpBar(current: number, max: number, length: number = 10): string {
  const clampedMax = Math.max(1, max);
  const clampedCurrent = Math.max(0, Math.min(clampedMax, current));
  const ratio = clampedCurrent / clampedMax;
  const filled = Math.max(0, Math.min(length, Math.round(ratio * length)));
  const empty = length - filled;
  return `[\`${'█'.repeat(filled)}${'░'.repeat(empty)}\`] ${clampedCurrent}/${clampedMax} HP`;
}

// ─── Player Profile Lifecycle ─────────────────────────────────────────────────

export async function getPlayer(guildId: string, userId: string): Promise<IAdventurePlayer | null> {
  if (testMode) {
    return testPlayers.get(`${guildId}:${userId}`) ?? null;
  }
  await connectDB();
  return AdventurePlayer.findOne({ guildId, userId });
}

export async function getOrCreatePlayer(
  guildId: string,
  userId: string,
  chosenClass: AdventureClass = 'warrior',
  userName: string = 'Adventurer',
): Promise<IAdventurePlayer> {
  const existing = await getPlayer(guildId, userId);
  if (existing) {
    return existing;
  }

  const starterItems = STARTER_KITS[chosenClass]
    ? STARTER_KITS[chosenClass].map((item) => ({ ...item }))
    : STARTER_KITS.warrior.map((item) => ({ ...item }));

  if (testMode) {
    const mockPlayer = {
      guildId,
      userId,
      name: userName,
      class: chosenClass,
      level: 1,
      xp: 0,
      hp: 100,
      maxHp: 100,
      gold: 50,
      inventory: starterItems,
      dungeon: {
        active: false,
        floor: 1,
        encounterCount: 0,
        currentScenario: '',
        choices: [],
      },
      monstersDefeated: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: async function () {
        (this as Record<string, unknown>).updatedAt = new Date();
        testPlayers.set(`${guildId}:${userId}`, this as unknown as IAdventurePlayer);
        return this;
      },
    } as unknown as IAdventurePlayer;

    testPlayers.set(`${guildId}:${userId}`, mockPlayer);
    return mockPlayer;
  }

  await connectDB();
  const created = await AdventurePlayer.create({
    guildId,
    userId,
    name: userName,
    class: chosenClass,
    level: 1,
    xp: 0,
    hp: 100,
    maxHp: 100,
    gold: 50,
    inventory: starterItems,
    dungeon: {
      active: false,
      floor: 1,
      encounterCount: 0,
      currentScenario: '',
      choices: [],
    },
    monstersDefeated: 0,
  });

  return created;
}

// ─── Tavern Healing ───────────────────────────────────────────────────────────

export interface HealResult {
  success: boolean;
  healedAmount: number;
  cost: number;
  player: IAdventurePlayer;
  message: string;
}

/**
 * Restores player HP to max. Costs 20 gold at the tavern, or free if 0 gold.
 */
export async function healPlayer(guildId: string, userId: string): Promise<HealResult> {
  let player = await getPlayer(guildId, userId);
  if (!player) {
    player = await getOrCreatePlayer(guildId, userId);
  }

  const healedAmount = Math.max(0, player.maxHp - player.hp);
  let cost = 0;

  if (player.gold >= 20) {
    cost = 20;
  } else if (player.gold > 0) {
    cost = player.gold;
  } else {
    cost = 0; // Free mercy at 0 gold
  }

  player.gold = Math.max(0, player.gold - cost);
  player.hp = player.maxHp;
  await player.save();

  let message = '';
  if (healedAmount === 0) {
    message = `You enjoyed a refreshing flagon of spiced cider by the tavern hearth. You are already in peak battle condition (${player.maxHp}/${player.maxHp} HP)!`;
  } else {
    message = `You rested in a cozy room at the Silver Dragon Tavern. You recovered **+${healedAmount} HP** back to full health (${player.maxHp}/${player.maxHp} HP)!`;
  }

  if (cost > 0) {
    message += ` You paid **${cost} gold** to the friendly innkeeper.`;
  } else {
    message += ` Having no coin to your name, the kindly innkeeper offered you a warm hearth and stew free of charge!`;
  }

  return {
    success: true,
    healedAmount,
    cost,
    player,
    message,
  };
}

// ─── Procedural Scenario & Encounters Engine ──────────────────────────────────

export interface ProceduralEncounter {
  title: string;
  scenario: string;
  choices: string[];
  type: 'combat' | 'puzzle' | 'shrine' | 'chest' | 'boss';
  monsterName?: string;
  baseDamage?: number;
}

const PROCEDURAL_ENCOUNTERS: ProceduralEncounter[] = [
  {
    title: 'Goblin Patrol Ambush',
    scenario:
      'A screeching scout party of cave goblins drops from damp stalactites! Their crude bone daggers glint in the torchlight as they surround you.',
    choices: [
      'Slash the lead scout with your primary weapon',
      'Raise your guard and deflect their poisoned darts',
      'Unleash an arcane elemental burst to scatter them',
      'Roll into the cavern shadows and flank from behind',
    ],
    type: 'combat',
    monsterName: 'Goblin Scout',
    baseDamage: 12,
  },
  {
    title: 'Ancient Sarcophagus of the Crypt Knight',
    scenario:
      'You step into a frostbitten crypt. The carved lid of a granite tomb grinds open with a deafening screech, revealing an animated skeletal knight clad in rusted plate!',
    choices: [
      'Strike forcefully before the undead knight draws its broadsword',
      'Brace your armor to absorb its spectral slash',
      'Invoke holy radiance to cleanse the crypt',
      'Examine the tomb runes for a shattering counter-curse',
    ],
    type: 'combat',
    monsterName: 'Skeletal Crypt Knight',
    baseDamage: 16,
  },
  {
    title: 'The Sleeping Red Drake',
    scenario:
      'The air turns sweltering as glowing lava veins illuminate a subterranean cavern. An adolescent red dragon slumbers upon a mound of scorched bones and shimmering coin.',
    choices: [
      'Attempt a precise sneak attack on its soft neck scales',
      'Conjure a frost ward to damp the oppressive heat',
      'Carefully siphon gleaming gold and relics from the hoard',
      'Tread quietly along the shadowed ledge toward the descent stairs',
    ],
    type: 'boss',
    monsterName: 'Young Red Drake',
    baseDamage: 24,
  },
  {
    title: 'Forgotten Shrine of Celestial Grace',
    scenario:
      'A tranquil sanctuary hidden deep beneath the dungeon floor radiates calming azure energy. A crystal font ripples with blessed healing waters.',
    choices: [
      'Kneel before the altar and offer a prayer for divine blessing',
      'Drink deeply from the luminous crystal font',
      'Study the celestial engravings to extract lost knowledge',
      'Meditate peacefully to restore focus and fortitude',
    ],
    type: 'shrine',
    baseDamage: 0,
  },
  {
    title: 'Trapped Obsidian Treasure Chest',
    scenario:
      'In an arched stone alcove rests an ornate obsidian chest bound in brass bands. A faint ticking sound and glowing pressure runes betray an explosive trap.',
    choices: [
      'Carefully pick the locking mechanism with a slender blade',
      'Brace behind heavy cover and force the latch open',
      'Cast a dispelling cantrip to neutralize the arcane trigger',
      'Bypass the dangerous contraption and press forward',
    ],
    type: 'chest',
    baseDamage: 14,
  },
  {
    title: 'Stalking Shadow Stalker',
    scenario:
      'Two piercing violet eyes glow in the impenetrable darkness ahead. A feline predator woven from undulating shadows silently circles your perimeter.',
    choices: [
      'Swing your weapon in a wide arc to keep it at bay',
      'Cast a dazzling flare of daylight to burn its shadow form',
      'Stand resolute and wait for it to pounce into your counter',
      'Scatter smoke pellets and maneuver behind stone pillars',
    ],
    type: 'combat',
    monsterName: 'Shadow Stalker',
    baseDamage: 15,
  },
  {
    title: 'Mimic Chest Surprise',
    scenario:
      'As you approach what appears to be an innocent wooden chest, its lid snaps wide open into rows of jagged obsidian teeth and a thrashing purple tongue!',
    choices: [
      'Drive your blade straight into the beast\'s gaping maw',
      'Wedge your shield into its jaws to prevent it from clamping down',
      'Incinerate the monster with burst elemental magic',
      'Kick the mimic away and leap backward out of striking distance',
    ],
    type: 'combat',
    monsterName: 'Dungeon Mimic',
    baseDamage: 18,
  },
];

/**
 * Returns a procedural dungeon encounter scaled to the player's current floor.
 */
export function generateProceduralEncounter(floor: number, encounterCount: number): ProceduralEncounter {
  // Every 5 encounters or floor boss
  if (encounterCount > 0 && encounterCount % 5 === 0) {
    const boss = PROCEDURAL_ENCOUNTERS.find((e) => e.type === 'boss') ?? PROCEDURAL_ENCOUNTERS[2];
    return {
      ...boss,
      scenario: `[FLOOR ${floor} BOSS] ` + boss.scenario,
      baseDamage: (boss.baseDamage ?? 20) + floor * 4,
    };
  }

  const nonBoss = PROCEDURAL_ENCOUNTERS.filter((e) => e.type !== 'boss');
  const index = (floor * 3 + encounterCount) % nonBoss.length;
  const encounter = nonBoss[index];

  return {
    ...encounter,
    scenario: `[Floor ${floor}] ` + encounter.scenario,
    baseDamage: encounter.baseDamage ? encounter.baseDamage + Math.max(0, floor - 1) * 3 : 0,
  };
}

// ─── Adventure Progression Engine ─────────────────────────────────────────────

export interface StartAdventureResult {
  player: IAdventurePlayer;
  scenario: string;
  choices: string[];
  isNew: boolean;
}

export async function startAdventure(guildId: string, userId: string): Promise<StartAdventureResult> {
  const player = await getOrCreatePlayer(guildId, userId);

  // If already in an active dungeon with choices ready, resume
  if (player.dungeon.active && player.dungeon.currentScenario && player.dungeon.choices.length > 0) {
    return {
      player,
      scenario: player.dungeon.currentScenario,
      choices: player.dungeon.choices,
      isNew: false,
    };
  }

  // Initialize new adventure
  const floor = player.dungeon.floor > 0 ? player.dungeon.floor : 1;
  const encounter = generateProceduralEncounter(floor, 0);

  player.dungeon = {
    active: true,
    floor,
    encounterCount: 0,
    currentScenario: encounter.scenario,
    choices: encounter.choices,
    lastOutcome: undefined,
  };

  await player.save();

  return {
    player,
    scenario: encounter.scenario,
    choices: encounter.choices,
    isNew: true,
  };
}

export interface ChoiceResult {
  player: IAdventurePlayer;
  outcomeText: string;
  nextScenario: string;
  nextChoices: string[];
  leveledUp: boolean;
  fainted: boolean;
  rewards?: {
    xp: number;
    gold: number;
    item?: AdventureItem;
  };
}

/**
 * Resolves an adventure choice index, computing combat, rewards, level-ups, or death penalties.
 */
export async function processAdventureChoice(
  guildId: string,
  userId: string,
  choiceIndex: number,
): Promise<ChoiceResult> {
  let player = await getPlayer(guildId, userId);
  if (!player) {
    player = await getOrCreatePlayer(guildId, userId);
  }

  if (!player.dungeon.active || player.dungeon.choices.length === 0) {
    const started = await startAdventure(guildId, userId);
    player = started.player;
  }

  const validIndex = Math.max(0, Math.min(player.dungeon.choices.length - 1, choiceIndex));
  const chosenText = player.dungeon.choices[validIndex] ?? 'Action Taken';
  const floor = player.dungeon.floor || 1;

  // Calculate equipment stats
  let weaponPower = 5;
  let armorPower = 0;
  for (const item of player.inventory) {
    if (item.type === 'weapon') weaponPower += item.power;
    if (item.type === 'armor') armorPower += item.power;
    if (item.type === 'relic') weaponPower += Math.floor(item.power / 2);
  }

  // Class combat bonuses
  if (player.class === 'warrior') armorPower += 4;
  if (player.class === 'mage') weaponPower += 5;
  if (player.class === 'rogue') weaponPower += 3;
  if (player.class === 'cleric') armorPower += 3;
  if (player.class === 'ranger') weaponPower += 4;

  const monsterBaseDamage = 12 + floor * 4;
  let damageTaken = Math.max(2, monsterBaseDamage - Math.floor(armorPower / 2));
  let xpEarned = 35 + floor * 15;
  let goldEarned = 15 + floor * 10;
  let droppedItem: AdventureItem | undefined = undefined;
  let outcomeNarrative = '';

  // Determine outcome based on choice style
  if (validIndex === 0) {
    // Aggressive attack
    const dealt = weaponPower + player.level * 4 + 5;
    damageTaken = Math.max(3, monsterBaseDamage - Math.floor(armorPower / 2));
    player.monstersDefeated += 1;
    outcomeNarrative = `⚔️ You executed **${chosenText}**, dealing **${dealt} damage** and vanquishing the threat! You suffered **${damageTaken} counter-damage**.`;
  } else if (validIndex === 1) {
    // Defensive / Parry
    damageTaken = Math.max(1, Math.floor((monsterBaseDamage - armorPower) * 0.4));
    player.monstersDefeated += 1;
    xpEarned = Math.floor(xpEarned * 0.9);
    outcomeNarrative = `🛡️ You chose **${chosenText}**, utilizing your armor to mitigate incoming blows to just **${damageTaken} damage** before defeating your foe.`;
  } else if (validIndex === 2) {
    // Magic / Shrines / High Reward
    damageTaken = Math.max(2, monsterBaseDamage - armorPower - 2);
    xpEarned = Math.floor(xpEarned * 1.25);
    goldEarned = Math.floor(goldEarned * 1.3);
    outcomeNarrative = `✨ You performed **${chosenText}**, unleashing raw arcane power! The chamber resonated with energy as you triumphed, taking **${damageTaken} damage**.`;
  } else {
    // Cunning / Evade / Search
    damageTaken = Math.max(1, Math.floor(monsterBaseDamage * 0.3));
    goldEarned = Math.floor(goldEarned * 1.5);
    outcomeNarrative = `🏃 You executed **${chosenText}**, artfully maneuvering through the cavern. You took only **${damageTaken} damage** while unearthing extra coin!`;
  }

  // 15% chance of bonus rare loot drop
  const rollLoot = (player.dungeon.encounterCount + validIndex) % 7 === 0;
  if (rollLoot && LOOT_TABLE.length > 0) {
    const lootIdx = (floor + player.monstersDefeated) % LOOT_TABLE.length;
    const baseLoot = LOOT_TABLE[lootIdx];
    droppedItem = {
      id: `${baseLoot.id}_f${floor}`,
      name: `${baseLoot.name}`,
      type: baseLoot.type,
      power: baseLoot.power + (floor - 1) * 3,
    };
    player.inventory.push(droppedItem);
    outcomeNarrative += `\n🎁 **Loot Discovered:** Found **${droppedItem.name}** (+${droppedItem.power} ${droppedItem.type})!`;
  }

  // Apply damage
  player.hp -= damageTaken;

  // ─── Death / Faint Check ───────────────────────────────────────────────────
  if (player.hp <= 0) {
    const lostGold = Math.floor(player.gold / 2);
    player.gold = Math.max(0, player.gold - lostGold);
    player.hp = 50;
    player.dungeon.floor = 1;
    player.dungeon.encounterCount = 0;

    const respawnScenario =
      'You awaken on a rough straw cot near the entrance of the Dungeon of Shadows. Torches crackle along the stone archway. A sympathetic tavern merchant patches your wounds and points toward the depths.';
    const respawnChoices = [
      'Grip your weapon and march back into the dungeon',
      'Search the entrance supply barrels for rations',
      'Rest against the mossy cave wall to recover your focus',
    ];

    const deathOutcome = `💀 **You collapsed in battle!** You took **${damageTaken} damage** and fainted. A kind tavern keeper dragged you back to the dungeon entrance. You lost **${lostGold} gold**, but your wounds were treated (${player.hp}/${player.maxHp} HP).`;

    player.dungeon.currentScenario = respawnScenario;
    player.dungeon.choices = respawnChoices;
    player.dungeon.lastOutcome = deathOutcome;

    await player.save();

    return {
      player,
      outcomeText: deathOutcome,
      nextScenario: respawnScenario,
      nextChoices: respawnChoices,
      leveledUp: false,
      fainted: true,
    };
  }

  // ─── Survived: Rewards & Level Up ──────────────────────────────────────────
  player.xp += xpEarned;
  player.gold += goldEarned;

  let leveledUp = false;
  // Level-up condition: xp >= level * 100
  while (player.xp >= player.level * 100) {
    player.xp -= player.level * 100;
    player.level += 1;
    player.maxHp += 20;
    player.hp = player.maxHp;
    const bonusGold = player.level * 25;
    player.gold += bonusGold;
    leveledUp = true;
  }

  if (leveledUp) {
    outcomeNarrative += `\n🌟 **LEVEL UP!** You reached **Level ${player.level}**! Maximum HP increased to **${player.maxHp} HP**, health fully restored, and received **+${player.level * 25} bonus gold**!`;
  } else {
    outcomeNarrative += `\nEarned **+${xpEarned} XP** and **+${goldEarned} Gold**.`;
  }

  // Dungeon advancement
  player.dungeon.encounterCount += 1;
  if (player.dungeon.encounterCount % 3 === 0) {
    player.dungeon.floor += 1;
    outcomeNarrative += `\n🪜 **Floor Cleared!** You discovered the descent stairs and ventured deeper to **Floor ${player.dungeon.floor}**!`;
  }

  // Generate next encounter
  const nextEncounter = generateProceduralEncounter(player.dungeon.floor, player.dungeon.encounterCount);
  player.dungeon.currentScenario = nextEncounter.scenario;
  player.dungeon.choices = nextEncounter.choices;
  player.dungeon.lastOutcome = outcomeNarrative;

  await player.save();

  return {
    player,
    outcomeText: outcomeNarrative,
    nextScenario: nextEncounter.scenario,
    nextChoices: nextEncounter.choices,
    leveledUp,
    fainted: false,
    rewards: {
      xp: xpEarned,
      gold: goldEarned,
      item: droppedItem,
    },
  };
}

// ─── Discord Embed & Button Components ────────────────────────────────────────

/**
 * Builds a rich thematic embed displaying dungeon scenario, character stats, and narrative outcome.
 */
export function buildAdventureEmbed(
  player: IAdventurePlayer,
  scenarioText: string,
  outcomeText?: string,
): DiscordEmbed {
  const hpDisplay = renderHpBar(player.hp, player.maxHp);
  const classIcon = CLASS_ICONS[player.class] ?? '⚔️';
  const className = CLASS_NAMES[player.class] ?? 'Adventurer';

  const embed: DiscordEmbed = {
    title: `🗡️ The Dungeon of Shadows — Floor ${player.dungeon.floor || 1}`,
    color: player.hp < 30 ? 0xef4444 : RPG_COLOR,
    description: '',
    fields: [
      {
        name: 'Hero',
        value: `${classIcon} **${player.name}**\nClass: \`${className}\`\nLevel: **${player.level}**`,
        inline: true,
      },
      {
        name: 'Vitals',
        value: `${hpDisplay}\nXP: **${player.xp}/${player.level * 100}**`,
        inline: true,
      },
      {
        name: 'Purse & Trophies',
        value: `🪙 **${player.gold}** Gold\n💀 **${player.monstersDefeated}** Slain`,
        inline: true,
      },
    ],
    footer: {
      text: 'AiCord RPG • Click a button below to choose your action',
    },
  };

  let desc = '';
  if (outcomeText && outcomeText.trim()) {
    desc += `📜 **Action Outcome:**\n${outcomeText}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  }
  desc += `📖 **Current Encounter:**\n${scenarioText}`;

  embed.description = desc;
  return clampEmbed(embed);
}

/**
 * Builds an ActionRow of Discord interactive buttons for adventure choices.
 */
export function buildAdventureComponents(
  choices: string[],
  disabled: boolean = false,
  userId?: string,
): APIActionRowComponent<APIButtonComponent> {
  const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

  const buttons: APIButtonComponent[] = choices.slice(0, 5).map((choice, i) => {
    const customId = userId ? `adv_choice:${userId}:${i}` : `adv_choice:${i}`;
    const truncatedLabel = choice.length > 80 ? choice.slice(0, 77) + '...' : choice;

    return {
      type: ComponentType.Button,
      style: ButtonStyle.Secondary,
      custom_id: customId,
      label: truncatedLabel,
      emoji: { name: numberEmojis[i] ?? '▶️' },
      disabled,
    };
  });

  return {
    type: ComponentType.ActionRow,
    components: buttons,
  };
}

// ─── Guild Adventure Leaderboard ──────────────────────────────────────────────

/**
 * Retrieves the top adventurers in a guild ranked by level, XP, and gold.
 */
export async function getAdventureLeaderboard(
  guildId: string,
  limit: number = 10,
): Promise<IAdventurePlayer[]> {
  if (testMode) {
    const all = Array.from(testPlayers.values()).filter((p) => p.guildId === guildId);
    all.sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      if (b.xp !== a.xp) return b.xp - a.xp;
      return b.gold - a.gold;
    });
    return all.slice(0, limit);
  }

  await connectDB();
  const players = await AdventurePlayer.find({ guildId })
    .sort({ level: -1, xp: -1, gold: -1 })
    .limit(limit)
    .lean();

  return players as unknown as IAdventurePlayer[];
}
