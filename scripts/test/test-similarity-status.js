// Test script to verify similarity status indicator
// Run this script to see the progress indicator in action

async function testSimilarityStatus() {
  console.log('Testing similarity status endpoint...\n');
  
  try {
    // Check vault list
    const vaultsResponse = await fetch('http://localhost:5173/api/vaults');
    const vaultsData = await vaultsResponse.json();
    console.log('Available vaults:', vaultsData.vaults.map(v => v.id).join(', '));
    
    if (vaultsData.vaults.length === 0) {
      console.log('No vaults available');
      return;
    }
    
    const vaultId = vaultsData.vaults[0].id;
    console.log(`\nUsing vault: ${vaultId}\n`);
    
    // Check similarity status
    const statusResponse = await fetch(`http://localhost:5173/api/vaults/${vaultId}/similarity/status`);
    
    if (!statusResponse.ok) {
      console.log(`Status endpoint returned ${statusResponse.status}`);
      if (statusResponse.status === 404 || statusResponse.status === 501) {
        console.log('Similarity search is not configured');
      }
      return;
    }
    
    const statusData = await statusResponse.json();
    console.log('Similarity Status:');
    console.log('==================');
    console.log(`Status: ${statusData.status}`);
    console.log(`Total Documents: ${statusData.totalDocuments}`);
    console.log(`Indexed Documents: ${statusData.indexedDocuments}`);
    console.log(`Percent Complete: ${statusData.percentComplete}%`);
    console.log(`Estimated Time Remaining: ${statusData.estimatedTimeRemaining || 'N/A'}`);
    
    // Visual representation
    if (statusData.status === 'indexing') {
      const barLength = 40;
      const filled = Math.round((statusData.percentComplete / 100) * barLength);
      const empty = barLength - filled;
      const progressBar = '▓'.repeat(filled) + '░'.repeat(empty);
      
      console.log(`\nProgress: [${progressBar}] ${statusData.percentComplete}%`);
      console.log(`         ${statusData.indexedDocuments}/${statusData.totalDocuments} documents`);
    } else if (statusData.status === 'ready') {
      console.log('\n✓ Similarity search is ready!');
      console.log(`  ${statusData.totalDocuments} documents indexed`);
    } else if (statusData.status === 'not_configured') {
      console.log('\n⚠ Similarity search is not configured');
      console.log('  Add a similarity provider to your configuration');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the test
testSimilarityStatus();

// Instructions for manual testing:
console.log('\n=== Manual Testing Instructions ===');
console.log('1. Open your browser to http://localhost:5173');
console.log('2. Click on "Similarity" search mode');
console.log('3. You should see the status indicator:');
console.log('   - If ready: Green "✓ Similarity search ready (X documents indexed)"');
console.log('   - If indexing: Blue progress bar with percentage');
console.log('   - If not configured: Gray "Similarity search not configured"');
console.log('4. The status updates every 5 seconds automatically');
console.log('\nTo simulate indexing state:');
console.log('  POST to /api/vaults/{vaultId}/similarity/reindex with {force: true}');