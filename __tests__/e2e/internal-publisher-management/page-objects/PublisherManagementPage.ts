import { Page, Locator } from '@playwright/test';

export class PublisherManagementPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly addPublisherButton: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly clearSearchButton: Locator;
  readonly publishersTable: Locator;
  readonly publisherRows: Locator;
  readonly statsCards: Locator;
  readonly totalPublishersCard: Locator;
  readonly verifiedCard: Locator;
  readonly pendingCard: Locator;
  readonly totalWebsitesCard: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1').filter({ hasText: /publisher management/i });
    this.addPublisherButton = page.locator('a[href="/internal/publishers/new"]');
    this.searchInput = page.locator('input[name="search"]');
    this.searchButton = page.locator('button[type="submit"]').filter({ hasText: /search/i });
    this.clearSearchButton = page.locator('a').filter({ hasText: /clear/i });
    this.publishersTable = page.locator('table');
    this.publisherRows = page.locator('tbody tr');
    this.statsCards = page.locator('.grid .bg-white');
    this.totalPublishersCard = this.statsCards.filter({ hasText: /total publishers/i });
    this.verifiedCard = this.statsCards.filter({ hasText: /verified/i });
    this.pendingCard = this.statsCards.filter({ hasText: /pending/i });
    this.totalWebsitesCard = this.statsCards.filter({ hasText: /total websites/i });
    this.emptyState = page.locator('text=No publishers found');
  }

  async goto() {
    await this.page.goto('/internal/publishers');
  }

  async searchPublisher(searchTerm: string) {
    await this.searchInput.fill(searchTerm);
    await this.searchButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clearSearch() {
    await this.clearSearchButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getPublisherRowByEmail(email: string) {
    return this.publisherRows.filter({ hasText: email });
  }

  async getPublisherRowByCompany(companyName: string) {
    return this.publisherRows.filter({ hasText: companyName });
  }

  async clickViewPublisher(publisherId: string) {
    const viewLink = this.page.locator(`a[href="/internal/publishers/${publisherId}"]`);
    await viewLink.click();
  }

  async clickEditPublisher(publisherId: string) {
    const editLink = this.page.locator(`a[href="/internal/publishers/${publisherId}/edit"]`);
    await editLink.click();
  }

  async clickAddPublisher() {
    await this.addPublisherButton.click();
    await this.page.waitForURL('/internal/publishers/new');
  }

  async getStatsCardValue(cardType: 'total' | 'verified' | 'pending' | 'websites') {
    let card: Locator;
    switch (cardType) {
      case 'total':
        card = this.totalPublishersCard;
        break;
      case 'verified':
        card = this.verifiedCard;
        break;
      case 'pending':
        card = this.pendingCard;
        break;
      case 'websites':
        card = this.totalWebsitesCard;
        break;
    }
    
    const valueElement = card.locator('dd');
    return await valueElement.textContent();
  }

  async expectPublisherInTable(email: string) {
    const row = await this.getPublisherRowByEmail(email);
    await row.waitFor();
  }

  async expectPublisherNotInTable(email: string) {
    const row = await this.getPublisherRowByEmail(email);
    await row.waitFor({ state: 'hidden' });
  }

  async expectEmptyState() {
    await this.emptyState.waitFor();
  }

  async expectTableVisible() {
    await this.publishersTable.waitFor();
  }

  async expectSearchResults(expectedCount: number) {
    await this.page.waitForTimeout(1000); // Wait for search to complete
    const rowCount = await this.publisherRows.count();
    if (rowCount !== expectedCount) {
      throw new Error(`Expected ${expectedCount} results, but got ${rowCount}`);
    }
  }
}