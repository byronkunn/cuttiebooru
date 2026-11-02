import { PrismaClient } from "@prisma/client";
import { STARTER_TAGS } from "../src/lib/tag-taxonomy";

const prisma = new PrismaClient();

async function main() {
  await prisma.siteSetting.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global" },
  });
  for (const tag of STARTER_TAGS) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: {
        name: tag.name,
        displayName: tag.displayName,
        category: tag.category,
        description: tag.description,
      },
    });
  }
  console.log("Initialized site settings and real tag vocabulary. Existing accounts and content were not changed.");
}

main()
  .catch((error) => {
    console.error("Site initialization failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
