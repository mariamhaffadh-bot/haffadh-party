// ═══════════════════════════════════════════════════════
// HAFFADH PARTY — Original Lore & Game Data (v3)
// Island: Nakhlah Isle — a volcanic tropical island
// Board: branching node-graph from beach to crater peak
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

// ═══════════════════════════════════════════════════════
// BOARD GRAPH — 45 nodes, branching paths from beach to crater
// Each node: { id, name, type, region, position:[x,y,z], connections:[id...] }
// Regions: beach, jungle, cliffside, volcano_rim, summit
// ═══════════════════════════════════════════════════════

const BOARD_NODES = [
  // ── BEACH ZONE (elevation 0-1) ──
  { id: 'start',       name: 'Palm Harbour',        type: 'start',       region: 'beach',    position: [16, 0.3, 0],     connections: ['b1'] },
  { id: 'b1',          name: 'Shell Scatter',        type: 'coin_gain',   region: 'beach',    position: [14, 0.4, 4],     connections: ['b2'],       amount: 3 },
  { id: 'b2',          name: 'Tidal Whisper',        type: 'event',       region: 'beach',    position: [12, 0.5, 7],     connections: ['b3'] },
  { id: 'b3',          name: 'Driftwood Bazaar',     type: 'item_shop',   region: 'beach',    position: [9, 0.6, 9],      connections: ['b_fork'] },
  // ── BEACH FORK: coastal route vs tidal shortcut ──
  { id: 'b_fork',      name: 'Tidal Crossing',       type: 'fork',        region: 'beach',    position: [6, 0.7, 10],     connections: ['b4', 'b_tide1'] },
  // Main coastal route (safe, longer)
  { id: 'b4',          name: 'Crab Stash',           type: 'coin_gain',   region: 'beach',    position: [3, 0.8, 11],     connections: ['b5'],       amount: 2 },
  { id: 'b5',          name: 'Tidepool Shrine',      type: 'idol_shrine', region: 'beach',    position: [0, 0.9, 11],     connections: ['b6'],       baseCost: 10 },
  { id: 'b6',          name: 'Quicksand Pit',        type: 'coin_loss',   region: 'beach',    position: [-3, 1.0, 10],    connections: ['j_merge'],  amount: 2 },
  // Tidal shortcut (short, risky — can be submerged by tide event)
  { id: 'b_tide1',     name: 'Sandbar Dash',         type: 'coin_loss',   region: 'beach',    position: [3, 0.3, 13],     connections: ['b_tide2'],  amount: 3, tidalEdge: true },
  { id: 'b_tide2',     name: 'Reef Hop',             type: 'event',       region: 'beach',    position: [-1, 0.4, 12],    connections: ['j_merge'],  tidalEdge: true },

  // ── JUNGLE ZONE (elevation 1-3) ──
  { id: 'j_merge',     name: 'Jungle Gate',          type: 'coin_gain',   region: 'jungle',   position: [-5, 1.3, 8],     connections: ['j1'],       amount: 3 },
  { id: 'j1',          name: 'Banana Cache',         type: 'coin_gain',   region: 'jungle',   position: [-7, 1.6, 6],     connections: ['j2'],       amount: 3 },
  { id: 'j2',          name: 'Canopy Market',        type: 'item_shop',   region: 'jungle',   position: [-9, 1.9, 3],     connections: ['j_fork'],   movingShop: true },
  // ── JUNGLE FORK: vine bridge shortcut vs long path ──
  { id: 'j_fork',      name: 'Fork of Fronds',       type: 'fork',        region: 'jungle',   position: [-10, 2.1, 0],    connections: ['j3', 'j_vine1'] },
  // Long jungle path (safer, more loot)
  { id: 'j3',          name: 'Firefly Swarm',        type: 'event',       region: 'jungle',   position: [-11, 2.3, -3],   connections: ['j4'] },
  { id: 'j4',          name: 'Honeycomb Hollow',     type: 'coin_gain',   region: 'jungle',   position: [-11, 2.5, -6],   connections: ['j5'],       amount: 4 },
  { id: 'j5',          name: 'Firebloom Shrine',     type: 'idol_shrine', region: 'jungle',   position: [-10, 2.7, -8],   connections: ['j6'],       baseCost: 15 },
  { id: 'j6',          name: 'Pitcher Plant Trap',   type: 'coin_loss',   region: 'jungle',   position: [-8, 2.9, -10],   connections: ['c_merge'],  amount: 3 },
  // Vine bridge shortcut (risky — can collapse)
  { id: 'j_vine1',     name: 'Vine Bridge',          type: 'coin_loss',   region: 'jungle',   position: [-9, 2.5, -4],    connections: ['j_vine2'],  amount: 2, bridgeEdge: true },
  { id: 'j_vine2',     name: 'Mossy Ledge',          type: 'event',       region: 'jungle',   position: [-8, 2.8, -8],    connections: ['c_merge'],  bridgeEdge: true },

  // ── CLIFFSIDE ZONE (elevation 3-5) ──
  { id: 'c_merge',     name: 'Cliff Ascent',         type: 'coin_gain',   region: 'cliffside', position: [-6, 3.2, -11],  connections: ['c1'],       amount: 4 },
  { id: 'c1',          name: 'Rope Bridge Standoff', type: 'duel',        region: 'cliffside', position: [-3, 3.5, -12],  connections: ['c2'] },
  { id: 'c2',          name: 'Rockslide Pass',       type: 'event',       region: 'cliffside', position: [0, 3.8, -12],   connections: ['c3'] },
  { id: 'c3',          name: 'Eagle Toll',           type: 'coin_loss',   region: 'cliffside', position: [3, 4.1, -11],   connections: ['c_fork'],   amount: 3 },
  // ── CLIFF FORK: rope bridge express vs switchback ──
  { id: 'c_fork',      name: 'Ravine Edge',          type: 'fork',        region: 'cliffside', position: [5, 4.3, -9],    connections: ['c4', 'c_rope1'] },
  // Switchback (long, steady)
  { id: 'c4',          name: 'Cliff Outpost',        type: 'item_shop',   region: 'cliffside', position: [7, 4.5, -7],    connections: ['c5'] },
  { id: 'c5',          name: 'Stormwatch Shrine',    type: 'idol_shrine', region: 'cliffside', position: [8, 4.8, -4],    connections: ['c6'],       baseCost: 20 },
  { id: 'c6',          name: 'Crystal Cave',         type: 'coin_gain',   region: 'cliffside', position: [8, 5.0, -1],    connections: ['v_merge'],  amount: 5 },
  // Rope bridge express (can be destroyed by hazard)
  { id: 'c_rope1',     name: 'Rope Crossing',        type: 'coin_loss',   region: 'cliffside', position: [7, 4.6, -5],    connections: ['c_rope2'],  amount: 2, bridgeEdge: true },
  { id: 'c_rope2',     name: 'Wind Gust',            type: 'event',       region: 'cliffside', position: [8, 4.9, -2],    connections: ['v_merge'],  bridgeEdge: true },

  // ── VOLCANO RIM ZONE (elevation 5-7) ──
  { id: 'v_merge',     name: 'Volcano Gate',         type: 'coin_gain',   region: 'volcano_rim', position: [7, 5.3, 2],   connections: ['v1'],       amount: 5 },
  { id: 'v1',          name: 'Lava Burst',           type: 'event',       region: 'volcano_rim', position: [6, 5.6, 5],   connections: ['v2'] },
  { id: 'v2',          name: 'Obsidian Shards',      type: 'coin_gain',   region: 'volcano_rim', position: [4, 5.9, 7],   connections: ['v3'],       amount: 5 },
  { id: 'v3',          name: 'Ember Forge',          type: 'item_shop',   region: 'volcano_rim', position: [2, 6.2, 8],   connections: ['v4'] },
  { id: 'v4',          name: 'Sulfur Cloud',         type: 'coin_loss',   region: 'volcano_rim', position: [0, 6.4, 8],   connections: ['v_fork'],   amount: 4 },
  // ── VOLCANO FORK: lava field gamble vs safe ridge ──
  { id: 'v_fork',      name: 'Lava Fork',            type: 'fork',        region: 'volcano_rim', position: [-2, 6.6, 7],  connections: ['v5', 'v_lava1'] },
  // Safe ridge (longer)
  { id: 'v5',          name: 'Ash Ridge',            type: 'event',       region: 'volcano_rim', position: [-4, 6.8, 5],  connections: ['v6'] },
  { id: 'v6',          name: 'Caldera Shrine',       type: 'idol_shrine', region: 'volcano_rim', position: [-5, 7.0, 3],  connections: ['v7'],       baseCost: 25 },
  { id: 'v7',          name: 'Rim Duel Ring',        type: 'duel',        region: 'volcano_rim', position: [-5, 7.2, 0],  connections: ['s_merge'] },
  // Lava field gamble (short, can be blocked by lava flow)
  { id: 'v_lava1',     name: 'Magma Geode',          type: 'coin_gain',   region: 'volcano_rim', position: [-4, 7.0, 4],  connections: ['v_lava2'],  amount: 7, lavaEdge: true },
  { id: 'v_lava2',     name: 'Eruption Tremor',      type: 'coin_loss',   region: 'volcano_rim', position: [-5, 7.2, 1],  connections: ['s_merge'],  amount: 5, lavaEdge: true },

  // ── SUMMIT ZONE (elevation 7-9) ──
  { id: 's_merge',     name: 'Crater Rim',           type: 'coin_gain',   region: 'summit',   position: [-4, 7.5, -2],    connections: ['s1'],       amount: 6 },
  { id: 's1',          name: 'Starfall Ledge',       type: 'event',       region: 'summit',   position: [-2, 8.0, -3],    connections: ['s2'] },
  { id: 's2',          name: 'Peak Winds',           type: 'duel',        region: 'summit',   position: [0, 8.5, -2],     connections: ['summit'] },
  { id: 'summit',      name: 'The Sunfire Crown',    type: 'summit_shrine', region: 'summit', position: [0, 9.0, 0],      connections: ['start'],    baseCost: 35 },
];

// ─── Idol Shrines ───
const IDOL_SHRINES = [
  { id: 'tidepool_idol',   name: 'Tidepool Idol',    nodeId: 'b5',     baseCost: 10, description: 'A coral idol humming with ocean tides.' },
  { id: 'firebloom_idol',  name: 'Firebloom Idol',   nodeId: 'j5',     baseCost: 15, description: 'An idol wreathed in ever-burning petals.' },
  { id: 'stormwatch_idol', name: 'Stormwatch Idol',  nodeId: 'c5',     baseCost: 20, description: 'An idol crackling with captured lightning.' },
  { id: 'caldera_idol',    name: 'Caldera Idol',     nodeId: 'v6',     baseCost: 25, description: 'An idol forged in the volcano\'s heart.' },
  { id: 'sunfire_crown',   name: 'The Sunfire Crown', nodeId: 'summit', baseCost: 35, description: 'The rarest idol at the volcano peak. Legend says it holds the island\'s soul.' },
];

// ─── Items ───
const ITEMS = [
  { id: 'tailwind_charm', name: 'Tailwind Charm', cost: 5, description: 'Grants a bonus +3 to your next dice roll.', effect: 'bonus_roll', value: 3 },
  { id: 'thornvine_trap', name: 'Thornvine Trap', cost: 6, description: 'Drop on any space — the next player who lands there loses 4 coins.', effect: 'hazard', value: 4 },
  { id: 'phantom_hand',   name: 'Phantom Hand',   cost: 10, description: 'Use at an Idol Shrine to steal one Idol from an opponent instead of buying.', effect: 'steal_idol', value: 1 },
  { id: 'coral_shield',   name: 'Coral Shield',   cost: 4, description: 'Blocks one incoming steal, hazard, or coin-loss event. Auto-triggers.', effect: 'shield', value: 1 },
];

// ─── Random Events ───
const RANDOM_EVENTS = [
  { id: 'trade_winds',    name: 'Trade Winds Blow!',  description: 'Favorable winds fill your sails.', effect: 'gain_coins', value: 4 },
  { id: 'monsoon',        name: 'Monsoon Season!',     description: 'Heavy rains wash away some coins.', effect: 'lose_coins', value: 3 },
  { id: 'treasure_map',   name: 'Treasure Map Found!', description: 'An old map leads to buried coins.', effect: 'gain_coins', value: 6 },
  { id: 'coin_swap',      name: 'Island Spirit Swap!', description: 'The island spirits swap your fortune with another player.', effect: 'swap_coins', value: 0 },
  { id: 'current_push',   name: 'Strong Current!',     description: 'A current pushes you forward.', effect: 'move_forward', value: 2 },
  { id: 'coconut_rain',   name: 'Coconut Rain!',       description: 'Coconuts fall from the trees — collect them!', effect: 'gain_coins', value: 3 },
  { id: 'hermit_tax',     name: 'Hermit Crab Tax',     description: 'The local crabs demand a toll.', effect: 'lose_coins', value: 2 },
  { id: 'dolphins_gift',  name: 'Dolphin\'s Gift',     description: 'A friendly dolphin brings you shells.', effect: 'gain_coins', value: 5 },
  { id: 'volcano_rumble', name: 'Volcano Rumble!',     description: 'The ground shakes — watch your step!', effect: 'lose_coins', value: 4 },
];

// ─── Dynamic Board Hazard Events ───
const BOARD_HAZARDS = [
  {
    id: 'bridge_collapse',
    name: 'Bridge Collapse!',
    description: 'A vine bridge snaps and falls into the ravine!',
    targetTag: 'bridgeEdge', // disables edges tagged bridgeEdge
    duration: -1,            // permanent until repair event
    effect: 'disable_edge',
  },
  {
    id: 'lava_flow',
    name: 'Lava Flow!',
    description: 'Molten lava pours across the path — it will cool in one round.',
    targetTag: 'lavaEdge',
    duration: 1,             // blocks for 1 round, then recedes
    effect: 'disable_edge',
  },
  {
    id: 'tide_submerge',
    name: 'Rising Tide!',
    description: 'The tide rises, submerging the beach shortcut!',
    targetTag: 'tidalEdge',
    duration: 2,             // submerged for 2 rounds
    effect: 'disable_edge',
  },
  {
    id: 'tide_recede',
    name: 'Tide Recedes!',
    description: 'The water pulls back, revealing the sandbar shortcut!',
    targetTag: 'tidalEdge',
    duration: 0,
    effect: 'enable_edge',   // re-enables tidal edges
  },
  {
    id: 'shop_relocate',
    name: 'Wandering Merchant!',
    description: 'The Canopy Market packs up and moves to a new location!',
    effect: 'relocate_shop',
  },
  {
    id: 'bridge_repair',
    name: 'Bridge Repaired!',
    description: 'Island builders have repaired the vine bridge!',
    targetTag: 'bridgeEdge',
    duration: 0,
    effect: 'enable_edge',
  },
];

// ─── Minigame Templates ───
const MINIGAME_TEMPLATES = [
  { id: 'tap_race',   name: 'Coconut Tap Dash',  description: 'Tap as fast as you can to crack open coconuts!', type: 'tap_race',   duration: 10000 },
  { id: 'balance',    name: 'Tightrope Tilt',     description: 'Tilt your phone to keep balance on the rope bridge!', type: 'balance',    duration: 15000 },
  { id: 'memory',     name: 'Shell Memory',        description: 'Match pairs of island shells before time runs out!', type: 'memory',     duration: 30000 },
  { id: 'tug_of_war', name: 'Vine Tug',            description: 'Mash the button to pull the vine to your side!', type: 'tug_of_war', duration: 8000 },
  { id: 'reaction',   name: 'Firefly Catch',       description: 'Tap when the firefly lights up — fastest reaction wins!', type: 'reaction',   duration: 5000 },
];

// ─── Bonus Achievements ───
const BONUS_ACHIEVEMENTS = [
  { id: 'minigame_master', name: 'Minigame Master', description: 'Won the most minigames.',     stat: 'minigamesWon' },
  { id: 'coin_hoarder',    name: 'Coin Hoarder',    description: 'Held the most coins at end.', stat: 'coins' },
  { id: 'trailblazer',     name: 'Trailblazer',     description: 'Traveled the most spaces.',   stat: 'spacesTraveled' },
  { id: 'duel_champion',   name: 'Duel Champion',   description: 'Won the most duels.',         stat: 'duelsWon' },
];

const MINIGAME_PAYOUTS = [10, 6, 3, 1];

module.exports = {
  CHARACTERS, BOARD_NODES, IDOL_SHRINES, ITEMS,
  RANDOM_EVENTS, BOARD_HAZARDS, MINIGAME_TEMPLATES,
  BONUS_ACHIEVEMENTS, MINIGAME_PAYOUTS,
};
