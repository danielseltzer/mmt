import { test, expect } from '@playwright/test';

test.describe('Preview Network Debug', () => {
  test('capture preview API request and response', async ({ page }) => {
    // Set up request/response interceptors before navigation
    const requests: any[] = [];
    const responses: any[] = [];
    
    page.on('request', async request => {
      if (request.url().includes('/api/pipelines/execute')) {
        const postData = request.postData();
        console.log('\n=== API REQUEST ===');
        console.log('URL:', request.url());
        console.log('Method:', request.method());
        console.log('Headers:', request.headers());
        console.log('Body:', postData);
        if (postData) {
          try {
            console.log('Parsed Body:', JSON.stringify(JSON.parse(postData), null, 2));
          } catch (e) {
            console.log('Could not parse body as JSON');
          }
        }
        requests.push({ url: request.url(), method: request.method(), body: postData });
      }
    });
    
    page.on('response', async response => {
      if (response.url().includes('/api/pipelines/execute')) {
        const body = await response.text().catch(() => 'Could not read body');
        console.log('\n=== API RESPONSE ===');
        console.log('URL:', response.url());
        console.log('Status:', response.status());
        console.log('Headers:', response.headers());
        console.log('Body:', body);
        responses.push({ url: response.url(), status: response.status(), body });
      }
    });
    
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for app to load
    await page.waitForSelector('.document-table, .pipeline-builder', { timeout: 10000 });
    
    // Now interact with the UI to trigger the request
    // Since we want to reproduce the exact issue, let's do it programmatically
    
    // Execute the preview request directly
    const response = await page.evaluate(async () => {
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
      
      try {
        const response = await fetch('/api/pipelines/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(pipeline)
        });
        
        const text = await response.text();
        return {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: text
        };
      } catch (error) {
        return {
          error: error.message
        };
      }
    });
    
    console.log('\n=== FETCH RESULT ===');
    console.log(JSON.stringify(response, null, 2));
    
    // Wait a bit to ensure all console logs are captured
    await page.waitForTimeout(1000);
    
    // Analyze results
    if (requests.length > 0) {
      console.log('\n=== SUMMARY ===');
      console.log('Requests captured:', requests.length);
      console.log('Responses captured:', responses.length);
      
      if (responses.length > 0 && responses[0].status === 400) {
        console.log('\n=== BAD REQUEST DETAILS ===');
        try {
          const errorBody = JSON.parse(responses[0].body);
          console.log('Error:', errorBody.error);
          console.log('Details:', JSON.stringify(errorBody.details, null, 2));
        } catch (e) {
          console.log('Raw error body:', responses[0].body);
        }
      }
    }
  });
});