#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// Parse JSONL files from ~/.claude/projects directories
async function parseProjectJSONL(projectPath) {
  const results = [];
  
  try {
    const files = fs.readdirSync(projectPath).filter(f => f.endsWith('.jsonl'));
    
    for (const file of files) {
      const filePath = path.join(projectPath, file);
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });
      
      for await (const line of rl) {
        if (line.trim()) {
          try {
            const entry = JSON.parse(line);
            if (entry.type === 'assistant' && entry.message && entry.message.usage) {
              results.push({
                timestamp: entry.timestamp,
                model: entry.message.model,
                costUSD: entry.costUSD || 0,
                durationMs: entry.durationMs || 0,
                usage: {
                  input_tokens: entry.message.usage.input_tokens || 0,
                  output_tokens: entry.message.usage.output_tokens || 0,
                  cache_creation_input_tokens: entry.message.usage.cache_creation_input_tokens || 0,
                  cache_read_input_tokens: entry.message.usage.cache_read_input_tokens || 0
                },
                sessionId: entry.sessionId,
                requestId: entry.requestId
              });
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    }
  } catch (e) {
    console.error(`Error reading project ${projectPath}:`, e.message);
  }
  
  return results;
}

// Get all project stats from ~/.claude/projects
async function getAllProjectStats() {
  const claudeProjectsDir = path.join(os.homedir(), '.claude', 'projects');
  const allStats = [];
  
  if (!fs.existsSync(claudeProjectsDir)) {
    return allStats;
  }
  
  try {
    const projects = fs.readdirSync(claudeProjectsDir);
    
    for (const project of projects) {
      const projectPath = path.join(claudeProjectsDir, project);
      if (fs.statSync(projectPath).isDirectory()) {
        const projectStats = await parseProjectJSONL(projectPath);
        allStats.push({
          projectName: project,
          stats: projectStats
        });
      }
    }
  } catch (e) {
    console.error('Error reading projects directory:', e.message);
  }
  
  return allStats;
}

// Aggregate stats across all projects
async function getAggregatedStats() {
  const allProjects = await getAllProjectStats();
  
  let totalStats = {
    totalCost: 0,
    totalDuration: 0,
    totalRequests: 0,
    usage: {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0
    },
    byModel: {},
    byProject: {}
  };
  
  for (const project of allProjects) {
    let projectCost = 0;
    let projectDuration = 0;
    let projectUsage = {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0
    };
    
    for (const stat of project.stats) {
      totalStats.totalCost += stat.costUSD;
      totalStats.totalDuration += stat.durationMs;
      totalStats.totalRequests++;
      
      projectCost += stat.costUSD;
      projectDuration += stat.durationMs;
      
      // Aggregate usage
      totalStats.usage.input_tokens += stat.usage.input_tokens;
      totalStats.usage.output_tokens += stat.usage.output_tokens;
      totalStats.usage.cache_creation_input_tokens += stat.usage.cache_creation_input_tokens;
      totalStats.usage.cache_read_input_tokens += stat.usage.cache_read_input_tokens;
      
      projectUsage.input_tokens += stat.usage.input_tokens;
      projectUsage.output_tokens += stat.usage.output_tokens;
      projectUsage.cache_creation_input_tokens += stat.usage.cache_creation_input_tokens;
      projectUsage.cache_read_input_tokens += stat.usage.cache_read_input_tokens;
      
      // Group by model
      if (!totalStats.byModel[stat.model]) {
        totalStats.byModel[stat.model] = {
          count: 0,
          cost: 0,
          duration: 0,
          usage: {
            input_tokens: 0,
            output_tokens: 0,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0
          }
        };
      }
      
      totalStats.byModel[stat.model].count++;
      totalStats.byModel[stat.model].cost += stat.costUSD;
      totalStats.byModel[stat.model].duration += stat.durationMs;
      totalStats.byModel[stat.model].usage.input_tokens += stat.usage.input_tokens;
      totalStats.byModel[stat.model].usage.output_tokens += stat.usage.output_tokens;
      totalStats.byModel[stat.model].usage.cache_creation_input_tokens += stat.usage.cache_creation_input_tokens;
      totalStats.byModel[stat.model].usage.cache_read_input_tokens += stat.usage.cache_read_input_tokens;
    }
    
    totalStats.byProject[project.projectName] = {
      cost: projectCost,
      duration: projectDuration,
      requests: project.stats.length,
      usage: projectUsage
    };
  }
  
  return totalStats;
}

module.exports = {
  parseProjectJSONL,
  getAllProjectStats,
  getAggregatedStats
};

// If run directly, display stats
if (require.main === module) {
  (async () => {
    const stats = await getAggregatedStats();
    console.log(JSON.stringify(stats, null, 2));
  })();
}