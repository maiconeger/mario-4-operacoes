(function (ns) {
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffle(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function resolveMaxNumber(difficulty) {
    if (difficulty === 'easy') return 10;
    if (difficulty === 'medium') return 50;
    if (difficulty === 'hard') return 100;
    const parsed = Number(difficulty);
    if ([10, 20, 50, 100].includes(parsed)) return parsed;
    return 20;
  }

  function generateDistractors(answer, op, maxNum) {
    const candidates = new Set();
    const deltas = op === 'mul' || op === 'div'
      ? [-3, -2, -1, 1, 2, 3, 4, -4, 5, 6]
      : maxNum <= 10
        ? [-2, -1, 1, 2, 3, -3]
        : [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 10, -10];

    let guard = 0;
    while (candidates.size < 2 && guard < 80) {
      guard++;
      const d = deltas[randInt(0, deltas.length - 1)];
      const val = answer + d;
      if (val >= 0 && val <= maxNum && val !== answer) {
        candidates.add(val);
      }
    }

    let fallback = 1;
    while (candidates.size < 2) {
      if (answer + fallback <= maxNum && answer + fallback !== answer) {
        candidates.add(answer + fallback);
      } else if (answer - fallback >= 0 && answer - fallback !== answer) {
        candidates.add(answer - fallback);
      } else if (answer + fallback !== answer) {
        candidates.add(answer + fallback);
      }
      fallback++;
    }

    return Array.from(candidates).slice(0, 2);
  }

  function generateProblem(operation, difficulty = '20') {
    const maxNum = resolveMaxNumber(difficulty);

    let op = operation;
    if (op === 'mixed') {
      const ops = ['add', 'sub', 'mul', 'div'];
      op = ops[randInt(0, ops.length - 1)];
    }

    let a = 1;
    let b = 1;
    let symbol = '+';
    let answer = 2;

    if (op === 'add') {
      symbol = '+';
      const minSum = maxNum <= 10 ? 2 : maxNum <= 20 ? 4 : maxNum <= 50 ? 10 : 15;
      answer = randInt(minSum, maxNum);
      a = randInt(1, answer - 1);
      b = answer - a;
    } else if (op === 'sub') {
      symbol = '-';
      const minTop = maxNum <= 10 ? 3 : maxNum <= 20 ? 5 : maxNum <= 50 ? 12 : 20;
      a = randInt(minTop, maxNum);
      b = randInt(1, a - 1);
      answer = a - b;
    } else if (op === 'mul') {
      symbol = '×';
      const maxFactor = Math.min(10, Math.floor(maxNum / 2));
      a = randInt(2, Math.max(2, maxFactor));
      const maxB = Math.floor(maxNum / a);
      b = randInt(maxB >= 2 ? 2 : 1, Math.max(1, maxB));
      answer = a * b;
    } else if (op === 'div') {
      symbol = '÷';
      const maxDivisor = Math.min(10, Math.floor(maxNum / 2));
      b = randInt(2, Math.max(2, maxDivisor));
      const maxQuotient = Math.floor(maxNum / b);
      answer = randInt(maxQuotient >= 2 ? 2 : 1, Math.max(1, maxQuotient));
      a = b * answer;
    }

    const distractors = generateDistractors(answer, op, maxNum);
    const options = shuffle([answer, ...distractors]);

    return {
      op,
      a,
      b,
      symbol,
      answer,
      maxNum,
      text: `${a} ${symbol} ${b} = ?`,
      options
    };
  }

  ns.MathGen = {
    generateProblem
  };
})((window.MarioMath = window.MarioMath || {}));
