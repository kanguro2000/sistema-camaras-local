import { expect, test } from "@playwright/test";
import { cameraFixture, installGatewayMock, signIn } from "./support.js";

test("muestra una cámara, abre fullscreen y restaura el foco al volver", async ({ page }) => {
  const camera = cameraFixture("Camera Wall E2E", "192.0.2.10");
  await installGatewayMock(page, [camera]);
  await signIn(page);

  const tile = page.locator(".tile");
  await expect(tile).toContainText("Camera Wall E2E");
  await expect(tile.locator("video")).toBeAttached();

  await tile.click();
  await expect(page.locator(".fullscreen video")).toBeAttached();
  await page.keyboard.press("Escape");

  await expect(page.locator(".grid-view")).toBeVisible();
  await expect(tile).toBeFocused();
  await page.reload();
  await expect(page.locator(".tile")).toContainText("Camera Wall E2E");
});
