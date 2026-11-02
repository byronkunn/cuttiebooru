import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding direct messages from other users to admin Byron...");

  const admin = await prisma.user.findUnique({ where: { username: "byron" } });
  const sakura = await prisma.user.findUnique({ where: { username: "sakura" } });
  const luna = await prisma.user.findUnique({ where: { username: "luna" } });
  const hana = await prisma.user.findUnique({ where: { username: "hana" } });

  if (!admin || !sakura || !luna || !hana) {
    throw new Error("Missing users. Ensure byron, sakura, luna, and hana exist.");
  }

  // Clear existing messages to prevent duplicates
  await prisma.directMessage.deleteMany({});
  await prisma.notification.deleteMany({ where: { type: "message" } });

  const now = Date.now();

  // 1. Sakura -> Byron thread
  const m1_sakura = await prisma.directMessage.create({
    data: {
      senderId: sakura.id,
      receiverId: admin.id,
      text: "Hey Byron! The new Booru layout and theme switcher are awesome! I just finished organizing the Enchanted Starlight Chronicles album.",
      isRead: true,
      createdAt: new Date(now - 1000 * 60 * 120), // 2h ago
    },
  });

  const m2_sakura = await prisma.directMessage.create({
    data: {
      senderId: sakura.id,
      receiverId: admin.id,
      text: "Quick question: what video aspect ratio works best for loop animations on the mobile feed? Planning the next scene now!",
      isRead: true,
      createdAt: new Date(now - 1000 * 60 * 60), // 1h ago
    },
  });

  const m_byron_reply1 = await prisma.directMessage.create({
    data: {
      senderId: admin.id,
      receiverId: sakura.id,
      text: "Hey Sakura! 4:5 or 1:1 works best for feed thumbnails, and 9:16 vertical looks incredible when opened fullscreen. Excited to see what you create next!",
      isRead: true,
      replyToId: m2_sakura.id,
      createdAt: new Date(now - 1000 * 60 * 30), // 30m ago
    },
  });

  const m3_sakura = await prisma.directMessage.create({
    data: {
      senderId: sakura.id,
      receiverId: admin.id,
      text: "Perfect, thanks! I'll render the next batch in 4:5 then. Really appreciate your help with the creator setup!",
      isRead: false, // Unread
      replyToId: m_byron_reply1.id,
      createdAt: new Date(now - 1000 * 60 * 10), // 10m ago
    },
  });

  // 2. Luna -> Byron thread
  const m1_luna = await prisma.directMessage.create({
    data: {
      senderId: luna.id,
      receiverId: admin.id,
      text: "Hi Admin Byron! Thank you so much for featuring my cosplay work in the Heroines & Cosplay Showcase album! The presentation looks super sleek.",
      isRead: true,
      createdAt: new Date(now - 1000 * 60 * 180), // 3h ago
    },
  });

  const m2_luna = await prisma.directMessage.create({
    data: {
      senderId: luna.id,
      receiverId: admin.id,
      text: "I'm setting up a new Cyberpunk studio shoot next week. If you ever need high-res assets or featured photos for site promo banners, just let me know!",
      isRead: true,
      createdAt: new Date(now - 1000 * 60 * 120), // 2h ago
    },
  });

  const m_byron_reply2 = await prisma.directMessage.create({
    data: {
      senderId: admin.id,
      receiverId: luna.id,
      text: "Hey Luna! Your props and lighting are top tier. Cyberpunk always trends really well with our community—feel free to upload full resolution whenever you're ready!",
      isRead: true,
      replyToId: m2_luna.id,
      createdAt: new Date(now - 1000 * 60 * 60), // 1h ago
    },
  });

  const m3_luna = await prisma.directMessage.create({
    data: {
      senderId: luna.id,
      receiverId: admin.id,
      text: "Will do! I'll make sure to add all the proper booru tags like #cyberpunk, #cosplay, and #props.",
      isRead: false, // Unread
      replyToId: m_byron_reply2.id,
      createdAt: new Date(now - 1000 * 60 * 20), // 20m ago
    },
  });

  // 3. Hana -> Byron thread
  const m1_hana = await prisma.directMessage.create({
    data: {
      senderId: hana.id,
      receiverId: admin.id,
      text: "Hello Byron! I published the first 2 chapters of 'Whispers of the Cherry Grove' on the Manga Reader. The right-to-left reader direction works like a charm!",
      isRead: true,
      createdAt: new Date(now - 1000 * 60 * 240), // 4h ago
    },
  });

  const m2_hana = await prisma.directMessage.create({
    data: {
      senderId: hana.id,
      receiverId: admin.id,
      text: "Could you check if the cover art looks crisp on the homepage? Also wondering if creators will have the ability to schedule chapter drops in advance?",
      isRead: true,
      createdAt: new Date(now - 1000 * 60 * 120), // 2h ago
    },
  });

  const m_byron_reply3 = await prisma.directMessage.create({
    data: {
      senderId: admin.id,
      receiverId: hana.id,
      text: "Hi Hana! The cover looks gorgeous, and chapter 2 loaded smoothly on all devices. Scheduling is definitely on the roadmap for the studio tools!",
      isRead: true,
      replyToId: m2_hana.id,
      createdAt: new Date(now - 1000 * 60 * 50), // 50m ago
    },
  });

  const m3_hana = await prisma.directMessage.create({
    data: {
      senderId: hana.id,
      receiverId: admin.id,
      text: "That's wonderful to hear! Thank you for building such a great home for independent creators and artists.",
      isRead: false, // Unread
      replyToId: m_byron_reply3.id,
      createdAt: new Date(now - 1000 * 60 * 15), // 15m ago
    },
  });

  // Notifications for Byron from each user
  await prisma.notification.createMany({
    data: [
      {
        recipientId: admin.id,
        actorId: sakura.id,
        type: "message",
        text: "sent you a direct message",
        isRead: false,
        createdAt: new Date(now - 1000 * 60 * 10),
      },
      {
        recipientId: admin.id,
        actorId: luna.id,
        type: "message",
        text: "sent you a direct message",
        isRead: false,
        createdAt: new Date(now - 1000 * 60 * 20),
      },
      {
        recipientId: admin.id,
        actorId: hana.id,
        type: "message",
        text: "sent you a direct message",
        isRead: false,
        createdAt: new Date(now - 1000 * 60 * 15),
      },
    ],
  });

  console.log("Created direct message threads and notifications from Sakura, Luna, and Hana to Byron!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
