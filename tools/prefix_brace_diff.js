const fs = require('fs');
const a = fs.readFileSync(process.argv[2], 'utf8').split('\n');
const b = fs.readFileSync(process.argv[3], 'utf8').split('\n');
const max = Math.max(a.length, b.length);
let ac = 0;
let bc = 0;
for (let i=0;i<max;i++) {
  const al = a[i] || '';
  const bl = b[i] || '';
  for (const ch of al) { if (ch === '{') ac++; if (ch === '}') ac--; }
  for (const ch of bl) { if (ch === '{') bc++; if (ch === '}') bc--; }
  if (ac !== bc) {
    console.log('Difference at line', i+1, 'ac=', ac, 'bc=', bc);
    console.log('--- file1---');
    console.log((a[i-3]||'') + '\n' + (a[i-2]||'') + '\n' + (a[i-1]||'') + '\n' + (a[i]||'') + '\n' + (a[i+1]||'') + '\n' + (a[i+2]||'') );
    console.log('--- file2---');
    console.log((b[i-3]||'') + '\n' + (b[i-2]||'') + '\n' + (b[i-1]||'') + '\n' + (b[i]||'') + '\n' + (b[i+1]||'') + '\n' + (b[i+2]||'') );
    process.exit(0);
  }
}
console.log('No prefix brace differences found');
