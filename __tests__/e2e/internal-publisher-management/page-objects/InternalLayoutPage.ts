import { Page, Locator } from '@playwright/test';

export class InternalLayoutPage {
  readonly page: Page;
  readonly header: Locator;
  readonly sidebar: Locator;
  readonly mobileMenuButton: Locator;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;
  readonly breadcrumbs: Locator;
  readonly searchButton: Locator;

  // Navigation links
  readonly dashboardLink: Locator;
  readonly websitesLink: Locator;
  readonly publishersLink: Locator;
  readonly relationshipsLink: Locator;
  readonly bulkImportLink: Locator;
  readonly qualityControlLink: Locator;
  readonly analyticsLink: Locator;
  readonly settingsLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('header');
    this.sidebar = page.locator('aside');
    this.mobileMenuButton = page.locator('button').filter({ hasText: /menu/i }).first();
    this.userMenu = page.locator('[data-testid="user-menu"]');
    this.logoutButton = page.locator('button[title="Logout"]');
    this.breadcrumbs = page.locator('nav[aria-label="Breadcrumb"]');
    this.searchButton = page.locator('button').filter({ hasText: /search/i });

    // Navigation links
    this.dashboardLink = page.locator('a[href="/internal"]');
    this.websitesLink = page.locator('a[href="/internal/websites"]');
    this.publishersLink = page.locator('a[href="/internal/publishers"]');
    this.relationshipsLink = page.locator('a[href="/internal/relationships"]');
    this.bulkImportLink = page.locator('a[href="/internal/import"]');
    this.qualityControlLink = page.locator('a[href="/internal/quality"]');
    this.analyticsLink = page.locator('a[href="/internal/analytics"]');
    this.settingsLink = page.locator('a[href="/internal/settings"]');
  }

  async goto() {
    await this.page.goto('/internal');
  }

  async navigateToPublishers() {
    await this.publishersLink.click();
    await this.page.waitForURL('/internal/publishers');
  }

  async navigateToWebsites() {
    await this.websitesLink.click();
    await this.page.waitForURL('/internal/websites');
  }

  async navigateToRelationships() {
    await this.relationshipsLink.click();
    await this.page.waitForURL('/internal/relationships');
  }

  async logout() {
    await this.logoutButton.click();
    await this.page.waitForURL('/login');
  }

  async expectActiveNavigation(linkName: string) {
    const activeLink = this.page.locator('a').filter({ hasText: linkName }).filter({ hasClass: /active|bg-indigo/ });
    await activeLink.waitFor();
  }

  async expectBreadcrumb(text: string) {
    await this.breadcrumbs.locator('text=' + text).waitFor();
  }

  async expectUserInfo(name: string) {
    await this.page.locator('text=' + name).waitFor();
  }
}