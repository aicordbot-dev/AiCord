/**
 * src/config/copy.ts
 * Master marketing and promotional copy catalog.
 * Follows section 8 of the specification.
 */

export interface SectionCopy {
  badge: string;
  title: string;
  description: string;
}

export interface CopyConfig {
  hero: {
    badge: string;
    h1: string;
    h1Prefix: string;
    h1Highlight: string;
    sub: string;
    ctaPrimary: string;
    ctaSecondary: string;
    sampleCommand: {
      command: string;
      prompt: string;
    };
  };
  constellation: {
    badge: string;
    title: string;
    description: string;
    statsHighlight: string;
  };
  sections: {
    sandbox: SectionCopy;
    themes: SectionCopy;
    features: SectionCopy;
    pricing: SectionCopy;
    faq: SectionCopy;
  };
  pricing: {
    headline: string;
    subheadline: string;
    monthlyToggle: string;
    yearlyToggle: string;
    yearlySavings: string;
    guarantee: string;
  };
  finalCta: {
    badge: string;
    title: string;
    description: string;
    button: string;
    secondaryButton: string;
    disclaimer: string;
  };
  footer: {
    tagline: string;
    copyright: string;
    counterNotice: string;
  };
}

export const copyConfig: CopyConfig = {
  hero: {
    badge: 'GOOGLE GEMINI 2.5 + THREE.JS WEBGL',
    h1: 'Your Discord server, built by AI in minutes.',
    h1Prefix: 'Your Discord server,',
    h1Highlight: 'built by AI in minutes.',
    sub: 'Synthesize full category layouts, permission overrides, and automod in seconds from a single prompt. Style interactive profiles with 6 universal themes, and supercharge your guild with 28+ zero-bloat enterprise services.',
    ctaPrimary: 'Add to Discord',
    ctaSecondary: 'Launch 3D Sandbox',
    sampleCommand: {
      command: '/build',
      prompt: 'prompt:"Esports tournament guild with scrim voice rooms and verified rank gates"',
    },
  },
  constellation: {
    badge: 'DYNAMIC CONSTELLATION MESH',
    title: 'Interactive Guild Topology in 3D WebGL',
    description:
      'Explore your server as an interconnected constellation of channels, roles, and permission gates floating in holographic space. Inspect latency, node relationships, and live event throughput.',
    statsHighlight: 'Real-time WebGL node projection with 60 FPS spatial physics.',
  },
  sections: {
    sandbox: {
      badge: 'INTERACTIVE ARCHITECTURE SANDBOX',
      title: 'Synthesize Server Blueprints Instantly',
      description:
        'Test the natural language builder before touching your server. Preview generated channels, roles, and permission overrides with full visual hierarchy validation.',
    },
    themes: {
      badge: 'UNIVERSAL CUSTOM SCREENS',
      title: '6 Signature Aesthetic Themes',
      description:
        'Transform plain text responses into branded experiences. Choose from 6 curated color schemes and 4 ASCII progress bar styles across rank cards, balance embeds, and leaderboards.',
    },
    features: {
      badge: 'ENTERPRISE SERVICES CATALOG',
      title: '28+ Production-Grade Services Built-in',
      description:
        'No more 10 different bots cluttering your server. One unified architecture covering AI architecture, moderation, polyglot code execution, confessions, tickets, and economy.',
    },
    pricing: {
      badge: 'TRANSPARENT VALUE MATRIX',
      title: 'Choose Your Guild Architecture Tier',
      description:
        'Start 100% free with core building tools. Upgrade as your community expands with unlimited builds, custom branding, and permanent sovereign licenses.',
    },
    faq: {
      badge: 'ARCHITECTURAL SPECIFICATION',
      title: 'Frequently Answered Questions',
      description:
        'Engineered for high-volume Discord interactions with zero state corruption, pure Ed25519 webhook security, and zero hosting costs.',
    },
  },
  pricing: {
    headline: 'Scale Your Discord Architecture Confidently',
    subheadline:
      'Every plan includes our core serverless interaction engine, cryptographic verification, and instant deployment.',
    monthlyToggle: 'Monthly Billing',
    yearlyToggle: 'Yearly Billing',
    yearlySavings: 'Save 20%',
    guarantee: 'All plans include 100% money-back guarantee within 14 days.',
  },
  finalCta: {
    badge: 'INSTANT ONBOARDING',
    title: 'Ready to Architect Your Dream Discord Community?',
    description:
      'Deploy AiCord to your server in 15 seconds. Experience lightning-fast AI generation, custom themes, and complete server management today.',
    button: 'Deploy Bot to Discord',
    secondaryButton: 'Explore Documentation',
    disclaimer: 'Free tier requires no credit card. Setup takes under 30 seconds.',
  },
  footer: {
    tagline: 'The 3D AI Discord Server Architect & Universal Community Engine.',
    copyright: '© 2026 AiCord Platform. Open Architecture. All rights reserved.',
    counterNotice: 'All operational statistics and benchmarks shown are verified sample simulation metrics.',
  },
};
