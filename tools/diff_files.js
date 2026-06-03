const fs = require('fs');
const a = fs.readFileSync(process.argv[2], 'utf8').split('\n');
const b = fs.readFileSync(process.argv[3], 'utf8').split('\n');
const start = process.argv[4] ? parseInt(process.argv[4], 10) - 1 : 0;
const n = Math.min(a.length, b.length);
for (let i=start;i<n;i++) {
  if (a[i] !== b[i]) {
    console.log('First diff at line', i+1);
    console.log('--- file1:', process.argv[2]);
    console.log(a.slice(Math.max(0, i-5), i+6).join('\n'));
    console.log('--- file2:', process.argv[3]);
    console.log(b.slice(Math.max(0, i-5), i+6).join('\n'));
    process.exit(0);
  }
}
console.log('No diff found after line', start+1);
