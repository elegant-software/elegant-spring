import { expect, test } from 'playwright/test';

const diagramResponse = {
  version: '1.0',
  generatedAt: '2026-04-02T10:00:00.000Z',
  nodes: [
    {
      id: 'customer',
      name: 'Customer',
      type: 'entity',
      status: 'healthy',
      position: { x: 120, y: 120 },
      metadata: {
        kind: 'jpa-entity',
        packageName: 'com.example.domain',
        tableName: 'customers',
        idField: 'id',
        description: 'Customer aggregate root.',
        annotations: ['@Entity', '@Table(name = "customers")'],
        businessRules: ['Email must be unique.'],
        fields: [
          { name: 'id', type: 'UUID', column: 'id', id: true, nullable: false, unique: true },
          { name: 'email', type: 'String', column: 'email', nullable: false, unique: true },
        ],
      },
    },
  ],
  links: [],
};

test.describe('Domain model diagram', () => {
  let postedPayload: unknown;

  test.beforeEach(async ({ page }) => {
    postedPayload = undefined;

    await page.route('**/api/diagram', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(diagramResponse),
        });
        return;
      }

      if (route.request().method() === 'POST') {
        postedPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Diagram saved',
            timestamp: '2026-04-02T10:00:05.000Z',
          }),
        });
        return;
      }

      await route.continue();
    });
  });

  test('saves, restores, and clears browser state from the toolbar', async ({ page }) => {
    await page.goto('/#/domain-model');

    await expect(page.getByRole('heading', { name: 'Entity Diagram' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Customer' })).toBeVisible();

    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Save to Browser' }).click();
    await expect(page.getByText('State saved')).toBeVisible();

    await page.getByRole('button', { name: 'Reset / Load' }).click();
    await page.getByRole('button', { name: 'Restore from Browser' }).click();
    await expect(page.getByText('Layout restored')).toBeVisible();

    await page.getByRole('button', { name: 'Reset / Load' }).click();
    await page.getByRole('button', { name: 'Clear saved layout (Browser)' }).click();
    await expect(page.getByText('Saved layout cleared')).toBeVisible();
  });

  test('saves the current diagram to the server', async ({ page }) => {
    await page.goto('/#/domain-model');

    await expect(page.getByRole('heading', { name: 'Customer' })).toBeVisible();

    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Save to Server' }).click();

    await expect
      .poll(() => postedPayload, {
        message: 'Expected the mocked POST /api/diagram request to be captured.',
      })
      .toBeTruthy();
    expect(postedPayload).toMatchObject({
      version: '1.0',
      entities: [
        expect.objectContaining({
          id: 'customer',
          status: 'healthy',
        }),
      ],
      relationships: [],
    });
  });
});
