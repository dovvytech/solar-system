import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { planets, Planet } from './data/planets';

// Generate fixed star positions once
const generateStars = () => {
  const stars: { cx: number; cy: number; r: number; opacity: number }[] = [];
  for (let i = 0; i < 120; i++) {
    stars.push({
      cx: Math.random() * 900,
      cy: Math.random() * 900,
      r: Math.random() * 1.2 + 0.3,
      opacity: Math.random() * 0.6 + 0.2,
    });
  }
  return stars;
};

function App() {
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [angles, setAngles] = useState<number[]>(planets.map(() => Math.random() * Math.PI * 2));
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const anglesRef = useRef<number[]>(angles);

  const stars = useMemo(() => generateStars(), []);

  const animate = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const delta = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    const newAngles = anglesRef.current.map((angle, i) => {
      const baseSpeed = planets[i].orbitalSpeed * 0.5;
      return angle + baseSpeed * speed * delta;
    });

    anglesRef.current = newAngles;
    setAngles([...newAngles]);
    animationRef.current = requestAnimationFrame(animate);
  }, [speed]);

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = 0;
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, animate]);

  const getPlanetPosition = (planet: Planet, angle: number) => {
    const centerX = 450;
    const centerY = 450;
    return {
      x: centerX + Math.cos(angle) * planet.orbitRadius,
      y: centerY + Math.sin(angle) * planet.orbitRadius,
    };
  };

  const handleReset = () => {
    const newAngles = planets.map(() => Math.random() * Math.PI * 2);
    anglesRef.current = newAngles;
    setAngles(newAngles);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center overflow-hidden">
      {/* Header */}
      <header className="w-full py-4 px-6 text-center bg-gradient-to-b from-gray-900/80 to-transparent relative z-10">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-yellow-300 via-orange-400 to-blue-400 bg-clip-text text-transparent">
          🌌 Interactive Solar System Explorer
        </h1>
        <p className="text-gray-400 mt-1 text-xs sm:text-sm md:text-base">
          Click on any planet to learn more about it
        </p>
      </header>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4 w-full max-w-7xl px-4 py-2 flex-1">
        {/* Solar System Visualization */}
        <div className="relative flex-shrink-0">
          <svg
            viewBox="0 0 900 900"
            className="w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] md:w-[520px] md:h-[520px] lg:w-[580px] lg:h-[580px]"
          >
            {/* Definitions */}
            <defs>
              <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff7a0" stopOpacity="1" />
                <stop offset="30%" stopColor="#ffcc00" stopOpacity="0.8" />
                <stop offset="60%" stopColor="#ff8800" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#ff4400" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="sunCore" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#ffee55" />
                <stop offset="100%" stopColor="#ff8800" />
              </radialGradient>
              <filter id="planetGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Fixed stars background */}
            {stars.map((star, i) => (
              <circle
                key={`star-${i}`}
                cx={star.cx}
                cy={star.cy}
                r={star.r}
                fill="white"
                opacity={star.opacity}
              />
            ))}

            {/* Orbit paths */}
            {planets.map((planet) => (
              <circle
                key={`orbit-${planet.id}`}
                cx="450"
                cy="450"
                r={planet.orbitRadius}
                fill="none"
                stroke={selectedPlanet?.id === planet.id ? `${planet.color}40` : 'rgba(255,255,255,0.08)'}
                strokeWidth={selectedPlanet?.id === planet.id ? '1.5' : '1'}
                strokeDasharray="4 4"
              />
            ))}

            {/* Sun */}
            <circle cx="450" cy="450" r="45" fill="url(#sunGlow)" />
            <circle cx="450" cy="450" r="25" fill="url(#sunCore)">
              <animate
                attributeName="r"
                values="24;27;24"
                dur="3s"
                repeatCount="indefinite"
              />
            </circle>
            {/* Sun corona effect */}
            <circle cx="450" cy="450" r="32" fill="none" stroke="#ffaa00" strokeWidth="0.5" opacity="0.4">
              <animate
                attributeName="r"
                values="30;35;30"
                dur="4s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.4;0.1;0.4"
                dur="4s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Planets */}
            {planets.map((planet, index) => {
              const pos = getPlanetPosition(planet, angles[index]);
              const isSelected = selectedPlanet?.id === planet.id;
              const isHovered = hoveredPlanet === planet.id;

              return (
                <g key={planet.id}>
                  {/* Planet glow when selected/hovered */}
                  {(isSelected || isHovered) && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={planet.radius + 6}
                      fill="none"
                      stroke={planet.color}
                      strokeWidth="2"
                      opacity="0.6"
                    >
                      <animate
                        attributeName="r"
                        values={`${planet.radius + 4};${planet.radius + 8};${planet.radius + 4}`}
                        dur="1.5s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Saturn's rings */}
                  {planet.id === 'saturn' && (
                    <g transform={`translate(${pos.x}, ${pos.y})`}>
                      <ellipse
                        cx="0"
                        cy="0"
                        rx={planet.radius + 10}
                        ry={5}
                        fill="none"
                        stroke="#f0d890"
                        strokeWidth="3"
                        opacity="0.6"
                        transform="rotate(-20)"
                      />
                      <ellipse
                        cx="0"
                        cy="0"
                        rx={planet.radius + 7}
                        ry={3.5}
                        fill="none"
                        stroke="#d4b870"
                        strokeWidth="1.5"
                        opacity="0.4"
                        transform="rotate(-20)"
                      />
                    </g>
                  )}

                  {/* Planet body with gradient */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={planet.radius}
                    fill={planet.color}
                    className="cursor-pointer"
                    onClick={() => setSelectedPlanet(planet)}
                    onMouseEnter={() => setHoveredPlanet(planet.id)}
                    onMouseLeave={() => setHoveredPlanet(null)}
                    style={{
                      filter: isSelected
                        ? `drop-shadow(0 0 10px ${planet.color})`
                        : isHovered
                        ? `drop-shadow(0 0 5px ${planet.color})`
                        : 'none',
                      transition: 'filter 0.2s ease',
                    }}
                  />

                  {/* Planet highlight (3D effect) */}
                  <circle
                    cx={pos.x - planet.radius * 0.3}
                    cy={pos.y - planet.radius * 0.3}
                    r={planet.radius * 0.4}
                    fill="white"
                    opacity="0.15"
                    className="pointer-events-none"
                  />

                  {/* Planet label on hover */}
                  {isHovered && !isSelected && (
                    <text
                      x={pos.x}
                      y={pos.y - planet.radius - 10}
                      textAnchor="middle"
                      fill="white"
                      fontSize="11"
                      fontWeight="bold"
                      className="pointer-events-none"
                      style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
                    >
                      {planet.name}
                    </text>
                  )}

                  {/* Selected planet name tag */}
                  {isSelected && (
                    <g>
                      <rect
                        x={pos.x - 30}
                        y={pos.y - planet.radius - 22}
                        width="60"
                        height="16"
                        rx="4"
                        fill="rgba(0,0,0,0.7)"
                        stroke={planet.color}
                        strokeWidth="1"
                        className="pointer-events-none"
                      />
                      <text
                        x={pos.x}
                        y={pos.y - planet.radius - 10}
                        textAnchor="middle"
                        fill={planet.color}
                        fontSize="10"
                        fontWeight="bold"
                        className="pointer-events-none"
                      >
                        {planet.name}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Info Panel */}
        <div className="w-full lg:w-80 flex-shrink-0">
          {selectedPlanet ? (
            <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-xl p-5 shadow-2xl animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-full shadow-lg flex-shrink-0"
                  style={{
                    backgroundColor: selectedPlanet.color,
                    boxShadow: `0 0 20px ${selectedPlanet.color}50`,
                  }}
                />
                <div>
                  <h2 className="text-xl font-bold">{selectedPlanet.name}</h2>
                  <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">
                    {selectedPlanet.type}
                  </span>
                </div>
              </div>

              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                {selectedPlanet.description}
              </p>

              <div className="space-y-2">
                <InfoRow
                  icon="📏"
                  label="Radius"
                  value={`${selectedPlanet.actualRadius.toLocaleString()} km`}
                />
                <InfoRow
                  icon="☀️"
                  label="Distance from Sun"
                  value={`${selectedPlanet.distanceFromSun.toLocaleString()} million km`}
                />
                <InfoRow
                  icon="🔄"
                  label="Orbital Period"
                  value={
                    selectedPlanet.orbitalPeriod > 365
                      ? `${(selectedPlanet.orbitalPeriod / 365.25).toFixed(1)} years (${selectedPlanet.orbitalPeriod.toLocaleString()} days)`
                      : `${selectedPlanet.orbitalPeriod} days`
                  }
                />
                <InfoRow
                  icon="🌙"
                  label="Known Moons"
                  value={`${selectedPlanet.moons}`}
                />
                <InfoRow
                  icon="⚡"
                  label="Relative Speed"
                  value={`${selectedPlanet.orbitalSpeed}x (Earth = 1x)`}
                />
              </div>

              <button
                onClick={() => setSelectedPlanet(null)}
                className="mt-4 w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
          ) : (
            <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5 text-center">
              <div className="text-4xl mb-3">🪐</div>
              <h3 className="text-lg font-semibold text-gray-300 mb-2">
                Select a Planet
              </h3>
              <p className="text-gray-500 text-sm">
                Click on any planet in the solar system to view detailed information about it.
              </p>
            </div>
          )}

          {/* Planet List */}
          <div className="mt-4 bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
              All Planets
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {planets.map((planet) => (
                <button
                  key={planet.id}
                  onClick={() => setSelectedPlanet(planet)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all cursor-pointer ${
                    selectedPlanet?.id === planet.id
                      ? 'bg-gray-700 ring-1 ring-gray-500'
                      : 'bg-gray-800/50 hover:bg-gray-700/50'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: planet.color }}
                  />
                  <span className="text-gray-300 truncate">{planet.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="w-full max-w-2xl px-4 pb-6 pt-2">
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all cursor-pointer ${
              isPlaying
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isPlaying ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                Pause
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
                Play
              </>
            )}
          </button>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 text-white transition-all cursor-pointer"
            title="Reset planet positions"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>

          {/* Speed Control */}
          <div className="flex-1 w-full sm:w-auto">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm text-gray-400">Animation Speed</label>
              <span className="text-sm font-mono text-orange-400">{speed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="10"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0.1x</span>
              <span>5x</span>
              <span>10x</span>
            </div>
          </div>

          {/* Speed Presets */}
          <div className="flex gap-2 flex-wrap justify-center">
            {[0.5, 1, 2, 5].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer ${
                  Math.abs(speed - s) < 0.05
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-3 text-center text-xs text-gray-600">
        Solar System Explorer • Educational Demo
      </footer>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-3 py-2">
      <span className="text-lg">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-sm font-medium text-gray-200 truncate">{value}</div>
      </div>
    </div>
  );
}

export default App;
