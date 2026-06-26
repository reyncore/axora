// ── Shared domain types ──────────────────────────────────────────────────────
// Digunakan di seluruh app — server dan client.
// Semua Date diserialisasi sebagai ISO string karena melewati network boundary.

export interface UserBasic {
  id:          string
  username:    string
  displayName: string
  avatarUrl:   string | null
  isVerified:  boolean
}

export interface UserProfile extends UserBasic {
  bio:            string | null
  bannerUrl:      string | null
  createdAt:      string
  postsCount:     number
  followersCount: number
  followingCount: number
  isFollowing:    boolean
  isOwner:        boolean
}

export type MediaType = "IMAGE" | "VIDEO" | "GIF"

export interface MediaItem {
  id:   string
  url:  string
  type: MediaType
  size: number
}

export interface PostData {
  id:            string
  content:       string
  createdAt:     string
  updatedAt:     string
  parentId?:     string | null
  isLiked:       boolean
  isBookmarked?: boolean   // optional untuk backward compat — false jika tidak diset
  likesCount:    number
  commentsCount: number
  repliesCount?: number
  author:        UserBasic
  media:         MediaItem[]
  // Parent post untuk reply context (hanya di detail page)
  parent?:       ParentPost | null
  currentUserId?: string
}

// Versi ringkas dari PostData untuk parent context
export interface ParentPost {
  id:      string
  content: string
  author:  Pick<UserBasic, "username" | "displayName">
}

export interface CommentData {
  id:        string
  content:   string
  createdAt: string
  author:    UserBasic
}

export interface ReplyData extends PostData {
  parentId: string
}

export type NotificationType = "LIKE" | "COMMENT" | "FOLLOW" | "MENTION"

export interface NotificationData {
  id:        string
  type:      NotificationType
  isRead:    boolean
  createdAt: string
  actor:     Pick<UserBasic, "id" | "username" | "displayName" | "avatarUrl">
  post?:     { id: string; content: string } | null
}

// ── API response shapes ───────────────────────────────────────────────────────

export interface PaginatedMeta {
  cursor:  string | null
  hasMore: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginatedMeta
}

export interface ApiErrorPayload {
  code:     string
  message:  string
  details?: unknown
}

export interface ApiErrorResponse {
  error: ApiErrorPayload
}


// ── Direct Messages ───────────────────────────────────────────────────────────

export interface MessageData {
  id:        string
  content:   string
  senderId:  string
  createdAt: string
  readAt:    string | null
  isOwn:     boolean
}

export interface ConversationData {
  id:        string
  updatedAt: string
  otherUser: UserBasic
  lastMessage: {
    id:        string
    content:   string
    senderId:  string
    createdAt: string
    isOwn:     boolean
  } | null
  unreadCount: number
}
