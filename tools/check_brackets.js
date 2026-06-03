const fs = require('fs');
const path = process.argv[2];
if (!path) {
  console.error('Usage: node check_brackets.js <file>');
  process.exit(2);
}
let src = fs.readFileSync(path, 'utf8');
const startLine = process.argv[3] ? parseInt(process.argv[3], 10) : 1;
const endLine = process.argv[4] ? parseInt(process.argv[4], 10) : undefined;
if (startLine > 1 || endLine) {
  const lines = src.split('\n');
  const s = Math.max(0, startLine-1);
  const e = Math.min(lines.length, (endLine || lines.length));
  src = lines.slice(s, e).join('\n');
}
const counts = { '(':0, ')':0, '{':0, '}':0, '[':0, ']':0 };
for (const ch of src) {
  if (counts.hasOwnProperty(ch)) counts[ch]++;
}
console.log('Counts:', counts);
console.log('Parens balance:', counts['('] - counts[')']);
console.log('Braces balance:', counts['{'] - counts['}']);
console.log('Brackets balance:', counts['['] - counts[']']);

// Line-by-line running balance to find first mismatch
let r = { '(':0, '{':0, '[':0 };
const openers = { '(':')', '{':'}', '[':']' };
const closers = { ')':'(', '}':'{', ']':'[' };
const lines = src.split('\n');
let maxRunning = { '(': {val:0,line:0}, '{':{val:0,line:0}, '[':{val:0,line:0} };
for (let i=0;i<lines.length;i++) {
  const line = lines[i];
  for (const ch of line) {
    if (openers[ch]) r[ch]++;
    if (r[ch] > maxRunning[ch]?.val) {
      maxRunning[ch] = { val: r[ch], line: i+1 };
    }
    if (closers[ch]) r[closers[ch]]--;
    if (r['('] < 0 || r['{'] < 0 || r['['] < 0) {
      console.log(`Balance became negative at line ${i+1}:`, line.trim());
      process.exit(0);
    }
  }
}
if (r['('] !== 0 || r['{'] !== 0 || r['['] !== 0) {
  console.log('Final running balances (non-zero indicates missing closing):', r);
  console.log('Max running counts seen:', maxRunning);
  console.log('\nShowing 12 lines around max running positions:');
  const contexts = new Set([maxRunning['('].line, maxRunning['{'].line, maxRunning['['].line]);
  contexts.forEach(lineNo => {
    if (!lineNo) return;
    const start = Math.max(0, lineNo - 6);
    const end = Math.min(lines.length, lineNo + 6);
    console.log(`\n--- Context around line ${lineNo} ---`);
    for (let j=start;j<end;j++) {
      console.log(`${j+1}: ${lines[j]}`);
    }
  });
} else {
  console.log('All line-by-line balances are zero.');
}

// quick scan for suspicious `${` inside double quotes
const doubleQuoteInterpolations = [...src.matchAll(/"[^\"]*\$\{[^}]+\}[^\"]*"/g)];
if (doubleQuoteInterpolations.length) {
  console.log('\nFound ${} inside double-quoted strings (likely an error):');
  doubleQuoteInterpolations.forEach(m => {
    const snippet = m[0].slice(0,200).replace(/\n/g, ' ');
    console.log(' -', snippet);
  });
} else {
  console.log('\nNo ${} found inside double-quoted strings.');
}
