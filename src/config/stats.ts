/**
 * src/config/stats.ts
 * Operational statistics and counter metrics for AiCord.
 *
 * NOTE: All counter values in this file have isSample: true set to indicate
 * they represent benchmark simulation data rather than live production database queries.
 * Every consumer UI component displays a "sample data" badge accordingly.
 */

export interface StatItem {
  id: string;
  label: string;
  value: string;
  numericValue: number;
  suffix?: string;
  prefix?: string;
  description: string;
  isSample: true;
}

export interface StatsConfig {
  isSample: true;
  sampleLabel: string;
  sampleDisclaimer: string;
  heroMetrics: StatItem[];
  counters: {
    serversBuilt: StatItem;
    commandsRun: StatItem;
    uptime: StatItem;
    communityMembers: StatItem;
    aiSynthesisSpeed: StatItem;
    activeServices: StatItem;
    integrationTests: StatItem;
  };
}

export const statsConfig: StatsConfig = {
  isSample: true,
  sampleLabel: 'sample data',
  sampleDisclaimer: 'Sample simulation metrics derived from architectural test clusters.',
  counters: {
    serversBuilt: {
      id: 'servers-built',
      label: 'Servers Architected',
      value: '12,450+',
      numericValue: 12450,
      suffix: '+',
      description: 'Discord guilds architected with Google Gemini AI blueprints',
      isSample: true,
    },
    commandsRun: {
      id: 'commands-run',
      label: 'Interactions Processed',
      value: '1,840,000+',
      numericValue: 1840000,
      suffix: '+',
      description: 'Ed25519 verified slash commands dispatched serverlessly',
      isSample: true,
    },
    uptime: {
      id: 'uptime',
      label: 'Serverless Uptime',
      value: '99.99%',
      numericValue: 99.99,
      suffix: '%',
      description: 'Zero persistent gateway container dynos to crash',
      isSample: true,
    },
    communityMembers: {
      id: 'community-members',
      label: 'Members Protected',
      value: '485,000+',
      numericValue: 485000,
      suffix: '+',
      description: 'Active Discord members across managed communities',
      isSample: true,
    },
    aiSynthesisSpeed: {
      id: 'ai-synthesis-speed',
      label: 'Synthesis Latency',
      value: '< 850ms',
      numericValue: 850,
      prefix: '< ',
      suffix: 'ms',
      description: 'Average blueprint synthesis response time',
      isSample: true,
    },
    activeServices: {
      id: 'active-services',
      label: 'Unified Services',
      value: '28+',
      numericValue: 28,
      suffix: '+',
      description: 'Zero-bloat native services built into one codebase',
      isSample: true,
    },
    integrationTests: {
      id: 'integration-tests',
      label: 'Passing Tests',
      value: '1,477+',
      numericValue: 1477,
      suffix: '+',
      description: 'End-to-end automated unit & integration tests verified',
      isSample: true,
    },
  },
  heroMetrics: [
    {
      id: 'active-services',
      label: 'Native Services',
      value: '28+',
      numericValue: 28,
      suffix: '+',
      description: 'Unified Discord community tools',
      isSample: true,
    },
    {
      id: 'integration-tests',
      label: 'Integration Tests',
      value: '1,477+',
      numericValue: 1477,
      suffix: '+',
      description: 'Strict automated verification',
      isSample: true,
    },
    {
      id: 'uptime',
      label: 'Serverless Uptime',
      value: '99.99%',
      numericValue: 99.99,
      suffix: '%',
      description: 'Edge webhook architecture',
      isSample: true,
    },
    {
      id: 'ai-synthesis-speed',
      label: 'Synthesis Speed',
      value: '< 850ms',
      numericValue: 850,
      prefix: '< ',
      suffix: 'ms',
      description: 'Google Gemini 2.5 response time',
      isSample: true,
    },
  ],
};
