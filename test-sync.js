#!/usr/bin/env node

// Test script for sync functionality
const crypto = require('crypto');
const https = require('https');

const SYNC_SERVER_URL = process.env.CLAUDE_SYNC_SERVER || 'http://localhost:8000';

async function httpsRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      ...options
    };
    
    const proto = urlObj.protocol === 'https:' ? https : require('http');
    const req = proto.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: res.statusCode === 204 ? null : JSON.parse(body)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: body
          });
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Claude Analytics Sync System\n');
  console.log(`Server URL: ${SYNC_SERVER_URL}\n`);
  
  // Test 1: Health check
  console.log('1️⃣ Testing health check...');
  try {
    const health = await httpsRequest(`${SYNC_SERVER_URL}/`, { method: 'GET' });
    console.log(`✅ Server is ${health.body?.status || 'responding'}\n`);
  } catch (e) {
    console.log(`❌ Server unreachable: ${e.message}\n`);
    return;
  }
  
  // Test 2: Generate test key
  const testKey = crypto.randomBytes(32).toString('hex');
  console.log(`2️⃣ Generated test key: ${testKey.substring(0, 16)}...\n`);
  
  // Test 3: Sync data
  console.log('3️⃣ Testing data sync...');
  const syncData = {
    userKey: testKey,
    hostname: 'test-machine',
    timestamp: new Date().toISOString(),
    usage: {
      totalTokens: 1000000,
      inputTokens: 800000,
      outputTokens: 200000,
      cacheCreationTokens: 0,
      cacheReadTokens: 0
    },
    sessions: {
      total: 10,
      active: 2,
      averageDuration: 30.5
    },
    costs: {
      opus: 5.00,
      sonnet: 1.00,
      haiku: 0.25,
      actual: 0
    },
    hourlyUsage: new Array(24).fill(0).map((_, i) => i === 9 ? 500000 : i === 14 ? 500000 : 0),
    version: '3.0.2'
  };
  
  try {
    const syncResult = await httpsRequest(
      `${SYNC_SERVER_URL}/api/sync`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      syncData
    );
    console.log(`✅ Sync successful: ${syncResult.body?.message || 'OK'}\n`);
  } catch (e) {
    console.log(`❌ Sync failed: ${e.message}\n`);
    return;
  }
  
  // Test 4: Retrieve stats
  console.log('4️⃣ Testing stats retrieval...');
  try {
    const stats = await httpsRequest(
      `${SYNC_SERVER_URL}/api/stats/${testKey}`,
      { method: 'GET' }
    );
    console.log(`✅ Stats retrieved:`);
    console.log(`   Devices: ${stats.body?.devices?.length || 0}`);
    console.log(`   Total tokens: ${stats.body?.totalTokens?.toLocaleString() || 0}`);
    console.log(`   Total cost: $${stats.body?.totalCost?.toFixed(2) || '0.00'}\n`);
  } catch (e) {
    console.log(`❌ Stats retrieval failed: ${e.message}\n`);
  }
  
  console.log('✅ All tests completed!');
}

runTests().catch(console.error);