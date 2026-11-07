/**
 * test/rpg/adventure-service.test.ts
 * Unit tests for Service 20: Gemini AI Dynamic RPG (/adventure) Service Engine:
 * - Test store lifecycle (enableTestMode, clearTestStore, isTestMode, setTestPlayer, getTestPlayer)
 * - Player creation with default & custom classes
 * - Starter kits & equipment per class (Warrior, Mage, Rogue, Cleric, Ranger)
 * - Tavern healing mechanics & gold fees (standard 20g, partial gold, 0g free mercy tier)
 * - Dungeon adventure start & state resumption
 * - Combat encounters & choice resolution (attack, defense, magic, evasion)
 * - Level-up mechanics, stat scaling, full HP restore, and bonus gold
 * - Death/faint penalties: floor reset to 1, half gold lost, 50 HP recovery
 * - Embed builder & interactive button action row generator
 * - Guild adventure leaderboard ranking
 */

import '../test-env';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  enableTestMode,
  clearTestStore,
  isTestMode,
  setTestPlayer,
  getTestPlayer,
  getOrCreatePlayer,
  getPlayer,
  healPlayer,
  startAdventure,
  processAdventureChoice,
  buildAdventureEmbed,
  buildAdventureComponents,
  getAdventureLeaderboard,
  renderHpBar,
  STARTER_KITS,
  type IAdventurePlayer,
} from '@/lib/rpg/adventure-service';

describe('Gemini AI Dynamic RPG — Adventure Service Engine', () => {
  const GUILD_ID = 'guild_rpg_test_101';
  const USER_WARRIOR = 'user_warrior_1';
  const USER_MAGE = 'user_mage_2';
  const USER_ROGUE = 'user_rogue_3';
  const USER_CLERIC = 'user_cleric_4';
  const USER_RANGER = 'user_ranger_5';

  beforeEach(() => {
    enableTestMode(true);
    clearTestStore();
  });

  // ─── 1. Test Store Lifecycle ──────────────────────────────────────────────────

  describe('Test Store Lifecycle', () => {
    it('manages in-memory test mode, stores, and clears players without network access', () => {
      assert.equal(isTestMode(), true);

      const mockPlayer = {
        guildId: GUILD_ID,
        userId: 'temp_user',
        name: 'Tester',
        class: 'warrior',
        level: 3,
        xp: 150,
        hp: 120,
        maxHp: 140,
        gold: 250,
        inventory: [],
        dungeon: {
          active: false,
          floor: 1,
          encounterCount: 0,
          currentScenario: '',
          choices: [],
        },
        monstersDefeated: 5,
        save: async function () {
          return this;
        },
      } as unknown as IAdventurePlayer;

      setTestPlayer(mockPlayer);
      const retrieved = getTestPlayer(GUILD_ID, 'temp_user');
      assert.ok(retrieved);
      assert.equal(retrieved.level, 3);
      assert.equal(retrieved.gold, 250);

      clearTestStore();
      assert.equal(getTestPlayer(GUILD_ID, 'temp_user'), undefined);
    });
  });

  // ─── 2. Player Creation & Starter Kits ────────────────────────────────────────

  describe('Player Creation & Class Starter Kits', () => {
    it('creates a warrior with default stats and starter equipment', async () => {
      const player = await getOrCreatePlayer(GUILD_ID, USER_WARRIOR, 'warrior', 'Conan');

      assert.equal(player.guildId, GUILD_ID);
      assert.equal(player.userId, USER_WARRIOR);
      assert.equal(player.name, 'Conan');
      assert.equal(player.class, 'warrior');
      assert.equal(player.level, 1);
      assert.equal(player.xp, 0);
      assert.equal(player.hp, 100);
      assert.equal(player.maxHp, 100);
      assert.equal(player.gold, 50);
      assert.equal(player.monstersDefeated, 0);
      assert.equal(player.dungeon.active, false);

      // Starter kit check: Iron Longsword (+10), Steel Shield (+5)
      assert.equal(player.inventory.length, 2);
      const weapon = player.inventory.find((i) => i.type === 'weapon');
      const armor = player.inventory.find((i) => i.type === 'armor');
      assert.ok(weapon);
      assert.equal(weapon.name, 'Iron Longsword');
      assert.equal(weapon.power, 10);
      assert.ok(armor);
      assert.equal(armor.name, 'Steel Shield');
      assert.equal(armor.power, 5);
    });

    it('returns existing player without overwriting progression', async () => {
      const p1 = await getOrCreatePlayer(GUILD_ID, USER_WARRIOR, 'warrior', 'Original');
      p1.level = 5;
      p1.gold = 500;
      await p1.save();

      const p2 = await getOrCreatePlayer(GUILD_ID, USER_WARRIOR, 'mage', 'Modified');
      assert.equal(p2.level, 5);
      assert.equal(p2.gold, 500);
      assert.equal(p2.class, 'warrior');
    });

    it('assigns unique class starter kits correctly for all classes', async () => {
      // Mage
      const mage = await getOrCreatePlayer(GUILD_ID, USER_MAGE, 'mage', 'Gandalf');
      assert.equal(mage.inventory.length, 2);
      assert.ok(mage.inventory.some((i) => i.name === 'Arcane Wand' && i.power === 12));
      assert.ok(mage.inventory.some((i) => i.name === 'Mystic Robes' && i.power === 3));

      // Rogue
      const rogue = await getOrCreatePlayer(GUILD_ID, USER_ROGUE, 'rogue', 'Shadow');
      assert.equal(rogue.inventory.length, 2);
      assert.ok(rogue.inventory.some((i) => i.name === 'Twin Daggers' && i.power === 11));
      assert.ok(rogue.inventory.some((i) => i.name === 'Leather Armor' && i.power === 4));

      // Cleric: Weapon, Armor, and Potion
      const cleric = await getOrCreatePlayer(GUILD_ID, USER_CLERIC, 'cleric', 'Healer');
      assert.equal(cleric.inventory.length, 3);
      assert.ok(cleric.inventory.some((i) => i.name === 'Holy Mace' && i.power === 9));
      assert.ok(cleric.inventory.some((i) => i.name === 'Blessed Vestments' && i.power === 6));
      assert.ok(cleric.inventory.some((i) => i.name === 'Healing Draught' && i.power === 25));

      // Ranger
      const ranger = await getOrCreatePlayer(GUILD_ID, USER_RANGER, 'ranger', 'Legolas');
      assert.equal(ranger.inventory.length, 2);
      assert.ok(ranger.inventory.some((i) => i.name === 'Recurve Bow' && i.power === 10));
      assert.ok(ranger.inventory.some((i) => i.name === 'Camouflage Cloak' && i.power === 4));
    });
  });

  // ─── 3. Tavern Healing Mechanics ──────────────────────────────────────────────

  describe('Tavern Healing Mechanics', () => {
    it('restores HP to maxHp and charges 20 gold when player has sufficient funds', async () => {
      const player = await getOrCreatePlayer(GUILD_ID, USER_WARRIOR);
      player.hp = 30;
      player.gold = 50;
      await player.save();

      const result = await healPlayer(GUILD_ID, USER_WARRIOR);
      assert.equal(result.success, true);
      assert.equal(result.healedAmount, 70);
      assert.equal(result.cost, 20);
      assert.equal(result.player.hp, 100);
      assert.equal(result.player.gold, 30);
      assert.ok(result.message.includes('70 HP'));
      assert.ok(result.message.includes('20 gold'));
    });

    it('provides free healing mercy tier when player has 0 gold', async () => {
      const player = await getOrCreatePlayer(GUILD_ID, USER_WARRIOR);
      player.hp = 15;
      player.gold = 0;
      await player.save();

      const result = await healPlayer(GUILD_ID, USER_WARRIOR);
      assert.equal(result.success, true);
      assert.equal(result.healedAmount, 85);
      assert.equal(result.cost, 0);
      assert.equal(result.player.hp, 100);
      assert.equal(result.player.gold, 0);
      assert.ok(result.message.includes('free of charge'));
    });

    it('charges remaining coin when player has between 1 and 19 gold', async () => {
      const player = await getOrCreatePlayer(GUILD_ID, USER_WARRIOR);
      player.hp = 40;
      player.gold = 12;
      await player.save();

      const result = await healPlayer(GUILD_ID, USER_WARRIOR);
      assert.equal(result.success, true);
      assert.equal(result.cost, 12);
      assert.equal(result.player.hp, 100);
      assert.equal(result.player.gold, 0);
    });

    it('handles healing when already at peak health', async () => {
      const player = await getOrCreatePlayer(GUILD_ID, USER_WARRIOR);
      player.hp = 100;
      player.gold = 50;
      await player.save();

      const result = await healPlayer(GUILD_ID, USER_WARRIOR);
      assert.equal(result.healedAmount, 0);
      assert.equal(result.player.hp, 100);
      assert.ok(result.message.includes('peak battle condition'));
    });
  });

  // ─── 4. Adventure Start & Choice Resolution ───────────────────────────────────

  describe('Adventure Start & Choice Resolution', () => {
    it('initializes active dungeon state and generates 3-4 interactive choices', async () => {
      const start = await startAdventure(GUILD_ID, USER_WARRIOR);
      assert.equal(start.isNew, true);
      assert.equal(start.player.dungeon.active, true);
      assert.equal(start.player.dungeon.floor, 1);
      assert.ok(start.scenario.length > 10);
      assert.ok(start.choices.length >= 3);

      // Calling startAdventure again resumes the active scenario
      const resume = await startAdventure(GUILD_ID, USER_WARRIOR);
      assert.equal(resume.isNew, false);
      assert.equal(resume.scenario, start.scenario);
      assert.deepEqual(resume.choices, start.choices);
    });

    it('resolves attack choice (index 0) dealing combat damage and awarding rewards', async () => {
      await startAdventure(GUILD_ID, USER_WARRIOR);
      const res = await processAdventureChoice(GUILD_ID, USER_WARRIOR, 0);

      assert.equal(res.fainted, false);
      assert.ok(res.outcomeText.includes('You executed'));
      assert.ok(res.rewards);
      assert.ok(res.rewards.xp > 0);
      assert.ok(res.rewards.gold > 0);
      assert.equal(res.player.monstersDefeated, 1);
      assert.ok(res.player.hp < 100); // Suffered counter damage
      assert.ok(res.nextChoices.length >= 3);
    });

    it('resolves defensive choice (index 1) with armor mitigation', async () => {
      await startAdventure(GUILD_ID, USER_WARRIOR);
      const res = await processAdventureChoice(GUILD_ID, USER_WARRIOR, 1);

      assert.equal(res.fainted, false);
      assert.ok(res.outcomeText.includes('mitigate incoming blows'));
      assert.ok(res.player.hp >= 90); // Highly mitigated damage
    });

    it('resolves magic choice (index 2) with arcane bonus yields', async () => {
      await startAdventure(GUILD_ID, USER_MAGE);
      const res = await processAdventureChoice(GUILD_ID, USER_MAGE, 2);

      assert.equal(res.fainted, false);
      assert.ok(res.outcomeText.includes('unleashing raw arcane power'));
      assert.ok(res.rewards!.xp >= 40);
    });

    it('advances floor level after 3 encounters', async () => {
      const player = await getOrCreatePlayer(GUILD_ID, USER_WARRIOR);
      player.hp = 100;
      player.dungeon.floor = 1;
      player.dungeon.encounterCount = 2; // Next encounter makes it 3
      player.dungeon.active = true;
      player.dungeon.choices = ['A', 'B', 'C'];
      await player.save();

      const res = await processAdventureChoice(GUILD_ID, USER_WARRIOR, 0);
      assert.equal(res.player.dungeon.floor, 2);
      assert.ok(res.outcomeText.includes('Floor Cleared'));
    });
  });

  // ─── 5. Level-Up & Stat Scaling ───────────────────────────────────────────────

  describe('Level-Up & Stat Scaling Mechanics', () => {
    it('triggers level up when xp >= level * 100, scales maxHp, heals, and awards bonus gold', async () => {
      const player = await getOrCreatePlayer(GUILD_ID, USER_WARRIOR);
      player.level = 1;
      player.xp = 90; // Needs 10 more XP to reach 100
      player.hp = 40;
      player.maxHp = 100;
      player.gold = 50;
      player.dungeon.active = true;
      player.dungeon.choices = ['Attack', 'Defend', 'Flee'];
      await player.save();

      const res = await processAdventureChoice(GUILD_ID, USER_WARRIOR, 0);

      assert.equal(res.leveledUp, true);
      assert.equal(res.player.level, 2);
      assert.equal(res.player.maxHp, 120); // +20 max HP
      assert.equal(res.player.hp, 120); // Fully healed to new max HP
      assert.ok(res.player.gold > 50 + 50); // Initial 50 + combat gold + level 2 bonus (50g)
      assert.ok(res.outcomeText.includes('LEVEL UP!'));
    });
  });

  // ─── 6. Death / Faint Penalties & Respawn ──────────────────────────────────────

  describe('Death & Faint Penalties', () => {
    it('resets floor to 1, restores HP to 50, and deducts half gold on lethal damage', async () => {
      const player = await getOrCreatePlayer(GUILD_ID, USER_WARRIOR);
      player.hp = 2; // Critical low health
      player.gold = 200;
      player.dungeon.floor = 4;
      player.dungeon.active = true;
      player.dungeon.choices = ['Charge Recklessly', 'Defend', 'Run'];
      await player.save();

      const res = await processAdventureChoice(GUILD_ID, USER_WARRIOR, 0);

      assert.equal(res.fainted, true);
      assert.equal(res.leveledUp, false);
      assert.equal(res.player.hp, 50);
      assert.equal(res.player.dungeon.floor, 1);
      assert.equal(res.player.dungeon.encounterCount, 0);
      assert.equal(res.player.gold, 100); // Lost half of 200 gold
      assert.ok(res.outcomeText.includes('collapsed in battle'));
      assert.ok(res.nextScenario.includes('entrance of the Dungeon'));
      assert.ok(res.nextChoices.length >= 3);
    });
  });

  // ─── 7. Embed & Button Components ─────────────────────────────────────────────

  describe('Embed & Button Component Generators', () => {
    it('renders visual ASCII HP bars accurately', () => {
      const full = renderHpBar(100, 100, 10);
      assert.ok(full.includes('██████████'));
      assert.ok(full.includes('100/100 HP'));

      const half = renderHpBar(50, 100, 10);
      assert.ok(half.includes('█████░░░░░'));
      assert.ok(half.includes('50/100 HP'));

      const empty = renderHpBar(0, 100, 10);
      assert.ok(empty.includes('░░░░░░░░░░'));
      assert.ok(empty.includes('0/100 HP'));
    });

    it('builds adventure embed with hero details, vitals, and scenario narrative', async () => {
      const player = await getOrCreatePlayer(GUILD_ID, USER_WARRIOR, 'warrior', 'Aragorn');
      const embed = buildAdventureEmbed(
        player,
        'A dark goblin ambushes from shadows.',
        'You dealt 15 damage.',
      );

      assert.ok(embed.title?.includes('Floor 1'));
      assert.ok(embed.description?.includes('A dark goblin'));
      assert.ok(embed.description?.includes('You dealt 15 damage'));
      assert.equal(embed.fields?.length, 3);
      assert.ok(embed.fields?.[0].value.includes('Aragorn'));
      assert.ok(embed.fields?.[1].value.includes('100/100 HP'));
    });

    it('builds adventure action row with custom_id buttons matching adv_choice', () => {
      const choices = ['Strike with sword', 'Raise heavy shield', 'Cast spell'];
      const actionRow = buildAdventureComponents(choices, false, USER_WARRIOR);

      assert.equal(actionRow.components.length, 3);
      assert.equal((actionRow.components[0] as any).custom_id, `adv_choice:${USER_WARRIOR}:0`);
      assert.equal((actionRow.components[1] as any).custom_id, `adv_choice:${USER_WARRIOR}:1`);
      assert.equal((actionRow.components[2] as any).custom_id, `adv_choice:${USER_WARRIOR}:2`);
      assert.equal(actionRow.components[0].disabled, false);

      // Without userId
      const genericRow = buildAdventureComponents(choices, true);
      assert.equal((genericRow.components[0] as any).custom_id, 'adv_choice:0');
      assert.equal(genericRow.components[0].disabled, true);
    });
  });

  // ─── 8. Adventure Leaderboard ─────────────────────────────────────────────────

  describe('Adventure Leaderboard', () => {
    it('ranks players by level descending, XP descending, and gold descending', async () => {
      const p1 = await getOrCreatePlayer(GUILD_ID, 'user_1', 'warrior', 'Alice');
      p1.level = 2;
      p1.xp = 50;
      p1.gold = 100;
      await p1.save();

      const p2 = await getOrCreatePlayer(GUILD_ID, 'user_2', 'mage', 'Bob');
      p2.level = 4;
      p2.xp = 120;
      p2.gold = 300;
      await p2.save();

      const p3 = await getOrCreatePlayer(GUILD_ID, 'user_3', 'rogue', 'Charlie');
      p3.level = 2;
      p3.xp = 80;
      p3.gold = 150;
      await p3.save();

      const leaderboard = await getAdventureLeaderboard(GUILD_ID, 10);
      assert.equal(leaderboard.length, 3);
      assert.equal(leaderboard[0].name, 'Bob'); // Level 4
      assert.equal(leaderboard[1].name, 'Charlie'); // Level 2, 80 XP
      assert.equal(leaderboard[2].name, 'Alice'); // Level 2, 50 XP
    });

    it('honors leaderboard limit parameter', async () => {
      for (let i = 1; i <= 5; i++) {
        const p = await getOrCreatePlayer(GUILD_ID, `user_${i}`, 'warrior', `Hero ${i}`);
        p.level = i;
        await p.save();
      }

      const top2 = await getAdventureLeaderboard(GUILD_ID, 2);
      assert.equal(top2.length, 2);
      assert.equal(top2[0].level, 5);
      assert.equal(top2[1].level, 4);
    });
  });
});
