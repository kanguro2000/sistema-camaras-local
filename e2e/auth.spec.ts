import { expect, test } from "@playwright/test";
import { installGatewayMock, signIn } from "./support.js";

test("rechaza credenciales inválidas y conserva la sesión al recargar", async ({ page }) => {
  await installGatewayMock(page);
  await signIn(page);

  await expect(page.getByRole("heading", { name: "Cámaras (demo)" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Agregar la primera cámara" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Cámaras (demo)" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
});
