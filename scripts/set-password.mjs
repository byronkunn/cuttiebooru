// Run locally: node scripts/set-password.mjs <username> (password is read from stdin).
import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';
import readline from 'node:readline';
import { Writable } from 'node:stream';
const username = process.argv[2];
if (!username) { console.error('Usage: node scripts/set-password.mjs <username>'); process.exit(1); }
process.stderr.write('New password (at least 12 characters, input hidden): ');
const muted = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
const rl = readline.createInterface({ input: process.stdin, output: muted, terminal: !!process.stdin.isTTY });
const password = await new Promise(resolve => rl.question('', resolve));
rl.close();
process.stderr.write('\n');
if (password.length < 12 || password.length > 256) { console.error('Password must be 12–256 characters.'); process.exit(1); }
const salt = randomBytes(16).toString('hex');
const passwordHash = `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
const prisma = new PrismaClient();
try {
  const user = await prisma.user.update({ where: { username }, data: { passwordHash }, select: { id: true } });
  await prisma.session.deleteMany({ where: { userId: user.id } });
  console.log(`Password set for ${username}; existing sessions revoked.`);
} catch { console.error('User not found or database unavailable.'); process.exitCode = 1; }
finally { await prisma.$disconnect(); }
