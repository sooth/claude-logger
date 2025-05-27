#!/usr/bin/env node

const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CLAUDE_LOGS_DIR = path.join(os.homedir(), 'Documents', 'claude-logs');
const CLAUDE_LOGGER_DIR = path.dirname(__dirname);

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
    
    let tokenCount = 0;
    if (fs.existsSync(todayLog)) {
      const content = fs.readFileSync(todayLog, 'utf8');
      const tokenMatches = content.match(/(\d+(?:,\d+)*)\s*tokens/gi) || [];
      tokenMatches.forEach(match => {
        const num = parseInt(match.replace(/[^\d]/g, ''));
        if (!isNaN(num)) tokenCount += num;
      });
    }
    
    console.log('\n📈 Statistics:');
    console.log(`Active sessions: ${sessionFiles.length}`);
    console.log(`Total tokens today: ${tokenCount.toLocaleString()}`);
    console.log(`Cost per session: $${(200 / Math.max(1, sessionFiles.length)).toFixed(2)}`);
    
    if (sessionFiles.length > 0) {
      console.log('\n🔄 Active Sessions:');
      sessionFiles.slice(0, 5).forEach(file => {
        console.log(`- ${file.replace('.log', '')}`);
      });
    }
  },
  
  dashboard: () => {
    console.log('🎯 Claude Logger Dashboard\n');
    
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
  }
};

// Parse command
const command = process.argv[2];
const args = process.argv.slice(3);

if (!command || !commands[command]) {
  console.log('Claude Logger - Track your parallel coding sessions\n');
  console.log('Usage:');
  console.log('  claude-logger init      - Initialize and set up automatic logging');
  console.log('  claude-logger start     - Start logging session');
  console.log('  claude-logger stats     - View statistics');
  console.log('  claude-logger dashboard - Real-time dashboard');
  console.log('  claude-logger merge     - Merge all session logs');
  process.exit(0);
}

// Execute command
commands[command](...args);