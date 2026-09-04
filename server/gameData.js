// ═══════════════════════════════════════════════════════
// HAFFADH PARTY — Original Lore & Game Data (v2)
// Island: Nakhlah Isle — a volcanic tropical island
// The board spirals from the beach up the volcano to the summit
// ═══════════════════════════════════════════════════════

const CHARACTERS = [
  { id: 'zari',   name: 'Zari',   species: 'Golden Gecko',       color: '#FFD700', accent: '#B8860B', description: 'A nimble gecko who dreams of reaching the summit first.' },
  { id: 'buhoor', name: 'Buhoor', species: 'Purple Hermit Crab', color: '#9B59B6', accent: '#6C3483', description: 'A wise crab carrying ancient island secrets in its shell.' },
  { id: 'tamra',  name: 'Tamra',  species: 'Scarlet Parrot',     color: '#E74C3C', accent: '#922B21', description: 'A daring parrot and the island\'s fastest flier.' },
  { id: 'sidr',   name: 'Sidr',   species: 'Teal Turtle',        color: '#1ABC9C', accent: '#0E6655', description: 'A patient turtle who knows every path on the mountain.' },
  { id: 'ghaf',   name: 'Ghaf',   species: 'Brown Monkey',       color: '#8D6E63', accent: '#5D4037', description: 'A mischievous monkey who swings through the canopy.' },
  { id: 'dallah', name: 'Dallah', species: 'Amber Fox',          color: '#F39C12', accent: '#D68910', description: 'A clever fox with a nose for hidden treasure.' },
  { id: 'sumra',  name: 'Sumra',  species: 'Pink Jellyfish',     color: '#FF69B4', accent: '#C2185B', description: 'A luminous jellyfish that floats on warm island breezes.' },
  { id: 'mahli',  name: 'Mahli',  species: 'Silver Dolphin',     color: '#95A5A6', accent: '#707B7C', description: 'A playful dolphin who leaps between the waves.' },
];

// ─── Board: 36 spaces spiraling from beach to volcano summit ───
// Regions ascend: beach → jungle → cliffside → volcano_rim → summit
const BOARD_SPACES = [
  // ── Beach (0-6) ──
  { index: 0,  type: 'start',     name: 'Palm Harbour',          region: 'beach',    elevation: 0 },
  { index: 1,  type: 'coin_gain', name: 'Shell Scatter',         region: 'beach',    elevation: 0.1, amount: 3 },
  { index: 2,  type: 'event',     name: 'Tidal Whisper',         region: 'beach',    elevation: 0.15 },
  { index: 3,  type: 'item_shop', name: 'Driftwood Bazaar',      region: 'beach',    elevation: 0.2 },
  { index: 4,  type: 'coin_gain', name: 'Crab Stash',            region: 'beach',    elevation: 0.3, amount: 2 },
  { index: 5,  type: 'idol_shrine', name: 'Tidepool Shrine',     region: 'beach',    elevation: 0.35, baseCost: 10 },
  { index: 6,  type: 'coin_loss', name: 'Quicksand Pit',         region: 'beach',    elevation: 0.4, amount: 2 },

  // ── Jungle (7-14) ──
  { index: 7,  type: 'event',     name: 'Monsoon Warning',       region: 'jungle',   elevation: 0.5 },
  { index: 8,  type: 'coin_gain', name: 'Banana Cache',          region: 'jungle',   elevation: 0.6, amount: 3 },
  { index: 9,  type: 'branch',    name: 'Fork of Fronds',        region: 'jungle',   elevation: 0.65, branches: [10, 13] },
  // Left fork (longer, safer)
  { index: 10, type: 'coin_gain', name: 'Honeycomb Hollow',      region: 'jungle',   elevation: 0.7, amount: 4 },
  { index: 11, type: 'item_shop', name: 'Canopy Market',         region: 'jungle',   elevation: 0.75 },
  { index: 12, type: 'event',     name: 'Firefly Swarm',         region: 'jungle',   elevation: 0.8 },
  // Right fork (shorter, risky)
  { index: 13, type: 'coin_loss', name: 'Pitcher Plant Trap',    region: 'jungle',   elevation: 0.75, amount: 4 },
  // Merge
  { index: 14, type: 'idol_shrine', name: 'Firebloom Shrine',    region: 'jungle',   elevation: 0.85, baseCost: 15 },

  // ── Cliffside (15-22) ──
  { index: 15, type: 'coin_gain', name: 'Gem Vein',              region: 'cliffside', elevation: 1.0, amount: 4 },
  { index: 16, type: 'duel',      name: 'Rope Bridge Standoff',  region: 'cliffside', elevation: 1.1 },
  { index: 17, type: 'event',     name: 'Rockslide!',            region: 'cliffside', elevation: 1.2 },
  { index: 18, type: 'coin_loss', name: 'Eagle Toll',            region: 'cliffside', elevation: 1.3, amount: 3 },
  { index: 19, type: 'item_shop', name: 'Cliff Outpost',         region: 'cliffside', elevation: 1.4 },
  { index: 20, type: 'idol_shrine', name: 'Stormwatch Shrine',   region: 'cliffside', elevation: 1.5, baseCost: 20 },
  { index: 21, type: 'coin_gain', name: 'Crystal Cave',          region: 'cliffside', elevation: 1.6, amount: 5 },
  { index: 22, type: 'duel',      name: 'Switchback Clash',      region: 'cliffside', elevation: 1.7 },

  // ── Volcano Rim (23-30) ──
  { index: 23, type: 'event',     name: 'Lava Burst',            region: 'volcano_rim', elevation: 1.9 },
  { index: 24, type: 'coin_gain', name: 'Obsidian Shards',       region: 'volcano_rim', elevation: 2.0, amount: 5 },
  { index: 25, type: 'coin_loss', name: 'Sulfur Cloud',          region: 'volcano_rim', elevation: 2.1, amount: 4 },
  { index: 26, type: 'item_shop', name: 'Ember Forge',           region: 'volcano_rim', elevation: 2.2 },
  { index: 27, type: 'branch',    name: 'Lava Fork',             region: 'volcano_rim', elevation: 2.3, branches: [28, 30] },
  // Left (scenic route)
  { index: 28, type: 'coin_gain', name: 'Magma Geode',           region: 'volcano_rim', elevation: 2.4, amount: 6 },
  { index: 29, type: 'event',     name: 'Eruption Tremor',       region: 'volcano_rim', elevation: 2.5 },
  // Right (express but costly)
  { index: 30, type: 'coin_loss', name: 'Ash Storm',             region: 'volcano_rim', elevation: 2.5, amount: 5 },
  // Merge
  { index: 31, type: 'idol_shrine', name: 'Caldera Shrine',      region: 'volcano_rim', elevation: 2.7, baseCost: 25 },
  { index: 32, type: 'duel',      name: 'Rim Duel Ring',         region: 'volcano_rim', elevation: 2.8 },

  // ── Summit (33-35) ──
  { index: 33, type: 'coin_gain', name: 'Starfall Ledge',        region: 'summit', elevation: 3.0, amount: 7 },
  { index: 34, type: 'event',     name: 'Peak Winds',            region: 'summit', elevation: 3.2 },
  { index: 35, type: 'idol_shrine', name: 'The Sunfire Crown',   region: 'summit', elevation: 3.5, baseCost: 35 },
];

// Idol shrines with escalating costs
const IDOL_SHRINES = [
  { id: 'tidepool_idol',   name: 'Tidepool Idol',   spaceIndex: 5,  baseCost: 10, description: 'A coral idol humming with ocean tides.' },
  { id: 'firebloom_idol',  name: 'Firebloom Idol',  spaceIndex: 14, baseCost: 15, description: 'An idol wreathed in ever-burning petals.' },
  { id: 'stormwatch_idol', name: 'Stormwatch Idol',  spaceIndex: 20, baseCost: 20, description: 'An idol crackling with captured lightning.' },
  { id: 'caldera_idol',    name: 'Caldera Idol',     spaceIndex: 31, baseCost: 25, description: 'An idol forged in the volcano\'s heart.' },
  { id: 'sunfire_crown',   name: 'The Sunfire Crown', spaceIndex: 35, baseCost: 35, description: 'The rarest idol — the molten crown atop the summit. Legend says it holds the island\'s soul.' },
];

// ─── Items ───
const ITEMS = [
  {
    id: 'tailwind_charm',
    name: 'Tailwind Charm',
    cost: 5,
    description: 'Grants a bonus +3 to your next dice roll.',
    effect: 'bonus_roll',
    value: 3,
  },
  {
    id: 'thornvine_trap',
    name: 'Thornvine Trap',
    cost: 6,
    description: 'Drop on any space — the next player who lands there loses 4 coins.',
    effect: 'hazard',
    value: 4,
  },
  {
    id: 'phantom_hand',
    name: 'Phantom Hand',
    cost: 10,
    description: 'Use at an Idol Shrine to steal one Idol from an opponent instead of buying.',
    effect: 'steal_idol',
    value: 1,
  },
  {
    id: 'coral_shield',
    name: 'Coral Shield',
    cost: 4,
    description: 'Blocks one incoming steal, hazard, or coin-loss event. Auto-triggers.',
    effect: 'shield',
    value: 1,
  },
];

// ─── Random Events ───
const RANDOM_EVENTS = [
  { id: 'trade_winds',    name: 'Trade Winds Blow!',      description: 'Favorable winds fill your sails.', effect: 'gain_coins', value: 4 },
  { id: 'monsoon',        name: 'Monsoon Season!',         description: 'Heavy rains wash away some coins.', effect: 'lose_coins', value: 3 },
  { id: 'treasure_map',   name: 'Treasure Map Found!',     description: 'An old map leads to buried coins.', effect: 'gain_coins', value: 6 },
  { id: 'coin_swap',      name: 'Island Spirit Swap!',     description: 'The island spirits swap your fortune with another player.', effect: 'swap_coins', value: 0 },
  { id: 'current_push',   name: 'Strong Current!',         description: 'A current pushes you forward.', effect: 'move_forward', value: 2 },
  { id: 'undertow',       name: 'Undertow!',               description: 'You get pulled back by the undertow.', effect: 'move_backward', value: 3 },
  { id: 'coconut_rain',   name: 'Coconut Rain!',           description: 'Coconuts fall from the trees — collect them!', effect: 'gain_coins', value: 3 },
  { id: 'hermit_tax',     name: 'Hermit Crab Tax',         description: 'The local crabs demand a toll.', effect: 'lose_coins', value: 2 },
  { id: 'dolphins_gift',  name: 'Dolphin\'s Gift',         description: 'A friendly dolphin brings you shells.', effect: 'gain_coins', value: 5 },
  { id: 'volcano_rumble', name: 'Volcano Rumble!',         description: 'The ground shakes — watch your step!', effect: 'lose_coins', value: 4 },
];

// ─── Minigame Templates ───
const MINIGAME_TEMPLATES = [
  {
    id: 'tap_race',
    name: 'Coconut Tap Dash',
    description: 'Tap as fast as you can to crack open coconuts!',
    type: 'tap_race',
    minPlayers: 2,
    maxPlayers: 8,
    duration: 10000,
  },
  {
    id: 'balance',
    name: 'Tightrope Tilt',
    description: 'Tilt your phone to keep balance on the rope bridge!',
    type: 'balance',
    minPlayers: 2,
    maxPlayers: 8,
    duration: 15000,
  },
  {
    id: 'memory',
    name: 'Shell Memory',
    description: 'Match pairs of island shells before time runs out!',
    type: 'memory',
    minPlayers: 1,
    maxPlayers: 8,
    duration: 30000,
  },
  {
    id: 'tug_of_war',
    name: 'Vine Tug',
    description: 'Mash the button to pull the vine to your side!',
    type: 'tug_of_war',
    minPlayers: 2,
    maxPlayers: 8,
    duration: 8000,
  },
  {
    id: 'reaction',
    name: 'Firefly Catch',
    description: 'Tap when the firefly lights up — fastest reaction wins!',
    type: 'reaction',
    minPlayers: 2,
    maxPlayers: 8,
    duration: 5000,
  },
];

// ─── Bonus Idol Achievements (revealed at end of game) ───
const BONUS_ACHIEVEMENTS = [
  { id: 'minigame_master', name: 'Minigame Master',    description: 'Won the most minigames.',     stat: 'minigamesWon' },
  { id: 'coin_hoarder',    name: 'Coin Hoarder',       description: 'Held the most coins at end.', stat: 'coins' },
  { id: 'trailblazer',     name: 'Trailblazer',        description: 'Traveled the most spaces.',   stat: 'spacesTraveled' },
  { id: 'duel_champion',   name: 'Duel Champion',      description: 'Won the most duels.',         stat: 'duelsWon' },
];

// ─── Minigame ranked payout table ───
// payouts[placement] = coins awarded (0-indexed: 0=1st, 1=2nd, etc.)
const MINIGAME_PAYOUTS = [10, 6, 3, 1];

module.exports = {
  CHARACTERS,
  BOARD_SPACES,
  IDOL_SHRINES,
  ITEMS,
  RANDOM_EVENTS,
  MINIGAME_TEMPLATES,
  BONUS_ACHIEVEMENTS,
  MINIGAME_PAYOUTS,
};
