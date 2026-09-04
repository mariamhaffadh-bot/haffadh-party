export const CHARACTERS = [
  { id: 'zari',   name: 'Zari',   species: 'Golden Gecko',       color: '#FFD700', accent: '#B8860B' },
  { id: 'buhoor', name: 'Buhoor', species: 'Purple Hermit Crab', color: '#9B59B6', accent: '#6C3483' },
  { id: 'tamra',  name: 'Tamra',  species: 'Scarlet Parrot',     color: '#E74C3C', accent: '#922B21' },
  { id: 'sidr',   name: 'Sidr',   species: 'Teal Turtle',        color: '#1ABC9C', accent: '#0E6655' },
  { id: 'ghaf',   name: 'Ghaf',   species: 'Brown Monkey',       color: '#8D6E63', accent: '#5D4037' },
  { id: 'dallah', name: 'Dallah', species: 'Amber Fox',          color: '#F39C12', accent: '#D68910' },
  { id: 'sumra',  name: 'Sumra',  species: 'Pink Jellyfish',     color: '#FF69B4', accent: '#C2185B' },
  { id: 'mahli',  name: 'Mahli',  species: 'Silver Dolphin',     color: '#95A5A6', accent: '#707B7C' },
];

export function getCharacter(id) {
  return CHARACTERS.find((c) => c.id === id);
}
