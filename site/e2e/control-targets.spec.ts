import { expect, test } from 'playwright/test';

test('query and comparison checkbox labels remain 44px targets on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/', { waitUntil: 'networkidle' });

  const targets = [
    page.getByLabel('Include unavailable seats').locator('xpath=..'),
    page.getByRole('checkbox', { name: /Compare Seat/ }).first().locator('xpath=..'),
  ];

  for (const target of targets) {
    await expect(target).toHaveCSS('min-height', '44px');
    expect((await target.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
});
