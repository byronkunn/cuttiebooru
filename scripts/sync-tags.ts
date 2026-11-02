import { PrismaClient } from "@prisma/client";
import { STARTER_TAGS } from "../src/lib/tag-taxonomy";
const prisma = new PrismaClient();
async function main() {
  for (const [oldCategory, category] of [["nsfw", "content"], ["style", "meta"], ["cosplay", "meta"], ["photography", "meta"]]) {
    await prisma.tag.updateMany({ where: { category: oldCategory }, data: { category } });
    await prisma.tagSuggestion.updateMany({ where: { tagCategory: oldCategory }, data: { tagCategory: category } });
  }
  for (const tag of STARTER_TAGS) {
    // Preserve IDs, usage counts, associations, descriptions, and non-starter tags.
    await prisma.tag.upsert({ where: { name: tag.name }, create: tag, update: { category: tag.category, displayName: tag.displayName } });
  }
  console.log(`Synchronized ${STARTER_TAGS.length} categorized starter tags.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
