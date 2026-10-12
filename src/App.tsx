import { useState, useEffect, useRef, useCallback } from 'react';
import { planets, Planet } from './data/planets';

function App() {
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [angles, setAngles] = useState<number[]>(planets.map(() => Math.random() * Math.PI * 2));
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const anglesRef = useRef<number[]>(angles);

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

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center overflow-hidden">
      {/* Header */}
      <header className="w-full py-4 px-6 text-center bg-gradient-to-b from-gray-900 to-transparent">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-yellow-300 via-orange-400 to-blue-400 bg-clip-text text-transparent">
          🌌 Interactive Solar System Explorer
        </h1>
        <p className="text-gray-400 mt-1 text-sm md:text-base">
          Click on any planet to learn more about it
        </p>
      </header>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4 w-full max-w-7xl px-4 py-2 flex-1">
        {/* Solar System Visualization */}
        <div className="relative flex-shrink-0">
          <svg
            viewBox="0 0 900 900"
            className="w-[340px] h-[340px] sm:w-[450px] sm:h-[450px] md:w-[550px] md:h-[550px] lg:w-[600px] lg:h-[600px]"
          >
            {/* Stars background */}
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
            </defs>

            {/* Random stars */}
            {Array.from({ length: 80 }).map((_, i) => (
              <circle
                key={`star-${i}`}
                cx={Math.random() * 900}
                cy={Math.random() * 900}
                r={Math.random() * 1.2 + 0.3}
                fill="white"
                opacity={Math.random() * 0.6 + 0.2}
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
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            ))}

            {/* Sun */}
            <circle cx="450" cy="450" r="40" fill="url(#sunGlow)" />
            <circle cx="450" cy="450" r="25" fill="url(#sunCore)">
              <animate
                attributeName="r"
                values="24;26;24"
                dur="3s"
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
                    <ellipse
                      cx={pos.x}
                      cy={pos.y}
                      rx={planet.radius + 8}
                      ry={4}
                      fill="none"
                      stroke="#f0d890"
                      strokeWidth="2.5"
                      opacity="0.7"
                      transform={`rotate(-20 ${pos.x} ${pos.y})`}
                    />
                  )}

                  {/* Planet body */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={planet.radius}
                    fill={planet.color}
                    className="cursor-pointer transition-all duration-200"
                    onClick={() => setSelectedPlanet(planet)}
                    onMouseEnter={() => setHoveredPlanet(planet.id)}
                    onMouseLeave={() => setHoveredPlanet(null)}
                    style={{
                      filter: isSelected
                        ? `drop-shadow(0 0 8px ${planet.color})`
                        : isHovered
                        ? `drop-shadow(0 0 4px ${planet.color})`
                        : 'none',
                    }}
                  />

                  {/* Planet label on hover */}
                  {isHovered && !isSelected && (
                    <text
                      x={pos.x}
                      y={pos.y - planet.radius - 8}
                      textAnchor="middle"
                      fill="white"
                      fontSize="10"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      {planet.name}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Info Panel */}
        <div className="w-full lg:w-80 flex-shrink-0">
          {selectedPlanet ? (
            <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-xl p-5 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full shadow-lg"
                  style={{
                    backgroundColor: selectedPlanet.color,
                    boxShadow: `0 0 15px ${selectedPlanet.color}40`,
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

              <div className="space-y-3">
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
                      ? `${(selectedPlanet.orbitalPeriod / 365.25).toFixed(1)} years`
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
                className="mt-4 w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
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
              Planets
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {planets.map((planet) => (
                <button
                  key={planet.id}
                  onClick={() => setSelectedPlanet(planet)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all ${
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
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
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
          <div className="flex gap-2">
            {[0.5, 1, 2, 5].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
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
