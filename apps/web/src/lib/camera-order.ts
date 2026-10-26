const STORAGE_KEY = "camera-order";

export function applyCameraOrder<T extends { id: string }>(
  cameras: readonly T[],
  order: readonly string[],
): T[] {
  const position = new Map(order.map((id, index) => [id, index]));
  return cameras
    .map((camera, index) => ({ camera, index }))
    .sort((first, second) => {
      const firstPos = position.get(first.camera.id) ?? Number.POSITIVE_INFINITY;
      const secondPos = position.get(second.camera.id) ?? Number.POSITIVE_INFINITY;
      return firstPos === secondPos ? first.index - second.index : firstPos - secondPos;
    })
    .map(({ camera }) => camera);
}

export function moveCamera(
  currentIds: readonly string[],
  cameraId: string,
  offset: -1 | 1,
): string[] {
  const ids = [...currentIds];
  const from = ids.indexOf(cameraId);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= ids.length) return ids;
  [ids[from], ids[to]] = [ids[to]!, ids[from]!];
  return ids;
}

export function loadCameraOrder(storage: Pick<Storage, "getItem"> = localStorage): string[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function saveCameraOrder(
  order: readonly string[],
  storage: Pick<Storage, "setItem"> = localStorage,
): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {
    // El orden es una preferencia; si no se puede guardar, se mantiene en memoria.
  }
}
