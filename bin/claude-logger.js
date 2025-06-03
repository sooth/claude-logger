#!/usr/bin/env node

const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const https = require('https');
const readline = require('readline');
const { getAggregatedStats } = require('./jsonl-parser');

const CLAUDE_LOGS_DIR = path.join(os.homedir(), 'Documents', 'claude-logs');
const CLAUDE_LOGGER_DIR = path.dirname(__dirname);
const CLAUDE_CONFIG_DIR = path.join(os.homedir(), '.claude-logged');
const CLAUDE_CONFIG_FILE = path.join(CLAUDE_CONFIG_DIR, 'config.json');
const SYNC_SERVER_URL = process.env.CLAUDE_SYNC_SERVER || 'https://claude-logger-sync.herokuapp.com';

// Claude API pricing (per million tokens)
// Using patterns to match model variations
const CLAUDE_PRICING_PATTERNS = [
  { pattern: /claude-opus-4/i, pricing: { input: 15.00, output: 75.00, cacheCreation: 18.75, cacheRead: 1.50 }, name: 'claude-4-opus' },
  { pattern: /claude-sonnet-4/i, pricing: { input: 3.00, output: 15.00, cacheCreation: 3.75, cacheRead: 0.30 }, name: 'claude-4-sonnet' },
  { pattern: /claude-3\.5-haiku/i, pricing: { input: 0.80, output: 4.00, cacheCreation: 1.00, cacheRead: 0.08 }, name: 'claude-3.5-haiku' }
];

// Legacy pricing for backwards compatibility
const CLAUDE_PRICING = {
  'claude-4-opus': CLAUDE_PRICING_PATTERNS[0].pricing,
  'claude-4-sonnet': CLAUDE_PRICING_PATTERNS[1].pricing,
  'claude-3.5-haiku': CLAUDE_PRICING_PATTERNS[2].pricing
};

// Calculate API costs for given token usage
function calculateAPICosts(tokenData) {
  const costs = {};
  
  for (const [model, pricing] of Object.entries(CLAUDE_PRICING)) {
    const cost = (
      (tokenData.input / 1000000) * pricing.input +
      (tokenData.output / 1000000) * pricing.output +
      (tokenData.cacheCreation / 1000000) * pricing.cacheCreation +
      (tokenData.cacheRead / 1000000) * pricing.cacheRead
    );
    costs[model] = cost;
  }
  
  return costs;
}

// Configuration management functions
function loadConfig() {
  try {
    if (fs.existsSync(CLAUDE_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CLAUDE_CONFIG_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading config:', e.message);
  }
  return null;
}

function saveConfig(config) {
  try {
    fs.mkdirSync(CLAUDE_CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CLAUDE_CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (e) {
    console.error('Error saving config:', e.message);
    return false;
  }
}

// Create readline interface for user input
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// Make HTTP/HTTPS request helper
function httpsRequest(options, data) {
  return new Promise((resolve, reject) => {
    const protocol = options.port === 443 || options.protocol === 'https:' ? https : require('http');
    const req = protocol.request(options, (res) => {
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

// Helper function to get token usage from .claude.json
function getTokenUsage() {
  let tokenData = {
    input: 0,
    output: 0,
    cacheCreation: 0,
    cacheRead: 0
  };
  
  const claudeJsonPath = path.join(os.homedir(), '.claude.json');
  if (fs.existsSync(claudeJsonPath)) {
    try {
      const claudeJson = JSON.parse(fs.readFileSync(claudeJsonPath, 'utf8'));
      
      // Find the most recent project with token usage data
      let latestProject = null;
      let latestTime = 0;
      
      if (claudeJson.projects) {
        for (const [projectPath, projectData] of Object.entries(claudeJson.projects)) {
          if (projectData.lastTotalInputTokens !== undefined) {
            const lastTime = projectData.exampleFilesGeneratedAt || 0;
            if (lastTime > latestTime) {
              latestTime = lastTime;
              latestProject = projectData;
            }
          }
        }
      }
      
      if (latestProject) {
        tokenData.input = latestProject.lastTotalInputTokens || 0;
        tokenData.output = latestProject.lastTotalOutputTokens || 0;
        tokenData.cacheCreation = latestProject.lastTotalCacheCreationInputTokens || 0;
        tokenData.cacheRead = latestProject.lastTotalCacheReadInputTokens || 0;
      }
    } catch (e) {
      console.error('Error reading .claude.json:', e.message);
    }
  }
  
  return tokenData;
}

// Helper function to calculate session duration
function calculateDuration(startTime, endTime) {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  let durationMin = (endHour * 60 + endMin) - (startHour * 60 + startMin);
  if (durationMin < 0) durationMin += 24 * 60; // Handle day rollover
  
  const hours = Math.floor(durationMin / 60);
  const minutes = durationMin % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

// Commands
const commands = {
  init: () => {
    console.log('🚀 Initializing Claude Logger...');
    
    // Create directories
    fs.mkdirSync(CLAUDE_LOGS_DIR, { recursive: true });
    fs.mkdirSync(path.join(CLAUDE_LOGS_DIR, 'projects'), { recursive: true });
    fs.mkdirSync(path.join(CLAUDE_LOGS_DIR, 'sessions'), { recursive: true });
    
    // Create initial log file
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(CLAUDE_LOGS_DIR, `${today}.md`);
    
    if (!fs.existsSync(logFile)) {
      fs.writeFileSync(logFile, `# ${today} 作業ログ\n\n## Claude Logger initialized\n`);
    }
    
    // Run setup script
    const setupScript = path.join(CLAUDE_LOGGER_DIR, 'setup-claude-logger.sh');
    if (fs.existsSync(setupScript)) {
      console.log('\n🔧 Running automatic setup...');
      try {
        execSync(`bash ${setupScript}`, { stdio: 'inherit' });
      } catch (error) {
        console.error('Setup failed:', error.message);
      }
    }
    
    console.log('✅ Claude Logger initialized!');
    console.log(`📁 Logs directory: ${CLAUDE_LOGS_DIR}`);
  },
  
  start: () => {
    const sessionId = `${Date.now()}-${process.pid}`;
    console.log(`🔄 Starting Claude Logger session: ${sessionId}`);
    
    // Create session environment setup script
    const sessionScript = `
#!/bin/bash
export CLAUDE_SESSION_ID="${sessionId}"
export CLAUDE_LOGGER_DIR="${CLAUDE_LOGGER_DIR}"
source "${CLAUDE_LOGGER_DIR}/multi-session-logger.sh"
echo "✅ Claude Logger active for this session"
echo "📝 Session ID: ${sessionId}"
`;
    
    const tempScript = path.join(os.tmpdir(), `claude-session-${sessionId}.sh`);
    fs.writeFileSync(tempScript, sessionScript, { mode: 0o755 });
    
    console.log('\n⚠️  To activate logging in this terminal, run:');
    console.log(`source ${tempScript}\n`);
    console.log('Or use the wrapper: claude-logged');
  },
  
  stats: async (period = 'today') => {
    console.log(`📊 Generating stats for: ${period}`);
    
    const sessionFiles = fs.readdirSync(path.join(CLAUDE_LOGS_DIR, 'sessions'))
      .filter(f => f.endsWith('.log'));
    
    const today = new Date().toISOString().split('T')[0];
    const todayLog = path.join(CLAUDE_LOGS_DIR, `${today}.md`);
    
    // Try to get stats from JSONL files first
    let tokenData, apiCosts, usingJSONL = false, jsonlStats = null;
    
    try {
      jsonlStats = await getAggregatedStats();
      if (jsonlStats.totalRequests > 0) {
        // Convert JSONL stats to tokenData format
        tokenData = {
          input: jsonlStats.usage.input_tokens,
          output: jsonlStats.usage.output_tokens,
          cacheCreation: jsonlStats.usage.cache_creation_input_tokens,
          cacheRead: jsonlStats.usage.cache_read_input_tokens
        };
        
        // Use actual costs from JSONL with pattern matching
        const findModelCost = (pattern) => {
          const modelKey = Object.keys(jsonlStats.byModel).find(key => 
            key.toLowerCase().includes(pattern.toLowerCase())
          );
          return modelKey ? jsonlStats.byModel[modelKey].cost : 0;
        };
        
        apiCosts = {
          'claude-4-opus': findModelCost('claude-opus-4'),
          'claude-4-sonnet': findModelCost('claude-sonnet-4'),
          'claude-3.5-haiku': findModelCost('claude-3.5-haiku'),
          'actual': jsonlStats.totalCost
        };
        usingJSONL = true;
        
        console.log(`\n📊 Found ${jsonlStats.totalRequests} API calls across ${Object.keys(jsonlStats.byProject).length} projects`);
      } else {
        throw new Error('No JSONL data found');
      }
    } catch (e) {
      // Fallback to .claude.json
      tokenData = getTokenUsage();
      apiCosts = calculateAPICosts(tokenData);
    }
    
    const totalTokens = tokenData.input + tokenData.output + tokenData.cacheCreation + tokenData.cacheRead;
    
    console.log('\n📈 Statistics:');
    console.log(`Active sessions: ${sessionFiles.length}`);
    console.log(`\n🎯 Token Usage ${usingJSONL ? '(from JSONL files)' : '(from .claude.json)'}:`);
    console.log(`Input tokens: ${tokenData.input.toLocaleString()}`);
    console.log(`Output tokens: ${tokenData.output.toLocaleString()}`);
    console.log(`Cache creation tokens: ${tokenData.cacheCreation.toLocaleString()}`);
    console.log(`Cache read tokens: ${tokenData.cacheRead.toLocaleString()}`);
    console.log(`Total tokens: ${totalTokens.toLocaleString()}`);
    
    console.log(`\n💰 Cost Analysis:`);
    console.log(`Claude Max subscription: $200/month`);
    console.log(`Cost per session: $${(200 / Math.max(1, sessionFiles.length)).toFixed(2)}`);
    
    if (usingJSONL && apiCosts.actual) {
      console.log(`\n🚨 Actual API Costs (from usage logs):`);
      console.log(`Total cost: $${apiCosts.actual.toFixed(2)}`);
      console.log(`Subscription value: ${apiCosts.actual > 200 ? 
        `Saving $${(apiCosts.actual - 200).toFixed(2)} (${((apiCosts.actual - 200) / apiCosts.actual * 100).toFixed(1)}% savings)` :
        `Overpaying $${(200 - apiCosts.actual).toFixed(2)} (${((200 - apiCosts.actual) / 200 * 100).toFixed(1)}% overpay)`}`);
      
      // Display all models found in the data
      if (jsonlStats && jsonlStats.byModel) {
        const modelNames = Object.keys(jsonlStats.byModel).filter(model => 
          model !== '<synthetic>' && jsonlStats.byModel[model].cost > 0
        );
        
        if (modelNames.length > 0) {
          console.log(`\nBy model:`);
          modelNames.forEach(modelName => {
            const modelData = jsonlStats.byModel[modelName];
            const displayName = modelName
              .replace(/claude-opus-4-\d+/, 'Claude 4 Opus')
              .replace(/claude-sonnet-4-\d+/, 'Claude 4 Sonnet')
              .replace(/claude-3\.5-haiku.*/, 'Claude 3.5 Haiku');
            console.log(`${displayName}: $${modelData.cost.toFixed(2)} (${modelData.count} requests)`);
          });
        }
      }
    } else {
      console.log(`\n🚨 API Cost Comparison (if using pay-per-token):`);
      console.log(`Claude 4 Opus:    $${apiCosts['claude-4-opus'].toFixed(2)} (${(apiCosts['claude-4-opus'] / 200 * 100).toFixed(1)}% of subscription)`);
      console.log(`Claude 4 Sonnet:  $${apiCosts['claude-4-sonnet'].toFixed(2)} (${(apiCosts['claude-4-sonnet'] / 200 * 100).toFixed(1)}% of subscription)`);
      console.log(`Claude 3.5 Haiku: $${apiCosts['claude-3.5-haiku'].toFixed(2)} (${(apiCosts['claude-3.5-haiku'] / 200 * 100).toFixed(1)}% of subscription)`);
    }
    
    const mostExpensiveApiCost = apiCosts.actual || Math.max(...Object.values(apiCosts).filter(v => typeof v === 'number'));
    const cheapestApiCost = apiCosts.actual || Math.min(...Object.values(apiCosts).filter(v => typeof v === 'number'));
    
    if (mostExpensiveApiCost < 200) {
      const overpay = 200 - cheapestApiCost;
      console.log(`\n💸 Reality Check: You're paying $${overpay.toFixed(2)} more than needed (${((overpay / 200) * 100).toFixed(1)}% overpay)`);
      console.log(`📊 Break-even: You'd need ${Math.ceil(200 / mostExpensiveApiCost)}x more usage to justify the subscription`);
    } else {
      const savings = mostExpensiveApiCost - 200;
      console.log(`\n💎 Subscription value: Saving $${savings.toFixed(2)} vs API cost (${((savings / mostExpensiveApiCost) * 100).toFixed(1)}% savings)`);
    }
    
    if (sessionFiles.length > 0) {
      console.log('\n🔄 Active Sessions:');
      sessionFiles.slice(0, 5).forEach(file => {
        console.log(`- ${file.replace('.log', '')}`);
      });
    }
  },
  
  dashboard: async () => {
    console.log('🎯 Claude Logger Dashboard\n');
    
    // Try to get stats from JSONL files first
    let tokenData, apiCosts, usingJSONL = false, jsonlStats = null;
    
    try {
      jsonlStats = await getAggregatedStats();
      if (jsonlStats.totalRequests > 0) {
        // Convert JSONL stats to tokenData format
        tokenData = {
          input: jsonlStats.usage.input_tokens,
          output: jsonlStats.usage.output_tokens,
          cacheCreation: jsonlStats.usage.cache_creation_input_tokens,
          cacheRead: jsonlStats.usage.cache_read_input_tokens
        };
        
        apiCosts = {
          'actual': jsonlStats.totalCost
        };
        usingJSONL = true;
        
        console.log(`📊 Found ${jsonlStats.totalRequests} API calls across ${Object.keys(jsonlStats.byProject).length} projects`);
      } else {
        throw new Error('No JSONL data found');
      }
    } catch (e) {
      // Fallback to .claude.json
      tokenData = getTokenUsage();
      apiCosts = calculateAPICosts(tokenData);
    }
    
    const totalTokens = tokenData.input + tokenData.output + tokenData.cacheCreation + tokenData.cacheRead;
    
    console.log(`\n🎯 Token Usage ${usingJSONL ? '(from JSONL files)' : '(from .claude.json)'}:`);
    console.log(`Total tokens: ${totalTokens.toLocaleString()}`);
    console.log(`Input: ${tokenData.input.toLocaleString()}, Output: ${tokenData.output.toLocaleString()}`);
    console.log(`Cache Creation: ${tokenData.cacheCreation.toLocaleString()}, Cache Read: ${tokenData.cacheRead.toLocaleString()}`);
    
    console.log(`\n💰 Cost vs API pricing:`);
    if (usingJSONL && apiCosts.actual) {
      console.log(`Claude Max: $200/month | Actual API cost: $${apiCosts.actual.toFixed(2)}`);
      console.log(`${apiCosts.actual > 200 ? '💎 Saving' : '💸 Overpaying'}: $${Math.abs(apiCosts.actual - 200).toFixed(2)} (${(Math.abs(apiCosts.actual - 200) / (apiCosts.actual > 200 ? apiCosts.actual : 200) * 100).toFixed(1)}%)`);
    } else {
      console.log(`Claude Max: $200/month | API costs would be: Opus $${apiCosts['claude-4-opus'].toFixed(2)}, Sonnet $${apiCosts['claude-4-sonnet'].toFixed(2)}, Haiku $${apiCosts['claude-3.5-haiku'].toFixed(2)}`);
    }
    console.log(`📝 Note: Numbers show total ${usingJSONL ? 'actual' : 'estimated'} usage\n`);
    
    // Check for active sessions
    const sessionsDir = path.join(CLAUDE_LOGS_DIR, 'sessions');
    if (!fs.existsSync(sessionsDir)) {
      console.log('No active sessions found.');
      console.log('Run "claude-logger start" in each terminal to begin logging.');
      return;
    }
    
    const sessionFiles = fs.readdirSync(sessionsDir)
      .filter(f => f.endsWith('.log'))
      .map(f => {
        const stats = fs.statSync(path.join(sessionsDir, f));
        return { name: f, mtime: stats.mtime };
      })
      .sort((a, b) => b.mtime - a.mtime);
    
    if (sessionFiles.length === 0) {
      console.log('No active sessions found.');
      return;
    }
    
    console.log(`Active Sessions: ${sessionFiles.length}`);
    console.log(`Cost per session: $${(200 / sessionFiles.length).toFixed(2)}\n`);
    
    sessionFiles.slice(0, 10).forEach((file, i) => {
      const content = fs.readFileSync(path.join(sessionsDir, file.name), 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      const lastLine = lines[lines.length - 1] || 'No activity';
      
      console.log(`Terminal ${i + 1}: ${file.name.replace('.log', '')}`);
      console.log(`  Last: ${lastLine}`);
      console.log('');
    });
    
    console.log(`\n💡 Running ${sessionFiles.length} sessions = $${(200 / sessionFiles.length).toFixed(2)} per session!`);
  },
  
  merge: () => {
    console.log('🔄 Merging session logs...');
    
    const mergeScript = path.join(CLAUDE_LOGGER_DIR, 'multi-session-logger.sh');
    if (fs.existsSync(mergeScript)) {
      try {
        execSync(`bash ${mergeScript} merge`, { stdio: 'inherit' });
        console.log('✅ Logs merged successfully!');
      } catch (error) {
        console.error('Merge failed:', error.message);
      }
    }
  },

  heatmap: (period = 'week') => {
    console.log(`🔥 Token Usage Heatmap (${period}):\n`);
    
    // Parse session logs to build usage patterns
    const sessionsDir = path.join(CLAUDE_LOGS_DIR, 'sessions');
    if (!fs.existsSync(sessionsDir)) {
      console.log('No session data found. Start logging sessions to generate heatmaps.');
      return;
    }
    
    const hourlyUsage = new Array(24).fill(0);
    const dailyUsage = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    
    // Read all session files and extract token snapshots with timestamps
    const sessionFiles = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.log'));
    const snapshots = []; // Store all snapshots with timestamps for sorting
    
    sessionFiles.forEach(file => {
      try {
        const content = fs.readFileSync(path.join(sessionsDir, file), 'utf8');
        const lines = content.split('\n');
        
        // Get file timestamp from filename
        const fileTimestamp = parseInt(file.split('-')[0]) * 1000; // Convert to milliseconds
        
        // Parse both old single-line format and new multi-line format
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Look for token snapshot entries - both old single-line and new multi-line format
          const tokenMatch = line.match(/\[(\d{2}):(\d{2})\].*Token snapshot.*Input:\s*(\d+).*Output:\s*(\d+).*Cache Creation:\s*(\d+).*Cache Read:\s*(\d+)/);
          if (tokenMatch) {
            // Old single-line format
            const hour = parseInt(tokenMatch[1]);
            const minute = parseInt(tokenMatch[2]);
            const input = parseInt(tokenMatch[3]) || 0;
            const output = parseInt(tokenMatch[4]) || 0;
            const cacheCreation = parseInt(tokenMatch[5]) || 0;
            const cacheRead = parseInt(tokenMatch[6]) || 0;
            
            const totalTokens = input + output + cacheCreation + cacheRead;
            snapshots.push({
              timestamp: fileTimestamp,
              hour,
              minute,
              totalTokens
            });
          } else {
            // Check for new multi-line format starting with timestamp and "Token snapshot"
            const snapshotStart = line.match(/\[(\d{2}):(\d{2})\].*Token snapshot.*Input:\s*(\d+)/);
            if (snapshotStart && i + 12 < lines.length) {
              const hour = parseInt(snapshotStart[1]);
              const minute = parseInt(snapshotStart[2]);
              let input = parseInt(snapshotStart[3]) || 0;
              let output = 0;
              let cacheCreation = 0;
              let cacheRead = 0;
              
              // Parse the multi-line token data
              let lineIndex = 1;
              for (let j = i + 1; j < Math.min(i + 13, lines.length); j++) {
                const currentLine = lines[j].trim();
                
                if (lineIndex <= 3) {
                  const outputMatch = currentLine.match(/(\d+),\s*Output:\s*(\d+)/);
                  if (outputMatch) {
                    input += parseInt(outputMatch[1]) || 0;
                    output = parseInt(outputMatch[2]) || 0;
                  } else {
                    const numberMatch = currentLine.match(/^\s*(\d+)\s*$/);
                    if (numberMatch) {
                      input += parseInt(numberMatch[1]) || 0;
                    }
                  }
                } else if (lineIndex <= 6) {
                  const cacheCreationMatch = currentLine.match(/(\d+),\s*Cache Creation:\s*(\d+)/);
                  if (cacheCreationMatch) {
                    output += parseInt(cacheCreationMatch[1]) || 0;
                    cacheCreation = parseInt(cacheCreationMatch[2]) || 0;
                  } else {
                    const numberMatch = currentLine.match(/^\s*(\d+)\s*$/);
                    if (numberMatch) {
                      output += parseInt(numberMatch[1]) || 0;
                    }
                  }
                } else if (lineIndex <= 9) {
                  const cacheReadMatch = currentLine.match(/(\d+),\s*Cache Read:\s*(\d+)/);
                  if (cacheReadMatch) {
                    cacheCreation += parseInt(cacheReadMatch[1]) || 0;
                    cacheRead = parseInt(cacheReadMatch[2]) || 0;
                  } else {
                    const numberMatch = currentLine.match(/^\s*(\d+)\s*$/);
                    if (numberMatch) {
                      cacheCreation += parseInt(numberMatch[1]) || 0;
                    }
                  }
                } else {
                  const numberMatch = currentLine.match(/^\s*(\d+)/);
                  if (numberMatch) {
                    cacheRead += parseInt(numberMatch[1]) || 0;
                  }
                  if (currentLine.includes('Cost calc')) {
                    break;
                  }
                }
                
                lineIndex++;
              }
              
              const totalTokens = input + output + cacheCreation + cacheRead;
              snapshots.push({
                timestamp: fileTimestamp,
                hour,
                minute,
                totalTokens
              });
            }
          }
        }
      } catch (e) {
        // Skip files that can't be read
      }
    });
    
    if (snapshots.length === 0) {
      console.log('No token snapshots found. Token snapshots are created every 5 minutes.');
      console.log('Run "claude-logger start" in terminals and wait for snapshots to be generated.');
      return;
    }
    
    // Sort snapshots by timestamp
    snapshots.sort((a, b) => a.timestamp - b.timestamp);
    
    // Calculate incremental usage
    let previousTotal = 0;
    snapshots.forEach(snapshot => {
      const increment = snapshot.totalTokens - previousTotal;
      // Only count positive increments (negative would mean a reset or different session)
      if (increment > 0) {
        hourlyUsage[snapshot.hour] += increment;
      }
      // Update previous total for next iteration
      if (snapshot.totalTokens > previousTotal) {
        previousTotal = snapshot.totalTokens;
      }
    });
    
    // Generate hourly heatmap
    console.log('📊 Hourly Token Usage Pattern:');
    const maxUsage = Math.max(...hourlyUsage);
    
    for (let hour = 0; hour < 24; hour++) {
      const usage = hourlyUsage[hour];
      const normalized = maxUsage > 0 ? Math.round((usage / maxUsage) * 20) : 0;
      const bar = '█'.repeat(normalized) + '░'.repeat(20 - normalized);
      const hourStr = hour.toString().padStart(2, '0');
      
      console.log(`${hourStr}:00 │${bar}│ ${usage.toLocaleString()} tokens`);
    }
    
    console.log('\n🎯 Peak Usage Analysis:');
    const peakHour = hourlyUsage.indexOf(maxUsage);
    const quietHour = hourlyUsage.indexOf(Math.min(...hourlyUsage.filter(u => u > 0)));
    
    console.log(`Peak hour: ${peakHour.toString().padStart(2, '0')}:00 (${maxUsage.toLocaleString()} tokens)`);
    if (quietHour >= 0) {
      console.log(`Quietest active hour: ${quietHour.toString().padStart(2, '0')}:00`);
    }
    console.log(`Total incremental tokens: ${hourlyUsage.reduce((a, b) => a + b, 0).toLocaleString()}`);
    
    // Calculate productivity insights
    const morningUsage = hourlyUsage.slice(6, 12).reduce((a, b) => a + b, 0);
    const afternoonUsage = hourlyUsage.slice(12, 18).reduce((a, b) => a + b, 0);
    const eveningUsage = hourlyUsage.slice(18, 24).reduce((a, b) => a + b, 0);
    const nightUsage = hourlyUsage.slice(0, 6).reduce((a, b) => a + b, 0);
    
    console.log(`\n⏰ Time Period Analysis:`);
    console.log(`Morning (06-12): ${morningUsage.toLocaleString()} tokens`);
    console.log(`Afternoon (12-18): ${afternoonUsage.toLocaleString()} tokens`);
    console.log(`Evening (18-24): ${eveningUsage.toLocaleString()} tokens`);
    console.log(`Night (00-06): ${nightUsage.toLocaleString()} tokens`);
  },

  timeline: () => {
    console.log('📅 Project Timeline Visualization:\n');
    
    // Read session logs and build timeline
    const sessionsDir = path.join(CLAUDE_LOGS_DIR, 'sessions');
    if (!fs.existsSync(sessionsDir)) {
      console.log('No session data found. Start logging sessions to generate timeline.');
      return;
    }
    
    const sessions = [];
    const sessionFiles = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.log'));
    
    sessionFiles.forEach(file => {
      try {
        const content = fs.readFileSync(path.join(sessionsDir, file), 'utf8');
        const lines = content.split('\n').filter(l => l.trim());
        
        if (lines.length > 0) {
          const sessionId = file.replace('.log', '');
          let startTime = null, endTime = null;
          
          // Find start and end times
          lines.forEach(line => {
            const timeMatch = line.match(/\[(\d{2}:\d{2})\]/);
            if (timeMatch) {
              const time = timeMatch[1];
              if (line.includes('session started')) {
                startTime = time;
              } else if (line.includes('session ended')) {
                endTime = time;
              }
            }
          });
          
          if (startTime) {
            sessions.push({
              id: sessionId,
              start: startTime,
              end: endTime || 'ongoing',
              duration: endTime ? calculateDuration(startTime, endTime) : 'ongoing'
            });
          }
        }
      } catch (e) {
        // Skip files that can't be read
      }
    });
    
    // Sort sessions by start time
    sessions.sort((a, b) => a.start.localeCompare(b.start));
    
    console.log('🕐 Session Timeline (Recent):');
    sessions.slice(-15).forEach((session, i) => {
      const status = session.end === 'ongoing' ? '🟢' : '🔴';
      const duration = session.duration !== 'ongoing' ? ` (${session.duration})` : ' (active)';
      console.log(`${status} ${session.start} - ${session.end}${duration} | Session: ${session.id.substring(-8)}`);
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`Total sessions tracked: ${sessions.length}`);
    console.log(`Currently active: ${sessions.filter(s => s.end === 'ongoing').length}`);
    console.log(`Completed today: ${sessions.filter(s => s.end !== 'ongoing').length}`);
  },

  login: async () => {
    console.log('\n🔐 Claude Analytics Login\n');
    
    const config = loadConfig() || {};
    
    // Check if already logged in
    if (config.userKey) {
      console.log('✅ You are already logged in!');
      console.log(`🔑 Current key: ${config.userKey.substring(0, 16)}...`);
      console.log(`🏠 Hostname: ${config.hostname}`);
      console.log(`📅 Created: ${new Date(config.createdAt).toLocaleString()}`);
      if (config.lastSync) {
        console.log(`🔄 Last sync: ${new Date(config.lastSync).toLocaleString()}`);
      }
      
      const rl = createReadlineInterface();
      const choice = await new Promise((resolve) => {
        rl.question('\n1) Keep current login\n2) Generate new user key (⚠️  will replace current)\n3) Use different existing key\n\nChoice: ', resolve);
      });
      
      if (choice === '1') {
        console.log('\n✅ Keeping current login. You can now use "claude-analytics sync".');
        rl.close();
        return;
      } else if (choice === '3') {
        // Use existing key
        const key = await new Promise((resolve) => {
          rl.question('\nEnter your existing key: ', resolve);
        });
        
        if (key.length === 64 && /^[a-f0-9]+$/i.test(key)) {
          config.userKey = key;
          config.syncEnabled = true;
          config.hostname = os.hostname();
          config.restoredAt = new Date().toISOString();
          delete config.lastSync; // Reset sync timestamp
          
          if (saveConfig(config)) {
            console.log('✅ Key updated successfully!');
          } else {
            console.log('❌ Failed to save configuration');
          }
        } else {
          console.log('❌ Invalid key format. Keys should be 64 hexadecimal characters.');
        }
        rl.close();
        return;
      }
      rl.close();
      // Fall through to generate new key (choice 2)
    }
    
    const rl = createReadlineInterface();
    const choice = config.userKey ? '2' : await new Promise((resolve) => {
      rl.question('1) Generate new user key\n2) Use existing key\n\nChoice: ', resolve);
    });
    
    if (choice === '1') {
      // Generate new key
      const userKey = crypto.randomBytes(32).toString('hex');
      config.userKey = userKey;
      config.syncEnabled = true;
      config.hostname = os.hostname();
      config.createdAt = new Date().toISOString();
      
      if (saveConfig(config)) {
        console.log('\n✅ New key generated and saved to ~/.claude-logged/config.json');
        console.log(`🔑 Your key: ${userKey}`);
        console.log('\n⚠️  Save this key securely! You\'ll need it to sync from other devices.');
      } else {
        console.log('❌ Failed to save configuration');
      }
    } else if (choice === '2') {
      // Use existing key
      const key = await new Promise((resolve) => {
        rl.question('\nEnter your existing key: ', resolve);
      });
      
      if (key.length === 64 && /^[a-f0-9]+$/i.test(key)) {
        config.userKey = key;
        config.syncEnabled = true;
        config.hostname = os.hostname();
        config.restoredAt = new Date().toISOString();
        
        if (saveConfig(config)) {
          console.log('✅ Key saved successfully!');
        } else {
          console.log('❌ Failed to save configuration');
        }
      } else {
        console.log('❌ Invalid key format. Keys should be 64 hexadecimal characters.');
      }
    } else {
      console.log('❌ Invalid choice');
    }
    
    rl.close();
  },
  
  sync: async () => {
    console.log('\n📤 Syncing usage data to server...\n');
    
    const config = loadConfig();
    if (!config || !config.userKey) {
      console.log('❌ Not logged in. Run "claude-analytics login" first.');
      return;
    }
    
    if (!config.syncEnabled) {
      console.log('❌ Sync is disabled. Enable it in ~/.claude-logged/config.json');
      return;
    }
    
    try {
      // Gather usage data
      const tokenData = getTokenUsage();
      const apiCosts = calculateAPICosts(tokenData);
      const jsonlStats = await getAggregatedStats();
      
      // Gather session data
      const sessionFiles = fs.existsSync(path.join(CLAUDE_LOGS_DIR, 'sessions')) ?
        fs.readdirSync(path.join(CLAUDE_LOGS_DIR, 'sessions')).filter(f => f.endsWith('.log')) : [];
      
      // Build hourly usage pattern
      const hourlyUsage = new Array(24).fill(0);
      // (You would analyze session logs here to populate hourly usage)
      
      const syncData = {
        userKey: config.userKey,
        hostname: config.hostname || os.hostname(),
        timestamp: new Date().toISOString(),
        usage: {
          totalTokens: tokenData.input + tokenData.output + tokenData.cacheCreation + tokenData.cacheRead,
          inputTokens: tokenData.input,
          outputTokens: tokenData.output,
          cacheCreationTokens: tokenData.cacheCreation,
          cacheReadTokens: tokenData.cacheRead
        },
        sessions: {
          total: sessionFiles.length,
          active: sessionFiles.filter(f => {
            const content = fs.readFileSync(path.join(CLAUDE_LOGS_DIR, 'sessions', f), 'utf8');
            return !content.includes('session ended');
          }).length,
          averageDuration: 45.5 // This would be calculated from session logs
        },
        costs: {
          opus: apiCosts['claude-4-opus'] || 0,
          sonnet: apiCosts['claude-4-sonnet'] || 0,
          haiku: apiCosts['claude-3.5-haiku'] || 0,
          actual: jsonlStats.totalCost || 0
        },
        hourlyUsage: hourlyUsage,
        version: require('../package.json').version
      };
      
      // Send to server
      const url = new URL(`${SYNC_SERVER_URL}/api/sync`);
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        protocol: url.protocol,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `claude-analytics/${syncData.version}`
        }
      };
      
      const response = await httpsRequest(options, syncData);
      
      if (response.statusCode === 200 || response.statusCode === 201) {
        config.lastSync = new Date().toISOString();
        saveConfig(config);
        
        console.log(`✅ Synced ${syncData.usage.totalTokens.toLocaleString()} tokens from ${syncData.hostname}`);
        console.log(`✅ Last sync: ${new Date().toLocaleString()}`);
      } else {
        console.log(`❌ Sync failed: ${response.body?.message || response.body || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ Sync error: ${error.message}`);
      console.log('Note: The sync server may not be deployed yet.');
    }
  },
  
  'stats-global': async () => {
    console.log('\n🌍 Global Usage Statistics (All Devices)\n');
    
    const config = loadConfig();
    if (!config || !config.userKey) {
      console.log('❌ Not logged in. Run "claude-analytics login" first.');
      return;
    }
    
    try {
      const url = new URL(`${SYNC_SERVER_URL}/api/stats/${config.userKey}`);
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'GET',
        protocol: url.protocol,
        headers: {
          'User-Agent': `claude-analytics/${require('../package.json').version}`
        }
      };
      
      const response = await httpsRequest(options);
      
      if (response.statusCode === 200) {
        const stats = response.body;
        
        console.log(`Devices: ${stats.devices.length}`);
        let totalTokens = 0;
        stats.devices.forEach(device => {
          const percentage = stats.totalTokens > 0 ? 
            ((device.totalTokens / stats.totalTokens) * 100).toFixed(0) : 0;
          console.log(`- ${device.hostname}: ${device.totalTokens.toLocaleString()} tokens (${percentage}%)`);
          totalTokens += device.totalTokens;
        });
        
        console.log(`\nTotal Usage: ${totalTokens.toLocaleString()} tokens`);
        console.log(`Total Cost (if API): $${stats.totalCost.toFixed(2)}`);
        
        console.log('\n💡 Use "claude-analytics stats" to see local device statistics.');
      } else {
        console.log(`❌ Failed to get global stats: ${response.body?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log('Note: The sync server may not be deployed yet.');
    }
  },
  
  status: () => {
    console.log('\n🔍 Claude Analytics Status\n');
    
    const config = loadConfig();
    if (!config || !config.userKey) {
      console.log('❌ Not logged in');
      console.log('💡 Run "claude-analytics login" to get started');
      return;
    }
    
    console.log('✅ Logged in and ready to sync');
    console.log(`🔑 User key: ${config.userKey.substring(0, 16)}...`);
    console.log(`🏠 Hostname: ${config.hostname}`);
    console.log(`📅 Created: ${new Date(config.createdAt).toLocaleString()}`);
    if (config.lastSync) {
      console.log(`🔄 Last sync: ${new Date(config.lastSync).toLocaleString()}`);
    } else {
      console.log('🔄 Never synced');
    }
    console.log(`🌐 Server: ${SYNC_SERVER_URL}`);
    console.log(`⚙️  Sync enabled: ${config.syncEnabled ? 'Yes' : 'No'}`);
    
    console.log('\n💡 Available commands:');
    console.log('• claude-analytics sync          - Upload usage data');
    console.log('• claude-analytics stats-global  - View combined stats');
    console.log('• claude-analytics login         - Change login settings');
  },
  
  export: (format = 'csv') => {
    console.log(`📊 Exporting data in ${format.toUpperCase()} format...\n`);
    
    const sessionsDir = path.join(CLAUDE_LOGS_DIR, 'sessions');
    if (!fs.existsSync(sessionsDir)) {
      console.log('No session data found to export.');
      return;
    }
    
    const exportData = [];
    const sessionFiles = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.log'));
    
    // Parse all session data
    sessionFiles.forEach(file => {
      try {
        const content = fs.readFileSync(path.join(sessionsDir, file), 'utf8');
        const lines = content.split('\n').filter(l => l.trim());
        const sessionId = file.replace('.log', '');
        
        let sessionStart = null;
        let sessionEnd = null;
        const tokenSnapshots = [];
        
        lines.forEach(line => {
          const timeMatch = line.match(/\[(\d{2}:\d{2})\]/);
          if (timeMatch) {
            const time = timeMatch[1];
            
            if (line.includes('session started')) {
              sessionStart = time;
            } else if (line.includes('session ended')) {
              sessionEnd = time;
            }
            
            // Parse token snapshots
            const tokenMatch = line.match(/Token snapshot.*Input:\s*(\d+).*Output:\s*(\d+).*Cache Creation:\s*(\d+).*Cache Read:\s*(\d+)/);
            if (tokenMatch) {
              const snapshot = {
                time: time,
                input: parseInt(tokenMatch[1]) || 0,
                output: parseInt(tokenMatch[2]) || 0,
                cacheCreation: parseInt(tokenMatch[3]) || 0,
                cacheRead: parseInt(tokenMatch[4]) || 0
              };
              snapshot.total = snapshot.input + snapshot.output + snapshot.cacheCreation + snapshot.cacheRead;
              tokenSnapshots.push(snapshot);
            }
          }
        });
        
        // Calculate costs
        const tokenData = tokenSnapshots.length > 0 ? tokenSnapshots[tokenSnapshots.length - 1] : 
          { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, total: 0 };
        const apiCosts = calculateAPICosts(tokenData);
        
        exportData.push({
          sessionId,
          startTime: sessionStart,
          endTime: sessionEnd || 'ongoing',
          duration: sessionEnd ? calculateDuration(sessionStart, sessionEnd) : 'ongoing',
          tokenSnapshots: tokenSnapshots.length,
          totalTokens: tokenData.total,
          inputTokens: tokenData.input,
          outputTokens: tokenData.output,
          cacheCreationTokens: tokenData.cacheCreation,
          cacheReadTokens: tokenData.cacheRead,
          costOpus: apiCosts['claude-4-opus'],
          costSonnet: apiCosts['claude-4-sonnet'],
          costHaiku: apiCosts['claude-3.5-haiku']
        });
      } catch (e) {
        console.error(`Error processing ${file}:`, e.message);
      }
    });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (format.toLowerCase() === 'json') {
      // Export as JSON
      const jsonData = {
        exportDate: new Date().toISOString(),
        totalSessions: exportData.length,
        activeSessions: exportData.filter(s => s.endTime === 'ongoing').length,
        sessions: exportData
      };
      
      const filename = `claude-analytics-export-${timestamp}.json`;
      const filepath = path.join(CLAUDE_LOGS_DIR, filename);
      fs.writeFileSync(filepath, JSON.stringify(jsonData, null, 2));
      console.log(`✅ JSON export saved: ${filepath}`);
      
    } else {
      // Export as CSV
      const csvHeaders = [
        'Session ID', 'Start Time', 'End Time', 'Duration', 'Token Snapshots',
        'Total Tokens', 'Input Tokens', 'Output Tokens', 'Cache Creation', 'Cache Read',
        'Cost (Opus)', 'Cost (Sonnet)', 'Cost (Haiku)'
      ];
      
      const csvRows = exportData.map(session => [
        session.sessionId,
        session.startTime || 'N/A',
        session.endTime,
        session.duration,
        session.tokenSnapshots,
        session.totalTokens,
        session.inputTokens,
        session.outputTokens,
        session.cacheCreationTokens,
        session.cacheReadTokens,
        session.costOpus.toFixed(4),
        session.costSonnet.toFixed(4),
        session.costHaiku.toFixed(4)
      ]);
      
      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
      
      const filename = `claude-analytics-export-${timestamp}.csv`;
      const filepath = path.join(CLAUDE_LOGS_DIR, filename);
      fs.writeFileSync(filepath, csvContent);
      console.log(`✅ CSV export saved: ${filepath}`);
    }
    
    console.log(`\n📈 Export Summary:`);
    console.log(`Sessions exported: ${exportData.length}`);
    console.log(`Active sessions: ${exportData.filter(s => s.endTime === 'ongoing').length}`);
    console.log(`Total tokens: ${exportData.reduce((sum, s) => sum + s.totalTokens, 0).toLocaleString()}`);
  }
};

// Parse command
const command = process.argv[2];
const args = process.argv.slice(3);

if (!command || !commands[command]) {
  console.log('Claude Analytics - Advanced Claude Code analytics and insights\n');
  console.log('Usage:');
  console.log('  claude-analytics init            - Initialize and set up automatic logging');
  console.log('  claude-analytics start           - Start logging session');
  console.log('  claude-analytics stats           - View statistics with API cost analysis');
  console.log('  claude-analytics dashboard       - Real-time dashboard');
  console.log('  claude-analytics heatmap         - Token usage heatmap (find peak hours)');
  console.log('  claude-analytics timeline        - Project timeline visualization');
  console.log('  claude-analytics export [format] - Export data (csv/json)');
  console.log('  claude-analytics merge           - Merge all session logs');
  console.log('  claude-analytics login           - Login/register for sync functionality');
  console.log('  claude-analytics status          - Check sync login status');
  console.log('  claude-analytics sync            - Sync usage data to cloud');
  console.log('  claude-analytics stats-global    - View aggregated stats from all devices');
  process.exit(0);
}

// Execute command
(async () => {
  try {
    await commands[command](...args);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();