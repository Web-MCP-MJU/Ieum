import { describe, expect, it } from 'vitest';

import nextConfig from '../../next.config';
import { buildContentSecurityPolicy } from '@/src/security/csp';

describe('response headers', () => {
  it('enables WebMCP and applies baseline browser protections', async () => {
    const rules = await nextConfig.headers?.();
    const headers = Object.fromEntries((rules?.[0].headers ?? []).map(({ key, value }) => [key, value]));

    expect(rules?.map((rule) => rule.source)).toEqual(['/', '/:path*']);
    expect(headers['Permissions-Policy']).toBe('tools=(self)');
    expect(headers['Origin-Agent-Cluster']).toBe('?1');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
  });

  it('builds a nonce-only content security policy', () => {
    const csp = buildContentSecurityPolicy('test-nonce');
    expect(csp).toContain("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'");
    expect(csp).toContain("style-src 'self' 'nonce-test-nonce'");
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).not.toContain('unsafe-eval');
  });
});
