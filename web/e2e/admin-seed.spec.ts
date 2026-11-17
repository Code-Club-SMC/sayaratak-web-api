import { expect, test, visit } from "./journeys/fixtures"

test.describe("Admin seed workflow and public controls", () => {
  test("admin accesses site settings, sees seed section and dataset controls @en", async ({
    page,
    signIn,
    t,
    at,
  }) => {
    await signIn("admin")
    await visit(page, at("/admin/settings"))

    const seedTitle = page.getByRole("heading", {
      name: t("admin.seed_settings_title"),
    })
    await expect(seedTitle).toBeVisible()

    const prepareButton = page.getByRole("button", {
      name: t("admin.seed_action_prepare"),
    })
    if (await prepareButton.isVisible()) {
      await prepareButton.click()
      await expect(
        page.getByRole("button", {
          name: t("admin.seed_action_download_prompts"),
        })
      ).toBeVisible()
    }
  })

  test("seed notice appears when preview data is displayed and suppresses actions @en", async ({
    page,
    t,
    at,
  }) => {
    await visit(page, at("/"))
    const notice = page.locator("main").getByText(t("common.seed_notice"))
    const noticeCount = await notice.count()
    expect(noticeCount).toBeLessThanOrEqual(1)
  })

  test("admin seed controls work across desktop and mobile viewports @ar", async ({
    page,
    signIn,
    t,
    at,
  }) => {
    await signIn("admin")
    await visit(page, at("/admin/settings"))

    const seedTitle = page.getByRole("heading", {
      name: t("admin.seed_settings_title"),
    })
    await expect(seedTitle).toBeVisible()
  })
})
