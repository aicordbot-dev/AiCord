/**
 * src/lib/games/trivia.ts
 * Interactive Trivia Game Engine for AiCord.
 *
 * Features:
 * - 55 high-quality trivia questions across 5 categories: tech, gaming, anime, science, general.
 * - Shuffled answer choices with deterministic or randomized placement.
 * - Discord embed builder with category styling, countdown hint, and answer explanations.
 * - Interactive ActionRow buttons ([A], [B], [C], [D]) with status highlights.
 */

import type { DiscordEmbed } from '@/lib/discord/embeds';
import { Colors } from '@/lib/discord/embeds';
import type { DiscordActionRowComponent } from './types';

export type TriviaCategory = 'tech' | 'gaming' | 'anime' | 'science' | 'general';

export interface TriviaQuestion {
  id: string;
  category: TriviaCategory;
  question: string;
  correctAnswer: string;
  incorrectAnswers: [string, string, string];
  explanation: string;
}

export interface ShuffledTrivia {
  question: TriviaQuestion;
  choices: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export const TRIVIA_CATEGORIES: Array<{ id: TriviaCategory; name: string; emoji: string }> = [
  { id: 'tech', name: 'Technology & Code', emoji: '💻' },
  { id: 'gaming', name: 'Video Games', emoji: '🎮' },
  { id: 'anime', name: 'Anime & Manga', emoji: '🌸' },
  { id: 'science', name: 'Science & Nature', emoji: '🔬' },
  { id: 'general', name: 'General Knowledge', emoji: '🌍' },
];

export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  // ─── TECH (11) ─────────────────────────────────────────────────────────────
  {
    id: 'tech_01',
    category: 'tech',
    question: 'Who created the Linux operating system kernel in 1991?',
    correctAnswer: 'Linus Torvalds',
    incorrectAnswers: ['Richard Stallman', 'Steve Wozniak', 'Ken Thompson'],
    explanation: 'Linus Torvalds created the Linux kernel while studying computer science at the University of Helsinki.',
  },
  {
    id: 'tech_02',
    category: 'tech',
    question: 'Which HTTP status code humorously states "I\'m a teapot"?',
    correctAnswer: '418',
    incorrectAnswers: ['404', '502', '451'],
    explanation: 'HTTP 418 I\'m a teapot was defined in RFC 2324 as an April Fools\' joke in 1998.',
  },
  {
    id: 'tech_03',
    category: 'tech',
    question: 'Brendan Eich designed JavaScript in 1995 while working at which company?',
    correctAnswer: 'Netscape',
    incorrectAnswers: ['Sun Microsystems', 'Microsoft', 'Apple'],
    explanation: 'Eich developed JavaScript (originally Mocha, then LiveScript) in just 10 days at Netscape Communications.',
  },
  {
    id: 'tech_04',
    category: 'tech',
    question: 'What distributed version control system was designed by Linus Torvalds in 2005?',
    correctAnswer: 'Git',
    incorrectAnswers: ['Subversion', 'Mercurial', 'Perforce'],
    explanation: 'Linus Torvalds created Git to support the distributed development of the Linux kernel.',
  },
  {
    id: 'tech_05',
    category: 'tech',
    question: 'The famous first real computer bug recorded in 1947 by Grace Hopper\'s team was what creature?',
    correctAnswer: 'A moth',
    incorrectAnswers: ['A beetle', 'A spider', 'A cricket'],
    explanation: 'A moth was found trapped in a relay of the Harvard Mark II computer and taped into the logbook.',
  },
  {
    id: 'tech_06',
    category: 'tech',
    question: 'The Python programming language was named in honor of which comedy group?',
    correctAnswer: 'Monty Python',
    incorrectAnswers: ['The Kids in the Hall', 'Fawlty Towers', 'The Marx Brothers'],
    explanation: 'Guido van Rossum chose the name Python because he was a big fan of the British comedy series "Monty Python\'s Flying Circus".',
  },
  {
    id: 'tech_07',
    category: 'tech',
    question: 'Which IPv4 address is universally reserved for localhost (loopback)?',
    correctAnswer: '127.0.0.1',
    incorrectAnswers: ['192.168.1.1', '10.0.0.1', '255.255.255.255'],
    explanation: '127.0.0.1 is the standard loopback IP address representing the local device.',
  },
  {
    id: 'tech_08',
    category: 'tech',
    question: 'Which company created and maintains the TypeScript programming language?',
    correctAnswer: 'Microsoft',
    incorrectAnswers: ['Google', 'Meta', 'Amazon'],
    explanation: 'Microsoft introduced TypeScript in 2012, architected by Anders Hejlsberg (lead architect of C#).',
  },
  {
    id: 'tech_09',
    category: 'tech',
    question: 'Which default network port is standard for secure HTTPS traffic?',
    correctAnswer: '443',
    incorrectAnswers: ['80', '8080', '22'],
    explanation: 'Port 80 is used for unencrypted HTTP, while Port 443 is used for TLS/HTTPS traffic.',
  },
  {
    id: 'tech_10',
    category: 'tech',
    question: 'What does the acronym "RAM" stand for in computer hardware?',
    correctAnswer: 'Random Access Memory',
    incorrectAnswers: ['Rapid Action Module', 'Read Access Memory', 'Rotational Array Matrix'],
    explanation: 'RAM stands for Random Access Memory, high-speed temporary storage used by the CPU.',
  },
  {
    id: 'tech_11',
    category: 'tech',
    question: 'In modern CSS, which layout module is designed for one-dimensional layouts (row or column)?',
    correctAnswer: 'Flexbox',
    incorrectAnswers: ['CSS Grid', 'Float Model', 'Absolute Canvas'],
    explanation: 'CSS Flexbox is tailored for 1D layouts along an axis, while CSS Grid handles 2D grid systems.',
  },

  // ─── GAMING (11) ───────────────────────────────────────────────────────────
  {
    id: 'gaming_01',
    category: 'gaming',
    question: 'What was Nintendo mascot Mario originally named in the 1981 arcade hit Donkey Kong?',
    correctAnswer: 'Jumpman',
    incorrectAnswers: ['Plumber Pete', 'Red Cap', 'Luigi'],
    explanation: 'Mario was originally introduced as "Jumpman" before being named Mario in homage to landlord Mario Segale.',
  },
  {
    id: 'gaming_02',
    category: 'gaming',
    question: 'Which game development studio originally created Minecraft?',
    correctAnswer: 'Mojang Studios',
    incorrectAnswers: ['Valve Corporation', 'Epic Games', 'Bethesda Softworks'],
    explanation: 'Minecraft was created by Markus "Notch" Persson and developed by Mojang Studios before acquisition by Microsoft.',
  },
  {
    id: 'gaming_03',
    category: 'gaming',
    question: 'What is the legendary sacred blade wielded by Link throughout The Legend of Zelda called?',
    correctAnswer: 'Master Sword',
    incorrectAnswers: ['Buster Sword', 'Falchion', 'Soul Edge'],
    explanation: 'The Master Sword, also known as the Blade of Evil\'s Bane, is Link\'s signature weapon in The Legend of Zelda.',
  },
  {
    id: 'gaming_04',
    category: 'gaming',
    question: 'In the Halo universe, what is the name of Master Chief\'s companion AI?',
    correctAnswer: 'Cortana',
    incorrectAnswers: ['GLaDOS', 'EDI', 'SHODAN'],
    explanation: 'Cortana is the United Nations Space Command (UNSC) artificial intelligence construct paired with Spartan-117.',
  },
  {
    id: 'gaming_05',
    category: 'gaming',
    question: 'In FromSoftware\'s Dark Souls series, resting at which object refills your Estus Flasks and revives enemies?',
    correctAnswer: 'Bonfire',
    incorrectAnswers: ['Shrine', 'Campfire', 'Fountain'],
    explanation: 'Bonfires serve as checkpoints, respawn locations, and Estus replenishment points across Lordran.',
  },
  {
    id: 'gaming_06',
    category: 'gaming',
    question: 'What is the full name of the silver-haired witcher protagonist in CD Projekt Red\'s RPG franchise?',
    correctAnswer: 'Geralt of Rivia',
    incorrectAnswers: ['Vesemir of Kaer Morhen', 'Eskel of Nilfgaard', 'Letho of Gulet'],
    explanation: 'Geralt of Rivia (the White Wolf) is the mutant monster slayer protagonist of Andrzej Sapkowski\'s books and CDPR\'s games.',
  },
  {
    id: 'gaming_07',
    category: 'gaming',
    question: 'The iconic gaming voice line "Finish Him!" originates from which fighting franchise?',
    correctAnswer: 'Mortal Kombat',
    incorrectAnswers: ['Street Fighter', 'Tekken', 'Killer Instinct'],
    explanation: 'Mortal Kombat introduced "Finish Him!" to signal the opportunity to execute a dramatic Fatality move.',
  },
  {
    id: 'gaming_08',
    category: 'gaming',
    question: 'Released in 1972, what is widely considered the world\'s first commercial home video game console?',
    correctAnswer: 'Magnavox Odyssey',
    incorrectAnswers: ['Atari 2600', 'ColecoVision', 'Nintendo Famicom'],
    explanation: 'Designed by Ralph Baer, the Magnavox Odyssey connected to a TV set and used plastic screen overlays.',
  },
  {
    id: 'gaming_09',
    category: 'gaming',
    question: 'Valve launched which PC digital distribution platform in September 2003?',
    correctAnswer: 'Steam',
    incorrectAnswers: ['Origin', 'GOG Galaxy', 'Battle.net'],
    explanation: 'Valve launched Steam in 2003 initially to provide automated patches for Counter-Strike and Half-Life.',
  },
  {
    id: 'gaming_10',
    category: 'gaming',
    question: 'The Elder Scrolls V: Skyrim famously launched worldwide on what memorable date?',
    correctAnswer: '11/11/11',
    incorrectAnswers: ['10/10/10', '12/12/12', '07/07/07'],
    explanation: 'Skyrim launched on November 11, 2011 (11/11/11) on PC, PlayStation 3, and Xbox 360.',
  },
  {
    id: 'gaming_11',
    category: 'gaming',
    question: 'Which elemental type does Pokémon franchise mascot Pikachu belong to?',
    correctAnswer: 'Electric',
    incorrectAnswers: ['Normal', 'Fire', 'Steel'],
    explanation: 'Pikachu is the Electric Mouse Pokémon, number 0025 in the National Pokédex.',
  },

  // ─── ANIME (11) ────────────────────────────────────────────────────────────
  {
    id: 'anime_01',
    category: 'anime',
    question: 'What is the true name of the Nine-Tails beast sealed inside Naruto Uzumaki?',
    correctAnswer: 'Kurama',
    incorrectAnswers: ['Shukaku', 'Gyuki', 'Matatabi'],
    explanation: 'Kurama is the Nine-Tails (Kyūbi) beast who eventually forms an unbreakable bond with Naruto.',
  },
  {
    id: 'anime_02',
    category: 'anime',
    question: 'In Death Note, which human food is the Shinigami Ryuk obsessed with eating?',
    correctAnswer: 'Apples',
    incorrectAnswers: ['Strawberries', 'Peaches', 'Cherries'],
    explanation: 'Ryuk experiences withdrawal symptoms like twisting his body into a pretzel if deprived of juicy human apples.',
  },
  {
    id: 'anime_03',
    category: 'anime',
    question: 'What is the official name of Monkey D. Luffy\'s crew in One Piece?',
    correctAnswer: 'Straw Hat Pirates',
    incorrectAnswers: ['Red Hair Pirates', 'Heart Pirates', 'Blackbeard Pirates'],
    explanation: 'Luffy captains the Straw Hat Pirates, nicknamed after the signature straw hat passed down by Red-Haired Shanks.',
  },
  {
    id: 'anime_04',
    category: 'anime',
    question: 'What is the family surname of Attack on Titan protagonist Eren?',
    correctAnswer: 'Yeager',
    incorrectAnswers: ['Ackerman', 'Arlert', 'Reiss'],
    explanation: 'Eren Yeager (Jäger) vows to eradicate all Titans after the fall of Wall Maria.',
  },
  {
    id: 'anime_05',
    category: 'anime',
    question: 'In Dragon Ball, what was Son Goku\'s native Saiyan birth name on Planet Vegeta?',
    correctAnswer: 'Kakarot',
    incorrectAnswers: ['Raditz', 'Bardock', 'Broly'],
    explanation: 'Son Goku was named Kakarot before being sent to Earth as an infant, named after the root vegetable carrot.',
  },
  {
    id: 'anime_06',
    category: 'anime',
    question: 'What state alchemist title is officially bestowed upon Edward Elric in Fullmetal Alchemist?',
    correctAnswer: 'Fullmetal Alchemist',
    incorrectAnswers: ['Flame Alchemist', 'Iron Blood Alchemist', 'Crimson Alchemist'],
    explanation: 'King Bradley bestows the military title "Fullmetal Alchemist" on Edward due to his automail right arm and left leg.',
  },
  {
    id: 'anime_07',
    category: 'anime',
    question: 'Which legendary director founded Studio Ghibli and directed the Oscar-winning film Spirited Away?',
    correctAnswer: 'Hayao Miyazaki',
    incorrectAnswers: ['Isao Takahata', 'Makoto Shinkai', 'Satoshi Kon'],
    explanation: 'Hayao Miyazaki co-founded Studio Ghibli in 1985 and won the Academy Award for Best Animated Feature for Spirited Away.',
  },
  {
    id: 'anime_08',
    category: 'anime',
    question: 'In Demon Slayer, what is the initial breathing style Tanjiro learns from master Sakonji Urokodaki?',
    correctAnswer: 'Water Breathing',
    incorrectAnswers: ['Thunder Breathing', 'Flame Breathing', 'Beast Breathing'],
    explanation: 'Tanjiro masters Water Breathing (Mizu no Kokyū) on Mt. Sagiri before discovering his Hinokami Kagura heritage.',
  },
  {
    id: 'anime_09',
    category: 'anime',
    question: 'In Neon Genesis Evangelion, which purple Evangelion unit is piloted by Shinji Ikari?',
    correctAnswer: 'Unit-01',
    incorrectAnswers: ['Unit-00', 'Unit-02', 'Unit-06'],
    explanation: 'Shinji Ikari pilots the Test Type EVA Unit-01, which houses the soul of his mother Yui Ikari.',
  },
  {
    id: 'anime_10',
    category: 'anime',
    question: 'In Hunter x Hunter, what childhood tool does Gon Freecss utilize in combat during the Hunter Exam?',
    correctAnswer: 'A fishing rod',
    incorrectAnswers: ['A wooden katana', 'A sling shot', 'Metal yo-yos'],
    explanation: 'Gon utilizes his father Ging\'s heavy fishing rod with remarkable precision to snatch tags and grapple opponents.',
  },
  {
    id: 'anime_11',
    category: 'anime',
    question: 'In Jujutsu Kaisen, what is the name of Satoru Gojo\'s Domain Expansion?',
    correctAnswer: 'Unlimited Void',
    incorrectAnswers: ['Malevolent Shrine', 'Chimera Shadow Garden', 'Coffin of the Iron Mountain'],
    explanation: 'Unlimited Void (Muryōkūsho) floods targets with infinite sensory stimulation, rendering them completely catatonic.',
  },

  // ─── SCIENCE (11) ──────────────────────────────────────────────────────────
  {
    id: 'science_01',
    category: 'science',
    question: 'Which Latin letter symbolizes the universal speed of light in vacuum in physics formulas?',
    correctAnswer: 'c',
    incorrectAnswers: ['v', 'l', 's'],
    explanation: 'The speed of light is denoted by "c", standing for celeritas (Latin for "swiftness").',
  },
  {
    id: 'science_02',
    category: 'science',
    question: 'What is the chemical formula for common table salt?',
    correctAnswer: 'NaCl',
    incorrectAnswers: ['KCl', 'CaCl2', 'NaHCO3'],
    explanation: 'Table salt consists of an ionic compound composed of equal parts Sodium (Na) and Chlorine (Cl).',
  },
  {
    id: 'science_03',
    category: 'science',
    question: 'Excluding the Sun, which individual star is situated closest to our solar system at ~4.24 light years?',
    correctAnswer: 'Proxima Centauri',
    incorrectAnswers: ['Sirius A', 'Betelgeuse', 'Barnard\'s Star'],
    explanation: 'Proxima Centauri is a red dwarf star in the Alpha Centauri system situated approximately 4.246 light years away.',
  },
  {
    id: 'science_04',
    category: 'science',
    question: 'Which cellular organelle is universally known as the "powerhouse of the cell" for producing ATP?',
    correctAnswer: 'Mitochondria',
    incorrectAnswers: ['Ribosome', 'Golgi Apparatus', 'Endoplasmic Reticulum'],
    explanation: 'Mitochondria generate the majority of a cell\'s adenosine triphosphate (ATP) through cellular respiration.',
  },
  {
    id: 'science_05',
    category: 'science',
    question: 'What is the atomic number of Carbon on the periodic table of elements?',
    correctAnswer: '6',
    incorrectAnswers: ['12', '8', '14'],
    explanation: 'Carbon has 6 protons in its atomic nucleus, giving it atomic number 6.',
  },
  {
    id: 'science_06',
    category: 'science',
    question: 'Which planet in our solar system is nicknamed the "Red Planet" due to iron oxide on its surface?',
    correctAnswer: 'Mars',
    incorrectAnswers: ['Venus', 'Mercury', 'Jupiter'],
    explanation: 'Mars appears reddish-orange because ferric oxide (rust) covers much of its dusty surface.',
  },
  {
    id: 'science_07',
    category: 'science',
    question: 'Which gas comprises the largest percentage (~78%) of Earth\'s clean atmosphere by volume?',
    correctAnswer: 'Nitrogen',
    incorrectAnswers: ['Oxygen', 'Carbon Dioxide', 'Argon'],
    explanation: 'Earth\'s atmosphere is roughly 78% Nitrogen, 21% Oxygen, 0.93% Argon, and trace other gases.',
  },
  {
    id: 'science_08',
    category: 'science',
    question: 'Newton\'s First Law of Motion states that an object at rest remains at rest unless acted upon. What is this property called?',
    correctAnswer: 'Inertia',
    incorrectAnswers: ['Momentum', 'Acceleration', 'Friction'],
    explanation: 'Inertia is the natural resistance of any physical object to any change in its velocity or state of motion.',
  },
  {
    id: 'science_09',
    category: 'science',
    question: 'At which specific temperature do the Celsius and Fahrenheit temperature scales read the identical numerical value?',
    correctAnswer: '-40',
    incorrectAnswers: ['0', '-32', '100'],
    explanation: 'Because -40°C × (9/5) + 32 = -72 + 32 = -40°F, -40 is the exact point where both scales intersect.',
  },
  {
    id: 'science_10',
    category: 'science',
    question: 'James Watson and which British biophysicist published the discovery of DNA\'s double helix structure in 1953?',
    correctAnswer: 'Francis Crick',
    incorrectAnswers: ['Rosalind Franklin', 'Linus Pauling', 'Maurice Wilkins'],
    explanation: 'Watson and Crick formulated the double-helix DNA model at Cambridge, drawing key insights from Franklin\'s X-ray crystallography.',
  },
  {
    id: 'science_11',
    category: 'science',
    question: 'Which human blood type is considered the universal red blood cell donor in emergency medicine?',
    correctAnswer: 'O Negative',
    incorrectAnswers: ['AB Positive', 'O Positive', 'A Negative'],
    explanation: 'O- red blood cells lack A, B, and Rh antigens, enabling safe transfusion to almost any recipient in emergencies.',
  },

  // ─── GENERAL (11) ──────────────────────────────────────────────────────────
  {
    id: 'general_01',
    category: 'general',
    question: 'What is the federal capital city of the Commonwealth of Australia?',
    correctAnswer: 'Canberra',
    incorrectAnswers: ['Sydney', 'Melbourne', 'Brisbane'],
    explanation: 'Canberra was chosen as the compromise capital of Australia in 1908 between rivals Sydney and Melbourne.',
  },
  {
    id: 'general_02',
    category: 'general',
    question: 'Which is the largest and deepest of the world\'s five oceanic divisions by total surface area?',
    correctAnswer: 'Pacific Ocean',
    incorrectAnswers: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'],
    explanation: 'The Pacific Ocean covers over 165 million km² (more than 30% of the Earth\'s total surface area).',
  },
  {
    id: 'general_03',
    category: 'general',
    question: 'What is the official currency unit of Japan?',
    correctAnswer: 'Yen',
    incorrectAnswers: ['Won', 'Yuan', 'Baht'],
    explanation: 'The Japanese Yen (¥ / 円) was formally established under the New Currency Act of 1871.',
  },
  {
    id: 'general_04',
    category: 'general',
    question: 'Who authored the classic 1949 dystopian political fiction novel "Nineteen Eighty-Four"?',
    correctAnswer: 'George Orwell',
    incorrectAnswers: ['Aldous Huxley', 'Ray Bradbury', 'Franz Kafka'],
    explanation: 'Eric Arthur Blair, writing under the pen name George Orwell, wrote 1984 as a warning against totalitarian regimes.',
  },
  {
    id: 'general_05',
    category: 'general',
    question: 'Which three colors form the primary additive color model used in digital displays and screens?',
    correctAnswer: 'Red, Green, Blue',
    incorrectAnswers: ['Red, Yellow, Blue', 'Cyan, Magenta, Yellow', 'Green, Orange, Violet'],
    explanation: 'The RGB additive color model combines Red, Green, and Blue light beams to produce the entire spectrum on digital displays.',
  },
  {
    id: 'general_06',
    category: 'general',
    question: 'What is the world\'s tallest mountain peak measured by elevation above sea level?',
    correctAnswer: 'Mount Everest',
    incorrectAnswers: ['K2', 'Kangchenjunga', 'Kilimanjaro'],
    explanation: 'Mount Everest (Sagarmatha / Chomolungma) stands at 8,848.86 meters (29,031.7 ft) on the crest of the Himalayas.',
  },
  {
    id: 'general_07',
    category: 'general',
    question: 'How many total keys (black and white combined) are on a standard contemporary acoustic piano keyboard?',
    correctAnswer: '88',
    incorrectAnswers: ['76', '92', '84'],
    explanation: 'A standard piano has 88 keys: 52 natural white keys and 36 accidental black keys (7 octaves plus a minor third).',
  },
  {
    id: 'general_08',
    category: 'general',
    question: 'The iconic Statue of Liberty in New York Harbor was a diplomatic gift from the people of which nation?',
    correctAnswer: 'France',
    incorrectAnswers: ['United Kingdom', 'Spain', 'Italy'],
    explanation: 'Designed by Frédéric-Auguste Bartholdi with Eiffel\'s framework, the statue was gifted by France in 1886.',
  },
  {
    id: 'general_09',
    category: 'general',
    question: 'Which African river is traditionally recognized as the longest river in the world?',
    correctAnswer: 'Nile River',
    incorrectAnswers: ['Amazon River', 'Congo River', 'Yangtze River'],
    explanation: 'Flowing north for roughly 6,650 km (4,132 miles) through 11 countries, the Nile is historically recognized as the world\'s longest river.',
  },
  {
    id: 'general_10',
    category: 'general',
    question: 'Which Italian Renaissance polymath painted the famous portrait "Mona Lisa" in the early 16th century?',
    correctAnswer: 'Leonardo da Vinci',
    incorrectAnswers: ['Michelangelo', 'Raphael', 'Sandro Botticelli'],
    explanation: 'Leonardo da Vinci created the Mona Lisa (La Gioconda), now on permanent display at the Musée du Louvre in Paris.',
  },
  {
    id: 'general_11',
    category: 'general',
    question: 'On the Mohs scale of mineral hardness, which naturally occurring mineral is ranked at the maximum score of 10?',
    correctAnswer: 'Diamond',
    incorrectAnswers: ['Corundum', 'Topaz', 'Quartz'],
    explanation: 'Diamond is the hardest naturally occurring substance known on the Mohs scale, scoring a solid 10.',
  },
];

/**
 * Fisher-Yates shuffle helper with optional deterministic RNG function.
 */
function shuffleArray<T>(items: T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Retrieve a trivia question, optionally filtered by category, with shuffled choices.
 */
export function getTriviaQuestion(
  category?: string,
  rng: () => number = Math.random,
): ShuffledTrivia {
  let pool = TRIVIA_QUESTIONS;

  if (category) {
    const normalized = category.trim().toLowerCase();
    const matched = TRIVIA_QUESTIONS.filter(
      (q) => q.category.toLowerCase() === normalized,
    );
    if (matched.length > 0) {
      pool = matched;
    }
  }

  const selectedIndex = Math.floor(rng() * pool.length);
  const question = pool[selectedIndex];

  // Combine correct and incorrect answers and shuffle
  const rawChoices = [question.correctAnswer, ...question.incorrectAnswers];
  const shuffledChoices = shuffleArray(rawChoices, rng) as [string, string, string, string];
  const correctIndex = shuffledChoices.indexOf(question.correctAnswer);

  return {
    question,
    choices: shuffledChoices,
    correctIndex,
    explanation: question.explanation,
  };
}

const LETTERS = ['A', 'B', 'C', 'D'] as const;

export interface BuildTriviaEmbedOptions {
  question: TriviaQuestion;
  choices: [string, string, string, string];
  answeredIndex?: number;
  correctIndex?: number;
  userTag?: string;
}

/**
 * Build a Discord embed for the trivia question and state.
 */
export function buildTriviaEmbed(options: BuildTriviaEmbedOptions): DiscordEmbed {
  const { question, choices, answeredIndex, correctIndex, userTag } = options;
  const catMeta = TRIVIA_CATEGORIES.find((c) => c.id === question.category);
  const catTitle = catMeta ? `${catMeta.emoji} ${catMeta.name}` : question.category.toUpperCase();

  const isAnswered = answeredIndex !== undefined;
  const isCorrect = isAnswered && correctIndex !== undefined && answeredIndex === correctIndex;

  let title = `🧠 Trivia Challenge — ${catTitle}`;
  let color: number = Colors.PRIMARY;

  if (isAnswered) {
    if (isCorrect) {
      title = '🧠 Trivia Challenge — Correct! 🎉';
      color = Colors.SUCCESS;
    } else {
      title = '🧠 Trivia Challenge — Incorrect! ❌';
      color = Colors.DANGER;
    }
  }

  const choicesText = choices
    .map((choice, i) => {
      const letter = LETTERS[i];
      if (isAnswered && correctIndex !== undefined) {
        if (i === correctIndex) {
          return `**[${letter}]** **${choice}**  ✅ *(Correct)*`;
        }
        if (i === answeredIndex) {
          return `**[${letter}]** ~~${choice}~~  ❌ *(Your Choice)*`;
        }
      }
      return `**[${letter}]** ${choice}`;
    })
    .join('\n');

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    {
      name: 'Category',
      value: catTitle,
      inline: true,
    },
  ];

  if (userTag) {
    fields.push({
      name: 'Player',
      value: userTag,
      inline: true,
    });
  }

  if (isAnswered) {
    fields.push({
      name: 'Explanation',
      value: question.explanation,
      inline: false,
    });
  }

  return {
    title,
    description: `### ${question.question}\n\n${choicesText}`,
    color,
    fields,
    footer: {
      text: isAnswered
        ? 'Game concluded.'
        : 'Select your answer below within 60 seconds! Only the challenger can click.',
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build the 4-button action row ([A], [B], [C], [D]) for a trivia game.
 */
export function buildTriviaActionRow(
  gameId: string,
  answeredIndex?: number,
  correctIndex?: number,
): DiscordActionRowComponent {
  const isAnswered = answeredIndex !== undefined;

  const components = LETTERS.map((letter, i) => {
    let style = 2; // Secondary (gray) by default

    if (isAnswered && correctIndex !== undefined) {
      if (i === correctIndex) {
        style = 3; // Success (green)
      } else if (i === answeredIndex) {
        style = 4; // Danger (red)
      } else {
        style = 2; // Secondary
      }
    } else {
      style = 1; // Primary (blurple) when active
    }

    return {
      type: 2 as const,
      style,
      label: `[${letter}]`,
      custom_id: `game_trivia:${gameId}:${i}`,
      disabled: isAnswered,
    };
  });

  return {
    type: 1,
    components,
  };
}
