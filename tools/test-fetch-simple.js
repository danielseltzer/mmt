#!/usr/bin/env node

/**
 * Simple fetch test to isolate the document loading issue
 */

console.log('Testing fetch to API server...');

const testUrl = 'http://localhost:3001/api/vaults/Personal/documents?limit=5&offset=0';

console.log('URL:', testUrl);
console.log('Starting fetch at:', new Date().toISOString());

// Test 1: Simple fetch
async function testSimpleFetch() {
  console.log('\n=== Test 1: Simple fetch ===');
  try {
    const response = await fetch(testUrl);
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    const data = await response.json();
    console.log('Data received:', {
      documentCount: data.documents?.length || 0,
      total: data.total,
      vaultTotal: data.vaultTotal
    });
    
    return { success: true, data };
  } catch (error) {
    console.error('Simple fetch error:', error);
    return { success: false, error: error.message };
  }
}

// Test 2: Fetch with timeout
async function testFetchWithTimeout() {
  console.log('\n=== Test 2: Fetch with timeout ===');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(testUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Data received with timeout:', {
      documentCount: data.documents?.length || 0,
      total: data.total
    });
    
    return { success: true, data };
  } catch (error) {
    console.error('Fetch with timeout error:', error);
    return { success: false, error: error.message };
  }
}

// Test 3: Promise race with timeout
async function testPromiseRace() {
  console.log('\n=== Test 3: Promise race ===');
  try {
    const fetchPromise = fetch(testUrl).then(r => r.json());
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout after 3 seconds')), 3000)
    );
    
    const result = await Promise.race([fetchPromise, timeoutPromise]);
    console.log('Promise race result:', {
      documentCount: result.documents?.length || 0,
      total: result.total
    });
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Promise race error:', error);
    return { success: false, error: error.message };
  }
}

// Run all tests
async function runTests() {
  const results = [];
  
  results.push(await testSimpleFetch());
  results.push(await testFetchWithTimeout());
  results.push(await testPromiseRace());
  
  console.log('\n=== Summary ===');
  results.forEach((result, index) => {
    console.log(`Test ${index + 1}: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (!result.success) {
      console.log(`  Error: ${result.error}`);
    }
  });
  
  const allPassed = results.every(r => r.success);
  console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  process.exit(allPassed ? 0 : 1);
}

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
