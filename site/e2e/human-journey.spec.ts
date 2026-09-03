import { expect, test } from 'playwright/test';
import type { Page } from 'playwright/test';
import AxeBuilder from '@axe-core/playwright';

type BrowserTool = {
  execute(input: Record<string, unknown>, options?: { signal?: AbortSignal }): Promise<Record<string, unknown>>;
};

async function installWebMCPMock(page: Page) {
  await page.addInitScript(() => {
    const exposed = window as typeof window & {
      __bearingTools: Record<string, BrowserTool>;
      __bearingPending?: Promise<Record<string, unknown>>;
      __bearingAbort?: AbortController;
    };
    exposed.__bearingTools = {};
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        registerTool(definition: BrowserTool & { name: string }) {
          exposed.__bearingTools[definition.name] = definition;
        },
      },
    });
  });
}

test('human can inspect, select, cancel confirmation, and keep editing', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.getByRole('gridcell')).toHaveCount(60);
  await page.getByRole('gridcell', { name: /Seat 12A.*available/i }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('gridcell', { name: /Seat 12B.*available/i })).toBeFocused();

  await page.getByRole('gridcell', { name: /Seat 12A.*available/i }).click();
  await page.getByRole('button', { name: 'Select seat 12A' }).click();
  expect(browserErrors).toEqual([]);
  await expect(page.getByLabel('Current selection')).toContainText('6-12A', { timeout: 5_000 });
  const trigger = page.getByRole('button', { name: 'Review and confirm' });
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');

  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.getByRole('button', { name: 'Undo last selection' })).toBeEnabled();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('production exposes nine WebMCP tools and completes same-call agent confirmation', async ({ page }) => {
  await installWebMCPMock(page);
  const response = await page.goto('/', { waitUntil: 'networkidle' });
  const headers = response?.headers() ?? {};
  expect(headers['permissions-policy']).toBe('tools=(self)');
  expect(headers['origin-agent-cluster']).toBe('?1');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['content-security-policy']).not.toContain('unsafe-inline');
  expect(headers['content-security-policy']).not.toContain('unsafe-eval');

  await expect.poll(() => page.evaluate(() => Object.keys(
    (window as typeof window & { __bearingTools: Record<string, BrowserTool> }).__bearingTools,
  ).length)).toBe(9);
  const query = await page.evaluate(() => (
    window as typeof window & { __bearingTools: Record<string, BrowserTool> }
  ).__bearingTools['a11y.query'].execute({ availableOnly: true }));
  expect(query).toMatchObject({ ok: true });

  await page.getByText('Direction preferences').click();
  await page.getByLabel('Units').selectOption('steps');
  await page.getByLabel('Step length').fill('1');
  const description = await page.evaluate(() => (
    window as typeof window & { __bearingTools: Record<string, BrowserTool> }
  ).__bearingTools['a11y.describe'].execute({ ref: '6-12A' }));
  expect(JSON.stringify(description)).toContain('steps');

  await page.evaluate(async () => {
    const exposed = window as typeof window & {
      __bearingTools: Record<string, BrowserTool>;
      __bearingPending?: Promise<Record<string, unknown>>;
    };
    await exposed.__bearingTools['a11y.select'].execute({ ref: '6-12A' });
    exposed.__bearingPending = exposed.__bearingTools['a11y.confirm'].execute({});
  });
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm selection' }).click();
  const confirmed = await page.evaluate(() => (
    window as typeof window & { __bearingPending: Promise<Record<string, unknown>> }
  ).__bearingPending);
  expect(confirmed).toMatchObject({ ok: true, data: { outcome: 'confirmed' } });
});

test('agent abort closes confirmation and restores the editable draft', async ({ page }) => {
  await installWebMCPMock(page);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    const exposed = window as typeof window & {
      __bearingTools: Record<string, BrowserTool>;
      __bearingPending?: Promise<Record<string, unknown>>;
      __bearingAbort?: AbortController;
    };
    await exposed.__bearingTools['a11y.select'].execute({ ref: '6-12A' });
    exposed.__bearingAbort = new AbortController();
    exposed.__bearingPending = exposed.__bearingTools['a11y.confirm']
      .execute({}, { signal: exposed.__bearingAbort.signal })
      .then((value) => value, (error: Error) => ({ rejectedAs: error.name }));
  });
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.evaluate(() => (
    window as typeof window & { __bearingAbort: AbortController }
  ).__bearingAbort.abort(new DOMException('Host aborted.', 'AbortError')));
  const aborted = await page.evaluate(() => (
    window as typeof window & { __bearingPending: Promise<Record<string, unknown>> }
  ).__bearingPending);

  expect(aborted).toEqual({ rejectedAs: 'AbortError' });
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Undo last selection' })).toBeEnabled();
});
