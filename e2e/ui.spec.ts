import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const fixturesDir = path.join(
  import.meta.dirname,
  "..",
  "src",
  "core",
  "fixtures",
  "kindle-clippings",
);

function loadFixture(name: string): string {
  return readFileSync(path.join(fixturesDir, name), "utf-8");
}

test("empty state matches the UI spec's empty-state message", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("No clippings yet.")).toBeVisible();
  await expect(page).toHaveScreenshot("empty-state.png");
});

test("multiple clippings render as stacked cards matching the UI spec", async ({
  page,
  request,
}) => {
  for (const fixture of ["clean-highlight.txt", "bookmark.txt"]) {
    const response = await request.post(
      "http://localhost:3000/clippings/import",
      {
        data: { text: loadFixture(fixture) },
      },
    );
    expect(response.ok()).toBe(true);
  }

  await page.goto("/");
  await expect(page.getByText("The Design of Everyday Things")).toBeVisible();
  await expect(page.getByText("Fahrenheit 451")).toBeVisible();
  await expect(page).toHaveScreenshot("loaded-state.png");
});

test("the stats summary reflects the current data", async ({ page }) => {
  await page.goto("/");

  // From the previous test's imports: 1 highlight (Don Norman), 1 bookmark
  // (Ray Bradbury) — 2 distinct authors, 0 notes.
  await expect(
    page.getByText(
      "2 clippings — 1 highlights, 0 notes, 1 bookmarks · 2 authors",
    ),
  ).toBeVisible();
});

test("the export link carries the current search query and sort", async ({
  page,
}) => {
  await page.goto("/");
  await page.fill('input[type="search"]', "fahrenheit");
  await page.click('button[type="submit"]');
  await page.selectOption('select[aria-label="Sort order"]', "asc");

  await expect(page.locator("a.export-link")).toHaveAttribute(
    "href",
    "/clippings/export?q=fahrenheit&sort=asc",
  );
});

test("search filters the visible list to matching clippings only", async ({
  page,
}) => {
  await page.goto("/");
  await page.fill('input[type="search"]', "fahrenheit");
  await page.click('button[type="submit"]');

  await expect(page.getByText("Fahrenheit 451")).toBeVisible();
  await expect(
    page.getByText("The Design of Everyday Things"),
  ).not.toBeVisible();
});

test("a search with no matches shows a distinct message naming the term", async ({
  page,
}) => {
  await page.goto("/");
  await page.fill('input[type="search"]', "zzz-nonexistent-term-zzz");
  await page.click('button[type="submit"]');

  await expect(
    page.getByText('No clippings match "zzz-nonexistent-term-zzz".'),
  ).toBeVisible();
  await expect(page.getByText("No clippings yet.")).not.toBeVisible();
});

test("adding and removing a tag updates the chip list live", async ({
  page,
}) => {
  await page.goto("/");
  await page.fill('input[type="search"]', "fahrenheit");
  await page.click('button[type="submit"]');

  const card = page
    .locator("li.clipping")
    .filter({ hasText: "Fahrenheit 451" });
  const tagInput = card.locator(".add-tag input");

  await tagInput.fill("classic");
  await tagInput.press("Enter");

  const chip = card.locator(".tag-chip", { hasText: "classic" });
  await expect(chip).toBeVisible();

  await chip.getByRole("button", { name: "Remove tag classic" }).click();
  await expect(chip).toHaveCount(0);
});

test("Load more appends the next page instead of replacing the current results", async ({
  page,
  request,
}) => {
  const highlightText = loadFixture("clean-highlight.txt");
  for (let i = 0; i < 51; i++) {
    const response = await request.post(
      "http://localhost:3000/clippings/import",
      {
        data: { text: highlightText },
      },
    );
    expect(response.ok()).toBe(true);
  }

  await page.goto("/");
  await page.fill('input[type="search"]', "The Design of Everyday Things");
  await page.click('button[type="submit"]');

  await expect(page.locator("li.clipping")).toHaveCount(50);
  await expect(page.locator("button.load-more")).toBeVisible();

  const initialCount = await page.locator("li.clipping").count();
  await page.click("button.load-more");

  await expect
    .poll(async () => page.locator("li.clipping").count())
    .toBeGreaterThan(initialCount);
});
