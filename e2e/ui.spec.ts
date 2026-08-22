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
