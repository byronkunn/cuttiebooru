import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding direct messages with media attachments to admin Byron...");

  const admin = await prisma.user.findUnique({ where: { username: "byron" } });
  const sakura = await prisma.user.findUnique({ where: { username: "sakura" } });
  const luna = await prisma.user.findUnique({ where: { username: "luna" } });
  const hana = await prisma.user.findUnique({ where: { username: "hana" } });

  if (!admin || !sakura || !luna || !hana) {
    throw new Error("Missing users. Ensure byron, sakura, luna, and hana exist.");
  }

  // Clear existing messages and notifications
  await prisma.directMessage.deleteMany({});
  await prisma.notification.deleteMany({ where: { type: "message" } });

  const now = Date.now();

  // 1. Sakura -> Byron thread (with image and video attachments)
  const m1_sakura = await prisma.directMessage.create({
    data: {
      senderId: sakura.id,
      receiverId: admin.id,
      text: "Hey Byron! The new Booru layout and theme switcher are awesome! Here is the latest character artwork I finished for the Enchanted Starlight collection:",
      mediaUrl: "/sfw/image/148a0f0eae39998a954d56c2290dc65e.png",
      mediaType: "image",
      isRead: true,
      createdAt: new Date(now - 1000 * 60 * 120),
    },
  });

  const m2_sakura = await prisma.directMessage.create({
    data: {
      senderId: sakura.id,
      receiverId: admin.id,
      text: "And here is a test preview of the animation loop! Does the video bitrate look good on your end?",
      mediaUrl: "/sfw/video/18a140f0b65bb1dfa2b7aeaff6fc366e.mp4",
      mediaType: "video",
      mediaDuration: "0:14",
      isRead: true,
      createdAt: new Date(now - 1000 * 60 * 60),
    },
  });

  const m_byron_reply1 = await prisma.directMessage.create({
    data: {
      senderId: admin.id,
      receiverId: sakura.id,
      text: "Hey Sakura! The animation runs silky smooth at 60fps! 4:5 or 1:1 works best for feed thumbnails, and 9:16 vertical looks incredible fullscreen.",
      mediaUrl: "/sfw/image/401429168df44a34b0acf9ee0da34369.png",
      mediaType: "image",
      isRead: true,
      replyToId: m2_sakura.id,
      createdAt: new Date(now - 1000 * 60 * 30),
    },
  });

  await prisma.directMessage.create({
    data: {
      senderId: sakura.id,
      receiverId: admin.id,
      text: "Perfect, thanks! I'll render the next batch in 4:5 then. Really appreciate your help with the creator setup!",
      isRead: false, // Unread
      replyToId: m_byron_reply1.id,
      createdAt: new Date(now - 1000 * 60 * 10),
    },
  });

  // 2. Luna -> Byron thread (with cosplay photo and video)
  const m1_luna = await prisma.directMessage.create({
    data: {
      senderId: luna.id,
      receiverId: admin.id,
      text: "Hi Admin Byron! Thank you so much for featuring my cosplay work in the Heroines & Cosplay Showcase album! Here's the studio shot:",
      mediaUrl: "/sfw/image/avetetsuya-studios-271773445-103012065615905-9196945532505041529-n.jpg",
      mediaType: "image",
      isRead: true,
      createdAt: new Date(now - 1000 * 60 * 180),
    },
  });

  const m2_luna = await prisma.directMessage.create({
    data: {
      senderId: luna.id,
      receiverId: admin.id,
      text: "Also check out this test footage from our nighttime neon shoot with the LED visor prop:",
      mediaUrl: "/sfw/video/1face9fa56fedfdaf2a600710e3ab977.mp4",
      mediaType: "video",
      mediaDuration: "0:12",
      isRead: true,
      createdAt: new Date(now - 1000 * 60 * 120),
    },
  });

  const m_byron_reply2 = await prisma.directMessage.create({
    data: {
      senderId: admin.id,
      receiverId: luna.id,
      text: "Hey Luna! That lighting is top tier. Cyberpunk aesthetics always trend really well with our community—feel free to upload full resolution whenever you're ready!",
      isRead: true,
      replyToId: m2_luna.id,
      createdAt: new Date(now - 1000 * 60 * 60),
    },
  });

  await prisma.directMessage.create({
    data: {
      senderId: luna.id,
      receiverId: admin.id,
      text: "Will do! I'll make sure to add all the proper booru tags like #cyberpunk, #cosplay, and #props.",
      isRead: false, // Unread
      replyToId: m_byron_reply2.id,
      createdAt: new Date(now - 1000 * 60 * 20),
    },
  });

  // 3. Hana -> Byron thread (with manga illustration and watercolor sketch)
  const m1_hana = await prisma.directMessage.create({
    data: {
      senderId: hana.id,
      receiverId: admin.id,
      text: "Hello Byron! I published chapters 1 and 2 of 'Whispers of the Cherry Grove' on the Manga Reader. Here is the color splash art:",
      mediaUrl: "/sfw/image/sample_2ccb3796c550e474c5162e781392f1aa.jpg",
      mediaType: "image",
      isRead: true,
      createdAt: new Date(now - 1000 * 60 * 240),
    },
  });

  const m2_hana = await prisma.directMessage.create({
    data: {
      senderId: hana.id,
      receiverId: admin.id,
      text: "And here is the coffee shop watercolor illustration for chapter 3! Could you check if the colors look right on the high-DPI displays?",
      mediaUrl: "/sfw/image/sample_121c05247147e27e187ec21d4903d42e.jpg",
      mediaType: "image",
      isRead: true,
      createdAt: new Date(now - 1000 * 60 * 120),
    },
  });

  const m_byron_reply3 = await prisma.directMessage.create({
    data: {
      senderId: admin.id,
      receiverId: hana.id,
      text: "Hi Hana! The watercolor textures look stunning and vibrant on Retina displays. The Manga Reader handles the RTL pages beautifully!",
      isRead: true,
      replyToId: m2_hana.id,
      createdAt: new Date(now - 1000 * 60 * 50),
    },
  });

  await prisma.directMessage.create({
    data: {
      senderId: hana.id,
      receiverId: admin.id,
      text: "That's wonderful to hear! Thank you for building such a great home for independent creators and artists.",
      isRead: false, // Unread
      replyToId: m_byron_reply3.id,
      createdAt: new Date(now - 1000 * 60 * 15),
    },
  });

  // Seed sample tag follows for Byron (e.g. following #fantasy, #cosplay, #cyberpunk)
  const tagsToFollow = ["fantasy", "cosplay", "cyberpunk"];
  for (const tName of tagsToFollow) {
    const t = await prisma.tag.findUnique({ where: { name: tName } });
    if (t) {
      await prisma.tagFollow.upsert({
        where: { userId_tagId: { userId: admin.id, tagId: t.id } },
        update: {},
        create: { userId: admin.id, tagId: t.id },
      });
    }
  }

  // Notifications for Byron
  await prisma.notification.createMany({
    data: [
      {
        recipientId: admin.id,
        actorId: sakura.id,
        type: "message",
        text: "sent you an animated video message",
        isRead: false,
        createdAt: new Date(now - 1000 * 60 * 10),
      },
      {
        recipientId: admin.id,
        actorId: luna.id,
        type: "message",
        text: "sent you a cosplay photo message",
        isRead: false,
        createdAt: new Date(now - 1000 * 60 * 20),
      },
      {
        recipientId: admin.id,
        actorId: hana.id,
        type: "message",
        text: "sent you a manga art message",
        isRead: false,
        createdAt: new Date(now - 1000 * 60 * 15),
      },
    ],
  });

  console.log("Successfully seeded messages with media attachments and tag follows!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
