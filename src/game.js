(function (ns) {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  // UI Elements
  const overlayMenu = document.getElementById('overlay-menu');
  const overlayPause = document.getElementById('overlay-pause');
  const overlayResult = document.getElementById('overlay-result');

  const btnExpand = document.getElementById('btn-expand');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  const btnSound = document.getElementById('btn-sound');
  const btnPause = document.getElementById('btn-pause');
  const btnMenu = document.getElementById('btn-menu');
  const btnResume = document.getElementById('btn-resume');
  const btnRestartLevel = document.getElementById('btn-restart-level');
  const btnBackMenu = document.getElementById('btn-back-menu');
  const btnNextLevel = document.getElementById('btn-next-level');
  const btnRetryLevel = document.getElementById('btn-retry-level');
  const btnResultMenu = document.getElementById('btn-result-menu');
  const rangePills = document.querySelectorAll('.range-pill');
  const menuMainView = document.getElementById('menu-main-view');
  const menuMapView = document.getElementById('menu-map-view');
  const btnOpenMap = document.getElementById('btn-open-map');
  const btnCloseMap = document.getElementById('btn-close-map');
  const worldMapGrid = document.getElementById('world-map-grid');
  const mapProgressBadge = document.getElementById('map-progress-badge');
  const btnContinueAdventure = document.getElementById('btn-continue-adventure');
  const continueTitle = document.getElementById('continue-title');
  const continueDesc = document.getElementById('continue-desc');

  const resultBadge = document.getElementById('result-badge');
  const resultTitle = document.getElementById('result-title');
  const resultMessage = document.getElementById('result-message');
  const statScore = document.getElementById('stat-score');
  const statCorrect = document.getElementById('stat-correct');
  const statCoins = document.getElementById('stat-coins');

  const W = canvas.width;   // 960
  const H = canvas.height;  // 540
  const GRAVITY = 1400;
  const MOVE_ACCEL = 2400;
  const MAX_SPEED = 310;
  const FRICTION = 2000;
  const JUMP_FORCE = -685;

  const state = {
    screen: 'menu', // 'menu' | 'playing' | 'paused' | 'result'
    mode: 'adventure', // 'adventure' | 'single'
    difficulty: '20',
    levelIndex: 0,
    level: null,
    score: 0,
    coins: 0,
    correctCount: 0,
    streak: 0,
    hearts: 4,
    maxHearts: 4,
    cameraX: 0,
    timeElapsed: 0,
    particles: [],
    floatingTexts: [],
    activePrompt: null
  };

  const player = {
    x: 90,
    y: 380,
    w: 34,
    h: 44,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    standingPlatform: null,
    coyoteTimer: 0,
    jumpBuffer: 0,
    invulnTimer: 0,
    walkFrame: 0,
    safeX: 90,
    safeY: 380
  };

  const STORAGE_KEY = 'superMathBros_progress_v1';

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { nextLevel: 0, completed: [] };
      const parsed = JSON.parse(raw);
      return {
        nextLevel: Number(parsed.nextLevel) || 0,
        completed: Array.isArray(parsed.completed) ? parsed.completed : []
      };
    } catch {
      return { nextLevel: 0, completed: [] };
    }
  }

  function saveProgress(completedIndex) {
    try {
      const prog = loadProgress();
      if (!prog.completed.includes(completedIndex)) {
        prog.completed.push(completedIndex);
      }
      prog.nextLevel = Math.min(ns.Levels.count - 1, Math.max(prog.nextLevel, completedIndex + 1));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prog));
    } catch {
      // Ignore storage failures in restricted contexts
    }
  }

  function refreshMenuUI() {
    const prog = loadProgress();
    if (prog.completed.length > 0 && prog.nextLevel < ns.Levels.count) {
      const targetCfg = ns.Levels.configs[prog.nextLevel] || ns.Levels.configs[0];
      btnContinueAdventure.style.display = 'flex';
      continueTitle.textContent = `Continuar: Fase ${prog.nextLevel + 1}`;
      continueDesc.textContent = `${targetCfg.shortName} (${prog.completed.length}/${ns.Levels.count} concluídas)`;
      btnContinueAdventure.dataset.level = String(prog.nextLevel);
    } else {
      btnContinueAdventure.style.display = 'none';
    }

    if (mapProgressBadge) {
      mapProgressBadge.textContent = `${prog.completed.length}/${ns.Levels.count} concluídas`;
    }

    if (worldMapGrid) {
      worldMapGrid.innerHTML = '';
      ns.Levels.configs.forEach((cfg, idx) => {
        const biome = ns.Levels.biomes[cfg.biome];
        const done = prog.completed.includes(idx);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `map-level-btn${done ? ' completed' : ''}`;
        btn.innerHTML = `
          <div class="map-level-top">
            <span>FASE ${idx + 1}</span>
            <span>${done ? '✓' : '▶'}</span>
          </div>
          <div class="map-level-name">${cfg.shortName}</div>
          <div class="map-level-meta">${biome ? biome.label : ''} • ${cfg.opLabel}</div>
        `;
        btn.addEventListener('click', () => {
          state.mode = 'adventure';
          startLevel(idx, false);
        });
        worldMapGrid.appendChild(btn);
      });
    }
  }

  const keys = {
    left: false,
    right: false,
    jump: false,
    jumpJustPressed: false
  };

  // --- Helpers ---
  function setOverlay(which) {
    overlayMenu.classList.toggle('active', which === 'menu');
    overlayPause.classList.toggle('active', which === 'pause');
    overlayResult.classList.toggle('active', which === 'result');
  }

  function addFloatingText(x, y, text, color = '#fde047', size = 18) {
    state.floatingTexts.push({
      x,
      y,
      text,
      color,
      size,
      life: 1.1,
      maxLife: 1.1
    });
  }

  function spawnParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 90 + Math.random() * 190;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        size: 4 + Math.random() * 5,
        color,
        life: 0.55 + Math.random() * 0.3
      });
    }
  }

  function aabb(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  // --- Game Lifecycle ---
  function startLevel(index, keepStats = false) {
    state.levelIndex = index;
    const activePill = document.querySelector('.range-pill.active');
    state.difficulty = activePill ? activePill.dataset.range : state.difficulty || '20';
    state.level = ns.Levels.buildLevel(index, state.difficulty);
    state.cameraX = 0;
    state.particles = [];
    state.floatingTexts = [];
    state.activePrompt = null;

    if (!keepStats) {
      state.score = 0;
      state.coins = 0;
      state.correctCount = 0;
      state.streak = 0;
      state.hearts = state.maxHearts;
    } else {
      state.hearts = Math.min(state.maxHearts, Math.max(state.hearts, 3));
    }

    player.x = 90;
    player.y = state.level.groundY - player.h;
    player.vx = 0;
    player.vy = 0;
    player.facing = 1;
    player.onGround = true;
    player.standingPlatform = null;
    player.coyoteTimer = 0;
    player.jumpBuffer = 0;
    player.invulnTimer = 0.8;
    player.safeX = 90;
    player.safeY = state.level.groundY - player.h;

    state.screen = 'playing';
    setOverlay(null);
  }

  function showResult(isVictory, reason) {
    state.screen = 'result';
    statScore.textContent = state.score;
    statCorrect.textContent = state.correctCount;
    statCoins.textContent = state.coins;

    if (isVictory) {
      saveProgress(state.levelIndex);
      refreshMenuUI();
      ns.Audio.levelClear();
      const hasNext = state.mode === 'adventure' && state.levelIndex < ns.Levels.count - 1;
      resultBadge.className = 'result-badge';

      if (hasNext) {
        resultBadge.textContent = `★ FASE ${state.levelIndex + 1}/${ns.Levels.count} CONCLUÍDA!`;
        resultTitle.textContent = `${state.level.shortName} Completa!`;
        resultMessage.textContent = 'Excelente raciocínio! Pronto para a próxima etapa?';
        btnNextLevel.style.display = 'block';
      } else if (state.mode === 'adventure') {
        resultBadge.textContent = '🏆 CAMPEÃO DAS 4 OPERAÇÕES!';
        resultTitle.textContent = 'Você Zerou as 20 Fases!';
        resultMessage.textContent = 'Incrível! Você conquistou todos os 10 cenários de Soma, Subtração, Multiplicação e Divisão!';
        btnNextLevel.style.display = 'none';
      } else {
        resultBadge.textContent = '★ FASE CONCLUÍDA!';
        resultTitle.textContent = 'Mandou Muito Bem!';
        resultMessage.textContent = 'Você superou todos os desafios matemáticos desta fase!';
        btnNextLevel.style.display = 'none';
      }
    } else {
      ns.Audio.gameOver();
      resultBadge.className = 'result-badge danger';
      resultBadge.textContent = 'FIM DE JOGO';
      resultTitle.textContent = 'Quase lá!';
      resultMessage.textContent = reason || 'Suas vidas acabaram, mas você pode tentar novamente!';
      btnNextLevel.style.display = 'none';
    }

    setOverlay('result');
  }

  function loseHeart(fellInPit = false) {
    if (player.invulnTimer > 0 && !fellInPit) return;

    state.hearts -= 1;
    state.streak = 0;
    ns.Audio.wrong();

    if (state.hearts <= 0) {
      showResult(false, fellInPit ? 'Cuidado com os buracos no caminho!' : 'Fique atento às contas e aos inimigos!');
      return;
    }

    if (fellInPit) {
      // Respawn at last checkpoint
      let cpX = 90;
      for (const cp of state.level.checkpoints) {
        if (player.x >= cp) cpX = cp;
      }
      player.x = cpX;
      player.y = state.level.groundY - player.h - 20;
      player.vx = 0;
      player.vy = 0;
      addFloatingText(player.x + 15, player.y - 10, '-1 ♥', '#f87171', 20);
    } else {
      addFloatingText(player.x + 15, player.y - 12, '-1 ♥', '#f87171', 20);
    }

    player.invulnTimer = 1.4;
  }

  function rewardCorrect(x, y, points, label = 'ACERTOU!') {
    state.correctCount += 1;
    state.streak += 1;
    const bonus = Math.min(state.streak - 1, 5) * 20;
    const total = points + bonus;
    state.score += total;
    ns.Audio.correct();
    spawnParticles(x, y, '#fde047', 18);
    spawnParticles(x, y, '#4ade80', 10);
    addFloatingText(x, y - 16, `${label} +${total}`, '#4ade80', 20);
  }

  // --- Solid Colliders ---
  function getSolids() {
    const lvl = state.level;
    const solids = [];

    for (const g of lvl.grounds) {
      solids.push({ x: g.x, y: g.y, w: g.w, h: g.h, kind: 'ground' });
    }
    for (const p of lvl.platforms) {
      solids.push({ x: p.x, y: p.y, w: p.w, h: p.h, kind: 'platform' });
    }
    for (const mp of lvl.movingPlatforms) {
      solids.push({ x: mp.x, y: mp.y, w: mp.w, h: mp.h, kind: 'movingPlatform', ref: mp });
    }
    for (const hb of lvl.heartBlocks) {
      solids.push({ x: hb.x, y: hb.y + hb.bumpY, w: hb.w, h: hb.h, kind: 'heartBlock', ref: hb });
    }
    for (const st of lvl.stations) {
      if (st.type === 'blocks') {
        for (const blk of st.items) {
          solids.push({
            x: blk.x,
            y: blk.y + blk.bumpY,
            w: blk.w,
            h: blk.h,
            kind: 'mathBlock',
            station: st,
            ref: blk
          });
        }
      } else if (st.type === 'pipes') {
        for (const pipe of st.items) {
          solids.push({
            x: pipe.x,
            y: pipe.y,
            w: pipe.w,
            h: pipe.h,
            kind: 'mathPipe',
            station: st,
            ref: pipe
          });
        }
      }
      if (!st.solved) {
        solids.push({
          x: st.gateX,
          y: 120,
          w: 22,
          h: lvl.groundY - 120,
          kind: 'gate',
          station: st
        });
      }
    }
    return solids;
  }

  function handleBlockBump(solid) {
    if (solid.kind === 'heartBlock') {
      const hb = solid.ref;
      hb.bumpY = -10;
      if (!hb.used) {
        hb.used = true;
        if (state.hearts < state.maxHearts) {
          state.hearts += 1;
          ns.Audio.heart();
          spawnParticles(hb.x + hb.w / 2, hb.y, '#fb7185', 14);
          addFloatingText(hb.x + 20, hb.y - 12, '+1 VIDA ♥', '#fb7185', 18);
        } else {
          state.score += 100;
          ns.Audio.coin();
          addFloatingText(hb.x + 20, hb.y - 12, '+100 PTS', '#fde047', 18);
        }
      } else {
        ns.Audio.bump();
      }
      return;
    }

    if (solid.kind === 'mathBlock') {
      const blk = solid.ref;
      const st = solid.station;
      blk.bumpY = -12;

      if (st.solved) {
        ns.Audio.bump();
        return;
      }

      if (blk.isCorrect) {
        blk.hit = true;
        st.solved = true;
        rewardCorrect(blk.x + blk.w / 2, blk.y, 150, 'EXATO!');
      } else {
        if (blk.wrongTimer <= 0) {
          blk.wrongTimer = 1.1;
          addFloatingText(blk.x + blk.w / 2, blk.y - 12, 'OPS!', '#f87171', 18);
          loseHeart(false);
        } else {
          ns.Audio.bump();
        }
      }
    }
  }

  function handlePipeStep(solid) {
    const st = solid.station;
    const pipe = solid.ref;
    if (st.solved) return;

    if (pipe.isCorrect) {
      pipe.entered = true;
      st.solved = true;
      ns.Audio.pipe();
      rewardCorrect(pipe.x + pipe.w / 2, pipe.y, 150, 'CANO CERTO!');
    } else if (pipe.wrongTimer <= 0) {
      pipe.wrongTimer = 1.3;
      addFloatingText(pipe.x + pipe.w / 2, pipe.y - 12, 'CANO ERRADO!', '#f87171', 16);
      loseHeart(false);
    }
  }

  // --- Update Loop ---
  function update(dt) {
    if (state.screen !== 'playing') return;

    const lvl = state.level;
    state.timeElapsed += dt;

    // Update moving platforms
    for (const mp of lvl.movingPlatforms) {
      const prevMpX = mp.x;
      const prevMpY = mp.y;
      if (mp.axis === 'x') {
        mp.x = mp.baseX + (0.5 + 0.5 * Math.sin(state.timeElapsed * mp.speed + mp.phase)) * mp.range;
      } else {
        mp.y = mp.baseY + Math.sin(state.timeElapsed * mp.speed + mp.phase) * mp.range;
      }
      mp.dx = mp.x - prevMpX;
      mp.dy = mp.y - prevMpY;
    }

    if (player.standingPlatform) {
      player.x += player.standingPlatform.dx;
      player.y += player.standingPlatform.dy;
    }

    if (player.invulnTimer > 0) player.invulnTimer = Math.max(0, player.invulnTimer - dt);
    if (player.coyoteTimer > 0) player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
    if (player.jumpBuffer > 0) player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);

    if (keys.jumpJustPressed) {
      player.jumpBuffer = 0.14;
      keys.jumpJustPressed = false;
    }

    // Horizontal Movement
    if (keys.left && !keys.right) {
      player.vx -= MOVE_ACCEL * dt;
      player.facing = -1;
    } else if (keys.right && !keys.left) {
      player.vx += MOVE_ACCEL * dt;
      player.facing = 1;
    } else {
      const drop = FRICTION * dt;
      if (Math.abs(player.vx) <= drop) player.vx = 0;
      else player.vx -= Math.sign(player.vx) * drop;
    }
    player.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, player.vx));

    // Jump execution with coyote time & buffer
    if (player.jumpBuffer > 0 && player.coyoteTimer > 0) {
      player.vy = JUMP_FORCE;
      player.onGround = false;
      player.coyoteTimer = 0;
      player.jumpBuffer = 0;
      ns.Audio.jump();
    }

    // Variable jump height when button released early
    if (!keys.jump && player.vy < -320) {
      player.vy += GRAVITY * 0.65 * dt;
    }

    // Gravity
    player.vy = Math.min(900, player.vy + GRAVITY * dt);

    const solids = getSolids();

    // Move X & resolve X collisions
    player.x += player.vx * dt;
    if (player.x < 0) {
      player.x = 0;
      player.vx = 0;
    }
    if (player.x + player.w > lvl.width) {
      player.x = lvl.width - player.w;
      player.vx = 0;
    }

    for (const s of solids) {
      if (aabb(player, s)) {
        // Ledge forgiveness: let player step onto top if feet are near the ledge
        if (s.kind !== 'gate' && player.vy >= 0 && player.y + player.h - s.y <= 12) {
          continue;
        }
        if (player.vx > 0) {
          player.x = s.x - player.w;
          player.vx = 0;
        } else if (player.vx < 0) {
          player.x = s.x + s.w;
          player.vx = 0;
        }
      }
    }

    // Move Y & resolve Y collisions
    const prevY = player.y;
    player.y += player.vy * dt;
    player.onGround = false;
    player.standingPlatform = null;

    for (const s of solids) {
      if (aabb(player, s)) {
        if (player.vy >= 0 && prevY + player.h <= s.y + 20) {
          player.y = s.y - player.h;
          player.vy = 0;
          player.onGround = true;
          player.coyoteTimer = 0.12;
          if (s.kind === 'movingPlatform') player.standingPlatform = s.ref;

          if (s.kind === 'mathPipe') {
            handlePipeStep(s);
          }
        } else if (player.vy < 0 && prevY >= s.y + s.h - 16) {
          player.y = s.y + s.h;
          player.vy = 40;
          handleBlockBump(s);
        } else if (player.vy >= 0) {
          player.y = s.y - player.h;
          player.vy = 0;
          player.onGround = true;
          player.coyoteTimer = 0.12;
          if (s.kind === 'movingPlatform') player.standingPlatform = s.ref;

          if (s.kind === 'mathPipe') {
            handlePipeStep(s);
          }
        }
      }
    }

    // Bounce Springs
    for (const sp of lvl.springs) {
      if (sp.anim > 0) sp.anim = Math.max(0, sp.anim - dt);
      if (player.vy >= 0 && aabb(player, sp)) {
        player.y = sp.y - player.h;
        player.vy = -940;
        player.onGround = false;
        player.standingPlatform = null;
        sp.anim = 0.25;
        ns.Audio.spring();
        spawnParticles(sp.x + sp.w / 2, sp.y, '#fde047', 10);
        addFloatingText(sp.x + sp.w / 2, sp.y - 12, 'BOING!', '#fde047', 16);
      }
    }

    // Checkpoint Flags
    for (const cp of lvl.checkpointFlags) {
      if (!cp.activated && player.x + player.w >= cp.x) {
        cp.activated = true;
        ns.Audio.checkpoint();
        spawnParticles(cp.x + 8, cp.y + 18, '#4ade80', 12);
        addFloatingText(cp.x + 12, cp.y - 10, 'CHECKPOINT!', '#4ade80', 17);
      }
    }

    if (player.onGround && Math.abs(player.vx) > 20) {
      player.walkFrame += dt * 11;
    } else {
      player.walkFrame = 0;
    }

    // Fall into pit check
    if (player.y > H + 40) {
      loseHeart(true);
      return;
    }

    // Animate block bumps & timers
    for (const hb of lvl.heartBlocks) {
      if (hb.bumpY < 0) hb.bumpY = Math.min(0, hb.bumpY + 70 * dt);
    }

    for (const st of lvl.stations) {
      if (st.type === 'blocks') {
        for (const blk of st.items) {
          if (blk.bumpY < 0) blk.bumpY = Math.min(0, blk.bumpY + 75 * dt);
          if (blk.wrongTimer > 0) blk.wrongTimer = Math.max(0, blk.wrongTimer - dt);
        }
      } else if (st.type === 'pipes') {
        for (const pipe of st.items) {
          if (pipe.wrongTimer > 0) pipe.wrongTimer = Math.max(0, pipe.wrongTimer - dt);
        }
      } else if (st.type === 'enemies' && !st.solved) {
        for (const en of st.items) {
          if (!en.alive) continue;
          if (en.wrongFlash > 0) en.wrongFlash = Math.max(0, en.wrongFlash - dt);
          en.x += en.vx * dt;
          if (en.x <= en.minX) {
            en.x = en.minX;
            en.vx = Math.abs(en.vx);
          } else if (en.x >= en.maxX) {
            en.x = en.maxX;
            en.vx = -Math.abs(en.vx);
          }

          if (aabb(player, en)) {
            const isStomp = player.vy > 0 && prevY + player.h <= en.y + 22;
            if (isStomp) {
              player.vy = -420;
              if (en.isCorrect) {
                st.solved = true;
                st.items.forEach((other) => {
                  other.alive = false;
                  spawnParticles(other.x + 20, other.y + 20, '#fde047', 8);
                });
                rewardCorrect(en.x + en.w / 2, en.y, 150, 'INIMIGO CERTO!');
              } else {
                if (en.wrongFlash <= 0) {
                  en.wrongFlash = 1.0;
                  addFloatingText(en.x + 20, en.y - 12, 'NÚMERO ERRADO!', '#f87171', 16);
                  loseHeart(false);
                } else {
                  ns.Audio.stomp();
                }
              }
            } else if (player.invulnTimer <= 0) {
              player.vy = -250;
              player.vx = player.x < en.x ? -220 : 220;
              loseHeart(false);
            }
          }
        }
      }
    }

    // Regular patrolling enemies
    for (const en of lvl.patrolEnemies) {
      if (!en.alive) continue;
      en.x += en.vx * dt;
      if (en.x <= en.minX) {
        en.x = en.minX;
        en.vx = Math.abs(en.vx);
      } else if (en.x >= en.maxX) {
        en.x = en.maxX;
        en.vx = -Math.abs(en.vx);
      }
      if (aabb(player, en)) {
        const isStomp = player.vy > 0 && prevY + player.h <= en.y + 20;
        if (isStomp) {
          en.alive = false;
          player.vy = -380;
          state.score += 30;
          ns.Audio.stomp();
          spawnParticles(en.x + 18, en.y + 18, '#f59e0b', 10);
          addFloatingText(en.x + 18, en.y - 10, '+30', '#fde047', 16);
        } else if (player.invulnTimer <= 0) {
          player.vy = -240;
          player.vx = player.x < en.x ? -200 : 200;
          loseHeart(false);
        }
      }
    }

    // Regular Coins
    const playerCx = player.x + player.w / 2;
    const playerCy = player.y + player.h / 2;
    for (const c of lvl.coins) {
      if (c.collected) continue;
      const dx = playerCx - c.x;
      const dy = playerCy - c.y;
      if (dx * dx + dy * dy < 28 * 28) {
        c.collected = true;
        state.coins += 1;
        state.score += 10;
        ns.Audio.coin();
        spawnParticles(c.x, c.y, '#facc15', 6);
      }
    }

    // Numbered Coin Challenges
    for (const cc of lvl.coinChallenges) {
      if (cc.solved) continue;
      for (const coin of cc.coins) {
        if (coin.collected) continue;
        const dx = playerCx - coin.x;
        const dy = playerCy - coin.y;
        if (dx * dx + dy * dy < 34 * 34) {
          coin.collected = true;
          if (coin.isCorrect) {
            cc.solved = true;
            state.coins += 3;
            rewardCorrect(coin.x, coin.y, 100, 'MOEDA CERTA!');
          } else {
            ns.Audio.bump();
            addFloatingText(coin.x, coin.y - 14, 'OPS!', '#fca5a5', 16);
          }
        }
      }
    }

    // Active Math Prompt determination for HUD Banner
    state.activePrompt = null;
    for (const st of lvl.stations) {
      if (!st.solved && player.x >= st.triggerX && player.x <= st.endX) {
        const hintMap = {
          blocks: 'Bata por baixo no bloco ? com a resposta certa!',
          enemies: 'Pule em cima do inimigo com a resposta certa!',
          pipes: 'Suba no cano verde com a resposta certa!'
        };
        state.activePrompt = {
          text: st.problem.text,
          hint: hintMap[st.type],
          kind: st.type
        };
        break;
      }
    }
    if (!state.activePrompt) {
      for (const cc of lvl.coinChallenges) {
        if (!cc.solved && player.x >= cc.triggerX && player.x <= cc.endX) {
          state.activePrompt = {
            text: cc.problem.text,
            hint: 'Pegue a moeda dourada com o resultado certo! (Bônus)',
            kind: 'coins'
          };
          break;
        }
      }
    }

    // Check Finish Flagpole
    if (player.x + player.w >= lvl.finishX && player.x <= lvl.finishX + 36) {
      state.score += 200 + state.hearts * 50;
      showResult(true);
      return;
    }

    // Particles & Floating Texts
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 450 * dt;
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }

    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const ft = state.floatingTexts[i];
      ft.y -= 36 * dt;
      ft.life -= dt;
      if (ft.life <= 0) state.floatingTexts.splice(i, 1);
    }

    // Smooth camera follow
    const targetCamX = Math.max(0, Math.min(lvl.width - W, player.x - W * 0.36));
    state.cameraX += (targetCamX - state.cameraX) * Math.min(1, dt * 8);
  }

  // --- Drawing Functions ---
  function drawBackground(lvl) {
    const t = lvl.theme;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, t.skyTop);
    grad.addColorStop(1, t.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const prop = t.propType;

    // Sky accents (Sun, Moon, Stars, Rainbow)
    if (prop === 'sunset' || prop === 'autumn' || prop === 'pyramids') {
      ctx.fillStyle = prop === 'pyramids' ? 'rgba(254, 240, 138, 0.9)' : 'rgba(253, 224, 71, 0.85)';
      ctx.beginPath();
      ctx.arc(790, 95, 42, 0, Math.PI * 2);
      ctx.fill();
    } else if (prop === 'castle_night') {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 45; i++) {
        const sx = (i * 197) % W;
        const sy = 24 + ((i * 83) % 240);
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(state.timeElapsed * 2 + i));
        ctx.globalAlpha = tw;
        ctx.fillRect(sx, sy, 2.5, 2.5);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fef9c3';
      ctx.beginPath();
      ctx.arc(810, 92, 34, 0, Math.PI * 2);
      ctx.fill();
    } else if (prop === 'rainbow') {
      const colors = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#8b5cf6'];
      ctx.globalAlpha = 0.32;
      colors.forEach((col, idx) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(W / 2, lvl.groundY + 40, 320 - idx * 10, Math.PI, 0);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }

    // Parallax Midground Shapes by Biome
    if (prop === 'pyramids') {
      ctx.fillStyle = '#d97706';
      for (let i = 0; i < 7; i++) {
        const px = ((i * 380 - state.cameraX * 0.22) % (W + 450)) - 140;
        const size = 140 + (i % 2) * 50;
        ctx.beginPath();
        ctx.moveTo(px, lvl.groundY);
        ctx.lineTo(px + size, lvl.groundY - size * 0.85);
        ctx.lineTo(px + size * 2, lvl.groundY);
        ctx.closePath();
        ctx.fill();
      }
      // Desert cacti
      ctx.fillStyle = '#15803d';
      for (let i = 0; i < 8; i++) {
        const cx = ((i * 310 - state.cameraX * 0.45) % (W + 340)) - 80;
        ctx.fillRect(cx, lvl.groundY - 54, 12, 54);
        ctx.fillRect(cx - 10, lvl.groundY - 40, 10, 8);
        ctx.fillRect(cx - 10, lvl.groundY - 50, 8, 12);
        ctx.fillRect(cx + 12, lvl.groundY - 34, 10, 8);
        ctx.fillRect(cx + 14, lvl.groundY - 46, 8, 14);
      }
    } else if (prop === 'snow') {
      // Jagged icy mountains
      for (let i = 0; i < 8; i++) {
        const mx = ((i * 310 - state.cameraX * 0.22) % (W + 380)) - 120;
        const mh = 160 + (i % 3) * 45;
        ctx.fillStyle = '#93c5fd';
        ctx.beginPath();
        ctx.moveTo(mx, lvl.groundY);
        ctx.lineTo(mx + 110, lvl.groundY - mh);
        ctx.lineTo(mx + 220, lvl.groundY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(mx + 110, lvl.groundY - mh);
        ctx.lineTo(mx + 78, lvl.groundY - mh + 48);
        ctx.lineTo(mx + 142, lvl.groundY - mh + 48);
        ctx.closePath();
        ctx.fill();
      }
      // Falling snow
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 36; i++) {
        const sx = ((i * 97 + state.timeElapsed * 25) % W);
        const sy = ((i * 61 + state.timeElapsed * (45 + (i % 3) * 15)) % (lvl.groundY - 10));
        ctx.beginPath();
        ctx.arc(sx, sy, 2.5 + (i % 2), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (prop === 'forest') {
      // Layered forest trees + fireflies
      for (let i = 0; i < 12; i++) {
        const tx = ((i * 230 - state.cameraX * 0.3) % (W + 280)) - 90;
        ctx.fillStyle = '#573b1d';
        ctx.fillRect(tx + 20, lvl.groundY - 90, 14, 90);
        ctx.fillStyle = i % 2 === 0 ? '#059669' : '#10b981';
        ctx.beginPath();
        ctx.arc(tx + 27, lvl.groundY - 105, 42, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 18; i++) {
        const fx = ((i * 140 - state.cameraX * 0.4 + Math.sin(state.timeElapsed + i) * 20) % W + W) % W;
        const fy = 180 + ((i * 53) % 240) + Math.cos(state.timeElapsed * 2 + i) * 12;
        ctx.fillStyle = `rgba(253, 224, 71, ${0.4 + 0.5 * Math.abs(Math.sin(state.timeElapsed * 3 + i))})`;
        ctx.beginPath();
        ctx.arc(fx, fy, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (prop === 'beach') {
      // Ocean strip on horizon
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, lvl.groundY - 46, W, 46);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      for (let i = 0; i < 10; i++) {
        const wx = ((i * 210 - state.cameraX * 0.35) % (W + 240)) - 60;
        ctx.fillRect(wx, lvl.groundY - 34 + (i % 2) * 10, 48, 4);
      }
      // Palm trees
      for (let i = 0; i < 7; i++) {
        const px = ((i * 340 - state.cameraX * 0.4) % (W + 380)) - 90;
        ctx.fillStyle = '#92400e';
        ctx.fillRect(px, lvl.groundY - 110, 12, 110);
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.ellipse(px - 18, lvl.groundY - 110, 26, 9, -0.35, 0, Math.PI * 2);
        ctx.ellipse(px + 28, lvl.groundY - 110, 26, 9, 0.35, 0, Math.PI * 2);
        ctx.ellipse(px + 6, lvl.groundY - 122, 24, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (prop === 'volcano') {
      // Volcanoes + rising embers
      for (let i = 0; i < 6; i++) {
        const vx = ((i * 410 - state.cameraX * 0.25) % (W + 460)) - 140;
        ctx.fillStyle = '#44403c';
        ctx.beginPath();
        ctx.moveTo(vx, lvl.groundY);
        ctx.lineTo(vx + 95, lvl.groundY - 175);
        ctx.lineTo(vx + 145, lvl.groundY - 175);
        ctx.lineTo(vx + 240, lvl.groundY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#f97316';
        ctx.fillRect(vx + 98, lvl.groundY - 178, 44, 10);
      }
      for (let i = 0; i < 22; i++) {
        const ex = ((i * 113 + Math.sin(state.timeElapsed * 2 + i) * 18) % W);
        const ey = lvl.groundY - ((state.timeElapsed * 48 + i * 37) % 360);
        ctx.fillStyle = i % 2 === 0 ? '#fde047' : '#fb923c';
        ctx.fillRect(ex, ey, 3.5, 3.5);
      }
    } else if (prop === 'crystals') {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.24)';
      for (let i = 0; i < 12; i++) {
        const cx = ((i * 250 - state.cameraX * 0.32) % (W + 300)) - 80;
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx + 18, 72 + (i % 3) * 24);
        ctx.lineTo(cx + 36, 0);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // Hills for sunny / autumn / rainbow / castle_night
      ctx.fillStyle = t.hillColor;
      ctx.globalAlpha = prop === 'castle_night' ? 0.42 : 0.65;
      for (let i = 0; i < 10; i++) {
        const hx = ((i * 340 - state.cameraX * 0.25) % (W + 400)) - 150;
        ctx.beginPath();
        ctx.arc(hx, lvl.groundY + 15, 130 + (i % 2) * 45, Math.PI, 0);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Fluffy Clouds for outdoor/day/sky biomes
    if (prop !== 'crystals' && prop !== 'volcano') {
      ctx.fillStyle = prop === 'castle_night' ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.86)';
      for (let i = 0; i < 9; i++) {
        const cx = ((i * 290 - state.cameraX * 0.18) % (W + 350)) - 100;
        const cy = 62 + (i % 3) * 42;
        ctx.beginPath();
        ctx.arc(cx, cy, 24, 0, Math.PI * 2);
        ctx.arc(cx + 22, cy - 10, 28, 0, Math.PI * 2);
        ctx.arc(cx + 46, cy, 22, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawGroundAndPlatforms(lvl) {
    const t = lvl.theme;

    // Lava or water shimmer in pits
    for (const pit of lvl.pits) {
      const px = pit.x - state.cameraX;
      if (px + pit.w < -20 || px > W + 20) continue;
      ctx.fillStyle = t.pitFill || '#0284c7';
      ctx.fillRect(px, lvl.groundY + 34, pit.w, 60);
      ctx.fillStyle = t.pitTop || '#7dd3fc';
      ctx.fillRect(px, lvl.groundY + 34, pit.w, 6);
    }

    // Ground blocks
    for (const g of lvl.grounds) {
      const gx = g.x - state.cameraX;
      if (gx + g.w < -20 || gx > W + 20) continue;
      ctx.fillStyle = t.groundBody;
      ctx.fillRect(gx, g.y, g.w, g.h);
      ctx.fillStyle = t.groundTop;
      ctx.fillRect(gx, g.y, g.w, 16);

      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 2;
      for (let bx = 0; bx < g.w; bx += 40) {
        ctx.strokeRect(gx + bx, g.y + 16, 40, 32);
      }
    }

    // Static Platforms
    for (const p of lvl.platforms) {
      const px = p.x - state.cameraX;
      if (px + p.w < -20 || px > W + 20) continue;

      if (p.kind === 'bridge') {
        ctx.fillStyle = '#92400e';
        ctx.fillRect(px, p.y, p.w, p.h);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(px, p.y, p.w, 6);
      } else {
        ctx.fillStyle = t.brickColor;
        ctx.fillRect(px, p.y, p.w, p.h);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(px, p.y, p.w, p.h);
        for (let bx = 32; bx < p.w; bx += 32) {
          ctx.beginPath();
          ctx.moveTo(px + bx, p.y);
          ctx.lineTo(px + bx, p.y + p.h);
          ctx.stroke();
        }
      }
    }

    // Moving Platforms
    for (const mp of lvl.movingPlatforms) {
      const mx = mp.x - state.cameraX;
      if (mx + mp.w < -20 || mx > W + 20) continue;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(mx, mp.y, mp.w, mp.h);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(mx, mp.y, mp.w, 6);
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 2;
      ctx.strokeRect(mx, mp.y, mp.w, mp.h);
    }

    // Bounce Springs
    for (const sp of lvl.springs) {
      const sx = sp.x - state.cameraX;
      if (sx + sp.w < -20 || sx > W + 20) continue;
      const squish = sp.anim > 0 ? 6 : 0;
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(sx + 8, sp.y + 8 + squish, sp.w - 16, sp.h - 8 - squish);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(sx, sp.y + squish, sp.w, 9);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sp.y + squish, sp.w, 9);
    }

    // Checkpoint Flags
    for (const cp of lvl.checkpointFlags) {
      const cx = cp.x - state.cameraX;
      if (cx < -40 || cx > W + 40) continue;
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(cx, cp.y, 6, 92);
      ctx.fillStyle = cp.activated ? '#22c55e' : '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(cx + 6, cp.y + 6);
      ctx.lineTo(cx + 40, cp.y + 20);
      ctx.lineTo(cx + 6, cp.y + 34);
      ctx.closePath();
      ctx.fill();
    }

    // Heart recovery blocks
    for (const hb of lvl.heartBlocks) {
      const hx = hb.x - state.cameraX;
      const hy = hb.y + hb.bumpY;
      ctx.fillStyle = hb.used ? '#64748b' : '#ec4899';
      ctx.fillRect(hx, hy, hb.w, hb.h);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(hx, hy, hb.w, hb.h);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hb.used ? '✓' : '♥', hx + hb.w / 2, hy + hb.h / 2 + 1);
    }
  }

  function drawCoins(lvl) {
    const pulse = Math.sin(state.timeElapsed * 6) * 2.5;
    for (const c of lvl.coins) {
      if (c.collected) continue;
      const cx = c.x - state.cameraX;
      if (cx < -30 || cx > W + 30) continue;

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.ellipse(cx, c.y, Math.max(5, 11 - Math.abs(pulse)), 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Numbered coin challenges
    for (const cc of lvl.coinChallenges) {
      const sx = cc.signX - state.cameraX;
      if (sx > -120 && sx < W + 120) {
        // Wooden signpost
        ctx.fillStyle = '#78350f';
        ctx.fillRect(sx + 48, lvl.groundY - 56, 10, 56);
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(sx, lvl.groundY - 94, 108, 42);
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 3;
        ctx.strokeRect(sx, lvl.groundY - 94, 108, 42);

        ctx.fillStyle = '#1e293b';
        ctx.font = '900 17px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cc.problem.text, sx + 54, lvl.groundY - 73);
      }

      if (cc.solved) continue;

      for (const coin of cc.coins) {
        if (coin.collected) continue;
        const cx = coin.x - state.cameraX;
        const cy = coin.y + Math.sin(state.timeElapsed * 4 + coin.x) * 4;
        if (cx < -40 || cx > W + 40) continue;

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(cx, cy, coin.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.font = '900 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(coin.value), cx, cy + 1);
      }
    }
  }

  function drawStations(lvl) {
    for (const st of lvl.stations) {
      // Draw floating equation plaque above station
      const centerX = st.items[1].x + st.items[1].w / 2 - state.cameraX;
      if (centerX > -250 && centerX < W + 250) {
        ctx.fillStyle = st.solved ? 'rgba(22, 163, 74, 0.92)' : 'rgba(15, 23, 42, 0.88)';
        const boxW = 210;
        const boxH = 44;
        const boxX = centerX - boxW / 2;
        const boxY = 175;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 10);
        ctx.fill();
        ctx.strokeStyle = st.solved ? '#86efac' : '#facc15';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 21px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          st.solved ? `✓ ${st.problem.text.replace('?', st.problem.answer)}` : st.problem.text,
          centerX,
          boxY + boxH / 2 + 1
        );
      }

      if (st.type === 'blocks') {
        for (const blk of st.items) {
          const bx = blk.x - state.cameraX;
          const by = blk.y + blk.bumpY;
          if (bx + blk.w < -20 || bx > W + 20) continue;

          if (st.solved && blk.isCorrect) {
            ctx.fillStyle = '#22c55e';
          } else if (blk.wrongTimer > 0) {
            ctx.fillStyle = '#ef4444';
          } else {
            ctx.fillStyle = '#f59e0b';
          }

          ctx.fillRect(bx, by, blk.w, blk.h);
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 3;
          ctx.strokeRect(bx, by, blk.w, blk.h);

          // Corner rivets
          ctx.fillStyle = '#78350f';
          ctx.fillRect(bx + 4, by + 4, 4, 4);
          ctx.fillRect(bx + blk.w - 8, by + 4, 4, 4);

          ctx.fillStyle = '#ffffff';
          ctx.font = '900 22px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(blk.value), bx + blk.w / 2, by + blk.h / 2 + 1);
        }
      } else if (st.type === 'pipes') {
        for (const pipe of st.items) {
          const px = pipe.x - state.cameraX;
          if (px + pipe.w < -20 || px > W + 20) continue;

          const bodyColor = pipe.wrongTimer > 0 ? '#ef4444' : pipe.entered ? '#16a34a' : '#22c55e';
          const rimColor = pipe.wrongTimer > 0 ? '#f87171' : '#4ade80';

          // Pipe body
          ctx.fillStyle = bodyColor;
          ctx.fillRect(px + 6, pipe.y + 20, pipe.w - 12, pipe.h - 20);
          ctx.strokeStyle = '#14532d';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(px + 6, pipe.y + 20, pipe.w - 12, pipe.h - 20);

          // Pipe rim
          ctx.fillStyle = rimColor;
          ctx.fillRect(px, pipe.y, pipe.w, 22);
          ctx.strokeRect(px, pipe.y, pipe.w, 22);

          // Number badge
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.roundRect(px + 11, pipe.y + 34, pipe.w - 22, 30, 6);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 20px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(pipe.value), px + pipe.w / 2, pipe.y + 50);
        }
      } else if (st.type === 'enemies') {
        // Arena floor highlight
        const ax = st.arenaLeft - state.cameraX;
        const aw = st.arenaRight - st.arenaLeft;
        ctx.fillStyle = 'rgba(250, 204, 21, 0.16)';
        ctx.fillRect(ax, lvl.groundY - 6, aw, 6);

        for (const en of st.items) {
          if (!en.alive) continue;
          drawMathEnemy(en);
        }
      }

      // Gate Barrier
      if (!st.solved) {
        const gx = st.gateX - state.cameraX;
        if (gx > -40 && gx < W + 40) {
          const pulse = 0.6 + Math.sin(state.timeElapsed * 8) * 0.25;
          ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
          ctx.fillRect(gx, 120, 22, lvl.groundY - 120);
          ctx.strokeStyle = '#fecaca';
          ctx.lineWidth = 2;
          ctx.strokeRect(gx, 120, 22, lvl.groundY - 120);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🔒', gx + 11, 290);
        }
      }
    }
  }

  function drawMathEnemy(en) {
    const ex = en.x - state.cameraX;
    if (ex + en.w < -30 || ex > W + 30) return;

    // Number sign above enemy
    ctx.fillStyle = en.wrongFlash > 0 ? '#ef4444' : '#0f172a';
    ctx.beginPath();
    ctx.roundRect(ex + 2, en.y - 32, en.w - 4, 26, 6);
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 17px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(en.value), ex + en.w / 2, en.y - 18);

    // Creature body (cute spiky-shell / mushroom creature)
    ctx.fillStyle = en.wrongFlash > 0 ? '#dc2626' : '#8b5cf6';
    ctx.beginPath();
    ctx.arc(ex + en.w / 2, en.y + 18, 19, Math.PI, 0);
    ctx.lineTo(ex + en.w - 3, en.y + en.h - 6);
    ctx.lineTo(ex + 3, en.y + en.h - 6);
    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ex + 12, en.y + 16, 6, 8);
    ctx.fillRect(ex + 26, en.y + 16, 6, 8);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(ex + 14, en.y + 19, 3, 4);
    ctx.fillRect(ex + 28, en.y + 19, 3, 4);

    // Feet
    const step = Math.sin(state.timeElapsed * 12 + en.x) * 3;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(ex + 6, en.y + en.h - 6 + step, 12, 6);
    ctx.fillRect(ex + en.w - 18, en.y + en.h - 6 - step, 12, 6);
  }

  function drawPatrolEnemies(lvl) {
    for (const en of lvl.patrolEnemies) {
      if (!en.alive) continue;
      const ex = en.x - state.cameraX;
      if (ex + en.w < -20 || ex > W + 20) continue;

      ctx.fillStyle = '#9a3412';
      ctx.beginPath();
      ctx.arc(ex + en.w / 2, en.y + 16, 17, Math.PI, 0);
      ctx.lineTo(ex + en.w - 4, en.y + en.h - 6);
      ctx.lineTo(ex + 4, en.y + en.h - 6);
      ctx.closePath();
      ctx.fill();

      // Angry brows & eyes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ex + 9, en.y + 14, 6, 7);
      ctx.fillRect(ex + 21, en.y + 14, 6, 7);
      ctx.fillStyle = '#000';
      ctx.fillRect(ex + 11, en.y + 17, 3, 4);
      ctx.fillRect(ex + 23, en.y + 17, 3, 4);

      const step = Math.sin(state.timeElapsed * 12 + en.x) * 2.5;
      ctx.fillStyle = '#451a03';
      ctx.fillRect(ex + 5, en.y + en.h - 6 + step, 11, 6);
      ctx.fillRect(ex + en.w - 16, en.y + en.h - 6 - step, 11, 6);
    }
  }

  function drawFinish(lvl) {
    const fx = lvl.finishX - state.cameraX;
    if (fx < -150 || fx > W + 220) return;

    // Flagpole
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(fx, lvl.groundY - 210, 8, 210);
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(fx + 4, lvl.groundY - 214, 9, 0, Math.PI * 2);
    ctx.fill();

    // Waving flag
    const wave = Math.sin(state.timeElapsed * 5) * 4;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(fx + 8, lvl.groundY - 204);
    ctx.lineTo(fx + 66, lvl.groundY - 186 + wave);
    ctx.lineTo(fx + 8, lvl.groundY - 166);
    ctx.closePath();
    ctx.fill();

    // Castle
    const cx = fx + 85;
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(cx, lvl.groundY - 135, 130, 135);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(cx + 25, lvl.groundY - 175, 80, 40);

    // Battlements
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(cx + i * 28, lvl.groundY - 148, 16, 13);
    }

    // Castle door
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(cx + 65, lvl.groundY - 38, 22, Math.PI, 0);
    ctx.lineTo(cx + 87, lvl.groundY);
    ctx.lineTo(cx + 43, lvl.groundY);
    ctx.closePath();
    ctx.fill();
  }

  function drawPlayer() {
    if (player.invulnTimer > 0 && Math.floor(player.invulnTimer * 14) % 2 === 0) {
      return;
    }

    const px = player.x - state.cameraX;
    const py = player.y;
    const legSwing = player.onGround ? Math.sin(player.walkFrame) * 5 : 4;

    ctx.save();
    ctx.translate(px + player.w / 2, py + player.h / 2);
    ctx.scale(player.facing, 1);

    // Shoes / legs
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-12 + legSwing, 14, 11, 8);
    ctx.fillRect(2 - legSwing, 14, 11, 8);

    // Blue overalls body
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(-11, 0, 22, 16);

    // Red shirt arms
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-15, 0, 6, 11);
    ctx.fillRect(9, 0, 6, 11);

    // Head
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(-10, -16, 20, 17);

    // Eye & mustache
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(3, -11, 4, 5);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(1, -4, 9, 3);

    // Red Cap
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-12, -22, 24, 8);
    ctx.fillRect(-4, -18, 18, 4);

    ctx.restore();
  }

  function drawParticlesAndTexts() {
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - state.cameraX, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    for (const ft of state.floatingTexts) {
      ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
      ctx.font = `900 ${ft.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000000';
      ctx.fillText(ft.text, ft.x - state.cameraX + 2, ft.y + 2);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x - state.cameraX, ft.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawHUD() {
    const lvl = state.level;

    // Top HUD Bar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.fillRect(0, 0, W, 52);

    ctx.textBaseline = 'middle';

    // Hearts
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px sans-serif';
    let heartsStr = '';
    for (let i = 0; i < state.maxHearts; i++) {
      heartsStr += i < state.hearts ? '❤️' : '🤍';
    }
    ctx.fillText(heartsStr, 16, 26);

    // Level & Operation
    ctx.textAlign = 'center';
    ctx.fillStyle = '#facc15';
    ctx.font = '800 15px sans-serif';
    ctx.fillText(`${lvl.name.toUpperCase()} (${state.levelIndex + 1}/${ns.Levels.count})`, W / 2, 18);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '700 13px sans-serif';
    ctx.fillText(`${lvl.worldName} • ${lvl.opLabel} • Até ${state.difficulty}`, W / 2, 37);

    // Score & Coins
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fde047';
    ctx.font = '800 17px sans-serif';
    ctx.fillText(`🪙 ${state.coins}   ★ ${state.score}`, W - 18, 26);

    // Active Math Challenge Banner
    if (state.activePrompt) {
      const bw = 490;
      const bh = 68;
      const bx = (W - bw) / 2;
      const by = 64;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 14);
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 25px sans-serif';
      ctx.fillText(`DESAFIO: ${state.activePrompt.text}`, W / 2, by + 25);

      ctx.fillStyle = '#93c5fd';
      ctx.font = '700 13px sans-serif';
      ctx.fillText(state.activePrompt.hint, W / 2, by + 50);
    }

    // Progress bar at very bottom edge
    const progress = Math.min(1, Math.max(0, player.x / lvl.finishX));
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.fillRect(0, H - 6, W, 6);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, H - 6, W * progress, 6);
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    if (!state.level) {
      const previewLevel = ns.Levels.buildLevel(0, '20');
      state.level = previewLevel;
      drawBackground(previewLevel);
      drawGroundAndPlatforms(previewLevel);
      state.level = null;
      return;
    }

    drawBackground(state.level);
    drawGroundAndPlatforms(state.level);
    drawCoins(state.level);
    drawStations(state.level);
    drawPatrolEnemies(state.level);
    drawFinish(state.level);
    drawPlayer();
    drawParticlesAndTexts();
    drawHUD();
  }

  // --- Main Animation Loop ---
  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.033);
    lastTime = now;

    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  // --- Controls & Events ---
  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      keys.left = true;
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      keys.right = true;
    } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      if (state.screen === 'playing') e.preventDefault();
      if (!keys.jump) keys.jumpJustPressed = true;
      keys.jump = true;
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      if (state.screen === 'playing') {
        state.screen = 'paused';
        setOverlay('pause');
      } else if (state.screen === 'paused') {
        state.screen = 'playing';
        setOverlay(null);
      }
    } else if (e.code === 'KeyR' && state.screen === 'playing') {
      startLevel(state.levelIndex, state.mode === 'adventure');
    } else if (e.code === 'KeyM') {
      const muted = ns.Audio.toggleMute();
      btnSound.textContent = muted ? '🔇 Mudo' : '🔊 Som';
    } else if (e.code === 'KeyF') {
      toggleExpandedMode();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keys.jump = false;
  });

  // Touch controls
  function bindTouch(id, onStart, onEnd) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      onStart();
    });
    el.addEventListener('pointerup', (e) => {
      e.preventDefault();
      onEnd();
    });
    el.addEventListener('pointerleave', onEnd);
    el.addEventListener('pointercancel', onEnd);
  }

  bindTouch('touch-left', () => { keys.left = true; }, () => { keys.left = false; });
  bindTouch('touch-right', () => { keys.right = true; }, () => { keys.right = false; });
  bindTouch(
    'touch-jump',
    () => {
      if (!keys.jump) keys.jumpJustPressed = true;
      keys.jump = true;
    },
    () => { keys.jump = false; }
  );

  // Menu & Modal Buttons
  rangePills.forEach((pill) => {
    pill.addEventListener('click', () => {
      rangePills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      state.difficulty = pill.dataset.range;
    });
  });

  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode || 'adventure';
      const lvlIdx = Number(btn.dataset.level) || 0;
      startLevel(lvlIdx, false);
    });
  });

  if (btnOpenMap) {
    btnOpenMap.addEventListener('click', () => {
      refreshMenuUI();
      menuMainView.style.display = 'none';
      menuMapView.style.display = 'block';
    });
  }

  if (btnCloseMap) {
    btnCloseMap.addEventListener('click', () => {
      menuMapView.style.display = 'none';
      menuMainView.style.display = 'block';
    });
  }

  function syncExpandButtons() {
    const isExpanded = document.body.classList.contains('expanded-mode');
    const isFullscreen = Boolean(document.fullscreenElement);
    if (btnExpand) {
      btnExpand.classList.toggle('active-toggle', isExpanded);
      btnExpand.textContent = isExpanded ? '🗗 Normal' : '⛶ Expandir';
    }
    if (btnFullscreen) {
      btnFullscreen.classList.toggle('active-toggle', isFullscreen);
      btnFullscreen.textContent = isFullscreen ? '🗗 Sair Tela Cheia' : '🖥️ Tela Cheia';
    }
  }

  function toggleExpandedMode() {
    document.body.classList.toggle('expanded-mode');
    syncExpandButtons();
  }

  if (btnExpand) {
    btnExpand.addEventListener('click', () => {
      toggleExpandedMode();
      btnExpand.blur();
    });
  }

  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.body.classList.add('expanded-mode');
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      syncExpandButtons();
      btnFullscreen.blur();
    });
  }

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      document.body.classList.remove('expanded-mode');
    } else {
      document.body.classList.add('expanded-mode');
    }
    syncExpandButtons();
  });

  btnSound.addEventListener('click', () => {
    const muted = ns.Audio.toggleMute();
    btnSound.textContent = muted ? '🔇 Mudo' : '🔊 Som';
    btnSound.blur();
  });

  btnPause.addEventListener('click', () => {
    if (state.screen === 'playing') {
      state.screen = 'paused';
      setOverlay('pause');
    } else if (state.screen === 'paused') {
      state.screen = 'playing';
      setOverlay(null);
    }
  });

  function goToMenu() {
    state.screen = 'menu';
    state.level = null;
    if (menuMapView && menuMainView) {
      menuMapView.style.display = 'none';
      menuMainView.style.display = 'block';
    }
    refreshMenuUI();
    setOverlay('menu');
  }

  btnMenu.addEventListener('click', goToMenu);
  btnBackMenu.addEventListener('click', goToMenu);
  btnResultMenu.addEventListener('click', goToMenu);

  btnResume.addEventListener('click', () => {
    state.screen = 'playing';
    setOverlay(null);
  });

  btnRestartLevel.addEventListener('click', () => {
    startLevel(state.levelIndex, false);
  });

  btnRetryLevel.addEventListener('click', () => {
    startLevel(state.levelIndex, false);
  });

  btnNextLevel.addEventListener('click', () => {
    startLevel(state.levelIndex + 1, true);
  });

  refreshMenuUI();
  requestAnimationFrame(loop);
})((window.MarioMath = window.MarioMath || {}));
