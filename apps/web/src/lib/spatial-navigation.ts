export type SpatialDirection = "up" | "right" | "down" | "left";

export interface SpatialRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

type SpatialElement = HTMLElement & {
  getBoundingClientRect(): SpatialRect;
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not(:disabled)",
  "input:not(:disabled):not([type='hidden'])",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function findNearestSpatialCandidate<T>(
  current: SpatialRect,
  candidates: readonly T[],
  getRect: (candidate: T) => SpatialRect,
  direction: SpatialDirection,
): T | null {
  const currentX = (current.left + current.right) / 2;
  const currentY = (current.top + current.bottom) / 2;
  let nearest: T | null = null;
  let nearestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const rect = getRect(candidate);
    const candidateX = (rect.left + rect.right) / 2;
    const candidateY = (rect.top + rect.bottom) / 2;
    let primaryDistance: number;
    let perpendicularDistance: number;

    if (direction === "right" || direction === "left") {
      primaryDistance = direction === "right" ? candidateX - currentX : currentX - candidateX;
      if (primaryDistance <= 0) continue;
      perpendicularDistance = Math.max(
        0,
        current.top - rect.bottom,
        rect.top - current.bottom,
      );
    } else {
      primaryDistance = direction === "down" ? candidateY - currentY : currentY - candidateY;
      if (primaryDistance <= 0) continue;
      perpendicularDistance = Math.max(
        0,
        current.left - rect.right,
        rect.left - current.right,
      );
    }

    const score = primaryDistance + perpendicularDistance * 2;
    if (score < nearestScore) {
      nearest = candidate;
      nearestScore = score;
    }
  }

  return nearest;
}

function getFocusableElements(container: HTMLElement): SpatialElement[] {
  return Array.from(container.querySelectorAll<SpatialElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    if (element.getAttribute("aria-disabled") === "true" || element.getClientRects().length === 0) {
      return false;
    }
    const style = window.getComputedStyle(element);
    return style.visibility !== "hidden" && style.display !== "none";
  });
}

function allowsNativeArrowKeys(element: HTMLElement, direction: SpatialDirection): boolean {
  if (element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) return true;
  if (!(element instanceof HTMLInputElement)) return false;

  if (["checkbox", "radio", "range", "color", "date", "datetime-local", "month", "number", "time", "week"].includes(element.type)) {
    return true;
  }
  return direction === "left" || direction === "right";
}

export function isRemoteBackKey(event: KeyboardEvent): boolean {
  return ["Escape", "Backspace", "BrowserBack", "GoBack", "XF86Back"].includes(event.key)
    || event.keyCode === 4
    || event.keyCode === 461;
}

export function getSpatialDirection(event: KeyboardEvent): SpatialDirection | null {
  const directionByKey: Record<string, SpatialDirection> = {
    ArrowUp: "up",
    ArrowRight: "right",
    ArrowDown: "down",
    ArrowLeft: "left",
    Up: "up",
    Right: "right",
    Down: "down",
    Left: "left",
  };
  const direction = directionByKey[event.key];
  if (direction) return direction;

  const directionByKeyCode: Record<number, SpatialDirection> = {
    37: "left",
    38: "up",
    39: "right",
    40: "down",
  };
  return directionByKeyCode[event.keyCode] ?? null;
}

export function navigateSpatially(
  container: HTMLElement,
  direction: SpatialDirection,
): boolean {
  const active = document.activeElement;
  if (active instanceof HTMLElement && allowsNativeArrowKeys(active, direction)) return false;

  const controls = getFocusableElements(container);
  if (controls.length === 0) return false;

  if (!(active instanceof HTMLElement) || !container.contains(active)) {
    controls.sort((first, second) => {
      const firstRect = first.getBoundingClientRect();
      const secondRect = second.getBoundingClientRect();
      return firstRect.top - secondRect.top || firstRect.left - secondRect.left;
    })[0]?.focus();
    return true;
  }

  const currentRect = active.getBoundingClientRect();
  const nearest = findNearestSpatialCandidate(
    currentRect,
    controls.filter((control) => control !== active),
    (control) => control.getBoundingClientRect(),
    direction,
  );
  nearest?.focus();
  return true;
}
