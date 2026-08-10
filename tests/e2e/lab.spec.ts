import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const locale of ["en", "es"] as const) {
  test(`${locale} simulator exposes aligned controls and results`, async ({
    page,
  }) => {
    await page.goto(`${locale}/`);
    await expect(
      page.getByText(
        locale === "en"
          ? "Simulation · Not production telemetry"
          : "Simulación · No es telemetría de producción",
      ),
    ).toBeVisible();
    await expect(page.locator("[data-metrics] article")).toHaveCount(10);
    await page.locator('select[name="fault"]').selectOption("inventory");
    await page.locator('input[name="intensity"]').fill("90");
    await page
      .getByRole("button", {
        name: locale === "en" ? "Run simulation" : "Ejecutar simulación",
      })
      .click();
    await expect(page.locator("[data-traces] details").first()).toBeVisible();
    await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute(
      "href",
      /\/en\/$/,
    );
    await expect(page.locator("[data-theme-control]")).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

test("theme choice persists and portfolio return is the final menu link", async ({
  page,
}) => {
  await page.goto("en/");
  await page.locator("[data-theme-control] summary").click();
  await page.getByRole("button", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".nav-menu nav a").last()).toHaveText("Portfolio");
});
