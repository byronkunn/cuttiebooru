export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string | null;
  bio: string;
  avatarUrl: string;
  headerUrl: string;
  websiteUrl: string;
  socialLinks: string;
  niche: string;
  isCreator: boolean;
  isVerified: boolean;
  isModerator: boolean;
  role?: "admin" | "moderator" | "creator" | "user" | string;
  isBanned?: boolean;
  featured: boolean;
  spotlightQuote: string;
  notifyFollows: boolean;
  notifyFavorites: boolean;
  privateProfile: boolean;
  showCollections?: boolean;
  showFavorites?: boolean;
  allowDMs?: "everyone" | "followers" | "none" | string;
  createdAt: string;
  _count?: {
    createdPosts: number;
    followers: number;
    following: number;
    albums: number;
  };
}

export interface FollowRelation {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
  approved: boolean;
  follower: User;
  following: User;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  mediaUrl: string;
  mediaType: "" | "image" | "video" | "voice" | "sticker" | string;
  mediaDuration: string;
  replyToId?: string | null;
  forwardedFromId?: string | null;
  reactions: string; // JSON object: { "❤️": ["user_hana"] }
  isPinned: boolean;
  isEdited: boolean;
  isRead: boolean;
  selfDestructSec: number;
  createdAt: string;
  sender: User;
  receiver: User;
  replyTo?: DirectMessage | null;
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  actorId: string;
  type:
    | "like"
    | "follow"
    | "mention"
    | "collection_save"
    | "tag_approved"
    | "message"
    | string;
  postId?: string | null;
  comicSeriesId?: string | null;
  text: string;
  isRead: boolean;
  createdAt: string;
  actor: User;
  post?: Post | null;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  includedTags: string;
  excludedTags: string;
  mediaType: string;
  rating: string;
  alertsEnabled: boolean;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  displayName: string;
  category: string;
  description: string;
  usageCount: number;
  trending: boolean;
  _count?: {
    posts: number;
  };
}

export interface PostTag {
  id: string;
  postId: string;
  tagId: string;
  tag: Tag;
}

export interface TagSuggestion {
  id: string;
  postId: string;
  tagName: string;
  tagCategory: string;
  suggestedById: string;
  status: string;
  createdAt: string;
  suggestedBy?: User;
  post?: Post;
}

export interface Album {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  category: string;
  creatorId: string;
  createdAt: string;
  creator: User;
  posts?: Post[];
  _count?: {
    posts: number;
  };
}

export interface Post {
  id: string;
  title: string;
  description: string;
  mediaUrl: string;
  thumbnailUrl: string;
  galleryUrls: string;
  filesCount: number;
  mediaType: "image" | "video" | string;
  videoDuration: string;
  aspectRatio: string;
  category: string;
  rating?: "sfw" | "questionable" | "explicit" | string;
  sourceUrl: string;
  attribution: string;
  permissionConfirmed: boolean;
  views: number;
  featured: boolean;
  creatorId: string;
  uploaderId: string;
  albumId?: string | null;
  createdAt: string;
  creator: User;
  uploader?: User;
  album?: Album | null;
  tags: PostTag[];
  tagSuggestions?: TagSuggestion[];
  comments?: Comment[];
  _count: {
    favorites: number;
    collectionItems?: number;
    comments?: number;
  };
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: User;
}

export interface CollectionItem {
  id: string;
  collectionId: string;
  postId?: string | null;
  albumId?: string | null;
  creatorId?: string | null;
  orderIndex: number;
  addedAt: string;
  post?: Post | null;
  album?: Album | null;
  creator?: User | null;
}

export interface Collection {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  isPublic: boolean;
  isCurated: boolean;
  badgeText: string;
  ownerId: string;
  createdAt: string;
  owner: User;
  items: CollectionItem[];
  _count?: {
    items: number;
  };
}

export interface Report {
  id: string;
  targetType: string;
  postId?: string | null;
  reportedUserId?: string | null;
  reporterId?: string | null;
  reason: string;
  details: string;
  contactEmail: string;
  status: string;
  createdAt: string;
  post?: Post | null;
  reportedUser?: User | null;
  reporter?: User | null;
}

export interface SearchLog {
  id: string;
  query: string;
  resultsCount: number;
  createdAt: string;
}

export interface ModerationData {
  reports: Report[];
  tagSuggestions: TagSuggestion[];
  searchLogs: SearchLog[];
  metrics: {
    totalPosts: number;
    totalViews: number;
    totalFavorites: number;
    totalFollows: number;
    activeCreators: number;
    zeroResultSearches: SearchLog[];
  };
}

export interface ComicPageItem {
  id: string;
  chapterId: string;
  position: number;
  url: string;
}

export interface ChapterCommentItem {
  id: string;
  chapterId: string;
  authorId: string;
  content: string;
  reaction?: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    isVerified?: boolean;
    role?: string;
  };
}

export interface ComicChapterItem {
  id: string;
  seriesId: string;
  title: string;
  number: number;
  published: boolean;
  publishedAt?: string | null;
  createdAt: string;
  pages: ComicPageItem[];
  comments?: ChapterCommentItem[];
}

export interface ComicSeriesItem {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  genres: string;
  tags: string;
  direction: "rtl" | "ltr" | "vertical" | string;
  status: "ongoing" | "completed" | string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  creator: User;
  chapters?: ComicChapterItem[];
  _count?: {
    chapters: number;
    follows: number;
  };
}

export interface ComicReadingProgress {
  chapterId: string;
  page: number;
}

export interface ContinueReadingItem {
  id: string;
  seriesId: string;
  chapterId: string;
  page: number;
  updatedAt: string;
  series: ComicSeriesItem;
  chapter: ComicChapterItem;
}
