export interface Planet {
  id: string;
  name: string;
  radius: number; // visual radius in px
  orbitRadius: number; // visual orbit radius in px
  color: string;
  actualRadius: number; // in km
  distanceFromSun: number; // in million km
  orbitalPeriod: number; // in Earth days
  orbitalSpeed: number; // relative speed (Earth = 1)
  description: string;
  moons: number;
  type: string;
}

export const planets: Planet[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    radius: 4,
    orbitRadius: 60,
    color: '#b5b5b5',
    actualRadius: 2439.7,
    distanceFromSun: 57.9,
    orbitalPeriod: 88,
    orbitalSpeed: 4.15,
    description: 'The smallest planet and closest to the Sun. It has no atmosphere and extreme temperature variations.',
    moons: 0,
    type: 'Terrestrial',
  },
  {
    id: 'venus',
    name: 'Venus',
    radius: 7,
    orbitRadius: 90,
    color: '#e8cda0',
    actualRadius: 6051.8,
    distanceFromSun: 108.2,
    orbitalPeriod: 225,
    orbitalSpeed: 1.62,
    description: 'The hottest planet due to its thick atmosphere of carbon dioxide. It rotates in the opposite direction to most planets.',
    moons: 0,
    type: 'Terrestrial',
  },
  {
    id: 'earth',
    name: 'Earth',
    radius: 8,
    orbitRadius: 125,
    color: '#4da6ff',
    actualRadius: 6371,
    distanceFromSun: 149.6,
    orbitalPeriod: 365.25,
    orbitalSpeed: 1.0,
    description: 'Our home planet — the only known world with liquid water on its surface and life. It has one moon.',
    moons: 1,
    type: 'Terrestrial',
  },
  {
    id: 'mars',
    name: 'Mars',
    radius: 6,
    orbitRadius: 160,
    color: '#e07050',
    actualRadius: 3389.5,
    distanceFromSun: 227.9,
    orbitalPeriod: 687,
    orbitalSpeed: 0.53,
    description: 'The Red Planet, named for its iron oxide surface. It has the largest volcano in the solar system — Olympus Mons.',
    moons: 2,
    type: 'Terrestrial',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    radius: 18,
    orbitRadius: 220,
    color: '#d4a574',
    actualRadius: 69911,
    distanceFromSun: 778.5,
    orbitalPeriod: 4333,
    orbitalSpeed: 0.084,
    description: 'The largest planet in our solar system. Its Great Red Spot is a storm larger than Earth that has raged for centuries.',
    moons: 95,
    type: 'Gas Giant',
  },
  {
    id: 'saturn',
    name: 'Saturn',
    radius: 15,
    orbitRadius: 280,
    color: '#f0d890',
    actualRadius: 58232,
    distanceFromSun: 1434,
    orbitalPeriod: 10759,
    orbitalSpeed: 0.034,
    description: 'Famous for its stunning ring system made of ice and rock. It is the least dense planet — it could float in water!',
    moons: 146,
    type: 'Gas Giant',
  },
  {
    id: 'uranus',
    name: 'Uranus',
    radius: 11,
    orbitRadius: 340,
    color: '#7de8e8',
    actualRadius: 25362,
    distanceFromSun: 2871,
    orbitalPeriod: 30687,
    orbitalSpeed: 0.012,
    description: 'An ice giant that rotates on its side. Its blue-green color comes from methane in its atmosphere.',
    moons: 28,
    type: 'Ice Giant',
  },
  {
    id: 'neptune',
    name: 'Neptune',
    radius: 10,
    orbitRadius: 390,
    color: '#4060e0',
    actualRadius: 24622,
    distanceFromSun: 4495,
    orbitalPeriod: 60190,
    orbitalSpeed: 0.006,
    description: 'The windiest planet with speeds up to 2,100 km/h. It is the farthest planet from the Sun.',
    moons: 16,
    type: 'Ice Giant',
  },
];
