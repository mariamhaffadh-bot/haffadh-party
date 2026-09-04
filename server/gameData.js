// ═══════════════════════════════════════════════════════
// HAFFADH PARTY — Original Lore & Game Data
// Island: Nakhlah Isle — a crescent-shaped tropical island
// ═══════════════════════════════════════════════════════

const CHARACTERS = [
  { id: 'zari',   name: 'Zari',   species: 'Golden Gecko',    color: '#FFD700', accent: '#B8860B', description: 'A nimble gecko who dreams of finding the legendary Golden Coconut.' },
  { id: 'buhoor', name: 'Buhoor', species: 'Purple Hermit Crab', color: '#9B59B6', accent: '#6C3483', description: 'A wise crab carrying ancient island secrets in its shell.' },
  { id: 'tamra',  name: 'Tamra',  species: 'Scarlet Parrot',  color: '#E74C3C', accent: '#922B21', description: 'A daring parrot and the island\'s fastest flier.' },
  { id: 'sidr',   name: 'Sidr',   species: 'Teal Turtle',     color: '#1ABC9C', accent: '#0E6655', description: 'A patient turtle who knows every tide and current.' },
  { id: 'ghaf',   name: 'Ghaf',   species: 'Brown Monkey',    color: '#8D6E63', accent: '#5D4037', description: 'A mischievous monkey who swings through the canopy.' },
  { id: 'dallah', name: 'Dallah', species: 'Amber Fox',       color: '#F39C12', accent: '#D68910', description: 'A clever fox with a nose for hidden treasure.' },
  { id: 'sumra',  name: 'Sumra',  species: 'Pink Jellyfish',  color: '#FF69B4', accent: '#C2185B', description: 'A luminous jellyfish that glows in the moonlight.' },
  { id: 'mahli',  name: 'Mahli',  species: 'Silver Dolphin',  color: '#95A5A6', accent: '#707B7C', description: 'A playful dolphin who leaps between the waves.' },
];

// Board: 35 spaces that wind around Nakhlah Isle
// Path: Beach Start → Tidal Flats → Jungle Trail → Rope Bridge →
//       Cliffside → Volcano Rim → Caldera Descent → Lagoon → back to start
const BOARD_SPACES = [
  { index: 0,  type: 'start',     name: 'Palm Harbour',         region: 'beach' },
  { index: 1,  type: 'coin_gain', name: 'Shell Scatter',         region: 'beach', amount: 3 },
  { index: 2,  type: 'event',     name: 'Tidal Whisper',         region: 'beach' },
  { index: 3,  type: 'coin_gain', name: 'Crab Stash',            region: 'beach', amount: 2 },
  { index: 4,  type: 'minigame',  name: 'Coconut Grove Arena',   region: 'beach' },
  { index: 5,  type: 'coin_loss', name: 'Quicksand Pit',         region: 'tidal' },
  { index: 6,  type: 'event',     name: 'Monsoon Warning',       region: 'tidal' },
  { index: 7,  type: 'landmark',  name: 'The Coral Throne',      region: 'tidal' },
  { index: 8,  type: 'coin_gain', name: 'Starfish Pool',         region: 'tidal', amount: 4 },
  { index: 9,  type: 'branch',    name: 'Fork of Fronds',        region: 'jungle', branches: [10, 14] },
  // Left path through jungle
  { index: 10, type: 'coin_gain', name: 'Banana Cache',          region: 'jungle', amount: 2 },
  { index: 11, type: 'duel',      name: 'Vine Duel Ring',        region: 'jungle' },
  { index: 12, type: 'event',     name: 'Firefly Swarm',         region: 'jungle' },
  { index: 13, type: 'coin_loss', name: 'Pitcher Plant Trap',    region: 'jungle', amount: 3 },
  // Right path (shortcut but risky)
  { index: 14, type: 'coin_loss', name: 'Thorny Pass',           region: 'jungle', amount: 4 },
  { index: 15, type: 'coin_gain', name: 'Hidden Grotto',         region: 'jungle', amount: 6 },
  // Paths merge
  { index: 16, type: 'landmark',  name: 'The Firebloom Shrine',  region: 'jungle' },
  { index: 17, type: 'minigame',  name: 'Canopy Challenge',      region: 'jungle' },
  { index: 18, type: 'coin_gain', name: 'Honeycomb Hollow',      region: 'cliffside', amount: 3 },
  { index: 19, type: 'event',     name: 'Rockslide!',            region: 'cliffside' },
  { index: 20, type: 'coin_loss', name: 'Eagle Toll',            region: 'cliffside', amount: 2 },
  { index: 21, type: 'duel',      name: 'Rope Bridge Standoff',  region: 'cliffside' },
  { index: 22, type: 'landmark',  name: 'The Driftwood Market',  region: 'cliffside' },
  { index: 23, type: 'coin_gain', name: 'Gem Vein',              region: 'volcano', amount: 5 },
  { index: 24, type: 'event',     name: 'Lava Burst',            region: 'volcano' },
  { index: 25, type: 'minigame',  name: 'Caldera Clash',         region: 'volcano' },
  { index: 26, type: 'coin_loss', name: 'Sulfur Cloud',          region: 'volcano', amount: 3 },
  { index: 27, type: 'landmark',  name: 'The Canopy Altar',      region: 'volcano' },
  { index: 28, type: 'coin_gain', name: 'Obsidian Shards',       region: 'volcano', amount: 4 },
  { index: 29, type: 'branch',    name: 'Lava Fork',             region: 'volcano', branches: [30, 32] },
  { index: 30, type: 'coin_gain', name: 'Crystal Cave',          region: 'lagoon', amount: 6 },
  { index: 31, type: 'event',     name: 'Whirlpool Pull',        region: 'lagoon' },
  { index: 32, type: 'coin_loss', name: 'Coral Maze',            region: 'lagoon', amount: 2 },
  { index: 33, type: 'landmark',  name: 'The Obsidian Arch',     region: 'lagoon' },
  { index: 34, type: 'minigame',  name: 'Lagoon Showdown',       region: 'lagoon' },
];

const LANDMARKS = [
  { id: 'coral_throne',     name: 'The Coral Throne',     spaceIndex: 7,  cost: 15, ownerId: null, description: 'A throne carved from living coral, pulsing with ocean energy.' },
  { id: 'firebloom_shrine', name: 'The Firebloom Shrine',  spaceIndex: 16, cost: 20, ownerId: null, description: 'A shrine where rare fire-blooming flowers glow at dusk.' },
  { id: 'driftwood_market', name: 'The Driftwood Market',  spaceIndex: 22, cost: 18, ownerId: null, description: 'A floating market built on ancient driftwood rafts.' },
  { id: 'canopy_altar',     name: 'The Canopy Altar',      spaceIndex: 27, cost: 25, ownerId: null, description: 'A sacred platform high in the jungle canopy.' },
  { id: 'obsidian_arch',    name: 'The Obsidian Arch',     spaceIndex: 33, cost: 22, ownerId: null, description: 'A natural arch of volcanic glass that frames the sunset.' },
];

const RANDOM_EVENTS = [
  { id: 'trade_winds',    name: 'Trade Winds Blow!',       description: 'Favorable winds fill your sails.', effect: 'gain_coins', value: 4 },
  { id: 'monsoon',        name: 'Monsoon Season!',          description: 'Heavy rains wash away some coins.', effect: 'lose_coins', value: 3 },
  { id: 'treasure_map',   name: 'Treasure Map Found!',      description: 'An old map leads to buried coins.', effect: 'gain_coins', value: 6 },
  { id: 'coin_swap',      name: 'Island Spirit Swap!',      description: 'The island spirits swap your fortune with another player.', effect: 'swap_coins', value: 0 },
  { id: 'current_push',   name: 'Strong Current!',          description: 'A current pushes you forward.', effect: 'move_forward', value: 2 },
  { id: 'undertow',       name: 'Undertow!',                description: 'You get pulled back by the undertow.', effect: 'move_backward', value: 3 },
  { id: 'coconut_rain',   name: 'Coconut Rain!',            description: 'Coconuts fall from the trees! Collect them.', effect: 'gain_coins', value: 3 },
  { id: 'hermit_tax',     name: 'Hermit Crab Tax',          description: 'The local crabs demand a toll.', effect: 'lose_coins', value: 2 },
  { id: 'dolphins_gift',  name: 'Dolphin\'s Gift',          description: 'A friendly dolphin brings you shells.', effect: 'gain_coins', value: 5 },
  { id: 'volcano_rumble', name: 'Volcano Rumble!',           description: 'The ground shakes — watch your step!', effect: 'lose_coins', value: 4 },
];

// Minigame templates
const MINIGAME_TEMPLATES = [
  {
    id: 'tap_race',
    name: 'Coconut Tap Dash',
    description: 'Tap as fast as you can to crack open coconuts!',
    type: 'tap_race',
    minPlayers: 2,
    maxPlayers: 8,
    duration: 10000,
    winCondition: 'most_taps',
  },
  {
    id: 'balance',
    name: 'Tightrope Tilt',
    description: 'Tilt your phone to keep balance on the rope bridge!',
    type: 'balance',
    minPlayers: 2,
    maxPlayers: 8,
    duration: 15000,
    winCondition: 'last_standing',
  },
  {
    id: 'memory',
    name: 'Shell Memory',
    description: 'Match pairs of island shells before time runs out!',
    type: 'memory',
    minPlayers: 1,
    maxPlayers: 8,
    duration: 30000,
    winCondition: 'most_pairs',
  },
  {
    id: 'tug_of_war',
    name: 'Vine Tug',
    description: 'Mash the button to pull the vine to your side!',
    type: 'tug_of_war',
    minPlayers: 2,
    maxPlayers: 2,
    duration: 8000,
    winCondition: 'most_mashes',
  },
  {
    id: 'reaction',
    name: 'Firefly Catch',
    description: 'Tap when the firefly lights up — fastest reaction wins!',
    type: 'reaction',
    minPlayers: 2,
    maxPlayers: 8,
    duration: 5000,
    winCondition: 'fastest_reaction',
  },
];

module.exports = { CHARACTERS, BOARD_SPACES, LANDMARKS, RANDOM_EVENTS, MINIGAME_TEMPLATES };
