import { expect, test } from "@playwright/test";
import { cameraFixture, installGatewayMock, signIn } from "./support.js";

test("muestra una cÃ¡mara, abre fullscreen y restaura el foco al volver", async ({ page }) => {
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

test("reordena las cámaras con los botones y conserva el orden al recargar", async ({ page }) => {
  await installGatewayMock(page, [
    cameraFixture("Camara 1", "192.0.2.11"),
    cameraFixture("Camara 2", "192.0.2.12"),
  ]);
  await signIn(page);

  const names = page.locator(".tile .tile-name");
  await expect(names).toHaveText(["Camara 1", "Camara 2"]);

  const moveRight = page.getByRole("button", { name: "Mover Camara 1 a la derecha" });
  await moveRight.focus();
  await page.keyboard.press("Enter");

  await expect(names).toHaveText(["Camara 2", "Camara 1"]);
  await expect(page.getByRole("button", { name: "Mover Camara 1 a la derecha" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Mover Camara 1 a la izquierda" })).toBeFocused();

  await page.reload();
  await expect(names).toHaveText(["Camara 2", "Camara 1"]);
});
