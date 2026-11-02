/** Shared tag categories and starter vocabulary. Ratings remain a separate post field. */
export const TAG_CATEGORIES = [
  { id: "franchise", label: "Franchises" },
  { id: "character", label: "Characters" },
  { id: "genre", label: "Genres & Themes" },
  { id: "clothing", label: "Clothing" },
  { id: "pose", label: "Poses" },
  { id: "activity", label: "Activities" },
  { id: "appearance", label: "Appearance" },
  { id: "anatomy", label: "Anatomy" },
  { id: "setting", label: "Settings" },
  { id: "content", label: "Content" },
  { id: "meta", label: "Media & Meta" },
  { id: "general", label: "General" },
] as const;
export type TagCategory = (typeof TAG_CATEGORIES)[number]["id"];

const vocabulary: Record<TagCategory, string[]> = {
  // 40 Anime Franchises from the last 10 years (2014-2026)
  franchise: [
    "frieren_beyond_journeys_end",
    "jujutsu_kaisen",
    "demon_slayer",
    "chainsaw_man",
    "bocchi_the_rock",
    "spy_x_family",
    "oshi_no_ko",
    "my_hero_academia",
    "re_zero",
    "mushoku_tensei",
    "cyberpunk_edgerunners",
    "lycoris_recoil",
    "kaguya_sama_love_is_war",
    "attack_on_titan",
    "my_dress_up_darling",
    "fate_grand_order",
    "konosuba",
    "the_eminence_in_shadow",
    "delicious_in_dungeon",
    "solo_leveling",
    "overlord",
    "sword_art_online",
    "darling_in_the_franxx",
    "bunny_girl_senpai",
    "hololive",
    "genshin_impact",
    "honkai_star_rail",
    "zenless_zone_zero",
    "blue_archive",
    "nier_automata",
    "dandadan",
    "violet_evergarden",
    "mob_psycho_100",
    "hells_paradise",
    "tokyo_ghoul",
    "made_in_abyss",
    "kill_la_kill",
    "bleach_tybw",
    "heavenly_delusion",
    "akame_ga_kill",
  ],
  // Prominent characters from the 40 series
  character: [
    // Frieren
    "frieren", "fern", "stark", "ubel",
    // Jujutsu Kaisen
    "nobara_kugisaki", "maki_zenin", "satoru_gojo", "megumi_fushiguro", "ryomen_sukuna",
    // Demon Slayer
    "nezuko_kamado", "shinobu_kocho", "mitsuri_kanroji", "kanao_tsuyuri", "tanjiro_kamado",
    // Chainsaw Man
    "makima", "power_(chainsaw_man)", "reze", "kobeni_higashiyama", "denji",
    // Bocchi the Rock
    "hitori_gotoh", "nijika_ijichi", "ryo_yamada", "ikuyo_kita",
    // Spy x Family
    "yor_forger", "anya_forger", "loid_forger", "fiona_frost",
    // Oshi no Ko
    "ai_hoshino", "ruby_hoshino", "kana_arima", "akane_kurokawa",
    // My Hero Academia
    "ochaco_uraraka", "tsuyu_asui", "momo_yaoyorozu", "himiko_toga", "mirko",
    // Re:Zero
    "rem_(re_zero)", "ram_(re_zero)", "emilia_(re_zero)", "echidna_(re_zero)",
    // Mushoku Tensei
    "roxy_migurdia", "eris_boreas_greyrat", "sylphiette", "ghislaine_dedoldia",
    // Cyberpunk Edgerunners
    "lucy_(cyberpunk)", "rebecca_(cyberpunk)", "kiwi_(cyberpunk)", "david_martinez",
    // Lycoris Recoil
    "chisato_nishikigi", "takina_inoue",
    // Kaguya-sama
    "kaguya_shinomiya", "chika_fujiwara", "miko_iino", "ai_hayasaka",
    // Attack on Titan
    "mikasa_ackerman", "annie_leonhart", "historia_reiss", "sasha_blouse", "levi_ackerman",
    // My Dress-Up Darling
    "marin_kitagawa", "sajuna_inui",
    // Fate
    "artoria_pendragon", "mash_kyrielight", "jeanne_d_arc", "scathach_(fate)", "rin_tohsaka", "astolfo",
    // KonoSuba
    "megumin", "aqua_(konosuba)", "darkness_(konosuba)", "wiz_(konosuba)",
    // The Eminence in Shadow
    "alpha_(eminence)", "beta_(eminence)", "delta_(eminence)", "alexia_midgar",
    // Delicious in Dungeon
    "marcelle_donato", "falin_touden",
    // Solo Leveling
    "cha_hae_in", "sung_jin_woo",
    // Overlord
    "albedo_(overlord)", "shalltear_bloodfallen", "narberal_gamma",
    // Sword Art Online
    "asuna_yuuki", "sinon", "alice_zuberg",
    // Darling in the Franxx
    "zero_two", "ichigo_(ditf)",
    // Bunny Girl Senpai
    "mai_sakurajima", "tomoe_koga", "rio_futaba",
    // Hololive / VTuber
    "gawr_gura", "houshou_marine", "usada_pekora", "hoshimachi_suisei", "mori_calliope",
    // Genshin Impact
    "raiden_shogun", "yae_miko", "ganyu", "hu_tao", "yelan", "furina",
    // Honkai Star Rail
    "kafka_(star_rail)", "firefly_(star_rail)", "silver_wolf", "march_7th", "acheron",
    // Zenless Zone Zero
    "ellen_joe", "nicole_demara", "zhu_yuan", "jane_doe_(zzz)",
    // Blue Archive
    "shiroko_(blue_archive)", "yuuka_hayase", "asuna_ichinose", "karin_kakudate", "hina_sorasaki",
    // Nier: Automata
    "2b", "a2", "9s", "commander_white",
    // Dandadan
    "momo_ayase", "seiko_ayase", "ken_takakura_okarun",
    // Violet Evergarden
    "violet_evergarden_(character)",
    // Mob Psycho 100
    "shigeo_kageyama", "arataka_reigen",
    // Hell's Paradise
    "sagiri_yamada_asaemon", "yuzuriha",
    // Tokyo Ghoul
    "touka_kirishima", "rize_kamishiro", "ken_kaneki",
    // Made in Abyss
    "riko_(made_in_abyss)", "nanachi", "ozen",
    // Kill la Kill
    "ryuko_matoi", "satsuki_kiryuin", "mako_mankanshoku",
    // Bleach TYBW
    "rukia_kuchiki", "yoruichi_shihoin", "rangiku_matsumoto", "orihime_inoue", "bambietta_basterbine",
    // Heavenly Delusion
    "kiruko", "mimihime",
    // Akame ga Kill
    "esdeath", "akame", "sheele", "leone",
  ],
  // 20 Booru Genres & Themes
  genre: [
    "pinup", "boudoir", "gravure", "fantasy", "science_fiction", "cyberpunk",
    "action", "romance", "comedy", "slice_of_life", "supernatural", "gothic",
    "magical_girl", "mecha", "isekai", "horror", "mystery", "psychological",
    "adventure", "parody"
  ],
  // 37 Booru Clothing & Outfit Tags
  clothing: [
    "thighhighs", "stockings", "lingerie", "bikini", "swimsuit", "one_piece_swimsuit",
    "bunny_suit", "maid", "corset", "latex", "fishnets", "panties", "bra",
    "underwear", "school_uniform", "sailor_uniform", "bodysuit", "dress",
    "skirt", "miniskirt", "pleated_skirt", "crop_top", "open_shirt", "sweater",
    "oversized_shirt", "kimono", "yukata", "armor", "high_heels", "boots",
    "gloves", "choker", "collar", "ribbon", "garter_belt", "thong", "micro_bikini"
  ],
  // 24 Booru Poses
  pose: [
    "looking_at_viewer", "standing", "sitting", "kneeling", "lying", "on_back",
    "on_stomach", "all_fours", "from_behind", "from_above", "from_below",
    "side_pose", "crossed_legs", "arms_up", "hands_on_hips", "arching_back",
    "looking_back", "bending_over", "straddling", "spread_legs", "close_up",
    "full_body", "portrait", "dynamic_pose"
  ],
  // 23 Booru Activities & Actions
  activity: [
    "posing", "taking_selfie", "dancing", "bathing", "swimming", "kissing",
    "hugging", "sleeping", "eating", "drinking", "walking", "running",
    "fighting", "stretching", "undressing", "adjusting_clothes", "holding_weapon",
    "winking", "finger_to_mouth", "masturbation", "sex", "oral_sex", "foreplay"
  ],
  // 35 Booru Appearance Tags
  appearance: [
    "long_hair", "short_hair", "twintails", "ponytail", "braid", "ahoge",
    "blonde_hair", "black_hair", "brown_hair", "silver_hair", "white_hair",
    "blue_hair", "pink_hair", "red_hair", "green_hair", "purple_hair",
    "blue_eyes", "red_eyes", "green_eyes", "brown_eyes", "heterochromia",
    "horns", "wings", "pointy_ears", "elf", "kitsune", "cat_ears", "succubus",
    "animal_ears", "tail", "fang", "blush", "glasses", "tattoo", "freckles"
  ],
  // 21 Booru Anatomy Tags
  anatomy: [
    "cleavage", "midriff", "navel", "breasts", "large_breasts", "medium_breasts",
    "small_breasts", "buttocks", "thighs", "thick_thighs", "collarbone",
    "bare_shoulders", "bare_legs", "bare_feet", "abs", "muscular", "curvy",
    "hourglass_figure", "curvaceous", "slender", "adult_woman"
  ],
  // 22 Booru Settings & Backgrounds
  setting: [
    "indoors", "outdoors", "bedroom", "bed", "bathroom", "shower", "bath",
    "onsen", "beach", "pool", "classroom", "school", "city", "street",
    "forest", "nature", "night", "daytime", "sunset", "neon_lights",
    "simple_background", "white_background"
  ],
  // 20 SFW, Ecchi, & Explicit 18+ Content Tags
  content: [
    "sfw", "ecchi", "nsfw", "18+", "nudity", "partial_nudity", "implied_nude",
    "uncensored", "censored", "topless", "bottomless", "completely_nude",
    "areola", "nipples", "cleavage_cutout", "see-through", "wet_clothes",
    "cameltoe", "lewd", "adult_content"
  ],
  // 21 Booru Media & Metadata Tags
  meta: [
    "image", "video", "animated", "gif", "highres", "4k", "absurdres",
    "2d_illustration", "3d_render", "digital_painting", "photography",
    "photoshoot", "cosplay", "comic", "manga", "webcomic", "official_art",
    "fanart", "original_work", "monochrome", "colored"
  ],
  // 20 General Booru Tags
  general: [
    "solo", "duo", "group", "1girl", "2girls", "3girls", "multiple_girls",
    "1boy", "female_focus", "male_focus", "yuri", "hetero", "original_character",
    "weapon", "multiple_views", "wet", "sweat", "food", "flower", "water"
  ],
};

export const STARTER_TAGS = TAG_CATEGORIES.flatMap(({ id }) => vocabulary[id].map(name => ({
  name,
  displayName: name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
  category: id,
  description: `${id.toUpperCase()} tag for ${name.replace(/_/g, " ")}`,
  trending: [
    "18+", "ecchi", "sfw", "thighhighs", "lingerie", "corset", "bikini",
    "bunny_suit", "succubus", "2b", "tifa_lockhart", "genshin_impact",
    "cyberpunk_2077", "looking_at_viewer", "solo", "video", "animated", "highres", "4k"
  ].includes(name),
})));
export const TAG_CATEGORY_IDS = new Set<string>(TAG_CATEGORIES.map(c => c.id));

export interface TagStyle {
  text: string;
  bg: string;
  border: string;
  badge: string;
  hover: string;
  solid: string;
}

export function getTagCategoryStyle(category?: string | null): TagStyle {
  switch (category) {
    case "franchise":
      return {
        text: "text-purple-400",
        bg: "bg-purple-500/15",
        border: "border-purple-500/30",
        badge: "bg-purple-500/20 text-purple-300 border-purple-500/40",
        hover: "hover:bg-purple-500/25",
        solid: "bg-purple-600 text-white",
      };
    case "character":
      return {
        text: "text-emerald-400",
        bg: "bg-emerald-500/15",
        border: "border-emerald-500/30",
        badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        hover: "hover:bg-emerald-500/25",
        solid: "bg-emerald-600 text-white",
      };
    case "genre":
      return {
        text: "text-indigo-400",
        bg: "bg-indigo-500/15",
        border: "border-indigo-500/30",
        badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
        hover: "hover:bg-indigo-500/25",
        solid: "bg-indigo-600 text-white",
      };
    case "clothing":
      return {
        text: "text-cyan-400",
        bg: "bg-cyan-500/15",
        border: "border-cyan-500/30",
        badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
        hover: "hover:bg-cyan-500/25",
        solid: "bg-cyan-600 text-white",
      };
    case "pose":
      return {
        text: "text-amber-400",
        bg: "bg-amber-500/15",
        border: "border-amber-500/30",
        badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        hover: "hover:bg-amber-500/25",
        solid: "bg-amber-600 text-white",
      };
    case "activity":
      return {
        text: "text-orange-400",
        bg: "bg-orange-500/15",
        border: "border-orange-500/30",
        badge: "bg-orange-500/20 text-orange-300 border-orange-500/40",
        hover: "hover:bg-orange-500/25",
        solid: "bg-orange-600 text-white",
      };
    case "content":
      return {
        text: "text-rose-400",
        bg: "bg-rose-500/20",
        border: "border-rose-500/40",
        badge: "bg-rose-500/25 text-rose-300 border-rose-500/50",
        hover: "hover:bg-rose-500/30",
        solid: "bg-rose-600 text-white",
      };
    case "meta":
      return {
        text: "text-blue-400",
        bg: "bg-blue-500/15",
        border: "border-blue-500/30",
        badge: "bg-blue-500/20 text-blue-300 border-blue-500/40",
        hover: "hover:bg-blue-500/25",
        solid: "bg-blue-600 text-white",
      };
    case "appearance":
    case "anatomy":
      return {
        text: "text-pink-400",
        bg: "bg-pink-500/15",
        border: "border-pink-500/30",
        badge: "bg-pink-500/20 text-pink-300 border-pink-500/40",
        hover: "hover:bg-pink-500/25",
        solid: "bg-pink-600 text-white",
      };
    case "setting":
      return {
        text: "text-teal-400",
        bg: "bg-teal-500/15",
        border: "border-teal-500/30",
        badge: "bg-teal-500/20 text-teal-300 border-teal-500/40",
        hover: "hover:bg-teal-500/25",
        solid: "bg-teal-600 text-white",
      };
    default:
      return {
        text: "text-zinc-300",
        bg: "bg-white/5",
        border: "border-white/10",
        badge: "bg-white/10 text-zinc-300 border-white/15",
        hover: "hover:bg-white/10",
        solid: "bg-zinc-700 text-white",
      };
  }
}
