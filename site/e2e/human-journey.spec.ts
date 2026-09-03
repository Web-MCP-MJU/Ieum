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

type ViewportLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type ViewportRect = {
  ref: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

function intersectsRect(line: ViewportLine, rect: ViewportRect): boolean {
  const minX = Math.min(line.x1, line.x2);
  const maxX = Math.max(line.x1, line.x2);
  const minY = Math.min(line.y1, line.y2);
  const maxY = Math.max(line.y1, line.y2);
  return maxX >= rect.left && minX <= rect.right && maxY >= rect.top && minY <= rect.bottom;
}

async function readRouteGeometry(page: Page) {
  return page.evaluate(() => {
    const toViewportPoint = (element: SVGGraphicsElement, x: number, y: number) => {
      const matrix = element.getScreenCTM();
      if (!matrix) throw new Error('Route geometry does not have a viewport transform.');
      const point = new DOMPoint(x, y).matrixTransform(matrix);
      return { x: point.x, y: point.y };
    };
    const lines = [...document.querySelectorAll<SVGLineElement>('.route-overlay line')].map((line) => {
      const start = toViewportPoint(line, line.x1.baseVal.value, line.y1.baseVal.value);
      const end = toViewportPoint(line, line.x2.baseVal.value, line.y2.baseVal.value);
      return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
    });
    const seats = [...document.querySelectorAll<HTMLElement>('[id^="seat-"]')].map((seat) => {
      const rect = seat.getBoundingClientRect();
      return {
        ref: seat.id.replace('seat-', ''),
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      };
    });
    const target = document.querySelector<HTMLElement>('#seat-6-12A');
    if (!target) throw new Error('Target seat was not rendered.');
    const targetRect = target.getBoundingClientRect();
    const marker = document.querySelector<SVGCircleElement>('.route-endpoint-marker');
    const markerOverlay = marker?.closest<SVGSVGElement>('svg');
    const seatGrid = document.querySelector<HTMLElement>('.seat-grid');
    const markerPoint = marker
      ? toViewportPoint(marker, marker.cx.baseVal.value, marker.cy.baseVal.value)
      : null;
    const markerStyle = marker ? getComputedStyle(marker) : null;
    const targetStyle = getComputedStyle(target);

    return {
      lines,
      seats,
      targetCenter: {
        x: targetRect.left + targetRect.width / 2,
        y: targetRect.top + targetRect.height / 2,
      },
      marker: markerPoint && markerStyle
        ? {
            ...markerPoint,
            fill: markerStyle.fill,
            stroke: markerStyle.stroke,
            targetBackground: targetStyle.backgroundColor,
            overlayZIndex: Number(getComputedStyle(markerOverlay!).zIndex),
            seatGridZIndex: Number(getComputedStyle(seatGrid!).zIndex),
          }
        : null,
    };
  });
}

for (const width of [760, 759, 390, 320]) {
  test(`responsive route stays in the aisle and reaches its result at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Show route' }).click();

    const routeSummary = page.getByRole('region', { name: 'Active route' });
    await expect(routeSummary).toBeVisible();
    expect.soft(
      await routeSummary.evaluate((element) => element === document.activeElement),
      `${width}px route summary should receive focus`,
    ).toBe(true);
    await expect.poll(() => page.locator('.route-overlay line').count()).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Select seat 12A' }).click();
    await expect(page.getByRole('gridcell', { name: /Seat 12A.*available/i }))
      .toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.route-endpoint-marker')).toBeVisible();

    const geometry = await readRouteGeometry(page);
    const aisleSegments = geometry.lines.filter(
      (line) => Math.abs(line.y2 - line.y1) > Math.abs(line.x2 - line.x1),
    );
    const aisleIntersections = aisleSegments.flatMap((line) => geometry.seats
      .filter((seat) => intersectsRect(line, seat))
      .map((seat) => seat.ref));
    expect.soft(aisleSegments.length, `${width}px should render a longitudinal aisle segment`)
      .toBeGreaterThan(0);
    expect.soft(aisleIntersections, `${width}px aisle segments should avoid unrelated seats`)
      .toEqual([]);

    const finalLine = geometry.lines.at(-1);
    if (!finalLine) throw new Error('Route did not render a final segment.');
    const endpointError = Math.hypot(
      finalLine.x2 - geometry.targetCenter.x,
      finalLine.y2 - geometry.targetCenter.y,
    );
    expect.soft(endpointError, `${width}px endpoint should reach the target centre`)
      .toBeLessThanOrEqual(4);
    expect.soft(geometry.marker, `${width}px should render a route endpoint ring`).not.toBeNull();
    if (geometry.marker) {
      const markerError = Math.hypot(
        geometry.marker.x - geometry.targetCenter.x,
        geometry.marker.y - geometry.targetCenter.y,
      );
      expect.soft(markerError, `${width}px endpoint ring should be centred`).toBeLessThanOrEqual(4);
      expect.soft(geometry.marker.fill, `${width}px endpoint marker should not cover the seat label`)
        .toBe('none');
      expect.soft(geometry.marker.stroke, `${width}px endpoint marker should contrast with selection`)
        .not.toBe(geometry.marker.targetBackground);
      expect.soft(
        geometry.marker.overlayZIndex,
        `${width}px endpoint marker should remain above the selected seat fill`,
      ).toBeGreaterThan(geometry.marker.seatGridZIndex);
    }
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
