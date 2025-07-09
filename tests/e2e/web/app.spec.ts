import { test, expect } from '@playwright/test';
import { setupTestEnvironment, teardownTestEnvironment, TestEnvironment, TestDocument } from './test-helpers';

let testEnv: TestEnvironment;

const testDocuments: TestDocument[] = [
  {
    name: 'welcome.md',
    content: `# Welcome to MMT

This is a test document for the Markdown Management Toolkit.

## Features
- Search documents
- Filter by tags
- View metadata

Tags: #welcome #test`
  },
  {
    name: 'project-overview.md',
    content: `# Project Overview

## Description
This document contains project information.

## Status
Active development

Tags: #project #documentation`
  },
  {
    name: 'todo.md',
    content: `# Todo List

## Tasks
- [x] Set up project
- [ ] Add more features
- [ ] Write documentation

Tags: #todo #tasks`
  }
];

test.beforeAll(async () => {
  testEnv = await setupTestEnvironment(testDocuments);
});

test.afterAll(async () => {
  teardownTestEnvironment(testEnv);
});

test.describe('MMT Web App', () => {
  test('should load the app without errors', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Check that the app loaded
    await expect(page.locator('h1')).toContainText('MMT - Markdown Management Toolkit');
    
    // Check for no console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });
  
  test('should display documents from vault', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for documents to load
    await page.waitForSelector('[data-testid="table-container"]', { timeout: 10000 });
    
    // Check that documents are displayed
    const rows = page.locator('tr[data-testid^="row-"]');
    await expect(rows).toHaveCount(3);
    
    // Check document names
    await expect(page.locator('text=welcome')).toBeVisible();
    await expect(page.locator('text=project-overview')).toBeVisible();
    await expect(page.locator('text=todo')).toBeVisible();
  });
  
  test('should filter documents with search', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for initial load
    await page.waitForSelector('[data-testid="table-container"]');
    
    // Type in search box
    await page.fill('.query-input', 'todo');
    
    // Wait for filter to apply
    await page.waitForTimeout(500);
    
    // Check filtered results
    const rows = page.locator('tr[data-testid^="row-"]');
    await expect(rows).toHaveCount(1);
    await expect(page.locator('text=todo')).toBeVisible();
    await expect(page.locator('text=welcome')).not.toBeVisible();
    await expect(page.locator('text=project-overview')).not.toBeVisible();
  });
});