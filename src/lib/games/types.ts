/**
 * src/lib/games/types.ts
 * Shared game action row component types.
 */

export interface DiscordActionRowComponent {
  type: 1;
  components: Array<{
    type: 2;
    style: number;
    label: string;
    custom_id?: string;
    disabled?: boolean;
    emoji?: { name: string };
  }>;
}
