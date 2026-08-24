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
