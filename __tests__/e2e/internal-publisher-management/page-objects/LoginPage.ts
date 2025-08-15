import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('[data-testid="error-message"], .error, .alert-error');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async loginAsInternalUser(email: string = 'ajay@outreachlabs.com', password: string = 'FA64!I$nrbCauS^d') {
    await this.goto();
    await this.login(email, password);
    // Wait for redirect to internal dashboard
    await this.page.waitForURL(/\/(internal|dashboard)/);
  }

  async expectLoginError() {
    await this.errorMessage.waitFor();
  }

  async expectSuccessfulLogin() {
    // Should redirect away from login page
    await this.page.waitForURL(/(?!.*\/login)/);
  }
}