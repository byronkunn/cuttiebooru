import { PrismaClient } from "@prisma/client";
import { scrypt as scryptCallback, randomBytes } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);
const prisma = new PrismaClient();

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${key.toString("hex")}`;
}

async function main() {
  console.log("Seeding 4 creator accounts and uploading SFW content...");

  const passwordHash = await hashPassword("Killcartman22@");

  // 1. Clean existing posts, albums, comments, comics, dms to ensure clean state
  await prisma.postTag.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.collectionItem.deleteMany({});
  await prisma.collection.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.directMessage.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.chapterComment.deleteMany({});
  await prisma.comicPage.deleteMany({});
  await prisma.comicChapter.deleteMany({});
  await prisma.comicFollow.deleteMany({});
  await prisma.readingProgress.deleteMany({});
  await prisma.comicSeries.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.album.deleteMany({});
  await prisma.follow.deleteMany({});

  // 2. Define the 4 accounts (Byron as Admin + 3 Creators = 4 accounts, plus Hana)
  const accountsData = [
    {
      id: "user_byron",
      username: "byron",
      displayName: "Byron",
      email: "byronm71@gmail.com",
      bio: "Site Administrator & Owner of Cuttiebooru. Anime collector, digital curator, and archiving enthusiast.",
      avatarUrl: "/sfw/avatar/0738955ca929985f39921b4876053170.png",
      headerUrl: "/sfw/banner-image/sample_0a026d6456f6806f67a9d67f856e8862.jpg",
      websiteUrl: "https://cuttiebooru.art/@byron",
      niche: "Cute Art",
      role: "admin",
      isCreator: true,
      isVerified: true,
      isModerator: true,
      featured: true,
      spotlightQuote: "Welcome to Cuttiebooru — discover, archive, and share anime & cosplay art.",
      allowDMs: "everyone",
    },
    {
      id: "user_sakura",
      username: "sakura",
      displayName: "Sakura Star",
      email: "sakura@cuttiebooru.art",
      bio: "Digital anime illustrator & fantasy character designer. Specializing in vibrant magical girls and detailed armor.",
      avatarUrl: "/sfw/avatar/fa238b1ca4a1cc8f2f0fe1625a4dd295.png",
      headerUrl: "/sfw/banner-image/sample_1186719173244242bce471e4476a266e.jpg",
      websiteUrl: "https://cuttiebooru.art/@sakura",
      niche: "Cute Art",
      role: "creator",
      isCreator: true,
      isVerified: true,
      isModerator: false,
      featured: true,
      spotlightQuote: "Illustrating anime characters with vibrant colors and rich textures.",
      allowDMs: "everyone",
    },
    {
      id: "user_luna",
      username: "luna",
      displayName: "Luna Velvet",
      email: "luna@cuttiebooru.art",
      bio: "Cosplayer, prop maker & 3D character sculptor. Bringing video game and anime heroines into real life.",
      avatarUrl: "/sfw/avatar/sample_07acb23be6e4bea15d091117693849b2.jpg",
      headerUrl: "/sfw/banner-image/sample_1ebf418432111a9530b3287dc96b9410.jpg",
      websiteUrl: "https://cuttiebooru.art/@luna",
      niche: "Cosplay",
      role: "creator",
      isCreator: true,
      isVerified: true,
      isModerator: false,
      featured: true,
      spotlightQuote: "Capturing cosplay aesthetics, 3D sculpts, and character animations.",
      allowDMs: "everyone",
    },
    {
      id: "user_hana",
      username: "hana",
      displayName: "Hana Bloom",
      email: "hana@cuttiebooru.art",
      bio: "Manga artist & story author. Creating serialized romantic comedy and fantasy manga chapters.",
      avatarUrl: "/sfw/avatar/sample_1cc3b7361bda35f6bf0f78d8cb47640f.jpg",
      headerUrl: "/sfw/banner-image/sample_25eb2815b78288a5b6b97431e6086882.jpg",
      websiteUrl: "https://cuttiebooru.art/@hana",
      niche: "Cute Art",
      role: "creator",
      isCreator: true,
      isVerified: true,
      isModerator: false,
      featured: true,
      spotlightQuote: "Weekly manga sketches and serialized webcomic stories.",
      allowDMs: "everyone",
    },
  ];

  for (const acc of accountsData) {
    await prisma.user.upsert({
      where: { username: acc.username },
      update: {
        displayName: acc.displayName,
        bio: acc.bio,
        avatarUrl: acc.avatarUrl,
        headerUrl: acc.headerUrl,
        websiteUrl: acc.websiteUrl,
        niche: acc.niche,
        role: acc.role,
        isCreator: acc.isCreator,
        isVerified: acc.isVerified,
        isModerator: acc.isModerator,
        featured: acc.featured,
        spotlightQuote: acc.spotlightQuote,
        allowDMs: acc.allowDMs,
        passwordHash,
      },
      create: {
        id: acc.id,
        username: acc.username,
        displayName: acc.displayName,
        email: acc.email,
        bio: acc.bio,
        avatarUrl: acc.avatarUrl,
        headerUrl: acc.headerUrl,
        websiteUrl: acc.websiteUrl,
        niche: acc.niche,
        role: acc.role,
        isCreator: acc.isCreator,
        isVerified: acc.isVerified,
        isModerator: acc.isModerator,
        featured: acc.featured,
        spotlightQuote: acc.spotlightQuote,
        allowDMs: acc.allowDMs,
        passwordHash,
      },
    });
  }

  // Follow relationships between accounts
  const follows = [
    { follower: "user_sakura", following: "user_byron" },
    { follower: "user_luna", following: "user_byron" },
    { follower: "user_hana", following: "user_byron" },
    { follower: "user_byron", following: "user_sakura" },
    { follower: "user_byron", following: "user_luna" },
    { follower: "user_byron", following: "user_hana" },
    { follower: "user_sakura", following: "user_luna" },
    { follower: "user_luna", following: "user_sakura" },
    { follower: "user_hana", following: "user_sakura" },
  ];
  for (const f of follows) {
    await prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId: f.follower,
          followingId: f.following,
        },
      },
      update: { approved: true },
      create: {
        followerId: f.follower,
        followingId: f.following,
        approved: true,
      },
    });
  }

  // 3. Create Albums
  const albumSakura = await prisma.album.create({
    data: {
      id: "album_sakura_fantasy",
      title: "Enchanted Starlight Chronicles",
      description: "Collection of magical girls, fantasy pinups, and ethereal pastel character art.",
      coverUrl: "/sfw/image/148a0f0eae39998a954d56c2290dc65e.png",
      category: "Cute Art",
      creatorId: "user_sakura",
    },
  });

  const albumLuna = await prisma.album.create({
    data: {
      id: "album_luna_cosplay",
      title: "Heroines & Cosplay Showcase",
      description: "Handcrafted armor, photography studio captures, and character cosplay.",
      coverUrl: "/sfw/image/avetetsuya-studios-271773445-103012065615905-9196945532505041529-n.jpg",
      category: "Cosplay",
      creatorId: "user_luna",
    },
  });

  const albumHana = await prisma.album.create({
    data: {
      id: "album_hana_manga",
      title: "Twilight Blossom Artwork",
      description: "Original manga character illustrations and conceptual drawings.",
      coverUrl: "/sfw/image/sample_2ccb3796c550e474c5162e781392f1aa.jpg",
      category: "Cute Art",
      creatorId: "user_hana",
    },
  });

  const albumByron = await prisma.album.create({
    data: {
      id: "album_byron_vault",
      title: "Administrator's Curated Selection",
      description: "Featured community masterpieces, high-resolution anime art, and archival prints.",
      coverUrl: "/sfw/image/401429168df44a34b0acf9ee0da34369.png",
      category: "Cute Art",
      creatorId: "user_byron",
    },
  });

  // 4. Create Posts with real SFW images and videos
  const postsData = [
    // --- SAKURA'S POSTS ---
    {
      title: "Starlight Guardian - Radiant Aurora",
      description: "Original character illustration depicting a celestial guardian invoking sacred starlight.",
      mediaUrl: "/sfw/image/148a0f0eae39998a954d56c2290dc65e.png",
      thumbnailUrl: "/sfw/image/148a0f0eae39998a954d56c2290dc65e.png",
      mediaType: "image",
      category: "Cute Art",
      rating: "sfw",
      creatorId: "user_sakura",
      albumId: albumSakura.id,
      views: 524,
      featured: true,
      tags: ["fantasy", "magical_girl", "solo", "pinup", "illustration", "digital_art"],
    },
    {
      title: "Moonlight Serenade Princess",
      description: "Detailed character portrait with intricate lace attire and soft ambient twilight glow.",
      mediaUrl: "/sfw/image/b77813157c9f6e1ee90ac783fadf868a.png",
      thumbnailUrl: "/sfw/image/b77813157c9f6e1ee90ac783fadf868a.png",
      mediaType: "image",
      category: "Cute Art",
      rating: "sfw",
      creatorId: "user_sakura",
      albumId: albumSakura.id,
      views: 412,
      featured: false,
      tags: ["romance", "gothic", "solo", "pinup", "dress", "long_hair"],
    },
    {
      title: "Ethereal Maiden Animation Loop",
      description: "Smooth 60fps anime animation showcasing wind dynamics and flowing cape aesthetics.",
      mediaUrl: "/sfw/video/18a140f0b65bb1dfa2b7aeaff6fc366e.mp4",
      thumbnailUrl: "/sfw/image/sample_37ae46bfbb6ab04233f8b225aeee56db.jpg",
      mediaType: "video",
      videoDuration: "0:14",
      category: "Cute Art",
      rating: "sfw",
      creatorId: "user_sakura",
      albumId: albumSakura.id,
      views: 890,
      featured: true,
      tags: ["animation", "video", "loop", "fantasy", "magical_girl"],
    },
    {
      title: "Crystal Bloom Sorceress",
      description: "Character concept artwork showcasing elemental crystal magic and shimmering particles.",
      mediaUrl: "/sfw/image/sample_110e5127c38f53042f29a4dc3b2acdc1.jpg",
      thumbnailUrl: "/sfw/image/sample_110e5127c38f53042f29a4dc3b2acdc1.jpg",
      mediaType: "image",
      category: "Cute Art",
      rating: "sfw",
      creatorId: "user_sakura",
      albumId: albumSakura.id,
      views: 318,
      featured: false,
      tags: ["fantasy", "magic", "dress", "solo", "blonde_hair"],
    },

    // --- LUNA'S POSTS (COSPLAY & 3D) ---
    {
      title: "Gothic Blade Master Cosplay",
      description: "Studio photoshoot of the custom battle-worn blade and handcrafted leather armor vest.",
      mediaUrl: "/sfw/image/avetetsuya-studios-271773445-103012065615905-9196945532505041529-n.jpg",
      thumbnailUrl: "/sfw/image/avetetsuya-studios-271773445-103012065615905-9196945532505041529-n.jpg",
      mediaType: "image",
      category: "Cosplay",
      rating: "sfw",
      creatorId: "user_luna",
      albumId: albumLuna.id,
      views: 742,
      featured: true,
      tags: ["cosplay", "action", "armor", "sword", "gothic", "photography"],
    },
    {
      title: "Cyber City Operative Cosplay Video",
      description: "Nighttime neon location shoot featuring functional LED accents and visor prop.",
      mediaUrl: "/sfw/video/1face9fa56fedfdaf2a600710e3ab977.mp4",
      thumbnailUrl: "/sfw/image/sample_29416423e2bad115abcd148625416902.jpg",
      mediaType: "video",
      videoDuration: "0:12",
      category: "Cosplay",
      rating: "sfw",
      creatorId: "user_luna",
      albumId: albumLuna.id,
      views: 1120,
      featured: true,
      tags: ["video", "cosplay", "cyberpunk", "futuristic", "action"],
    },
    {
      title: "Desert Wanderer Character Study",
      description: "Atmospheric cosplay photography capturing natural windblown fabrics and weathered props.",
      mediaUrl: "/sfw/image/i-m-potatoes-yana-gaisina-photo-2026-09-11-12-38-56.jpg",
      thumbnailUrl: "/sfw/image/i-m-potatoes-yana-gaisina-photo-2026-09-11-12-38-56.jpg",
      mediaType: "image",
      category: "Cosplay",
      rating: "sfw",
      creatorId: "user_luna",
      albumId: albumLuna.id,
      views: 630,
      featured: false,
      tags: ["cosplay", "adventure", "fantasy", "photography", "cloak"],
    },
    {
      title: "Steampunk Scout Field Gear",
      description: "Detailed prop work showcase with brass gears, leather harness, and custom goggles.",
      mediaUrl: "/sfw/image/pavel-yankovich-01.jpg",
      thumbnailUrl: "/sfw/image/pavel-yankovich-01.jpg",
      mediaType: "image",
      category: "Cosplay",
      rating: "sfw",
      creatorId: "user_luna",
      albumId: albumLuna.id,
      views: 450,
      featured: false,
      tags: ["cosplay", "steampunk", "photography", "costume", "boots"],
    },

    // --- HANA'S POSTS (MANGA & ANIME ART) ---
    {
      title: "After-School Sunset Walk",
      description: "Warm golden-hour school hallway illustration with nostalgic slice-of-life composition.",
      mediaUrl: "/sfw/image/sample_2ccb3796c550e474c5162e781392f1aa.jpg",
      thumbnailUrl: "/sfw/image/sample_2ccb3796c550e474c5162e781392f1aa.jpg",
      mediaType: "image",
      category: "Cute Art",
      rating: "sfw",
      creatorId: "user_hana",
      albumId: albumHana.id,
      views: 680,
      featured: true,
      tags: ["slice_of_life", "school_uniform", "sunset", "romance", "solo"],
    },
    {
      title: "Rainy Cafe Sketchbook Page",
      description: "Detailed watercolor style illustration of a cozy Tokyo coffee shop during an autumn rain.",
      mediaUrl: "/sfw/image/sample_121c05247147e27e187ec21d4903d42e.jpg",
      thumbnailUrl: "/sfw/image/sample_121c05247147e27e187ec21d4903d42e.jpg",
      mediaType: "image",
      category: "Cute Art",
      rating: "sfw",
      creatorId: "user_hana",
      albumId: albumHana.id,
      views: 395,
      featured: false,
      tags: ["coffee", "rain", "slice_of_life", "relaxing", "scenery"],
    },
    {
      title: "Sakura Breeze Character Animation",
      description: "Animated scene featuring gentle cherry blossom petals falling over a peaceful courtyard.",
      mediaUrl: "/sfw/video/229b9b57de824b80107afe4080a5882f.mp4",
      thumbnailUrl: "/sfw/image/sample_395efbc9b59fea87768a4a2e73eea947.jpg",
      mediaType: "video",
      videoDuration: "0:16",
      category: "Cute Art",
      rating: "sfw",
      creatorId: "user_hana",
      albumId: albumHana.id,
      views: 940,
      featured: true,
      tags: ["video", "animation", "cherry_blossoms", "nature", "peaceful"],
    },
    {
      title: "Festival Kimono Maiden",
      description: "Traditional festival attire with floral patterns, ornate hairpins, and paper fan.",
      mediaUrl: "/sfw/image/sample_3a1cef0a2f73e70cd3d2165a88ab9d78.jpg",
      thumbnailUrl: "/sfw/image/sample_3a1cef0a2f73e70cd3d2165a88ab9d78.jpg",
      mediaType: "image",
      category: "Cute Art",
      rating: "sfw",
      creatorId: "user_hana",
      albumId: albumHana.id,
      views: 510,
      featured: false,
      tags: ["kimono", "traditional", "festival", "japanese_clothes", "solo"],
    },

    // --- BYRON'S CURATED POSTS ---
    {
      title: "Valkyrie Sovereign - High Resolution Master",
      description: "Featured archival masterpiece illustrating the celestial Valkyrie ascending into the heavens.",
      mediaUrl: "/sfw/image/401429168df44a34b0acf9ee0da34369.png",
      thumbnailUrl: "/sfw/image/401429168df44a34b0acf9ee0da34369.png",
      mediaType: "image",
      category: "Cute Art",
      rating: "sfw",
      creatorId: "user_byron",
      albumId: albumByron.id,
      views: 1450,
      featured: true,
      tags: ["fantasy", "armor", "wings", "valkyrie", "epic", "illustration"],
    },
    {
      title: "Cyberpunk District 9 Motion Graphic",
      description: "Dynamic visual loop exploring futuristic holographic advertisements and night rain reflections.",
      mediaUrl: "/sfw/video/44d9e05ae428e68f96afc440d2cf269b.mp4",
      thumbnailUrl: "/sfw/image/sample_4c9fc7b8bd126c0947d9a9846087527f.jpg",
      mediaType: "video",
      videoDuration: "0:15",
      category: "Indie",
      rating: "sfw",
      creatorId: "user_byron",
      albumId: albumByron.id,
      views: 1280,
      featured: true,
      tags: ["video", "cyberpunk", "futuristic", "animation", "scenery"],
    },
    {
      title: "Neon Cybernetic Assassin",
      description: "High-contrast digital speedpainting focusing on edge lighting and mechanical enhancements.",
      mediaUrl: "/sfw/image/sample_42940c99aa9def7fb257c9bd94071b85.jpg",
      thumbnailUrl: "/sfw/image/sample_42940c99aa9def7fb257c9bd94071b85.jpg",
      mediaType: "image",
      category: "Indie",
      rating: "sfw",
      creatorId: "user_byron",
      albumId: albumByron.id,
      views: 820,
      featured: false,
      tags: ["cyberpunk", "sci-fi", "cyborg", "neon", "digital_art"],
    },
    {
      title: "Celestial Shrine Guardian",
      description: "Spiritual shrine maiden surrounded by mystical spirits under a glowing moonlit sky.",
      mediaUrl: "/sfw/image/c78dc13197ac708d3b6726cff49785eb.jpg",
      thumbnailUrl: "/sfw/image/c78dc13197ac708d3b6726cff49785eb.jpg",
      mediaType: "image",
      category: "Cute Art",
      rating: "sfw",
      creatorId: "user_byron",
      albumId: albumByron.id,
      views: 970,
      featured: true,
      tags: ["fantasy", "shrine_maiden", "miko", "traditional", "magic"],
    },
  ];

  for (const p of postsData) {
    const post = await prisma.post.create({
      data: {
        title: p.title,
        description: p.description,
        mediaUrl: p.mediaUrl,
        thumbnailUrl: p.thumbnailUrl,
        galleryUrls: JSON.stringify([p.mediaUrl]),
        filesCount: 1,
        mediaType: p.mediaType,
        videoDuration: p.videoDuration || "",
        category: p.category,
        rating: p.rating,
        views: p.views,
        featured: p.featured,
        creatorId: p.creatorId,
        uploaderId: p.creatorId,
        albumId: p.albumId,
      },
    });

    for (const tagName of p.tags) {
      const tag = await prisma.tag.upsert({
        where: { name: tagName },
        update: { usageCount: { increment: 1 } },
        create: {
          name: tagName,
          displayName: tagName.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
          category: "general",
          description: `Booru tag for #${tagName}`,
          usageCount: 1,
        },
      });

      await prisma.postTag.upsert({
        where: {
          postId_tagId: { postId: post.id, tagId: tag.id },
        },
        update: {},
        create: {
          postId: post.id,
          tagId: tag.id,
        },
      });
    }

    // Add some favorites from other accounts
    const otherUsers = accountsData.filter((a) => a.id !== p.creatorId);
    if (otherUsers.length > 0) {
      await prisma.favorite.create({
        data: {
          userId: otherUsers[0].id,
          postId: post.id,
        },
      });
    }
    if (otherUsers.length > 1 && p.featured) {
      await prisma.favorite.create({
        data: {
          userId: otherUsers[1].id,
          postId: post.id,
        },
      });
    }

    // Add comments from other creators
    if (p.featured) {
      await prisma.comment.create({
        data: {
          postId: post.id,
          authorId: otherUsers[0].id,
          content: "The colors and composition here are absolutely stunning! Beautiful work.",
        },
      });
    }
  }

  // 5. Create a Comic Series in the Manga section for Hana
  const comicSeries = await prisma.comicSeries.create({
    data: {
      title: "Whispers of the Cherry Grove",
      description: "A gentle romantic comedy following two art students who discover a hidden magical courtyard on campus.",
      coverUrl: "/sfw/image/sample_2ccb3796c550e474c5162e781392f1aa.jpg",
      genres: "Romance, Slice of Life, Comedy",
      tags: "school_life, romance, cute, cherry_blossoms",
      direction: "rtl",
      status: "ongoing",
      creatorId: "user_hana",
      chapters: {
        create: [
          {
            title: "Chapter 1: The First Blossom",
            number: 1,
            published: true,
            pages: {
              create: [
                { position: 0, url: "/sfw/image/sample_2ccb3796c550e474c5162e781392f1aa.jpg" },
                { position: 1, url: "/sfw/image/sample_121c05247147e27e187ec21d4903d42e.jpg" },
                { position: 2, url: "/sfw/image/sample_3a1cef0a2f73e70cd3d2165a88ab9d78.jpg" },
              ],
            },
          },
          {
            title: "Chapter 2: After the Rain",
            number: 2,
            published: true,
            pages: {
              create: [
                { position: 0, url: "/sfw/image/sample_110e5127c38f53042f29a4dc3b2acdc1.jpg" },
                { position: 1, url: "/sfw/image/b77813157c9f6e1ee90ac783fadf868a.png" },
              ],
            },
          },
        ],
      },
    },
    include: { chapters: true },
  });

  // Byron and Sakura follow Hana's comic series
  await prisma.comicFollow.create({
    data: {
      seriesId: comicSeries.id,
      userId: "user_byron",
    },
  });
  await prisma.comicFollow.create({
    data: {
      seriesId: comicSeries.id,
      userId: "user_sakura",
    },
  });

  console.log("Successfully seeded 4 accounts and populated site with rich SFW media!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

