import type { GridPoint } from './IsoMath';
import type { TileMap } from './TileMap';

interface PathNode {
  x: number;
  y: number;
  g: number;
  f: number;
}

const DIRECTIONS: ReadonlyArray<readonly [number, number, number]> = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

function keyOf(x: number, y: number): number {
  return y * 1024 + x;
}

function octileHeuristic(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  const min = Math.min(dx, dy);
  const max = Math.max(dx, dy);
  return max - min + min * Math.SQRT2;
}

/**
 * Computes an 8-directional A* path across walkable tiles with corner-cutting prevention.
 */
export function findPath(
  tileMap: TileMap,
  startInput: GridPoint,
  goalInput: GridPoint
): GridPoint[] {
  const start: GridPoint = {
    x: Math.round(startInput.x),
    y: Math.round(startInput.y),
  };

  if (!tileMap.isWalkable(start.x, start.y)) {
    const rescued = tileMap.findNearestWalkable(start.x, start.y, start.x, start.y, 3);
    if (!rescued) {
      return [];
    }
    start.x = rescued.x;
    start.y = rescued.y;
  }

  const resolvedGoal = tileMap.findNearestWalkable(
    goalInput.x,
    goalInput.y,
    start.x,
    start.y,
    7
  );

  if (!resolvedGoal) {
    return [];
  }

  if (resolvedGoal.x === start.x && resolvedGoal.y === start.y) {
    return [];
  }

  const startKey = keyOf(start.x, start.y);
  const goalKey = keyOf(resolvedGoal.x, resolvedGoal.y);

  const open: PathNode[] = [
    {
      x: start.x,
      y: start.y,
      g: 0,
      f: octileHeuristic(start.x, start.y, resolvedGoal.x, resolvedGoal.y),
    },
  ];
  const gScore = new Map<number, number>([[startKey, 0]]);
  const cameFrom = new Map<number, number>();
  const closed = new Set<number>();

  while (open.length > 0) {
    // Pop lowest f-score node
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) {
        bestIdx = i;
      }
    }
    const current = open[bestIdx];
    open.splice(bestIdx, 1);

    const currKey = keyOf(current.x, current.y);
    if (currKey === goalKey) {
      const path: GridPoint[] = [];
      let traceKey: number | undefined = currKey;
      while (traceKey !== undefined && traceKey !== startKey) {
        const py = Math.floor(traceKey / 1024);
        const px = traceKey % 1024;
        path.push({ x: px, y: py });
        traceKey = cameFrom.get(traceKey);
      }
      path.reverse();
      return path;
    }

    if (closed.has(currKey)) {
      continue;
    }
    closed.add(currKey);

    for (const [dx, dy, stepCost] of DIRECTIONS) {
      const nx = current.x + dx;
      const ny = current.y + dy;

      if (!tileMap.isWalkable(nx, ny)) {
        continue;
      }

      // Prevent diagonal corner clipping across non-walkable adjacent tiles
      if (dx !== 0 && dy !== 0) {
        if (!tileMap.isWalkable(current.x + dx, current.y) || !tileMap.isWalkable(current.x, current.y + dy)) {
          continue;
        }
      }

      const nKey = keyOf(nx, ny);
      if (closed.has(nKey)) {
        continue;
      }

      const tentativeG = current.g + stepCost;
      const prevBestG = gScore.get(nKey);
      if (prevBestG !== undefined && tentativeG >= prevBestG) {
        continue;
      }

      cameFrom.set(nKey, currKey);
      gScore.set(nKey, tentativeG);
      const h = octileHeuristic(nx, ny, resolvedGoal.x, resolvedGoal.y);
      open.push({
        x: nx,
        y: ny,
        g: tentativeG,
        f: tentativeG + h * 1.001,
      });
    }
  }

  return [];
}
