@echo off
npx nodemon --exec "npx tsx server.ts" --watch server.ts --watch src --ext ts,tsx,js,jsx