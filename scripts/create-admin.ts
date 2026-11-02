import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";
import readline from "node:readline";
import { Writable } from "node:stream";

const prisma = new PrismaClient();

async function main() {
  const username = process.argv[2]?.trim().toLowerCase();
  const email = process.argv[3]?.trim().toLowerCase() || null;
  if (!username || !/^[a-z0-9_]{3,32}$/.test(username)) {
    throw new Error("Usage: npx tsx scripts/create-admin.ts <username> [email]");
  }
  process.stderr.write("New admin password (12-256 characters, input hidden): ");
  const muted = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
  const rl = readline.createInterface({ input: process.stdin, output: muted, terminal: !!process.stdin.isTTY });
  const password = await new Promise<string>((resolve) => rl.question("", resolve));
  rl.close();
  process.stderr.write("\n");
  if (password.length < 12 || password.length > 256) {
    throw new Error("Password must be 12-256 characters.");
  }
  const displayName = username;

  const passwordHash = await hashPassword(password);

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ username }, ...(email ? [{ email }] : [])],
    },
  });

  if (existing) {
    const updated = await prisma.$transaction(async (tx) => {
      const account = await tx.user.update({
      where: { id: existing.id },
      data: {
        username,
        ...(email ? { email } : {}),
        displayName,
        passwordHash,
        role: "admin",
        isModerator: true,
        isVerified: true,
        isCreator: true,
        featured: true,
        bio: "Site Administrator & Owner of Cuttiebooru.",
      },
      });
      await tx.session.deleteMany({ where: { userId: account.id } });
      return account;
    });
    console.log("Updated existing user to Admin:", updated.username, updated.email, updated.role);
  } else {
    const created = await prisma.user.create({
      data: {
        username,
        email,
        displayName,
        passwordHash,
        role: "admin",
        isModerator: true,
        isVerified: true,
        isCreator: true,
        featured: true,
        bio: "Site Administrator & Owner of Cuttiebooru.",
        avatarUrl: "/sfw/avatar/0738955ca929985f39921b4876053170.png",
        headerUrl: "/sfw/banner-image/sample_0a026d6456f6806f67a9d67f856e8862.jpg",
        websiteUrl: `https://cuttiebooru.art/@${username}`,
        niche: "Cute Character Art",
        collections: {
          create: {
            title: "Admin Vault",
            description: "Site Admin Curation & Saved Works",
            isPublic: true,
            isCurated: true,
            badgeText: "Admin Picks",
          },
        },
      },
    });
    console.log("Created new Admin user:", created.username, created.email, created.role);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
