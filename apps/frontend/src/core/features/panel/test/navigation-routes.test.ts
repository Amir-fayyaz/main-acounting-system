import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';
import { getActivePanelItem } from '@repo/web/ui/panel';
import { getSidebarLinks } from '@repo/web/ui/sidebar';

import { accountingPanelConfig } from '../assets/mock/navigation';

const PANEL_ROUTES_DIR = path.join(process.cwd(), 'src/app/(panel)');

function routeExists(href: string): boolean {
  return existsSync(path.join(PANEL_ROUTES_DIR, href.replace(/^\//, ''), 'page.tsx'));
}

const links = getSidebarLinks(accountingPanelConfig.navigation);
const hrefs = links.map((link) => link.href);

const EXPECTED_DESTINATIONS = [
  '/panel',
  '/panel/journal',
  '/panel/trial',
  '/panel/accounts',
  '/panel/checks',
  '/panel/pos',
  '/panel/people',
  '/panel/branches',
  '/panel/users',
  '/panel/audit-trail',
  '/panel/sales',
  '/panel/purchases',
  '/panel/settings',
];

describe('accounting panel navigation routes', () => {
  it('resolves every navigation destination to an existing route page', () => {
    for (const link of links) {
      expect(routeExists(link.href), `${link.label} (${link.href})`).toBe(true);
    }
    expect(routeExists(accountingPanelConfig.homeHref)).toBe(true);
  });

  it('includes every destination expected by issues #192 and #193 plus the dashboard', () => {
    expect(hrefs).toEqual(expect.arrayContaining(EXPECTED_DESTINATIONS));
  });

  it('has no duplicated destinations', () => {
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('marks each expected destination as the active route for its own URL', () => {
    for (const href of EXPECTED_DESTINATIONS) {
      expect(getActivePanelItem(accountingPanelConfig.navigation, href)?.href).toBe(href);
    }
  });
});
