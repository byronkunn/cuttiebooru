import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.follow.updateMany({
    where: { approved: false, following: { privateProfile: false } },
    data: { approved: true },
  });
  console.log(`Preserved ${result.count} public-account follows. Protected-account follows still require owner approval.`);
}

main()
  .catch((error) => {
    console.error("Could not migrate follow approvals:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
