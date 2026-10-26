import assert from "node:assert/strict";
import { test } from "node:test";
import {
  findNearestSpatialCandidate,
  getSpatialDirection,
  type SpatialDirection,
  type SpatialRect,
} from "../src/lib/spatial-navigation.js";

interface Candidate {
  id: string;
  rect: SpatialRect;
}

const cameraGrid: Candidate[] = [
  { id: "top-right", rect: { left: 120, right: 220, top: 0, bottom: 100 } },
  { id: "bottom-left", rect: { left: 0, right: 100, top: 120, bottom: 220 } },
  { id: "bottom-right", rect: { left: 120, right: 220, top: 120, bottom: 220 } },
];

const topLeft: SpatialRect = { left: 0, right: 100, top: 0, bottom: 100 };

function find(direction: SpatialDirection): Candidate | null {
  return findNearestSpatialCandidate(topLeft, cameraGrid, (candidate) => candidate.rect, direction);
}

test("spatial navigation follows the closest control in the requested visual direction", () => {
  assert.equal(find("right")?.id, "top-right");
  assert.equal(find("down")?.id, "bottom-left");
});

test("spatial navigation does not wrap when there is no control in that direction", () => {
  assert.equal(find("left"), null);
  assert.equal(find("up"), null);
});

test("spatial navigation ignores controls that are not in the requested direction", () => {
  const leftOnly: Candidate[] = [
    { id: "below", rect: { left: 0, right: 100, top: 120, bottom: 220 } },
    { id: "above", rect: { left: 0, right: 100, top: -120, bottom: -20 } },
  ];

  assert.equal(
    findNearestSpatialCandidate(topLeft, leftOnly, (candidate) => candidate.rect, "right"),
    null,
  );
});

test("remote arrow key names and legacy key codes map to spatial directions", () => {
  assert.equal(getSpatialDirection({ key: "ArrowLeft", keyCode: 0 } as KeyboardEvent), "left");
  assert.equal(getSpatialDirection({ key: "Down", keyCode: 0 } as KeyboardEvent), "down");
  assert.equal(getSpatialDirection({ key: "Unidentified", keyCode: 39 } as KeyboardEvent), "right");
  assert.equal(getSpatialDirection({ key: "Enter", keyCode: 13 } as KeyboardEvent), null);
});
