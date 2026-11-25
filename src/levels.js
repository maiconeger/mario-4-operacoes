(function (ns) {
  const BIOMES = {
    sunny: {
      id: 'sunny',
      label: 'Reino Ensolarado',
      skyTop: '#38bdf8',
      skyBottom: '#bae6fd',
      groundTop: '#22c55e',
      groundBody: '#92400e',
      brickColor: '#c2410c',
      hillColor: '#4ade80',
      pitFill: '#0284c7',
      pitTop: '#7dd3fc',
      propType: 'clouds_bushes'
    },
    sunset: {
      id: 'sunset',
      label: 'Vale do Entardecer',
      skyTop: '#ea580c',
      skyBottom: '#fde68a',
      groundTop: '#eab308',
      groundBody: '#78350f',
      brickColor: '#b45309',
      hillColor: '#f59e0b',
      pitFill: '#0369a1',
      pitTop: '#fde047',
      propType: 'autumn'
    },
    desert: {
      id: 'desert',
      label: 'Deserto das Pirâmides',
      skyTop: '#0284c7',
      skyBottom: '#fef08a',
      groundTop: '#f59e0b',
      groundBody: '#b45309',
      brickColor: '#d97706',
      hillColor: '#fbbf24',
      pitFill: '#92400e',
      pitTop: '#fde68a',
      propType: 'pyramids'
    },
    forest: {
      id: 'forest',
      label: 'Floresta Encantada',
      skyTop: '#064e3b',
      skyBottom: '#34d399',
      groundTop: '#16a34a',
      groundBody: '#573b1d',
      brickColor: '#854d0e',
      hillColor: '#059669',
      pitFill: '#047857',
      pitTop: '#6ee7b7',
      propType: 'forest'
    },
    beach: {
      id: 'beach',
      label: 'Ilha Tropical',
      skyTop: '#0ea5e9',
      skyBottom: '#e0f2fe',
      groundTop: '#fde047',
      groundBody: '#d97706',
      brickColor: '#ea580c',
      hillColor: '#2dd4bf',
      pitFill: '#0284c7',
      pitTop: '#ffffff',
      propType: 'beach'
    },
    snow: {
      id: 'snow',
      label: 'Montanhas Nevadas',
      skyTop: '#1d4ed8',
      skyBottom: '#dbeafe',
      groundTop: '#f8fafc',
      groundBody: '#475569',
      brickColor: '#60a5fa',
      hillColor: '#93c5fd',
      pitFill: '#0369a1',
      pitTop: '#e0f2fe',
      propType: 'snow'
    },
    cave: {
      id: 'cave',
      label: 'Caverna dos Cristais',
      skyTop: '#0f172a',
      skyBottom: '#1e3a8a',
      groundTop: '#06b6d4',
      groundBody: '#1e293b',
      brickColor: '#3b82f6',
      hillColor: '#1d4ed8',
      pitFill: '#0e7490',
      pitTop: '#67e8f9',
      propType: 'crystals'
    },
    sky: {
      id: 'sky',
      label: 'Céu das Nuvens',
      skyTop: '#2563eb',
      skyBottom: '#f0f9ff',
      groundTop: '#f8fafc',
      groundBody: '#93c5fd',
      brickColor: '#f59e0b',
      hillColor: '#ffffff',
      pitFill: '#38bdf8',
      pitTop: '#e0f2fe',
      propType: 'rainbow'
    },
    volcano: {
      id: 'volcano',
      label: 'Vulcão Incandescente',
      skyTop: '#450a0a',
      skyBottom: '#dc2626',
      groundTop: '#57534e',
      groundBody: '#1c1917',
      brickColor: '#991b1b',
      hillColor: '#7f1d1d',
      pitFill: '#ea580c',
      pitTop: '#fde047',
      propType: 'volcano'
    },
    castle: {
      id: 'castle',
      label: 'Castelo Estrelado',
      skyTop: '#090d1e',
      skyBottom: '#3b0764',
      groundTop: '#94a3b8',
      groundBody: '#334155',
      brickColor: '#64748b',
      hillColor: '#312e81',
      pitFill: '#dc2626',
      pitTop: '#fde047',
      propType: 'castle_night'
    }
  };

  const LEVEL_CONFIGS = [
    { id: 0, biome: 'sunny', name: 'Fase 1: Campos da Soma', shortName: 'Campos da Soma', operation: 'add', opLabel: 'SOMA (+)', stations: 6 },
    { id: 1, biome: 'sunny', name: 'Fase 2: Colinas Alegres', shortName: 'Colinas Alegres', operation: 'add', opLabel: 'SOMA (+)', stations: 6 },
    { id: 2, biome: 'sunset', name: 'Fase 3: Ponte Dourada', shortName: 'Ponte Dourada', operation: 'add', opLabel: 'SOMA (+)', stations: 7 },
    { id: 3, biome: 'sunset', name: 'Fase 4: Mirante do Sol', shortName: 'Mirante do Sol', operation: 'add', opLabel: 'SOMA (+)', stations: 7 },

    { id: 4, biome: 'desert', name: 'Fase 5: Dunas da Subtração', shortName: 'Dunas da Subtração', operation: 'sub', opLabel: 'SUBTRAÇÃO (-)', stations: 6 },
    { id: 5, biome: 'desert', name: 'Fase 6: Oásis das Pirâmides', shortName: 'Oásis das Pirâmides', operation: 'sub', opLabel: 'SUBTRAÇÃO (-)', stations: 7 },
    { id: 6, biome: 'forest', name: 'Fase 7: Trilha dos Vagalumes', shortName: 'Trilha dos Vagalumes', operation: 'sub', opLabel: 'SUBTRAÇÃO (-)', stations: 7 },
    { id: 7, biome: 'forest', name: 'Fase 8: Bosque Antigo', shortName: 'Bosque Antigo', operation: 'sub', opLabel: 'SUBTRAÇÃO (-)', stations: 7 },

    { id: 8, biome: 'beach', name: 'Fase 9: Baía da Multiplicação', shortName: 'Baía da Multiplicação', operation: 'mul', opLabel: 'MULTIPLICAÇÃO (×)', stations: 6 },
    { id: 9, biome: 'beach', name: 'Fase 10: Ilha dos Coqueiros', shortName: 'Ilha dos Coqueiros', operation: 'mul', opLabel: 'MULTIPLICAÇÃO (×)', stations: 7 },
    { id: 10, biome: 'snow', name: 'Fase 11: Pico Gelado', shortName: 'Pico Gelado', operation: 'mul', opLabel: 'MULTIPLICAÇÃO (×)', stations: 7 },
    { id: 11, biome: 'snow', name: 'Fase 12: Geleira da Tabuada', shortName: 'Geleira da Tabuada', operation: 'mul', opLabel: 'MULTIPLICAÇÃO (×)', stations: 8 },

    { id: 12, biome: 'cave', name: 'Fase 13: Gruta da Divisão', shortName: 'Gruta da Divisão', operation: 'div', opLabel: 'DIVISÃO (÷)', stations: 6 },
    { id: 13, biome: 'cave', name: 'Fase 14: Salão dos Cristais', shortName: 'Salão dos Cristais', operation: 'div', opLabel: 'DIVISÃO (÷)', stations: 7 },
    { id: 14, biome: 'sky', name: 'Fase 15: Trilha do Arco-Íris', shortName: 'Trilha do Arco-Íris', operation: 'div', opLabel: 'DIVISÃO (÷)', stations: 7 },
    { id: 15, biome: 'sky', name: 'Fase 16: Reino das Nuvens', shortName: 'Reino das Nuvens', operation: 'div', opLabel: 'DIVISÃO (÷)', stations: 8 },

    { id: 16, biome: 'volcano', name: 'Fase 17: Encosta do Vulcão', shortName: 'Encosta do Vulcão', operation: 'mixed', opLabel: 'MISTO (+ - × ÷)', stations: 7 },
    { id: 17, biome: 'volcano', name: 'Fase 18: Cratera Ardente', shortName: 'Cratera Ardente', operation: 'mixed', opLabel: 'MISTO (+ - × ÷)', stations: 8 },
    { id: 18, biome: 'castle', name: 'Fase 19: Muralhas da Noite', shortName: 'Muralhas da Noite', operation: 'mixed', opLabel: 'MISTO (+ - × ÷)', stations: 8 },
    { id: 19, biome: 'castle', name: 'Fase 20: Grande Castelo Final', shortName: 'Grande Castelo Final', operation: 'mixed', opLabel: 'DESAFIO FINAL (+ - × ÷)', stations: 9 }
  ];

  function createCoinArc(startX, baseY, count, spacingX, arcHeight) {
    const list = [];
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const lift = Math.sin(t * Math.PI) * arcHeight;
      list.push({
        x: startX + i * spacingX,
        y: baseY - lift,
        collected: false
      });
    }
    return list;
  }

  function buildMathStation(type, anchorX, op, difficulty, id, speedBoost = 0) {
    const problem = ns.MathGen.generateProblem(op, difficulty);

    if (type === 'blocks') {
      return {
        id,
        type: 'blocks',
        triggerX: anchorX - 240,
        endX: anchorX + 380,
        gateX: anchorX + 330,
        solved: false,
        problem,
        items: problem.options.map((val, idx) => ({
          x: anchorX + idx * 105,
          y: 315,
          w: 52,
          h: 52,
          value: val,
          isCorrect: val === problem.answer,
          bumpY: 0,
          wrongTimer: 0,
          hit: false
        }))
      };
    }

    if (type === 'pipes') {
      return {
        id,
        type: 'pipes',
        triggerX: anchorX - 240,
        endX: anchorX + 430,
        gateX: anchorX + 390,
        solved: false,
        problem,
        items: problem.options.map((val, idx) => ({
          x: anchorX + idx * 125,
          y: 376,
          w: 68,
          h: 84,
          value: val,
          isCorrect: val === problem.answer,
          wrongTimer: 0,
          entered: false
        }))
      };
    }

    const arenaLeft = anchorX - 40;
    const arenaRight = anchorX + 340;
    const baseSpeed = 66 + speedBoost;
    return {
      id,
      type: 'enemies',
      triggerX: anchorX - 260,
      endX: arenaRight + 90,
      gateX: arenaRight + 45,
      arenaLeft,
      arenaRight,
      solved: false,
      problem,
      items: problem.options.map((val, idx) => ({
        x: anchorX + idx * 105,
        y: 418,
        w: 44,
        h: 42,
        vx: (idx % 2 === 0 ? 1 : -1) * baseSpeed,
        value: val,
        isCorrect: val === problem.answer,
        alive: true,
        wrongFlash: 0,
        minX: arenaLeft + 8,
        maxX: arenaRight - 52
      }))
    };
  }

  function buildCoinChallenge(anchorX, op, difficulty, id) {
    const problem = ns.MathGen.generateProblem(op, difficulty);
    return {
      id,
      signX: anchorX - 40,
      triggerX: anchorX - 200,
      endX: anchorX + 340,
      solved: false,
      problem,
      coins: problem.options.map((val, idx) => ({
        x: anchorX + 45 + idx * 95,
        y: idx === 1 ? 305 : 345,
        r: 21,
        value: val,
        isCorrect: val === problem.answer,
        collected: false,
        wrongTimer: 0
      }))
    };
  }

  function buildLevel(levelIndex, difficulty = '20') {
    const cfg = LEVEL_CONFIGS[levelIndex] || LEVEL_CONFIGS[0];
    const theme = BIOMES[cfg.biome] || BIOMES.sunny;
    const groundY = 460;
    const speedBoost = Math.min(34, levelIndex * 2);

    const pits = [];
    const platforms = [];
    const movingPlatforms = [];
    const springs = [];
    const heartBlocks = [];
    const coins = [];
    const patrolEnemies = [];
    const stations = [];
    const coinChallenges = [];
    const checkpointFlags = [];

    let cursor = 0;

    // 1. Intro Zone
    platforms.push({ x: 230, y: 375, w: 120, h: 26, kind: 'brick' });
    coins.push(...createCoinArc(245, 335, 3, 42, 16));
    if (levelIndex >= 1) {
      patrolEnemies.push({
        x: 340,
        y: 422,
        w: 36,
        h: 38,
        vx: -(62 + speedBoost),
        minX: 200,
        maxX: 430,
        alive: true
      });
    }
    cursor += 460;

    // Cycle of station types and platforming zones for rich variety
    const stationOrder = ['blocks', 'enemies', 'pipes'];
    const totalStations = cfg.stations;

    for (let sIdx = 0; sIdx < totalStations; sIdx++) {
      // Alternate platforming challenges before each station
      const pattern = (sIdx + levelIndex) % 4;

      if (pattern === 0) {
        // Pit + Bridge + High Spring Tower
        const pitX = cursor + 140;
        const pitW = 105 + Math.min(25, levelIndex * 2);
        pits.push({ x: pitX, w: pitW });
        platforms.push({ x: pitX - 15, y: 382, w: pitW + 30, h: 22, kind: 'bridge' });
        coins.push(...createCoinArc(pitX, 338, 3, 42, 22));

        springs.push({ x: cursor + 340, y: groundY - 20, w: 38, h: 20, anim: 0 });
        platforms.push({ x: cursor + 390, y: 270, w: 130, h: 26, kind: 'brick' });
        coins.push(...createCoinArc(cursor + 408, 225, 3, 42, 12));
        if (sIdx % 3 === 1) {
          heartBlocks.push({ x: cursor + 435, y: 175, w: 42, h: 42, used: false, bumpY: 0 });
        }
        cursor += 580;
      } else if (pattern === 1) {
        // Numbered Coin Challenge + Tiered Brick Platforms
        platforms.push({ x: cursor + 60, y: 374, w: 120, h: 26, kind: 'brick' });
        platforms.push({ x: cursor + 225, y: 300, w: 115, h: 26, kind: 'brick' });
        coinChallenges.push(
          buildCoinChallenge(cursor + 90, cfg.operation, difficulty, `cc-${sIdx}`)
        );
        patrolEnemies.push({
          x: cursor + 360,
          y: 422,
          w: 36,
          h: 38,
          vx: 65 + speedBoost,
          minX: cursor + 280,
          maxX: cursor + 520,
          alive: true
        });
        cursor += 590;
      } else if (pattern === 2) {
        // Wide Gap with Horizontal Moving Platform + Coins
        const pitX = cursor + 110;
        const pitW = 190;
        pits.push({ x: pitX, w: pitW });
        movingPlatforms.push({
          x: pitX + 10,
          y: 382,
          w: 96,
          h: 22,
          axis: 'x',
          baseX: pitX + 10,
          baseY: 382,
          range: 80,
          speed: 1.5 + levelIndex * 0.04,
          phase: sIdx,
          dx: 0,
          dy: 0
        });
        coins.push(...createCoinArc(pitX + 25, 330, 4, 42, 20));
        if (sIdx % 2 === 0) {
          heartBlocks.push({ x: cursor + 380, y: 325, w: 42, h: 42, used: false, bumpY: 0 });
        }
        cursor += 520;
      } else {
        // Vertical Elevator Platform + Bonus Sky Coins + Enemy Patrol
        platforms.push({ x: cursor + 60, y: 375, w: 110, h: 24, kind: 'brick' });
        movingPlatforms.push({
          x: cursor + 210,
          y: 340,
          w: 96,
          h: 22,
          axis: 'y',
          baseX: cursor + 210,
          baseY: 315,
          range: 70,
          speed: 1.7 + levelIndex * 0.03,
          phase: sIdx,
          dx: 0,
          dy: 0
        });
        platforms.push({ x: cursor + 340, y: 265, w: 130, h: 26, kind: 'brick' });
        coins.push(...createCoinArc(cursor + 355, 222, 3, 42, 14));
        patrolEnemies.push({
          x: cursor + 350,
          y: 422,
          w: 36,
          h: 38,
          vx: -(68 + speedBoost),
          minX: cursor + 200,
          maxX: cursor + 490,
          alive: true
        });
        cursor += 550;
      }

      // Add Checkpoint every 2 stations
      if (sIdx > 0 && sIdx % 2 === 0) {
        checkpointFlags.push({
          x: cursor + 55,
          y: groundY - 92,
          activated: false
        });
        cursor += 150;
      }

      // Math Station Zone (always on solid ground)
      const stType = stationOrder[(sIdx + levelIndex) % stationOrder.length];
      const anchorX = cursor + 90;
      const stOp = cfg.operation === 'mixed' ? 'mixed' : cfg.operation;
      stations.push(buildMathStation(stType, anchorX, stOp, difficulty, `st-${sIdx}`, speedBoost));
      cursor += stType === 'enemies' ? 560 : stType === 'pipes' ? 540 : 500;
    }

    // Final sprint with celebratory coin arc before Flagpole
    coins.push(...createCoinArc(cursor + 30, 412, 4, 40, 20));
    const finishX = cursor + 230;
    const totalWidth = finishX + 340;

    // Build solid ground segments around all pits
    const grounds = [];
    let groundCursor = 0;
    pits.sort((a, b) => a.x - b.x);
    for (const pit of pits) {
      if (pit.x > groundCursor) {
        grounds.push({ x: groundCursor, y: groundY, w: pit.x - groundCursor, h: 100 });
      }
      groundCursor = pit.x + pit.w;
    }
    grounds.push({ x: groundCursor, y: groundY, w: totalWidth - groundCursor, h: 100 });

    return {
      id: cfg.id,
      biome: cfg.biome,
      worldName: theme.label,
      name: cfg.name,
      shortName: cfg.shortName,
      operation: cfg.operation,
      opLabel: cfg.opLabel,
      theme,
      width: totalWidth,
      groundY,
      pits,
      grounds,
      platforms,
      movingPlatforms,
      springs,
      heartBlocks,
      coins,
      patrolEnemies,
      stations,
      coinChallenges,
      checkpointFlags,
      finishX,
      checkpoints: [90, ...checkpointFlags.map((cp) => cp.x)]
    };
  }

  ns.Levels = {
    count: LEVEL_CONFIGS.length,
    biomes: BIOMES,
    configs: LEVEL_CONFIGS,
    buildLevel
  };
})((window.MarioMath = window.MarioMath || {}));
