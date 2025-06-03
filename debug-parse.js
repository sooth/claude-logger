const fs = require('fs');

// Test parsing one specific file
const content = fs.readFileSync('/Users/dmalson/Documents/claude-logs/sessions/1748667300-74660.log', 'utf8');
const lines = content.split('\n');

console.log('Lines:', lines);
console.log('\nParsing:');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  const snapshotStart = line.match(/\[(\d{2}):(\d{2})\].*Token snapshot.*Input:\s*(\d+)/);
  if (snapshotStart) {
    console.log('Found snapshot start:', line);
    const hour = parseInt(snapshotStart[1]);
    let input = parseInt(snapshotStart[3]) || 0;
    let output = 0;
    let cacheCreation = 0;
    let cacheRead = 0;
    
    console.log('Initial input:', input);
    
    let lineIndex = 1;
    for (let j = i + 1; j < Math.min(i + 13, lines.length); j++) {
      const currentLine = lines[j].trim();
      console.log(`Line ${lineIndex} (${j}): "${currentLine}"`);
      
      if (lineIndex <= 3) {
        const outputMatch = currentLine.match(/(\d+),\s*Output:\s*(\d+)/);
        if (outputMatch) {
          const num1 = parseInt(outputMatch[1]) || 0;
          const num2 = parseInt(outputMatch[2]) || 0;
          input += num1;
          output = num2;
          console.log(`  Found output match: input += ${num1} (now ${input}), output = ${num2}`);
        } else {
          const numberMatch = currentLine.match(/^\s*(\d+)\s*$/);
          if (numberMatch) {
            const num = parseInt(numberMatch[1]) || 0;
            input += num;
            console.log(`  Added to input: ${num} (now ${input})`);
          }
        }
      } else if (lineIndex <= 6) {
        const cacheCreationMatch = currentLine.match(/(\d+),\s*Cache Creation:\s*(\d+)/);
        if (cacheCreationMatch) {
          const num1 = parseInt(cacheCreationMatch[1]) || 0;
          const num2 = parseInt(cacheCreationMatch[2]) || 0;
          output += num1;
          cacheCreation = num2;
          console.log(`  Found cache creation match: output += ${num1} (now ${output}), cacheCreation = ${num2}`);
        } else {
          const numberMatch = currentLine.match(/^\s*(\d+)\s*$/);
          if (numberMatch) {
            const num = parseInt(numberMatch[1]) || 0;
            output += num;
            console.log(`  Added to output: ${num} (now ${output})`);
          }
        }
      } else if (lineIndex <= 9) {
        const cacheReadMatch = currentLine.match(/(\d+),\s*Cache Read:\s*(\d+)/);
        if (cacheReadMatch) {
          const num1 = parseInt(cacheReadMatch[1]) || 0;
          const num2 = parseInt(cacheReadMatch[2]) || 0;
          cacheCreation += num1;
          cacheRead = num2;
          console.log(`  Found cache read match: cacheCreation += ${num1} (now ${cacheCreation}), cacheRead = ${num2}`);
        } else {
          const numberMatch = currentLine.match(/^\s*(\d+)\s*$/);
          if (numberMatch) {
            const num = parseInt(numberMatch[1]) || 0;
            cacheCreation += num;
            console.log(`  Added to cacheCreation: ${num} (now ${cacheCreation})`);
          }
        }
      } else {
        const numberMatch = currentLine.match(/^\s*(\d+)/);
        if (numberMatch) {
          const num = parseInt(numberMatch[1]) || 0;
          cacheRead += num;
          console.log(`  Added to cacheRead: ${num} (now ${cacheRead})`);
        }
        if (currentLine.includes('Cost calc')) {
          console.log('  Found cost calc line, breaking');
          break;
        }
      }
      
      lineIndex++;
    }
    
    const totalTokens = input + output + cacheCreation + cacheRead;
    console.log(`\nFinal totals:`);
    console.log(`Input: ${input}`);
    console.log(`Output: ${output}`);
    console.log(`Cache Creation: ${cacheCreation}`);
    console.log(`Cache Read: ${cacheRead}`);
    console.log(`Total: ${totalTokens}`);
    console.log(`Hour: ${hour}`);
  }
}