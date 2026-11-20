export const TILE_W = 64;
export const TILE_H = 32;
export const ELEVATION_H = 14;

export interface GridPoint {
  x: number;
  y: number;
}

export interface WorldPoint {
  x: number;
  y: number;
  z?: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  targetZoom: number;
  viewWidth: number;
  viewHeight: number;
}

/**
 * Converts continuous world tile coordinates (wx, wy, wz) into unscaled isometric coordinates.
 */
export function worldToIso(wx: number, wy: number, wz = 0): ScreenPoint {
  return {
    x: (wx - wy) * (TILE_W / 2),
    y: (wx + wy) * (TILE_H / 2) - wz * ELEVATION_H,
  };
}

/**
 * Converts unscaled isometric coordinates back to world tile coordinates on elevation plane wz.
 */
export function isoToWorld(isoX: number, isoY: number, wz = 0): GridPoint {
  const adjY = isoY + wz * ELEVATION_H;
  const halfW = TILE_W / 2;
  const halfH = TILE_H / 2;
  return {
    x: (adjY / halfH + isoX / halfW) / 2,
    y: (adjY / halfH - isoX / halfW) / 2,
  };
}

/**
 * Converts world coordinates directly into canvas CSS pixel coordinates using the active camera.
 */
export function worldToScreen(
  wx: number,
  wy: number,
  wz: number,
  camera: CameraState
): ScreenPoint {
  const iso = worldToIso(wx, wy, wz);
  return {
    x: (iso.x - camera.x) * camera.zoom + camera.viewWidth / 2,
    y: (iso.y - camera.y) * camera.zoom + camera.viewHeight / 2,
  };
}

/**
 * Converts canvas CSS pixel coordinates into unscaled world isometric coordinates.
 */
export function screenToIso(
  screenX: number,
  screenY: number,
  camera: CameraState
): ScreenPoint {
  return {
    x: (screenX - camera.viewWidth / 2) / camera.zoom + camera.x,
    y: (screenY - camera.viewHeight / 2) / camera.zoom + camera.y,
  };
}

/**
 * Checks whether an unscaled isometric point lies inside the top diamond (or upper side lip)
 * of grid tile (gx, gy) at elevation wz.
 */
function isPointInTileDiamond(
  isoX: number,
  isoY: number,
  gx: number,
  gy: number,
  wz: number
): boolean {
  const center = worldToIso(gx, gy, wz);
  const dx = Math.abs(isoX - center.x) / (TILE_W / 2);
  const dy = Math.abs(isoY - center.y) / (TILE_H / 2);
  if (dx + dy <= 1.005) {
    return true;
  }

  // Allow clicking the front 2.5D bevel edge of elevated tiles for intuitive touch ergonomics
  if (wz > 0.3 && Math.abs(isoX - center.x) <= TILE_W / 2) {
    const lipDepth = Math.min(8, wz * ELEVATION_H * 0.55);
    const frontEdgeY = center.y + (1 - Math.abs(isoX - center.x) / (TILE_W / 2)) * (TILE_H / 2);
    if (isoY >= frontEdgeY && isoY <= frontEdgeY + lipDepth) {
      return true;
    }
  }

  return false;
}

/**
 * Picks the exact grid tile under (screenX, screenY), testing elevated surfaces in front-to-back order.
 */
export function screenToGrid(
  screenX: number,
  screenY: number,
  camera: CameraState,
  getElevation?: (gx: number, gy: number) => number
): GridPoint {
  const iso = screenToIso(screenX, screenY, camera);

  if (getElevation) {
    const lowEstimate = isoToWorld(iso.x, iso.y, 0);
    const highEstimate = isoToWorld(iso.x, iso.y, 1.2);
    const minX = Math.floor(Math.min(lowEstimate.x, highEstimate.x)) - 1;
    const maxX = Math.ceil(Math.max(lowEstimate.x, highEstimate.x)) + 1;
    const minY = Math.floor(Math.min(lowEstimate.y, highEstimate.y)) - 1;
    const maxY = Math.ceil(Math.max(lowEstimate.y, highEstimate.y)) + 1;

    const candidates: Array<{ gx: number; gy: number; wz: number; depth: number }> = [];
    for (let gx = minX; gx <= maxX; gx++) {
      for (let gy = minY; gy <= maxY; gy++) {
        const wz = getElevation(gx, gy);
        candidates.push({ gx, gy, wz, depth: gx + gy });
      }
    }

    // Front-most tiles first; break ties by higher elevation
    candidates.sort((a, b) => b.depth - a.depth || b.wz - a.wz);

    for (const c of candidates) {
      if (isPointInTileDiamond(iso.x, iso.y, c.gx, c.gy, c.wz)) {
        return { x: c.gx, y: c.gy };
      }
    }
  }

  const fallback = isoToWorld(iso.x, iso.y, 0.35);
  return {
    x: Math.round(fallback.x),
    y: Math.round(fallback.y),
  };
}
