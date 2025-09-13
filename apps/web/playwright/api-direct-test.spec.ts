import { test, expect } from '@playwright/test';

test.describe('API Direct Test', () => {
  test('test pipeline execute API directly', async ({ request }) => {
    // Test the API directly without UI
    const pipeline = {
      select: {
        all: true
      },
      filter: {
        conditions: [
          {
            field: 'folders',
            operator: 'in',
            value: ['/Users/danielseltzer/Notes/Personal-sync-250710/Daily Notes']
          },
          {
            field: 'modified',
            operator: 'gt',
            value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        ],
        logic: 'AND'
      },
      operations: [
        {
          type: 'updateFrontmatter',
          updates: {
            reviewed: true,
            reviewDate: new Date().toISOString()
          }
        }
      ],
      options: {
        destructive: false
      }
    };
    
    console.log('Sending pipeline:', JSON.stringify(pipeline, null, 2));
    
    const response = await request.post('http://localhost:3001/api/pipelines/execute', {
      data: pipeline
    });
    
    console.log('Response status:', response.status());
    console.log('Response headers:', response.headers());
    
    const responseBody = await response.text();
    console.log('Response body:', responseBody);
    
    if (response.status() === 400) {
      try {
        const error = JSON.parse(responseBody);
        console.log('\n=== VALIDATION ERROR ===');
        console.log('Error:', error.error);
        console.log('Details:', JSON.stringify(error.details, null, 2));
      } catch {
        console.log('Could not parse error response');
      }
    }
    
    expect(response.status()).toBe(200);
  });
});