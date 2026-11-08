/**
 * src/models/index.ts
 * Re-exports all Mongoose models. Import from here to ensure models are registered.
 */

export { GuildConfig } from './GuildConfig';
export { BuildJob } from './BuildJob';
export { ModCase } from './ModCase';
export { Warning } from './Warning';
export { AuditLog } from './AuditLog';
export { RolePanel } from './RolePanel';
export { AutomodConfig } from './AutomodConfig';
export { TempAction } from './TempAction';
export { Job } from './Job';
export { UserLevel } from './UserLevel';
export { LevelConfig } from './LevelConfig';
export { EconomyUser } from './EconomyUser';
export { EconomyShopItem } from './EconomyShopItem';
export { UserProfileStyle } from './UserProfileStyle';
export { GuildSubscription } from './GuildSubscription';
export { TicketPanel } from './TicketPanel';
export { Ticket } from './Ticket';
export { UserBirthday } from './UserBirthday';
export { BirthdayConfig } from './BirthdayConfig';
export { StarboardConfig } from './StarboardConfig';
export { StarboardMessage } from './StarboardMessage';
export { AdventurePlayer } from './AdventurePlayer';
export { RadioSession } from './RadioSession';
export { SkinItem } from './SkinItem';
export { UserSkins } from './UserSkins';
export { Giveaway } from './Giveaway';
export { ModmailConfig } from './ModmailConfig';
export { ModmailThread } from './ModmailThread';
export { Bounty } from './Bounty';
export { Confession } from './Confession';
export { ConfessionConfig } from './ConfessionConfig';
export { CrushMatch } from './CrushMatch';
export { ServerPet } from './ServerPet';
export { UserTimezone } from './UserTimezone';

export type { IGuildConfig } from './GuildConfig';
export type { IBuildJob, BuildJobStatus, CreatedIds, BuildStep } from './BuildJob';
export type { IModCase, CaseAction } from './ModCase';
export type { IWarning } from './Warning';
export type { IAuditLog, AuditLogType } from './AuditLog';
export type { IRolePanel, RolePanelMode, RolePanelEntry } from './RolePanel';
export type { IAutomodConfig } from './AutomodConfig';
export type { ITempAction, TempActionType } from './TempAction';
export type { IJob, JobStatus } from './Job';
export type { IUserLevel } from './UserLevel';
export type { ILevelConfig, ILevelReward } from './LevelConfig';
export type { IEconomyUser, IEconomyInventoryItem } from './EconomyUser';
export type { IEconomyShopItem, ShopItemType } from './EconomyShopItem';
export type { IUserProfileStyle } from './UserProfileStyle';
export type {
  IGuildSubscription,
  SubscriptionTier,
  GuildFeatures,
  CustomBranding,
} from './GuildSubscription';
export type { ITicketPanel, TicketPanelCategory } from './TicketPanel';
export type { ITicket, TicketStatus } from './Ticket';
export type { IUserBirthday } from './UserBirthday';
export type { IBirthdayConfig } from './BirthdayConfig';
export type { IStarboardConfig } from './StarboardConfig';
export type { IStarboardMessage } from './StarboardMessage';
export type {
  IAdventurePlayer,
  AdventureClass,
  AdventureItem,
  AdventureItemType,
  AdventureDungeonState,
} from './AdventurePlayer';
export type {
  IRadioSession,
  RadioStationId,
  RadioStatus,
  IRadioTrack,
} from './RadioSession';
export type { ISkinItem, SkinRarity, SkinType, ISkinItemDocument } from './SkinItem';
export type { IUserSkins } from './UserSkins';
export type { IGiveaway, IGiveawayRequirements } from './Giveaway';
export type { IModmailConfig, ICannedResponse } from './ModmailConfig';
export type { IModmailThread, IModmailMessage, ModmailStatus } from './ModmailThread';
export type { IBounty, BountyCategory, BountyStatus } from './Bounty';
export type {
  IConfession,
  IConfessionVotes,
  ConfessionStatus,
} from './Confession';
export type { IConfessionConfig } from './ConfessionConfig';
export type { ICrushMatch } from './CrushMatch';
export type { IServerPet, PetSpecies, IPetStats } from './ServerPet';
export type { IUserTimezone, IActiveHours } from './UserTimezone';
