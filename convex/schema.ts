import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    clerkId: v.string(),
    imageUrl: v.string(),
    isOnline: v.boolean(),
    lastSeen: v.number(), // timestamp
  }).index("by_clerkId", ["clerkId"]),

  conversations: defineTable({
    name: v.optional(v.string()), // For group chats
    isGroup: v.boolean(),
    adminId: v.optional(v.id("users")),
    groupDescription: v.optional(v.string()),
    lastMessageId: v.optional(v.id("messages")),
    participantIds: v.optional(v.array(v.id("users"))), // Legacy support for schema migration
  }),

  conversationMembers: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    joinedAt: v.number(),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_userId", ["userId"])
    .index("by_conversationId_userId", ["conversationId", "userId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    type: v.optional(v.union(v.literal("text"), v.literal("image"), v.literal("file"))),
    storageId: v.optional(v.string()), // Convex storage ID
    replyToId: v.optional(v.id("messages")),
    isDeleted: v.boolean(),
    isEdited: v.optional(v.boolean()),
  }).index("by_conversationId", ["conversationId"]),

  messageReactions: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
  }).index("by_messageId", ["messageId"]),

  hiddenMessages: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
  })
    .index("by_messageId", ["messageId"]) 
    .index("by_messageId_userId", ["messageId", "userId"]) 
    .index("by_userId", ["userId"]),

  messageReads: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    conversationId: v.id("conversations"), // for easier unread count queries
    readAt: v.number(),
  })
    .index("by_messageId", ["messageId"])
    .index("by_conversationId_userId", ["conversationId", "userId"]),

  typingIndicators: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    lastUpdate: v.number(),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_conversationId_userId", ["conversationId", "userId"]),

  unreadCounts: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    count: v.number(),
  }).index("by_conversationId_userId", ["conversationId", "userId"]),
});
