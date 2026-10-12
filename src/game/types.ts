// Types & données du jeu "Cosmic Colony"

export interface PlanetInfo {
  id: string;
  name: string;
  emoji: string;
  color: string;
  gravity: number; // multiplicateur de vitesse de marche
  hazard: 'none' | 'heat' | 'cold' | 'wind' | 'pressure';
  hazardRate: number; // boucliers perdus / seconde si non protégé
  oxygen: boolean; // true = air respirable (sans casque)
  groundColors: [string, string]; // couleur du sol (clair, sombre)
  skyColors: [string, string]; // dégradé du ciel
  facts: string[];
  buildable: boolean;
}

export const PLANETS: Record<string, PlanetInfo> = {
  sun: {
    id: 'sun', name: 'Soleil', emoji: '☀️', color: '#ffcc33',
    gravity: 0.5, hazard: 'heat', hazardRate: 40, oxygen: false,
    groundColors: ['#ff9d2f', '#e06a10'], skyColors: ['#5a1500', '#ff8c00'],
    facts: [
      'Le Soleil contient 99,86 % de la masse du système solaire !',
      'Sa surface atteint environ 5 500 °C.',
      'Un voyage en voiture vers le Soleil durerait près de 200 ans.',
      '⚠️ Zone ultra-dangereuse : combine Bouclier + Dôme pour survivre ici !',
    ],
    buildable: true,
  },
  mercury: {
    id: 'mercury', name: 'Mercure', emoji: '🌑', color: '#b5b5b5',
    gravity: 0.9, hazard: 'heat', hazardRate: 8, oxygen: false,
    groundColors: ['#9a9a9a', '#5f5f5f'], skyColors: ['#0a0a1a', '#2c2c44'],
    facts: [
      'Mercure est la plus petite planète du système solaire.',
      'Il y fait de -180 °C la nuit à +430 °C le jour !',
      'Une année sur Mercure dure seulement 88 jours terrestres.',
    ],
    buildable: true,
  },
  venus: {
    id: 'venus', name: 'Vénus', emoji: '🌕', color: '#e8cda0',
    gravity: 0.9, hazard: 'heat', hazardRate: 15, oxygen: false,
    groundColors: ['#c9974f', '#8a5a20'], skyColors: ['#4a2f00', '#c98a2e'],
    facts: [
      'Vénus est la planète la plus chaude (~465 °C).',
      'Son atmosphère est composée à 96 % de dioxyde de carbone.',
      'Sur Vénus, un jour dure plus longtemps qu’une année !',
    ],
    buildable: true,
  },
  earth: {
    id: 'earth', name: 'Terre', emoji: '🌍', color: '#4da6ff',
    gravity: 1.0, hazard: 'none', hazardRate: 0, oxygen: true,
    groundColors: ['#3f9d4f', '#226633'], skyColors: ['#1e5fa8', '#87ceeb'],
    facts: [
      'La Terre est la seule planète connue avec de l’eau liquide et la vie !',
      'Ici tu peux même enlever ton casque 🎉',
      '71 % de sa surface est recouverte d’océans.',
    ],
    buildable: true,
  },
  mars: {
    id: 'mars', name: 'Mars', emoji: '🔴', color: '#e07050',
    gravity: 0.7, hazard: 'cold', hazardRate: 4, oxygen: false,
    groundColors: ['#c1583a', '#7a2e18'], skyColors: ['#2b0f08', '#b5502e'],
    facts: [
      'Mars abrite Olympus Mons, le plus grand volcan du système solaire.',
      'Son ciel est rose-orangé à cause de la poussière de fer.',
      'Deux petites lunes : Phobos et Deimos.',
    ],
    buildable: true,
  },
  jupiter: {
    id: 'jupiter', name: 'Jupiter', emoji: '🟠', color: '#d4a574',
    gravity: 0.4, hazard: 'pressure', hazardRate: 20, oxygen: false,
    groundColors: ['#c9975f', '#8a5f30'], skyColors: ['#1a0f05', '#a06a35'],
    facts: [
      'Jupiter est une géante gazeuse : pas de vraie surface !',
      'La Grande Tache Rouge est une tempête plus grande que la Terre.',
      'Elle possède au moins 95 lunes.',
    ],
    buildable: true,
  },
  saturn: {
    id: 'saturn', name: 'Saturne', emoji: '🪐', color: '#f0d890',
    gravity: 0.4, hazard: 'cold', hazardRate: 10, oxygen: false,
    groundColors: ['#d8bd78', '#94793c'], skyColors: ['#0f0f25', '#caa95a'],
    facts: [
      'Les anneaux de Saturne sont faits de milliards de morceaux de glace.',
      'Saturne est si légère qu’elle flotterait dans l’eau !',
      'Elle a 146 lunes connues, record du système solaire.',
    ],
    buildable: true,
  },
  uranus: {
    id: 'uranus', name: 'Uranus', emoji: '🔵', color: '#7de8e8',
    gravity: 0.5, hazard: 'cold', hazardRate: 12, oxygen: false,
    groundColors: ['#63c6c6', '#2f7f8a'], skyColors: ['#031a1f', '#3aa8b5'],
    facts: [
      'Uranus tourne « couchée » sur le côté !',
      'C’est une géante de glace bleu-vert à cause du méthane.',
      'Sa température peut descendre sous -220 °C.',
    ],
    buildable: true,
  },
  neptune: {
    id: 'neptune', name: 'Neptune', emoji: '💙', color: '#4060e0',
    gravity: 0.5, hazard: 'wind', hazardRate: 18, oxygen: false,
    groundColors: ['#3a58c4', '#1c2f7a'], skyColors: ['#02042a', '#2a44b0'],
    facts: [
      'Neptune a les vents les plus forts : jusqu’à 2 100 km/h !',
      'C’est la planète la plus éloignée du Soleil.',
      'Il faut 165 années terrestres pour faire le tour du Soleil.',
    ],
    buildable: true,
  },
};

export const TRAVEL_ORDER = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

export type BuildingType = 'tent' | 'oxygen' | 'solar' | 'shield' | 'dome' | 'rocket';

export interface BuildingDef {
  type: BuildingType;
  name: string;
  emoji: string;
  cost: number;
  desc: string;
  width: number; // largeur en px monde
  height: number;
  special?: boolean; // construite une seule fois par planète (fusée)
}

export const BUILDINGS: BuildingDef[] = [
  { type: 'tent', name: 'Abri', emoji: '⛺', cost: 15, desc: 'Un premier abri douillet pour commencer ta colonie.', width: 90, height: 70 },
  { type: 'oxygen', name: 'Usine à Oxygène', emoji: '🫧', cost: 30, desc: 'Fabrique de l’air respirable autour d’elle (rayon 170 px).', width: 80, height: 100 },
  { type: 'solar', name: 'Panneau Solaire', emoji: '🔆', cost: 25, desc: 'Produit +1 cristal toutes les 8 secondes.', width: 110, height: 70 },
  { type: 'shield', name: 'Bouclier', emoji: '🛡️', cost: 45, desc: 'Annule les dangers planétaires dans son rayon (200 px).', width: 70, height: 110 },
  { type: 'dome', name: 'Dôme Géant', emoji: '🏙️', cost: 80, desc: 'Une mini-ville sous dôme. Protection totale (rayon 320 px) !', width: 260, height: 170 },
  { type: 'rocket', name: 'Fusée Spatiale', emoji: '🚀', cost: 150, desc: 'Construis-la pour VOYAGER vers une autre planète !', width: 120, height: 190, special: true },
];

export const buildingDef = (t: BuildingType): BuildingDef =>
  BUILDINGS.find((b) => b.type === t)!;

export interface PlacedBuilding {
  id: string;
  type: BuildingType;
  x: number; // position monde (le sol est en y = 0)
}

export interface Crystal {
  id: string;
  x: number;
  bob: number; // décalage d'animation
}

export interface PlayerState {
  name: string;
  photo: string | null; // dataURL (avatar du joueur)
  totalCrystals: number; // monnaie persistante
  inventory: Record<BuildingType, number>; // objets possédés (fusées = voyages)
  colonies: Record<string, { buildings: PlacedBuilding[]; crystals: Crystal[] }>;
  currentPlanet: string;
  discovered: string[];
}

export const WORLD_W = 2600;
export const VIEW_H = 480; // hauteur du canvas monde

export function defaultInventory(): Record<BuildingType, number> {
  return { tent: 0, oxygen: 0, solar: 0, shield: 0, dome: 0, rocket: 0 };
}

export function newPlayer(name: string, photo: string | null): PlayerState {
  return {
    name,
    photo,
    totalCrystals: 25,
    inventory: defaultInventory(),
    colonies: {},
    currentPlanet: 'earth',
    discovered: ['earth'],
  };
}

const STORE_KEY = 'cosmic-colony-v1';

export function saveGame(p: PlayerState) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(p));
  } catch { /* stockage plein ou indisponible */ }
}

export function loadGame(): PlayerState | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PlayerState;
    if (!p || typeof p.name !== 'string') return null;
    if (!p.inventory) p.inventory = defaultInventory();
    if (!p.colonies) p.colonies = {};
    if (!p.discovered) p.discovered = [];
    return p;
  } catch {
    return null;
  }
}

export function clearSave() {
  try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
}

let uid = 0;
export function nextId(prefix: string): string {
  uid += 1;
  return `${prefix}-${Date.now().toString(36)}-${uid}`;
}
