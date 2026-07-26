import { execSync, spawn } from 'child_process';

const PORT = 3000;
const SERVER_PATH = '/home/z/my-project/.next/standalone/server.js';

// Start the Next.js standalone server
const server = spawn('node', ['--max-old-space-size=256', SERVER_PATH], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['pipe', 'pipe', 'pipe'],
});

server.stdout.on('data', (data: Buffer) => {
  console.log(data.toString());
});

server.stderr.on('data', (data: Buffer) => {
  console.error(data.toString());
});

server.on('close', (code: number | null) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code ?? 0);
});

console.log(`Next.js server starting on port ${PORT}...`);
