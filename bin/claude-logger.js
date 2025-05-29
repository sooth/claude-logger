#!/usr/bin/env node

const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CLAUDE_LOGS_DIR = path.join(os.homedir(), 'Documents', 'claude-logs');
const CLAUDE_LOGGER_DIR = path.dirname(__dirname);

// Claude API pricing (per million tokens)
const CLAUDE_PRICING = {
  'claude-4-opus': { input: 15.00, output: 75.00, cacheCreation: 18.75, cacheRead: 1.50 },
  'claude-4-sonnet': { input: 3.00, output: 15.00, cacheCreation: 3.75, cacheRead: 0.30 },
  'claude-3.5-haiku': { input: 0.80, output: 4.00, cacheCreation: 1.00, cacheRead: 0.08 }
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
  
  stats: (period = 'today') => {
    console.log(`📊 Generating stats for: ${period}`);
    
    const sessionFiles = fs.readdirSync(path.join(CLAUDE_LOGS_DIR, 'sessions'))
      .filter(f => f.endsWith('.log'));
    
    const today = new Date().toISOString().split('T')[0];
    const todayLog = path.join(CLAUDE_LOGS_DIR, `${today}.md`);
    
    // Read token usage from .claude.json
    const tokenData = getTokenUsage();
    
    const totalTokens = tokenData.input + tokenData.output + tokenData.cacheCreation + tokenData.cacheRead;
    const apiCosts = calculateAPICosts(tokenData);
    
    console.log('\n📈 Statistics:');
    console.log(`Active sessions: ${sessionFiles.length}`);
    console.log(`\n🎯 Project Token Usage (current project total):`);
    console.log(`Input tokens: ${tokenData.input.toLocaleString()}`);
    console.log(`Output tokens: ${tokenData.output.toLocaleString()}`);
    console.log(`Cache creation tokens: ${tokenData.cacheCreation.toLocaleString()}`);
    console.log(`Cache read tokens: ${tokenData.cacheRead.toLocaleString()}`);
    console.log(`Total tokens: ${totalTokens.toLocaleString()}`);
    
    console.log(`\n💰 Cost Analysis:`);
    console.log(`Claude Max subscription: $200/month`);
    console.log(`Cost per session: $${(200 / Math.max(1, sessionFiles.length)).toFixed(2)}`);
    
    console.log(`\n🚨 API Cost Comparison (if using pay-per-token):`);
    console.log(`Claude 4 Opus:    $${apiCosts['claude-4-opus'].toFixed(2)} (${(apiCosts['claude-4-opus'] / 200 * 100).toFixed(1)}% of subscription)`);
    console.log(`Claude 4 Sonnet:  $${apiCosts['claude-4-sonnet'].toFixed(2)} (${(apiCosts['claude-4-sonnet'] / 200 * 100).toFixed(1)}% of subscription)`);
    console.log(`Claude 3.5 Haiku: $${apiCosts['claude-3.5-haiku'].toFixed(2)} (${(apiCosts['claude-3.5-haiku'] / 200 * 100).toFixed(1)}% of subscription)`);
    
    const mostExpensiveApiCost = Math.max(...Object.values(apiCosts));
    const cheapestApiCost = Math.min(...Object.values(apiCosts));
    
    if (mostExpensiveApiCost < 200) {
      const overpay = 200 - cheapestApiCost;
      console.log(`\n💸 Reality Check: You're paying $${overpay.toFixed(2)} more than needed (${((overpay / 200) * 100).toFixed(1)}% overpay)`);
      console.log(`📊 Break-even: You'd need ${Math.ceil(200 / mostExpensiveApiCost)}x more usage to justify the subscription`);
    } else {
      const savings = mostExpensiveApiCost - 200;
      console.log(`\n💎 Subscription value: Saving $${savings.toFixed(2)} vs most expensive API (${((savings / mostExpensiveApiCost) * 100).toFixed(1)}% savings)`);
    }
    
    if (sessionFiles.length > 0) {
      console.log('\n🔄 Active Sessions:');
      sessionFiles.slice(0, 5).forEach(file => {
        console.log(`- ${file.replace('.log', '')}`);
      });
    }
  },
  
  dashboard: () => {
    console.log('🎯 Claude Logger Dashboard\n');
    
    // Read token usage from .claude.json
    const tokenData = getTokenUsage();
    
    const totalTokens = tokenData.input + tokenData.output + tokenData.cacheCreation + tokenData.cacheRead;
    const apiCosts = calculateAPICosts(tokenData);
    
    console.log('🎯 Project-wide Token Usage (cumulative):');
    console.log(`Total tokens: ${totalTokens.toLocaleString()}`);
    console.log(`Input: ${tokenData.input.toLocaleString()}, Output: ${tokenData.output.toLocaleString()}`);
    console.log(`Cache Creation: ${tokenData.cacheCreation.toLocaleString()}, Cache Read: ${tokenData.cacheRead.toLocaleString()}`);
    
    console.log(`\n💰 Cost vs API pricing:`);
    console.log(`Claude Max: $200/month | API costs would be: Opus $${apiCosts['claude-4-opus'].toFixed(2)}, Sonnet $${apiCosts['claude-4-sonnet'].toFixed(2)}, Haiku $${apiCosts['claude-3.5-haiku'].toFixed(2)}`);
    console.log(`📝 Note: Numbers show total project usage, not per-session\n`);
    
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
    
    // Read all session files and extract token snapshots
    const sessionFiles = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.log'));
    let totalSnapshots = 0;
    
    sessionFiles.forEach(file => {
      try {
        const content = fs.readFileSync(path.join(sessionsDir, file), 'utf8');
        const lines = content.split('\n');
        
        lines.forEach(line => {
          // Look for token snapshot entries
          const tokenMatch = line.match(/\[(\d{2}):(\d{2})\].*Token snapshot.*Input:\s*(\d+).*Output:\s*(\d+).*Cache Creation:\s*(\d+).*Cache Read:\s*(\d+)/);
          if (tokenMatch) {
            const hour = parseInt(tokenMatch[1]);
            const input = parseInt(tokenMatch[3]) || 0;
            const output = parseInt(tokenMatch[4]) || 0;
            const cacheCreation = parseInt(tokenMatch[5]) || 0;
            const cacheRead = parseInt(tokenMatch[6]) || 0;
            
            const totalTokens = input + output + cacheCreation + cacheRead;
            hourlyUsage[hour] += totalTokens;
            totalSnapshots++;
          }
        });
      } catch (e) {
        // Skip files that can't be read
      }
    });
    
    if (totalSnapshots === 0) {
      console.log('No token snapshots found. Token snapshots are created every 5 minutes.');
      console.log('Run "claude-logger start" in terminals and wait for snapshots to be generated.');
      return;
    }
    
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
    console.log(`Quietest hour: ${quietHour.toString().padStart(2, '0')}:00`);
    console.log(`Total snapshots analyzed: ${totalSnapshots}`);
    
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
  process.exit(0);
}

// Execute command
commands[command](...args);