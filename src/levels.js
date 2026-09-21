const colorPalette = [
  "#ff6b6b",
  "#4ecdc4",
  "#ffe66d",
  "#5c7cfa",
  "#95d5b2",
  "#f4a261",
  "#b197fc",
  "#66d9e8",
  "#ffd43b",
  "#ff8787",
  "#74c0fc",
  "#69db7c"
];

function boardSizeForLevel(index) {
  const level = index + 1;
  if (level <= 2) return [3, 3];
  if (level <= 5) return [4, 4];
  if (level === 15) return [6, 5];
  if (level <= 20) return [5, 5];
  if (level === 27 || level === 34) return [7, 6];
  if (level <= 40) return [6, 6];
  if (level <= 90) return [7, 7];
  if (level <= 240) return [8, 8];
  if (level <= 390) return [9, 9];
  if (level <= 540) return [10, 10];
  if (level <= 690) return [11, 11];
  if (level <= 840) return [12, 11];
  if (level <= 990) return [13, 11];
  if (level <= 1140) return [14, 11];
  return [15, 11];
}

const boardSizes = Array.from({ length: 1290 }, (_, index) => boardSizeForLevel(index));

function area(rect) {
  return (rect[2] - rect[0] + 1) * (rect[3] - rect[1] + 1);
}

function random(seed) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function packageName(index) {
  if (index < 40) return "Starter";
  if (index < 90) return "7x7";
  if (index < 240) return "8x8";
  if (index < 390) return "9x9";
  if (index < 540) return "10x10";
  if (index < 690) return "11x11";
  if (index < 840) return "12x11";
  if (index < 990) return "13x11";
  if (index < 1140) return "14x11";
  return "15x11";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function splitCandidates(rect) {
  const [r1, c1, r2, c2] = rect;
  const options = [];

  for (let row = r1; row < r2; row += 1) {
    const first = [r1, c1, row, c2];
    const second = [row + 1, c1, r2, c2];
    if (area(first) > 1 && area(second) > 1) options.push([first, second]);
  }

  for (let col = c1; col < c2; col += 1) {
    const first = [r1, c1, r2, col];
    const second = [r1, col + 1, r2, c2];
    if (area(first) > 1 && area(second) > 1) options.push([first, second]);
  }

  return options;
}

function splitCandidatesWithMinArea(rect, minArea) {
  return splitCandidates(rect).filter(([first, second]) => area(first) >= minArea && area(second) >= minArea);
}

function shuffle(items, nextRandom) {
  const result = items.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom() * (index + 1));
    const item = result[index];
    result[index] = result[swapIndex];
    result[swapIndex] = item;
  }
  return result;
}

function weightedChoice(items, nextRandom) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = nextRandom() * totalWeight;

  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }

  return items[items.length - 1].value;
}

const balancedAreaGroups = [
  [2, 3, 5, 6],
  [7, 8, 9, 10, 12],
  [14, 15, 16, 18, 20]
];

const complexAreaValues = new Set([6, 8, 9, 10, 12, 14, 15, 16, 18, 20]);
const simpleAreaValues = new Set([2, 3, 4, 5, 7, 11, 13, 17, 19]);

function complexityWeight(value, rows = 0, cols = 0) {
  const compactBoard = rows <= 4 && cols <= 4;
  const earlyBoard = rows <= 5 && cols <= 5;
  const largeBoard = rows >= 6 || cols >= 6;
  if (value === 2) return compactBoard ? 0.18 : largeBoard ? 0.2 : 0.28;
  if (value === 3 || value === 5) return largeBoard ? 0.72 : 0.95;
  if (value === 4) return largeBoard ? 0.18 : earlyBoard ? 0.78 : 0.48;
  if (simpleAreaValues.has(value)) return largeBoard ? 0.42 : 0.68;
  if (earlyBoard && value >= 10) return 0.38;
  if (complexAreaValues.has(value)) return value >= 14 ? 1.18 : 1.36;
  return 1;
}

function maxPlannedAreaForBoard(rows, cols) {
  if (rows <= 3 && cols <= 3) return 4;
  if (rows <= 4 && cols <= 4) return 6;
  if (rows <= 5 && cols <= 5) return 10;
  if (rows <= 7 && cols <= 7) return 18;
  return 20;
}

function levelPhase(index) {
  const level = index + 1;
  if (level <= 10) return "tutorial";
  if (level <= 30) return "earlyTrap";
  if (level <= 75) return "flow";
  return "challenge";
}

function levelAreaProfile(index) {
  const phase = levelPhase(index);
  const pattern = index % 10;

  if (phase === "tutorial") return "tutorial";
  if (phase === "earlyTrap") {
    if (pattern === 0 || pattern === 6) return "small";
    if (pattern === 2 || pattern === 7) return "medium";
    return "earlyTrap";
  }
  if (phase === "flow") {
    if (pattern === 1 || pattern === 6) return "medium";
    if (pattern === 3 || pattern === 8) return "largeMix";
    if (pattern === 5) return "small";
    return "balanced";
  }

  if (pattern === 0 || pattern === 6) return "medium";
  if (pattern === 2 || pattern === 8) return "largeMix";
  if (pattern === 4) return "small";
  return "balanced";
}

function groupRatiosForProfile(profile, rows, cols) {
  if (rows <= 5 && cols <= 5) {
    if (profile === "tutorial") return [1.35, 1.7, 0.05];
    if (profile === "earlyTrap") return [1.6, 1.65, 0.12];
    if (profile === "small") return [1.45, 1.4, 0.15];
    if (profile === "large") return [1.05, 1.75, 0.2];
    if (profile === "medium") return [0.95, 2.05, 0.15];
    if (profile === "largeMix") return [1.2, 1.55, 0.2];
    return [1.15, 1.55, 0.15];
  }

  if (rows <= 7 && cols <= 7) {
    if (profile === "tutorial") return [1.45, 1.6, 0.25];
    if (profile === "earlyTrap") return [1.7, 1.65, 0.32];
    if (profile === "small") return [2.2, 1.25, 0.85];
    if (profile === "large") return [1.28, 1.42, 1.25];
    if (profile === "medium") return [1.05, 2.15, 0.9];
    if (profile === "largeMix") return [1.55, 1.22, 1.05];
    return [1.35, 1.55, 0.9];
  }

  if (rows >= 10 || cols >= 10) {
    if (profile === "tutorial") return [1.1, 1.7, 0.8];
    if (profile === "earlyTrap") return [1.2, 1.55, 0.95];
    if (profile === "small") return [1.45, 1.25, 1.15];
    if (profile === "large") return [0.7, 1.25, 2.25];
    if (profile === "medium") return [0.8, 2.15, 1.1];
    if (profile === "largeMix") return [0.98, 1.18, 1.85];
    return [0.9, 1.55, 1.35];
  }

  if (profile === "tutorial") return [1.35, 1.55, 0.45];
  if (profile === "earlyTrap") return [1.8, 1.45, 0.55];
  if (profile === "small") return [2.35, 1.2, 0.9];
  if (profile === "large") return [0.95, 1.25, 1.8];
  if (profile === "medium") return [0.95, 2.25, 0.95];
  if (profile === "largeMix") return [1.35, 1.05, 1.45];
  return [1.15, 1.35, 1.15];
}

function choosePlannedArea(groupIndex, remainingArea, nextRandom, rows, cols, minAllowedArea = 2, maxOverride = null) {
  const maxAllowedArea = Math.min(maxPlannedAreaForBoard(rows, cols), maxOverride ?? remainingArea, remainingArea);
  const groupValues = balancedAreaGroups[groupIndex].some((value) => value <= maxAllowedArea)
    ? balancedAreaGroups[groupIndex]
    : groupIndex === 2
      ? balancedAreaGroups[1]
      : balancedAreaGroups[0];
  const preferred = groupValues
    .filter((value) => value >= minAllowedArea && value <= maxAllowedArea && remainingArea - value !== 1)
    .map((value) => ({
      value,
      weight:
        complexityWeight(value, rows, cols) *
        (groupIndex === 1 ? 1.08 : 1) *
        (rows >= 9 || cols >= 9 ? (value === 20 ? 0.34 : value === 18 ? 0.72 : value >= 14 ? 1.16 : 1) : 1) *
        (rows >= 7 || cols >= 7 ? (value === 4 ? 0.72 : 1) : 1)
    }));

  if (preferred.length) return weightedChoice(preferred, nextRandom);

  const fallback = [];
  for (let value = minAllowedArea; value <= maxAllowedArea; value += 1) {
    if (remainingArea - value === 1) continue;
    fallback.push({
      value,
      weight:
        complexityWeight(value, rows, cols) *
        (rows >= 9 || cols >= 9 ? (value === 20 ? 0.34 : value === 18 ? 0.72 : value >= 14 ? 1.16 : 1) : 1) *
        (rows >= 7 || cols >= 7 ? (value === 4 ? 0.72 : 1) : 1)
    });
  }

  return fallback.length ? weightedChoice(fallback, nextRandom) : remainingArea;
}

function targetAreaForLevel(rows, cols, index, remainingArea, nextRandom) {
  const maxArea = Math.min(maxPlannedAreaForBoard(rows, cols), remainingArea);
  const lateBoard = rows >= 8 || cols >= 8;
  const largeBoard = rows >= 6 || cols >= 6;
  const bucket = index % 3;
  const choices = [];

  for (let value = 2; value <= maxArea; value += 1) {
    const isSmall = value <= 6;
    const isMedium = value >= 7 && value <= 12;
    const isLarge = value >= 13;
    const inBucket =
      (bucket === 0 && isSmall) ||
      (bucket === 1 && isMedium) ||
      (bucket === 2 && isLarge);
    let weight = inBucket ? 4.8 : 0.95;

    if (remainingArea - value === 1) weight *= 0.05;
    if (remainingArea <= 12 && value > remainingArea - 2) weight *= 0.45;

    weight *= complexityWeight(value, rows, cols);
    if (value === 4) weight *= largeBoard ? 0.08 : 0.42;
    if (lateBoard && value === 4) weight *= 0.2;
    if (lateBoard && isLarge) weight *= 1.12;
    if (largeBoard && (value === 8 || value === 9 || value === 10 || value === 12 || value === 14 || value === 15 || value === 16 || value === 18 || value === 20)) weight *= 1.12;
    if (largeBoard && (value === 11 || value === 13 || value === 17 || value === 19)) weight *= 0.78;
    choices.push({ value, weight });
  }

  return weightedChoice(choices, nextRandom);
}

function makeAreaPlan(rows, cols, index, nextRandom) {
  const plan = [];
  let remainingArea = rows * cols;
  const groupCounts = [0, 0, 0];
  const groupOrder = index % 2 === 0 ? [0, 2, 1] : [2, 0, 1];
  const profile = levelAreaProfile(index);
  const groupRatios = groupRatiosForProfile(profile, rows, cols);
  const finalAreaLimit = (rows >= 9 || cols >= 9) && index % 5 !== 0 ? 18 : maxPlannedAreaForBoard(rows, cols);
  const targetCount = targetRegionCount(rows, cols, index, nextRandom);

  while (remainingArea > 0) {
    const remainingSlots = targetCount - plan.length;
    if (remainingSlots <= 1) {
      plan.push(remainingArea);
      break;
    }

    const groupScores = groupCounts.map((count, groupIndex) => count / groupRatios[groupIndex]);
    const lowestScore = Math.min(...groupScores);
    const groupIndex = groupOrder.find((item) => groupScores[item] === lowestScore) ?? 0;
    const minAllowedArea = Math.max(2, remainingArea - finalAreaLimit * (remainingSlots - 1));
    const maxAllowedArea = Math.min(finalAreaLimit, remainingArea - 2 * (remainingSlots - 1));
    const nextArea = choosePlannedArea(groupIndex, remainingArea, nextRandom, rows, cols, minAllowedArea, maxAllowedArea);
    plan.push(nextArea);
    groupCounts[groupIndex] += 1;
    remainingArea -= nextArea;

    if (remainingArea === 1) {
      plan[plan.length - 1] += 1;
      remainingArea = 0;
    }
  }

  return shuffle(plan, nextRandom);
}

function targetRegionCount(rows, cols, index, nextRandom) {
  const totalArea = rows * cols;
  const phase = levelPhase(index);

  if (phase === "tutorial") {
    if (rows <= 3 && cols <= 3) return 3;
    if (rows <= 4 && cols <= 4) return 4 + (index % 2);
    return 5 + (index % 3 === 0 ? 1 : 0);
  }

  if (phase === "earlyTrap") {
    return 5 + (index % 4 === 0 || index % 5 === 0 ? 1 : 0);
  }

  if (phase === "flow") {
    return 5 + (index % 3 === 0 ? 1 : 0) + (index % 11 === 0 ? 1 : 0);
  }

  if (rows <= 7 && cols <= 7) return 7 + (index % 4 === 0 ? 1 : 0);
  if (rows <= 8 && cols <= 8) return 8 + (index % 3 === 0 ? 1 : 0) + (index % 11 === 0 ? 1 : 0);
  if (rows <= 9 && cols <= 9) return 9 + (index % 4 <= 1 ? 1 : 0) + (index % 13 === 0 ? 1 : 0);
  if (rows <= 10 && cols <= 10) return 12 + (index % 4 <= 1 ? 1 : 0) + (index % 17 === 0 ? 1 : 0);
  if (rows === 11 && cols === 11) return 15 + (index % 4 <= 1 ? 1 : 0) + (index % 19 === 0 ? 1 : 0);
  if (rows === 11 && cols === 12) return 16 + (index % 4 <= 1 ? 1 : 0) + (index % 17 === 0 ? 1 : 0);

  const rhythm = ((index % 7) - 3) * 0.18 + (index % 11 === 0 ? -0.55 : 0) + (index % 13 === 0 ? 0.5 : 0);
  const baseAverage = rows >= 8 || cols >= 8 ? 10.6 : rows >= 6 || cols >= 6 ? 9.2 : 7.6;
  const averageArea = baseAverage + (index % 4) * 0.42 + rhythm + nextRandom() * 1.25;
  const target = Math.round(totalArea / averageArea);
  const minTarget = rows <= 4 ? 4 : Math.ceil(totalArea / 15);
  const maxTarget = Math.floor(totalArea / 2.4);
  return clamp(target, minTarget, maxTarget);
}

function scoreSplit(pair, targetArea, nextRandom, rows, cols) {
  const firstArea = area(pair[0]);
  const secondArea = area(pair[1]);
  const boardMaxArea = maxPlannedAreaForBoard(rows, cols);
  const skinnyA =
    Math.abs((pair[0][2] - pair[0][0] + 1) - (pair[0][3] - pair[0][1] + 1));
  const skinnyB =
    Math.abs((pair[1][2] - pair[1][0] + 1) - (pair[1][3] - pair[1][1] + 1));
  const targetScore = Math.min(Math.abs(firstArea - targetArea), Math.abs(secondArea - targetArea));
  const smallPenalty = (firstArea < 2 ? 50 : 0) + (secondArea < 2 ? 50 : 0);
  const hugePenalty = (firstArea > boardMaxArea ? (firstArea - boardMaxArea) * 18 : 0) + (secondArea > boardMaxArea ? (secondArea - boardMaxArea) * 18 : 0);
  const twoPenalty = (firstArea === 2 ? 14 : 0) + (secondArea === 2 ? 14 : 0);
  const lateBoard = rows >= 8 || cols >= 8;
  const largeBoard = rows >= 6 || cols >= 6;
  const targetIsSmall = targetArea <= 6;
  const commonSmallPenalty =
    (largeBoard && firstArea === 4 ? 80 : 0) +
    (largeBoard && secondArea === 4 ? 80 : 0) +
    (lateBoard && firstArea === 4 ? 80 : 0) +
    (lateBoard && secondArea === 4 ? 80 : 0) +
    (!targetIsSmall && largeBoard && firstArea <= 6 ? 10 : 0) +
    (!targetIsSmall && largeBoard && secondArea <= 6 ? 10 : 0) +
    (!targetIsSmall && lateBoard && firstArea <= 6 ? 14 : 0) +
    (!targetIsSmall && lateBoard && secondArea <= 6 ? 14 : 0);

  return targetScore * 3 + (skinnyA + skinnyB) * 0.18 + smallPenalty + hugePenalty + twoPenalty + commonSmallPenalty + nextRandom();
}

const compactBoardPatterns = [
  [[0, 0, 0, 2], [1, 0, 1, 2], [2, 0, 2, 2]],
  [[0, 0, 2, 0], [0, 1, 2, 1], [0, 2, 2, 2]],
  [[0, 0, 0, 2], [1, 0, 2, 1], [1, 2, 2, 2]],
  [[0, 0, 0, 2], [1, 0, 2, 0], [1, 1, 2, 2]],
  [[0, 0, 1, 1], [0, 2, 1, 2], [2, 0, 2, 2]],
  [[0, 0, 1, 0], [0, 1, 1, 2], [2, 0, 2, 2]],
  [[0, 0, 2, 0], [0, 1, 1, 2], [2, 1, 2, 2]],
  [[0, 0, 2, 0], [0, 1, 0, 2], [1, 1, 2, 2]],
  [[0, 0, 1, 1], [2, 0, 2, 1], [0, 2, 2, 2]],
  [[0, 0, 0, 1], [1, 0, 2, 1], [0, 2, 2, 2]],
  [[0, 0, 0, 2], [1, 0, 1, 1], [1, 2, 2, 2], [2, 0, 2, 1]],
  [[0, 0, 2, 0], [0, 1, 1, 1], [2, 1, 2, 2], [0, 2, 1, 2]],
  [[0, 0, 0, 1], [0, 2, 2, 2], [1, 0, 1, 1], [2, 0, 2, 1]],
  [[0, 0, 1, 0], [2, 0, 2, 2], [0, 1, 0, 2], [1, 1, 1, 2]],
  [[0, 0, 1, 1], [0, 2, 2, 2], [2, 0, 2, 1]],
  [[0, 0, 2, 0], [0, 1, 0, 2], [1, 1, 2, 1], [1, 2, 2, 2]]
];

const smallBoardPatterns = [
  [[0, 0, 0, 3], [1, 0, 2, 1], [1, 2, 3, 2], [1, 3, 3, 3], [3, 0, 3, 1]],
  [[0, 0, 3, 0], [0, 1, 1, 2], [2, 1, 2, 3], [3, 1, 3, 3], [0, 3, 1, 3]],
  [[0, 0, 1, 2], [0, 3, 1, 3], [2, 0, 2, 3], [3, 0, 3, 3]],
  [[0, 0, 2, 1], [3, 0, 3, 1], [0, 2, 3, 2], [0, 3, 3, 3]],
  [[0, 0, 1, 1], [0, 2, 0, 3], [1, 2, 2, 3], [2, 0, 3, 1], [3, 2, 3, 3]],
  [[0, 0, 0, 2], [0, 3, 2, 3], [1, 0, 2, 1], [1, 2, 3, 2], [3, 0, 3, 1]],
  [[0, 0, 2, 0], [3, 0, 3, 2], [0, 1, 1, 2], [2, 1, 2, 3], [0, 3, 1, 3]],
  [[0, 0, 2, 0], [0, 1, 0, 3], [1, 1, 2, 1], [1, 2, 2, 3], [3, 0, 3, 3]],
  [[0, 0, 0, 1], [0, 2, 1, 3], [1, 0, 2, 1], [2, 2, 3, 3], [3, 0, 3, 1]],
  [[0, 0, 1, 0], [0, 1, 1, 2], [0, 3, 1, 3], [2, 0, 3, 1], [2, 2, 3, 3]],
  [[0, 0, 1, 2], [0, 3, 2, 3], [2, 0, 3, 1], [3, 2, 3, 3]],
  [[0, 0, 2, 0], [0, 1, 1, 2], [0, 3, 2, 3], [2, 1, 3, 2], [3, 0, 3, 0], [3, 3, 3, 3]]
];

function rectsCoverBoard(rects, rows, cols) {
  const cells = new Set();
  for (const rect of rects) {
    if (area(rect) < 2) return false;
    for (let row = rect[0]; row <= rect[2]; row += 1) {
      for (let col = rect[1]; col <= rect[3]; col += 1) {
        if (row < 0 || col < 0 || row >= rows || col >= cols) return false;
        const cellKey = `${row}-${col}`;
        if (cells.has(cellKey)) return false;
        cells.add(cellKey);
      }
    }
  }
  return cells.size === rows * cols;
}

function rectsArePlayableShape(rects, rows, cols) {
  const cells = new Set();
  for (const rect of rects) {
    if (area(rect) < 2) return false;
    for (let row = rect[0]; row <= rect[2]; row += 1) {
      for (let col = rect[1]; col <= rect[3]; col += 1) {
        if (row < 0 || col < 0 || row >= rows || col >= cols) return false;
        const cellKey = `${row}-${col}`;
        if (cells.has(cellKey)) return false;
        cells.add(cellKey);
      }
    }
  }
  return cells.size > 0;
}

function activeCellsForRects(rects) {
  const cells = [];
  rects.forEach((rect) => {
    for (let row = rect[0]; row <= rect[2]; row += 1) {
      for (let col = rect[1]; col <= rect[3]; col += 1) {
        cells.push(`${row}-${col}`);
      }
    }
  });
  return cells;
}

function activeCellsCountForRects(rects) {
  return activeCellsForRects(rects).length;
}

function rectsCoverActiveCells(rects, activeCells) {
  const expected = new Set(activeCells);
  const cells = new Set();
  for (const rect of rects) {
    if (area(rect) < 2) return false;
    for (let row = rect[0]; row <= rect[2]; row += 1) {
      for (let col = rect[1]; col <= rect[3]; col += 1) {
        const cellKey = `${row}-${col}`;
        if (!expected.has(cellKey) || cells.has(cellKey)) return false;
        cells.add(cellKey);
      }
    }
  }
  return cells.size === expected.size;
}

const validSmallBoardPatterns = smallBoardPatterns.filter((pattern) => rectsCoverBoard(pattern, 4, 4));

const handcraftedSmallBoardPatterns = [
  [[0, 3, 1, 3], [0, 0, 1, 2], [2, 0, 2, 3], [3, 0, 3, 3]],
  [[3, 2, 3, 3], [0, 2, 2, 3], [2, 0, 3, 1], [0, 0, 1, 1]],
  [[0, 1, 1, 3], [3, 0, 3, 3], [2, 0, 2, 3], [0, 0, 1, 0]],
  [[0, 2, 1, 3], [0, 0, 3, 1], [2, 2, 3, 2], [2, 3, 3, 3]],
  [[0, 3, 1, 3], [1, 0, 1, 2], [0, 0, 0, 2], [2, 0, 3, 3]],
  [[1, 0, 1, 1], [0, 0, 0, 1], [0, 2, 3, 3], [2, 0, 3, 1]],
  [[1, 0, 3, 1], [0, 2, 3, 2], [0, 3, 3, 3], [0, 0, 0, 1]],
  [[2, 1, 3, 3], [0, 2, 1, 3], [0, 0, 1, 1], [2, 0, 3, 0]],
  [[1, 0, 1, 3], [0, 0, 0, 1], [0, 2, 0, 3], [2, 0, 3, 3]],
  [[0, 1, 1, 2], [0, 0, 1, 0], [2, 0, 3, 3], [0, 3, 1, 3]],
  [[0, 0, 3, 1], [0, 3, 1, 3], [0, 2, 3, 2], [2, 3, 3, 3]],
  [[0, 0, 3, 1], [0, 2, 2, 2], [0, 3, 2, 3], [3, 2, 3, 3]],
  [[0, 0, 1, 3], [2, 1, 2, 3], [3, 1, 3, 3], [2, 0, 3, 0]],
  [[1, 2, 3, 2], [0, 2, 0, 3], [1, 3, 3, 3], [0, 0, 3, 1]],
  [[1, 0, 3, 0], [1, 1, 3, 1], [0, 2, 3, 3], [0, 0, 0, 1]],
  [[2, 0, 2, 2], [2, 3, 3, 3], [0, 0, 1, 2], [3, 0, 3, 2], [0, 3, 1, 3]],
  [[2, 0, 3, 0], [2, 1, 3, 3], [0, 3, 1, 3], [0, 0, 1, 0], [0, 1, 1, 2]],
  [[0, 2, 0, 3], [2, 1, 3, 3], [1, 2, 1, 3], [2, 0, 3, 0], [0, 0, 1, 1]],
  [[0, 2, 2, 3], [3, 2, 3, 3], [1, 0, 3, 0], [0, 0, 0, 1], [1, 1, 3, 1]],
  [[1, 0, 3, 1], [0, 0, 0, 1], [0, 3, 1, 3], [2, 3, 3, 3], [0, 2, 3, 2]],
  [[0, 1, 0, 3], [1, 1, 1, 3], [0, 0, 1, 0], [2, 3, 3, 3], [2, 0, 3, 2]],
  [[1, 2, 3, 3], [2, 0, 2, 1], [0, 2, 0, 3], [3, 0, 3, 1], [0, 0, 1, 1]],
  [[0, 0, 2, 1], [2, 2, 3, 2], [3, 0, 3, 1], [2, 3, 3, 3], [0, 2, 1, 3]],
  [[1, 2, 3, 3], [3, 0, 3, 1], [0, 0, 2, 0], [0, 2, 0, 3], [0, 1, 2, 1]],
  [[0, 1, 2, 1], [0, 0, 2, 0], [0, 2, 3, 2], [3, 0, 3, 1], [0, 3, 3, 3]],
  [[0, 3, 2, 3], [3, 0, 3, 1], [0, 2, 2, 2], [3, 2, 3, 3], [0, 0, 2, 1]],
  [[3, 0, 3, 2], [0, 0, 1, 1], [0, 2, 1, 3], [2, 3, 3, 3], [2, 0, 2, 2]],
  [[1, 0, 1, 2], [0, 3, 1, 3], [2, 2, 3, 3], [2, 0, 3, 1], [0, 0, 0, 2]],
  [[1, 1, 1, 3], [2, 2, 3, 3], [0, 1, 0, 3], [0, 0, 1, 0], [2, 0, 3, 1]],
  [[1, 1, 3, 1], [2, 2, 3, 3], [0, 2, 1, 3], [0, 0, 0, 1], [1, 0, 3, 0]]
];

const openingTutorialPatterns = [
  [[0, 0, 0, 2], [1, 0, 2, 0], [1, 1, 2, 2]],
  [[0, 0, 2, 0], [0, 1, 1, 2], [2, 1, 2, 2]],
  [[0, 0, 1, 1], [0, 2, 1, 3], [2, 0, 3, 1], [2, 2, 3, 3]],
  [[0, 0, 0, 3], [1, 0, 3, 0], [1, 1, 2, 2], [1, 3, 3, 3], [3, 1, 3, 2]],
  [[0, 0, 1, 0], [0, 1, 0, 3], [1, 1, 2, 3], [2, 0, 3, 0], [3, 1, 3, 3]],
  [[0, 0, 0, 4], [1, 0, 2, 1], [1, 2, 1, 4], [2, 2, 4, 2], [2, 3, 4, 4], [3, 0, 4, 1]],
  [[0, 0, 1, 1], [0, 2, 0, 4], [1, 2, 2, 4], [2, 0, 3, 1], [3, 2, 4, 2], [3, 3, 4, 4], [4, 0, 4, 1]],
  [[0, 0, 0, 4], [1, 0, 2, 1], [1, 2, 2, 4], [3, 0, 4, 0], [3, 1, 4, 3], [3, 4, 4, 4]],
  [[0, 0, 0, 4], [1, 0, 4, 0], [1, 1, 2, 2], [1, 3, 2, 4], [3, 1, 4, 3], [3, 4, 4, 4]],
  [[0, 0, 0, 4], [1, 0, 3, 1], [1, 2, 1, 4], [2, 2, 4, 4], [4, 0, 4, 1]]
];

function openingTutorialPattern(index, rows, cols) {
  const pattern = openingTutorialPatterns[index];
  return pattern && rectsCoverBoard(pattern, rows, cols) ? pattern : null;
}

const specialShapedRectPatterns = {
  14: [
    [0, 1, 0, 3],
    [1, 0, 1, 4],
    [2, 0, 3, 1],
    [2, 2, 3, 4],
    [4, 0, 4, 4],
    [5, 1, 5, 2]
  ],
  26: [
    [0, 1, 0, 4],
    [1, 0, 1, 5],
    [2, 0, 3, 1],
    [2, 2, 3, 3],
    [2, 4, 3, 5],
    [4, 0, 5, 2],
    [4, 3, 5, 5],
    [6, 1, 6, 2]
  ],
  33: [
    [0, 1, 0, 4],
    [1, 0, 2, 0],
    [1, 1, 1, 5],
    [2, 1, 3, 2],
    [2, 3, 3, 5],
    [3, 0, 5, 0],
    [4, 1, 5, 2],
    [4, 3, 5, 5],
    [6, 1, 6, 2]
  ]
};

const specialShapedCellCounts = {
  14: 25,
  26: 36,
  33: 36
};

function fixedPatternForLevel(index, rows, cols) {
  const tutorialPattern = openingTutorialPattern(index, rows, cols);
  if (tutorialPattern) return tutorialPattern;

  const specialPattern = specialShapedRectPatterns[index];
  const expectedCellCount = specialShapedCellCounts[index];
  if (specialPattern && rectsArePlayableShape(specialPattern, rows, cols) && activeCellsCountForRects(specialPattern) === expectedCellCount) {
    return specialPattern;
  }

  return generatedSpecialShapedPattern(index, rows, cols);
}

function specialShapeLevel(index, rows, cols) {
  const level = index + 1;
  return level >= 50 && level % 10 === 0 && rows >= 7 && cols >= 7;
}

function addSpan(rowSpans, row, c1, c2) {
  const safeStart = clamp(c1, 0, rowSpans[row].cols - 1);
  const safeEnd = clamp(c2, 0, rowSpans[row].cols - 1);
  if (safeEnd - safeStart + 1 >= 2) {
    rowSpans[row].spans.push([safeStart, safeEnd]);
  }
}

function makeRowSpanState(rows, cols) {
  return Array.from({ length: rows }, () => ({ cols, spans: [] }));
}

function rectsFromRowSpans(rowSpans) {
  const rects = [];
  const openBySpan = new Map();

  rowSpans.forEach((rowData, row) => {
    const usedThisRow = new Set();
    rowData.spans.forEach(([c1, c2]) => {
      const spanKey = `${c1}-${c2}`;
      const openRect = openBySpan.get(spanKey);
      if (openRect && openRect[2] === row - 1) {
        openRect[2] = row;
      } else {
        const rect = [row, c1, row, c2];
        rects.push(rect);
        openBySpan.set(spanKey, rect);
      }
      usedThisRow.add(spanKey);
    });

    Array.from(openBySpan.keys()).forEach((spanKey) => {
      if (!usedThisRow.has(spanKey)) openBySpan.delete(spanKey);
    });
  });

  return rects;
}

function splitLargeSpecialRects(rects, maxArea = 20) {
  const result = rects.map((rect) => rect.slice());
  let guard = 0;

  while (guard < 80) {
    const largeIndex = result.findIndex((rect) => area(rect) > maxArea);
    if (largeIndex === -1) break;

    const rect = result[largeIndex];
    const options = splitCandidates(rect).sort((a, b) => {
      const maxA = Math.max(area(a[0]), area(a[1]));
      const maxB = Math.max(area(b[0]), area(b[1]));
      const spreadA = Math.abs(area(a[0]) - area(a[1]));
      const spreadB = Math.abs(area(b[0]) - area(b[1]));
      return maxA - maxB + spreadA - spreadB;
    });

    if (!options.length) break;

    const pair = options[0];
    result.splice(largeIndex, 1, pair[0], pair[1]);
    guard += 1;
  }

  return result;
}

function generatedSpecialShapedPattern(index, rows, cols) {
  if (!specialShapeLevel(index, rows, cols)) return null;

  let best = null;

  for (let buildAttempt = 0; buildAttempt < 18; buildAttempt += 1) {
    const nextRandom = random((index + 1) * 92821 + rows * 193 + cols * 389 + buildAttempt * 1741);
    const targetCells = Math.floor(rows * cols * (0.62 + nextRandom() * 0.2));
    const targetRegions = clamp(Math.round((rows * cols) / 10) + Math.floor(nextRandom() * 5), 6, rows >= 10 ? 15 : 11);
    const placed = [];
    const used = new Set();

    function overlaps(rect) {
      for (let row = rect[0]; row <= rect[2]; row += 1) {
        for (let col = rect[1]; col <= rect[3]; col += 1) {
          if (used.has(`${row}-${col}`)) return true;
        }
      }
      return false;
    }

    function occupy(rect) {
      placed.push(rect);
      for (let row = rect[0]; row <= rect[2]; row += 1) {
        for (let col = rect[1]; col <= rect[3]; col += 1) {
          used.add(`${row}-${col}`);
        }
      }
    }

    for (let attempt = 0; attempt < 340 && (used.size < targetCells || placed.length < targetRegions); attempt += 1) {
      const orientation = nextRandom();
      let width;
      let height;

      if (orientation < 0.36) {
        width = 1 + Math.floor(nextRandom() * Math.min(3, cols));
        height = 3 + Math.floor(nextRandom() * Math.min(5, rows - 2));
      } else if (orientation < 0.66) {
        width = 3 + Math.floor(nextRandom() * Math.min(6, cols - 2));
        height = 1 + Math.floor(nextRandom() * Math.min(3, rows));
      } else {
        width = 2 + Math.floor(nextRandom() * Math.min(4, cols - 1));
        height = 2 + Math.floor(nextRandom() * Math.min(4, rows - 1));
      }

      width = clamp(width, 1, cols);
      height = clamp(height, 1, rows);
      if (width * height < 2 || width * height > 20) continue;

      const row = Math.floor(nextRandom() * (rows - height + 1));
      const col = Math.floor(nextRandom() * (cols - width + 1));
      const rect = [row, col, row + height - 1, col + width - 1];
      if (!overlaps(rect)) occupy(rect);
    }

    const rects = splitLargeSpecialRects(placed);
    const values = rects.map(area);
    const horizontalOnly = rects.length > 0 && rects.every((rect) => rect[0] === rect[2]);
    const verticalCount = rects.filter((rect) => rect[2] > rect[0]).length;
    const horizontalCount = rects.filter((rect) => rect[3] > rect[1]).length;
    const blockCount = rects.filter((rect) => rect[2] > rect[0] && rect[3] > rect[1]).length;
    const cells = activeCellsCountForRects(rects);
    const enoughCells = cells >= Math.floor(rows * cols * 0.52);

    if (
      !rectsArePlayableShape(rects, rows, cols) ||
      !rectSignature(rects) ||
      rects.length < 5 ||
      horizontalOnly ||
      verticalCount < 2 ||
      horizontalCount < 2 ||
      !enoughCells ||
      Math.max(...values) > 20
    ) {
      continue;
    }

    const score =
      Math.abs(cells - targetCells) +
      Math.abs(rects.length - targetRegions) * 3 -
      verticalCount * 2 -
      horizontalCount -
      blockCount * 3;

    if (!best || score < best.score) {
      best = { rects, score };
    }
  }

  return best?.rects || null;
}

function rectSignature(rects) {
  return rects.map((rect) => rect.join(",")).sort().join("|");
}

function valueSignature(rects) {
  return rects.map(area).sort((a, b) => a - b).join("-");
}

function areaCounts(rects) {
  const counts = {};
  rects.forEach((rect) => {
    const rectValue = area(rect);
    counts[rectValue] = (counts[rectValue] || 0) + 1;
  });
  return counts;
}

function valueDiversityScore(rects, rows, cols, recentPatterns) {
  const values = rects.map(area);
  const counts = areaCounts(rects);
  const uniqueCount = Object.keys(counts).length;
  const maxRepeat = Math.max(...Object.values(counts));
  const bigBoard = rows >= 8 || cols >= 8;
  const targetUnique = rows <= 4 && cols <= 4 ? 3 : rows <= 5 && cols <= 5 ? 5 : bigBoard ? 7 : 6;
  const signature = rectSignature(rects);
  const valuesOnly = valueSignature(rects);
  let score = 0;

  score += Math.max(0, targetUnique - uniqueCount) * 70;
  if (bigBoard && uniqueCount <= 3) score += 180;
  if (bigBoard && uniqueCount <= 4) score += 80;
  score += Math.max(0, maxRepeat - (bigBoard ? 4 : 3)) * 55;
  Object.entries(counts).forEach(([rawValue, count]) => {
    const value = Number(rawValue);
    if (count >= 4) score += bigBoard ? 28 : 70;
    if (value === 2 && count > 2) score += 35;
    if ((value === 4 || value === 9) && count >= 4) score += 80;
    if ((value === 15 || value === 18 || value === 20) && count >= 4) score += 38;
  });
  if (recentPatterns.some((item) => item.shape === signature)) score += 220;
  if (recentPatterns.some((item) => item.values === valuesOnly)) score += 160;
  score += Math.abs(values.filter((value) => value <= 6).length - values.filter((value) => value >= 13).length) * (bigBoard ? 2 : 5);

  return score;
}

function mergeableUnion(first, second) {
  const r1 = Math.min(first[0], second[0]);
  const c1 = Math.min(first[1], second[1]);
  const r2 = Math.max(first[2], second[2]);
  const c2 = Math.max(first[3], second[3]);
  const union = [r1, c1, r2, c2];
  return area(union) === area(first) + area(second) ? union : null;
}

function maxSameAreaCount(rows, cols, value) {
  if (value === 2) return rows <= 4 && cols <= 4 ? 3 : 2;
  if (rows <= 5 && cols <= 5) return 2;
  return rows >= 10 || cols >= 10 ? 4 : 3;
}

function splitScoreForDiversity(pair, counts, repeatedArea, rows, cols, nextRandom) {
  const firstArea = area(pair[0]);
  const secondArea = area(pair[1]);
  const boardMaxArea = maxPlannedAreaForBoard(rows, cols);
  let score = 0;

  if (firstArea < 2 || secondArea < 2) score += 1000;
  if (firstArea > boardMaxArea || secondArea > boardMaxArea) score += 300;
  if (firstArea === repeatedArea) score += 80;
  if (secondArea === repeatedArea) score += 80;
  if (firstArea === secondArea) score += 16;
  if ((counts[firstArea] || 0) >= maxSameAreaCount(rows, cols, firstArea)) score += 36;
  if ((counts[secondArea] || 0) >= maxSameAreaCount(rows, cols, secondArea)) score += 36;
  if (firstArea === 2) score += 8;
  if (secondArea === 2) score += 8;
  if (firstArea === 4) score += rows >= 6 || cols >= 6 ? 12 : 4;
  if (secondArea === 4) score += rows >= 6 || cols >= 6 ? 12 : 4;
  if (complexAreaValues.has(firstArea)) score -= 5;
  if (complexAreaValues.has(secondArea)) score -= 5;
  if (simpleAreaValues.has(firstArea) && firstArea > 2) score -= 2;
  if (simpleAreaValues.has(secondArea) && secondArea > 2) score -= 2;

  return score + nextRandom();
}

function mergeRepeatedSmallAreas(result, repeatedValue, rows, cols, counts, nextRandom) {
  const boardMaxArea = maxPlannedAreaForBoard(rows, cols);
  const candidates = [];

  for (let firstIndex = 0; firstIndex < result.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < result.length; secondIndex += 1) {
      const first = result[firstIndex];
      const second = result[secondIndex];
      const firstArea = area(first);
      const secondArea = area(second);
      if (firstArea !== repeatedValue && secondArea !== repeatedValue) continue;
      if (firstArea > 6 || secondArea > 6) continue;

      const union = mergeableUnion(first, second);
      if (!union) continue;

      const unionArea = area(union);
      if (unionArea < 3 || unionArea > boardMaxArea) continue;

      let score = 0;
      if (unionArea === repeatedValue) score += 100;
      if ((counts[unionArea] || 0) >= maxSameAreaCount(rows, cols, unionArea)) score += 24;
      if (unionArea === 2) score += 50;
      if (unionArea === 4 && rows >= 6) score += 8;
      if (complexAreaValues.has(unionArea)) score -= 8;
      score += Math.abs(8 - unionArea) + nextRandom();

      candidates.push({ firstIndex, secondIndex, union, score });
    }
  }

  if (!candidates.length) return false;

  candidates.sort((a, b) => a.score - b.score);
  const chosen = candidates[0];
  result.splice(chosen.secondIndex, 1);
  result.splice(chosen.firstIndex, 1, chosen.union);
  return true;
}

function diversifyRepeatedAreas(rects, rows, cols, nextRandom) {
  const result = rects.slice();

  for (let guard = 0; guard < rows * cols; guard += 1) {
    const counts = {};
    result.forEach((rect) => {
      const rectValue = area(rect);
      counts[rectValue] = (counts[rectValue] || 0) + 1;
    });

    const repeatedValue = Object.keys(counts)
      .map(Number)
      .filter((value) => counts[value] > maxSameAreaCount(rows, cols, value))
      .sort((a, b) => counts[b] - counts[a] || b - a)[0];

    if (!repeatedValue) break;

    if (repeatedValue <= 6 && mergeRepeatedSmallAreas(result, repeatedValue, rows, cols, counts, nextRandom)) {
      continue;
    }

    const candidates = [];
    result.forEach((rect, rectIndex) => {
      if (area(rect) !== repeatedValue) return;
      splitCandidates(rect).forEach((pair) => {
        const firstArea = area(pair[0]);
        const secondArea = area(pair[1]);
        if (firstArea < 2 || secondArea < 2) return;
        candidates.push({
          rectIndex,
          pair,
          score: splitScoreForDiversity(pair, counts, repeatedValue, rows, cols, nextRandom)
        });
      });
    });

    if (!candidates.length) break;

    candidates.sort((a, b) => a.score - b.score);
    const chosen = candidates[0];
    result.splice(chosen.rectIndex, 1, chosen.pair[0], chosen.pair[1]);
  }

  return result;
}

function improveValueVariety(rects, rows, cols, nextRandom) {
  if (rows < 6 && cols < 6) return rects;

  const result = rects.slice();
  const targetUnique = rows <= 6 && cols <= 6 ? 5 : rows <= 7 && cols <= 7 ? 6 : 7;

  for (let guard = 0; guard < rows * cols; guard += 1) {
    const counts = areaCounts(result);
    const uniqueCount = Object.keys(counts).length;
    if (uniqueCount >= targetUnique) break;

    const candidates = [];
    result.forEach((rect, rectIndex) => {
      const rectValue = area(rect);
      if (rectValue < (uniqueCount <= 3 ? 6 : 8)) return;

      splitCandidates(rect).forEach((pair) => {
        const firstArea = area(pair[0]);
        const secondArea = area(pair[1]);
        if (firstArea < 2 || secondArea < 2) return;

        let score = 0;
        if (counts[firstArea]) score += 28;
        if (counts[secondArea]) score += 28;
        if (firstArea === secondArea) score += 20;
        if (firstArea === 2 || secondArea === 2) score += 14;
        if (firstArea === 4 || secondArea === 4) score += rows >= 7 || cols >= 7 ? 10 : 3;
        if (complexAreaValues.has(firstArea)) score -= 7;
        if (complexAreaValues.has(secondArea)) score -= 7;
        if (simpleAreaValues.has(firstArea) && firstArea !== 2) score -= 2;
        if (simpleAreaValues.has(secondArea) && secondArea !== 2) score -= 2;
        score += Math.abs(firstArea - secondArea) * 0.35;
        score -= rectValue * 0.08;

        candidates.push({ rectIndex, pair, score: score + nextRandom() });
      });
    });

    if (!candidates.length) break;

    candidates.sort((a, b) => a.score - b.score);
    const chosen = candidates[0];
    result.splice(chosen.rectIndex, 1, chosen.pair[0], chosen.pair[1]);
  }

  return diversifyRepeatedAreas(result, rows, cols, nextRandom);
}

function rebalanceRects(rects, rows, cols, index, nextRandom) {
  if (rows < 6 && cols < 6) return rects;

  const result = rects.slice();
  const profile = levelAreaProfile(index);
  const largeMergeLimit = rows >= 9 || cols >= 9 ? 18 : 20;
  const maxSmallShare =
    profile === "small" ? 0.58 :
    profile === "large" ? (rows >= 10 || cols >= 10 ? 0.24 : rows <= 7 && cols <= 7 ? 0.52 : 0.32) :
    profile === "largeMix" ? (rows >= 10 || cols >= 10 ? 0.34 : rows <= 7 && cols <= 7 ? 0.5 : 0.44) :
    profile === "medium" ? 0.4 :
    rows >= 8 || cols >= 8 ? 0.46 : 0.5;

  for (let guard = 0; guard < rows * cols; guard += 1) {
    const smallCount = result.filter((rect) => area(rect) <= 6).length;
    if (smallCount / result.length <= maxSmallShare) break;

    const candidates = [];
    for (let firstIndex = 0; firstIndex < result.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < result.length; secondIndex += 1) {
        const first = result[firstIndex];
        const second = result[secondIndex];
        const firstArea = area(first);
        const secondArea = area(second);
        if (firstArea > 6 || secondArea > 6) continue;

        const union = mergeableUnion(first, second);
        if (!union) continue;

        const unionArea = area(union);
        if (unionArea < 7 || unionArea > largeMergeLimit || unionArea === 11 || unionArea === 13 || unionArea === 17 || unionArea === 19) continue;

        const removesFour = firstArea === 4 || secondArea === 4 ? -18 : 0;
        const biggerBonus = unionArea >= 12 ? -8 : unionArea >= 9 ? -4 : 0;
        candidates.push({
          firstIndex,
          secondIndex,
          union,
          score: removesFour + biggerBonus + Math.abs(12 - unionArea) + nextRandom()
        });
      }
    }

    if (!candidates.length) break;

    candidates.sort((a, b) => a.score - b.score);
    const chosen = candidates[Math.floor(nextRandom() * Math.min(3, candidates.length))];
    result.splice(chosen.secondIndex, 1);
    result.splice(chosen.firstIndex, 1, chosen.union);
  }

  for (let guard = 0; guard < rows * cols; guard += 1) {
    const smallCount = result.filter((rect) => area(rect) <= 6).length;
    const largeCount = result.filter((rect) => area(rect) >= 13).length;
    const targetLargeShare =
      profile === "large" ? (rows >= 10 || cols >= 10 ? 1.45 : rows <= 7 && cols <= 7 ? 0.56 : 1.15) :
      profile === "largeMix" ? (rows >= 10 || cols >= 10 ? 1.15 : rows <= 7 && cols <= 7 ? 0.48 : 0.9) :
      profile === "small" ? 0.42 :
      profile === "medium" ? 0.55 :
      rows >= 8 || cols >= 8 ? 0.72 : 0.82;
    if (largeCount >= smallCount * targetLargeShare) break;

    const candidates = [];
    for (let firstIndex = 0; firstIndex < result.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < result.length; secondIndex += 1) {
        const first = result[firstIndex];
        const second = result[secondIndex];
        const firstArea = area(first);
        const secondArea = area(second);
        if (firstArea > 12 || secondArea > 12) continue;

        const union = mergeableUnion(first, second);
        if (!union) continue;

        const unionArea = area(union);
        if (unionArea < 13 || unionArea > largeMergeLimit || unionArea === 17 || unionArea === 19) continue;

        const smallReduction = (firstArea <= 6 ? -8 : 0) + (secondArea <= 6 ? -8 : 0);
        const removesFour = firstArea === 4 || secondArea === 4 ? -12 : 0;
        candidates.push({
          firstIndex,
          secondIndex,
          union,
          score: smallReduction + removesFour + Math.abs(16 - unionArea) + nextRandom()
        });
      }
    }

    if (!candidates.length) break;

    candidates.sort((a, b) => a.score - b.score);
    const chosen = candidates[Math.floor(nextRandom() * Math.min(3, candidates.length))];
    result.splice(chosen.secondIndex, 1);
    result.splice(chosen.firstIndex, 1, chosen.union);
  }

  return improveValueVariety(diversifyRepeatedAreas(result, rows, cols, nextRandom), rows, cols, nextRandom);
}

function makeCreativeRects(rows, cols, index, attempt = 0) {
  const fixedPattern = attempt === 0 ? fixedPatternForLevel(index, rows, cols) : null;
  if (fixedPattern) {
    return fixedPattern;
  }

  if (rows === 3 && cols === 3) {
    return compactBoardPatterns[(index + attempt * 3) % compactBoardPatterns.length];
  }

  if (rows === 4 && cols === 4) {
    return handcraftedSmallBoardPatterns[(index - 2 + attempt * 7) % handcraftedSmallBoardPatterns.length];
  }

  const nextRandom = random((index + 1) * 11939 + rows * 433 + cols * 977 + attempt * 3571);
  const areaPlan = makeAreaPlan(rows, cols, index + attempt * 11, nextRandom);
  const targetCount = areaPlan.length;
  const rects = [[0, 0, rows - 1, cols - 1]];
  const boardMaxArea = maxPlannedAreaForBoard(rows, cols);

  for (let guard = 0; guard < rows * cols * 5; guard += 1) {
    const hasHugeRect = rects.some((rect) => area(rect) > boardMaxArea);
    if (!hasHugeRect && rects.length >= targetCount) break;

    const targetArea = guard < areaPlan.length
      ? areaPlan[guard]
      : (rows >= 8 || cols >= 8 ? (guard % 2 === 0 ? 18 : 12) : targetAreaForLevel(rows, cols, index + guard, rows * cols, nextRandom));
    const candidates = rects
      .map((rect, rectIndex) => {
        const preferredMinArea = rows <= 5 && cols <= 5 ? 3 : targetArea <= 6 ? 2 : targetArea <= 12 ? 3 : 4;
        const preferredOptions = splitCandidatesWithMinArea(rect, preferredMinArea);
        const rectArea = area(rect);
        return {
          rect,
          rectIndex,
          options: preferredOptions.length ? preferredOptions : rectArea > 20 ? splitCandidatesWithMinArea(rect, 2) : []
        };
      })
      .filter((item) => item.options.length > 0)
      .sort((a, b) => {
        const areaA = area(a.rect);
        const areaB = area(b.rect);
        const hugeA = areaA > boardMaxArea ? -100 : 0;
        const hugeB = areaB > boardMaxArea ? -100 : 0;
        return hugeA - hugeB + areaB - areaA + Math.abs(areaA - targetArea) - Math.abs(areaB - targetArea) + (nextRandom() - 0.5) * 2;
      });

    if (!candidates.length) break;

    const chosen = candidates[Math.floor(nextRandom() * Math.min(4, candidates.length))];
    const options = shuffle(chosen.options, nextRandom).sort(
      (a, b) => scoreSplit(a, targetArea, nextRandom, rows, cols) - scoreSplit(b, targetArea, nextRandom, rows, cols)
    );
    const pair = options[0];

    rects.splice(chosen.rectIndex, 1, pair[0], pair[1]);
  }

  return shuffle(rebalanceRects(rects, rows, cols, index, nextRandom), nextRandom);
}

const generatedSpecs = boardSizes.map(([rows, cols], index) => {
  const fixedPattern = fixedPatternForLevel(index, rows, cols);
  const usesIrregularBoard = fixedPattern && !rectsCoverBoard(fixedPattern, rows, cols);
  return {
    rows,
    cols,
    activeCells: usesIrregularBoard ? activeCellsForRects(fixedPattern) : null,
    rects: fixedPattern || makeCreativeRects(rows, cols, index)
  };
});

const recentPatternsBySize = {};
for (let index = 0; index < generatedSpecs.length; index += 1) {
  const spec = generatedSpecs[index];

  const sizeKey = `${spec.rows}x${spec.cols}`;
  const recentPatterns = recentPatternsBySize[sizeKey] || [];
  const fixedPattern = fixedPatternForLevel(index, spec.rows, spec.cols);

  if (fixedPattern) {
    const fixedShape = rectSignature(fixedPattern);
    const fixedValues = valueSignature(fixedPattern);
    spec.rects = fixedPattern;
    recentPatterns.push({ shape: fixedShape, values: fixedValues });
    recentPatternsBySize[sizeKey] = recentPatterns;
    continue;
  }

  let bestCandidate = null;

  for (let attempt = 0; attempt < 48; attempt += 1) {
    const candidateRects = makeCreativeRects(spec.rows, spec.cols, index, attempt);
    const candidateSignature = rectSignature(candidateRects);
    const candidateValues = valueSignature(candidateRects);
    const repeated = recentPatterns.some(
      (item) => item.shape === candidateSignature || item.values === candidateValues
    );
    const score = valueDiversityScore(candidateRects, spec.rows, spec.cols, recentPatterns) + (repeated ? 160 : 0) + attempt * 0.25;

    if (!bestCandidate || score < bestCandidate.score) {
      bestCandidate = {
        rects: candidateRects,
        shape: candidateSignature,
        values: candidateValues,
        score
      };
    }

    if (!repeated && score < 12) {
      break;
    }
  }

  if (bestCandidate) {
    spec.rects = bestCandidate.rects;
    recentPatterns.push({ shape: bestCandidate.shape, values: bestCandidate.values });
    recentPatternsBySize[sizeKey] = recentPatterns;
  }
}

const levelSpecs = generatedSpecs;

function key(row, col) {
  return `${row}-${col}`;
}

export function makeLevels() {
  return levelSpecs.map((spec, index) => ({
    name: `Bölüm ${index + 1}`,
    package: packageName(index),
    rows: spec.rows,
    cols: spec.cols,
    activeCells: spec.activeCells,
    regions: spec.rects.map((rect, regionIndex) => {
      const [r1, c1, r2, c2] = rect;
      const clueRow = r1 + ((regionIndex + index) % (r2 - r1 + 1));
      const clueCol = c1 + ((regionIndex * 2 + index) % (c2 - c1 + 1));
      const value = (r2 - r1 + 1) * (c2 - c1 + 1);

      return {
        id: `r${regionIndex}`,
        value,
        clue: key(clueRow, clueCol),
        color: colorPalette[(regionIndex + index * 5) % colorPalette.length],
        rect: { r1, c1, r2, c2 }
      };
    })
  }));
}

export { colorPalette, key };
