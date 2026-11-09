import '../test-env';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  DiscordMessage,
  SlashCommand,
  DiscordEmbed,
  DiscordButton,
  DiscordActionRow,
  DiscordSelectMenu,
  ProgressBar,
  formatAsciiProgressBar,
} from '../../src/components/discord-mock';

test('Discord Mock Component System', async (t) => {
  await t.test('renders DiscordMessage with bot avatar, APP badge, and content', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        DiscordMessage,
        {
          author: {
            name: 'AiCord',
            isBot: true,
            botBadgeText: 'APP',
            roleColor: '#00F0FF',
          },
          timestamp: 'Today at 12:45 PM',
          content: 'Here is your synthesized blueprint.',
        },
        React.createElement('div', { id: 'child-embed' }, 'Embed Placeholder')
      )
    );

    assert.ok(html.includes('AiCord'));
    assert.ok(html.includes('APP'));
    assert.ok(html.includes('Today at 12:45 PM'));
    assert.ok(html.includes('Here is your synthesized blueprint.'));
    assert.ok(html.includes('child-embed'));
  });

  await t.test('renders SlashCommand with user info and parameter chips', () => {
    const html = renderToStaticMarkup(
      React.createElement(SlashCommand, {
        command: '/build',
        user: { name: 'alex' },
        params: [
          { name: 'prompt', value: 'Esports tournament guild' },
        ],
      })
    );

    assert.ok(html.includes('alex'));
    assert.ok(html.includes('/build'));
    assert.ok(html.includes('prompt:'));
    assert.ok(html.includes('Esports tournament guild'));
  });

  await t.test('renders DiscordEmbed with left border color, title, and grid fields', () => {
    const html = renderToStaticMarkup(
      React.createElement(DiscordEmbed, {
        color: '#00F0FF',
        title: 'Gaming & Esports Hub',
        description: 'Complete esports architecture synthesized.',
        fields: [
          { name: 'Categories', value: '4 Categories', inline: true },
          { name: 'Security Score', value: '99/100 SECURE', inline: true },
          { name: 'Full Width Field', value: 'Enclosed channels', inline: false },
        ],
        footer: { text: 'AiCord Guild Synthesizer' },
        timestamp: '12:45 PM',
      })
    );

    assert.ok(html.includes('Gaming &amp; Esports Hub') || html.includes('Gaming & Esports Hub'));
    assert.ok(html.includes('00F0FF') || html.includes('#00F0FF') || html.includes('border-left-color'));
    assert.ok(html.includes('Categories'));
    assert.ok(html.includes('99/100 SECURE'));
    assert.ok(html.includes('AiCord Guild Synthesizer'));
  });

  await t.test('renders DiscordButton with primary blurple, success, and danger states', () => {
    const primaryHtml = renderToStaticMarkup(
      React.createElement(
        DiscordButton,
        { variant: 'primary' },
        'Confirm Deployment'
      )
    );
    assert.ok(primaryHtml.includes('#5865F2'));
    assert.ok(primaryHtml.includes('Confirm Deployment'));

    const dangerHtml = renderToStaticMarkup(
      React.createElement(
        DiscordButton,
        { variant: 'danger', pulsing: true },
        'Undo Build'
      )
    );
    assert.ok(dangerHtml.includes('#DA373C'));
    assert.ok(dangerHtml.includes('animate-pulse'));
    assert.ok(dangerHtml.includes('Undo Build'));

    const rowHtml = renderToStaticMarkup(
      React.createElement(
        DiscordActionRow,
        null,
        React.createElement(DiscordButton, { variant: 'secondary' }, 'Cancel')
      )
    );
    assert.ok(rowHtml.includes('Cancel'));
  });

  await t.test('renders DiscordSelectMenu with placeholder and dropdown options', () => {
    const html = renderToStaticMarkup(
      React.createElement(DiscordSelectMenu, {
        placeholder: 'Select blueprint...',
        options: [
          { label: 'Gaming & Esports', value: 'gaming-esports', emoji: '⚔️' },
          { label: 'Developer Community', value: 'developer-community', emoji: '💻' },
        ],
      })
    );

    assert.ok(html.includes('Select blueprint...'));
  });

  await t.test('ProgressBar renders ASCII bar and percentage string', () => {
    const ascii = formatAsciiProgressBar(70, 'retro', 10);
    assert.equal(ascii, '[▓▓▓▓▓▓▓░░░] 70%');

    const html = renderToStaticMarkup(
      React.createElement(ProgressBar, {
        percent: 85,
        style: 'pipes',
        label: 'Enterprise Services',
      })
    );

    assert.ok(html.includes('85%'));
    assert.ok(html.includes('Enterprise Services'));
    assert.ok(html.includes('▰'));
  });
});
