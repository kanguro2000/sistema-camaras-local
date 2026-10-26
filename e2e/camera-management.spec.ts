import { expect, test } from "@playwright/test";
import { installGatewayMock, signIn } from "./support.js";

test("crea una cámara y la vuelve a leer desde la lista", async ({ page }) => {
  const state = await installGatewayMock(page);
  await signIn(page);

  await page.getByRole("button", { name: "Administrar cámaras" }).click();
  await expect(page.getByRole("heading", { name: "Administrar cámaras" })).toBeVisible();
  await page.getByRole("button", { name: "Agregar cámara" }).click();

  await page.getByLabel("Nombre").fill("Camera Admin E2E");
  await page.getByLabel("Dirección IP local").fill("192.0.2.11");
  await page.getByLabel("Usuario de la cuenta de cámara").fill("camera-user");
  await page.getByLabel("Contraseña de la cuenta de cámara").fill("camera-password");
  await page.getByRole("button", { name: "Guardar cámara" }).click();

  await expect(page.getByRole("heading", { name: "Camera Admin E2E" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cámaras registradas (1)" })).toBeVisible();
  expect(state.cameras).toHaveLength(1);
  expect(state.cameras[0].name).toBe("Camera Admin E2E");

  await page.getByRole("button", { name: "Volver a la vista de cámaras" }).click();
  await expect(page.locator(".tile")).toContainText("Camera Admin E2E");
});
