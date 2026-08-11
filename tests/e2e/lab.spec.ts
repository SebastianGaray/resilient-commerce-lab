import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

for (const locale of ["en", "es"] as const) {
  test(`${locale} simulator exposes aligned controls and results`, async ({
    page,
  }) => {
    await page.goto(`${locale}/`)
    await expect(
      page.getByText(
        locale === "en"
          ? "Simulation · Not production telemetry"
          : "Simulación · No es telemetría de producción",
      ),
    ).toBeVisible()
    await expect(page.locator("[data-metrics] article")).toHaveCount(10)
    await expect(page.locator("[data-customer-state]")).toBeHidden()
    await expect(page.locator("[data-recommendation]")).toBeHidden()
    await page.locator('select[name="scenario"]').selectOption("cyber")
    await page.locator('select[name="scaling"]').selectOption("horizontal-2")
    await page
      .getByRole("button", {
        name: locale === "en" ? "Play" : "Reproducir",
      })
      .click()
    await expect(page.locator("[data-traces] details").first()).toBeVisible()
    await expect(page.locator("[data-resources] article")).toHaveCount(5)
    await expect(page.locator("[data-capacity-cost]")).toContainText(
      locale === "en" ? "maximum per service" : "máximo por servicio",
    )
    await expect(page.locator("[data-recommendation]")).toBeVisible()
    expect(
      await page.locator("[data-recommendation] li").count(),
    ).toBeGreaterThan(1)
    await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute(
      "href",
      /\/en\/$/,
    )
    await expect(page.locator("[data-theme-control]")).toBeVisible()
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    )
    expect(overflow).toBe(false)
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
}

test("theme choice persists and portfolio return is the final menu link", async ({
  page,
}) => {
  await page.goto("en/")
  await page.locator("[data-theme-control] summary").click()
  await page.getByRole("button", { name: "Dark" }).click()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await page.reload()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await expect(page.locator(".nav-menu nav a").last()).toHaveText("Portfolio")
})

test("playback animates bounded orbs, pauses and derives topology", async ({
  page,
}) => {
  await page.goto("en/")
  await expect(page.locator('select[name="scenario"] option')).toHaveCount(4)
  await expect(page.locator('select[name="scaling"] option')).toHaveCount(5)
  await expect(page.locator('input[name="seed"]')).toHaveCount(0)
  await expect(page.locator('select[name="maxInstances"]')).toHaveCount(0)
  await expect(
    page.locator('select[name="scenario"] option').nth(1),
  ).toContainText("250 users")
  await expect(page.locator('select[name="fault"]')).toHaveCount(0)
  await expect(page.locator('select[name="limit"] option')).toHaveCount(4)
  await expect(page.locator('select[name="speed"]')).toHaveCount(0)
  await expect(page.locator(".playback-actions button")).toHaveCount(1)
  await expect(page.locator(".flow-legend")).not.toHaveAttribute("open", "")
  await page.locator(".flow-legend summary").click()
  await expect(page.locator(".flow-legend li")).toHaveCount(4)
  await expect(page.locator('select[name="limit"]')).toHaveValue("1000")
  await expect(page.locator('select[name="retries"]')).toHaveValue("0")
  await expect(page.locator('input[name="cache"]')).not.toBeChecked()
  await expect(page.locator('input[name="circuit"]')).not.toBeChecked()
  await expect(page.locator('input[name="idempotency"]')).not.toBeChecked()
  await expect(page.locator("[data-annotations] > *")).toHaveCount(0)
  await expect(page.locator("[data-resources] article")).toHaveCount(0)
  await expect(page.locator("[data-capacity-cost]")).toBeHidden()
  expect(await page.locator("svg + .flow-legend").count()).toBe(1)
  expect(await page.locator(".flow-legend + .resource-summary").count()).toBe(1)
  await page.locator('input[name="cache"]').check()
  await page.locator('input[name="circuit"]').check()
  await expect(page.locator("[data-annotations]")).toContainText(
    "Circuit breaker: closed",
  )
  const cacheBox = await page.locator('[data-node="cache"]').boundingBox()
  const circuitBox = await page
    .locator("[data-annotations] g")
    .filter({ hasText: "Circuit breaker" })
    .boundingBox()
  expect(circuitBox?.y).toBeGreaterThan(
    (cacheBox?.y ?? 0) + (cacheBox?.height ?? 0),
  )
  const activityHeight = await page
    .locator(".activity ul")
    .evaluate((element) => element.getBoundingClientRect().height)
  await page.getByRole("button", { name: "Play" }).click()
  await expect(page.locator('[data-edge="order-queue"]')).toHaveClass(
    /active/,
    { timeout: 3_000 },
  )
  await page.waitForTimeout(650)
  const firstCapacity = await page.locator("[data-resources]").innerText()
  await page.waitForTimeout(1_100)
  await expect(page.locator("[data-resources]")).not.toHaveText(firstCapacity)
  const progress = await page
    .locator("[data-playback-progress]")
    .getAttribute("value")
  expect(Number(progress)).toBeGreaterThan(0)
  expect(await page.locator("[data-orbs] > *").count()).toBeLessThanOrEqual(12)
  expect(
    await page.locator("[data-trace-paint] > *").count(),
  ).toBeLessThanOrEqual(36)
  await expect(page.locator("[data-paint-summary]")).toHaveCount(0)
  await expect(page.locator("[data-resources]")).toContainText("CPU")
  expect(await page.locator("[data-activity] li").count()).toBeLessThanOrEqual(
    5,
  )
  expect(
    await page
      .locator(".activity ul")
      .evaluate((element) => element.getBoundingClientRect().height),
  ).toBe(activityHeight)
  await page.getByRole("button", { name: "Pause" }).click()
  const pausedTime = await page.locator("[data-playback-time]").innerText()
  await page.waitForTimeout(250)
  await expect(page.locator("[data-playback-time]")).toHaveText(pausedTime)
  await page.locator('input[name="cache"]').uncheck()
  await expect(page.locator('[data-node="cache"]')).toHaveAttribute(
    "hidden",
    "",
  )
  await page.locator('select[name="limit"]').selectOption("250")
  await expect(page.locator('[data-node="limiter"]')).not.toHaveAttribute(
    "hidden",
    "",
  )
  await page.locator('select[name="limit"]').selectOption("1000")
  await expect(page.locator('[data-node="limiter"]')).toHaveAttribute(
    "hidden",
    "",
  )
  await page.locator('select[name="mode"]').selectOption("continuous")
  await expect(page.locator("[data-loop-note]")).toBeVisible()
  await page.getByRole("button", { name: "Open help" }).first().click()
  await expect(page.locator("#controls-help")).toBeVisible()
  await expect(page.locator("#controls-help")).toContainText("Traffic scenario")
  await expect(page.locator("#controls-help a").first()).toHaveAttribute(
    "href",
    /kubernetes\.io/,
  )
})

test("single playback uses the full ten-second animation window", async ({
  page,
}) => {
  await page.goto("en/")
  await page.getByRole("button", { name: "Play" }).click()
  await page.waitForTimeout(9_200)
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible()
  await expect(page.locator("[data-orbs] > *")).not.toHaveCount(0)
  await expect(page.locator("[data-playback-time]")).not.toHaveText("10.0 s")
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible({
    timeout: 1_500,
  })
  await expect(page.locator("[data-playback-time]")).toHaveText("10.0 s")
})

test("guidance appears from playback evidence and resets with inputs", async ({
  page,
}) => {
  await page.goto("en/")
  await page.locator('select[name="scenario"]').selectOption("cyber")
  await expect(page.locator("[data-customer-state]")).toBeHidden()
  await expect(page.locator("[data-recommendation]")).toBeHidden()
  await page.getByRole("button", { name: "Play" }).click()
  await expect(page.locator("[data-customer-state]")).toBeVisible()
  await expect(page.locator("[data-recommendation]")).toContainText(
    "Enable horizontal scaling",
  )
  await page.getByRole("button", { name: "Pause" }).click()
  await page.locator('select[name="scaling"]').selectOption("horizontal-4")
  await expect(page.locator("[data-customer-state]")).toBeHidden()
  await expect(page.locator("[data-recommendation]")).toBeHidden()
})
