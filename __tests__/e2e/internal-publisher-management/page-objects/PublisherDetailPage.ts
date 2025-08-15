import { Page, Locator } from '@playwright/test';

export class PublisherDetailPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly publisherInfo: Locator;
  readonly contactInfo: Locator;
  readonly statusBadge: Locator;
  readonly tierBadge: Locator;
  readonly editButton: Locator;
  readonly verifyButton: Locator;
  readonly backButton: Locator;
  readonly websitesSection: Locator;
  readonly offeringsSection: Locator;
  readonly relationshipsSection: Locator;
  readonly notesSection: Locator;
  readonly activityLog: Locator;
  readonly deleteButton: Locator;
  readonly suspendButton: Locator;

  // Website management
  readonly websitesList: Locator;
  readonly addWebsiteButton: Locator;
  readonly manageRelationshipsButton: Locator;

  // Offerings management
  readonly offeringsList: Locator;
  readonly addOfferingButton: Locator;
  readonly enableOfferingButtons: Locator;
  readonly disableOfferingButtons: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1');
    this.publisherInfo = page.locator('[data-testid="publisher-info"]');
    this.contactInfo = page.locator('[data-testid="contact-info"]');
    this.statusBadge = page.locator('[data-testid="status-badge"]');
    this.tierBadge = page.locator('[data-testid="tier-badge"]');
    this.editButton = page.locator('a').filter({ hasText: /edit/i });
    this.verifyButton = page.locator('button').filter({ hasText: /verify/i });
    this.backButton = page.locator('a').filter({ hasText: /back/i });
    this.websitesSection = page.locator('[data-testid="websites-section"]');
    this.offeringsSection = page.locator('[data-testid="offerings-section"]');
    this.relationshipsSection = page.locator('[data-testid="relationships-section"]');
    this.notesSection = page.locator('[data-testid="notes-section"]');
    this.activityLog = page.locator('[data-testid="activity-log"]');
    this.deleteButton = page.locator('button').filter({ hasText: /delete/i });
    this.suspendButton = page.locator('button').filter({ hasText: /suspend/i });

    // Website management
    this.websitesList = page.locator('[data-testid="websites-list"]');
    this.addWebsiteButton = page.locator('button').filter({ hasText: /add website/i });
    this.manageRelationshipsButton = page.locator('button').filter({ hasText: /manage relationships/i });

    // Offerings management
    this.offeringsList = page.locator('[data-testid="offerings-list"]');
    this.addOfferingButton = page.locator('button').filter({ hasText: /add offering/i });
    this.enableOfferingButtons = page.locator('button').filter({ hasText: /enable/i });
    this.disableOfferingButtons = page.locator('button').filter({ hasText: /disable/i });
  }

  async goto(publisherId: string) {
    await this.page.goto(`/internal/publishers/${publisherId}`);
  }

  async clickEdit() {
    await this.editButton.click();
  }

  async clickVerify() {
    await this.verifyButton.click();
    // Wait for status to update
    await this.page.waitForTimeout(1000);
  }

  async clickBack() {
    await this.backButton.click();
    await this.page.waitForURL('/internal/publishers');
  }

  async addWebsite(websiteId: string) {
    await this.addWebsiteButton.click();
    // This would open a modal or navigate to add website page
    await this.page.waitForLoadState('networkidle');
  }

  async manageRelationships() {
    await this.manageRelationshipsButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async addOffering() {
    await this.addOfferingButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async enableOffering(offeringId: string) {
    const enableButton = this.enableOfferingButtons.filter({ hasAttribute: 'data-offering-id', value: offeringId });
    await enableButton.click();
  }

  async disableOffering(offeringId: string) {
    const disableButton = this.disableOfferingButtons.filter({ hasAttribute: 'data-offering-id', value: offeringId });
    await disableButton.click();
  }

  async expectPublisherName(name: string) {
    await this.pageTitle.filter({ hasText: name }).waitFor();
  }

  async expectStatus(status: 'verified' | 'pending' | 'suspended') {
    const expectedText = status === 'verified' ? 'Verified' : 
                       status === 'pending' ? 'Pending' : 'Suspended';
    await this.statusBadge.filter({ hasText: expectedText }).waitFor();
  }

  async expectTier(tier: 'premium' | 'standard' | 'basic') {
    const expectedText = tier.charAt(0).toUpperCase() + tier.slice(1);
    await this.tierBadge.filter({ hasText: expectedText }).waitFor();
  }

  async expectWebsiteCount(count: number) {
    const countText = count === 1 ? '1 website' : `${count} websites`;
    await this.websitesSection.filter({ hasText: countText }).waitFor();
  }

  async expectOfferingCount(count: number) {
    const countText = count === 1 ? '1 offering' : `${count} offerings`;
    await this.offeringsSection.filter({ hasText: countText }).waitFor();
  }

  async expectContactInfo(email: string, contactName?: string) {
    await this.contactInfo.filter({ hasText: email }).waitFor();
    if (contactName) {
      await this.contactInfo.filter({ hasText: contactName }).waitFor();
    }
  }

  async expectPageNotFound() {
    const notFoundIndicator = this.page.locator('text=404').or(this.page.locator('text=Not Found'));
    await notFoundIndicator.waitFor();
  }

  async expectAccessDenied() {
    const accessDeniedIndicator = this.page.locator('text=403').or(this.page.locator('text=Access Denied'));
    await accessDeniedIndicator.waitFor();
  }
}