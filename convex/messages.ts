import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";

export const send = mutation({
    args: {
        conversationId: v.id("conversations"),
        content: v.string(),
        type: v.union(v.literal("text"), v.literal("image"), v.literal("file")),
        storageId: v.optional(v.string()),
        replyToId: v.optional(v.id("messages")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) throw new Error("User not found");

        const messageId = await ctx.db.insert("messages", {
            conversationId: args.conversationId,
            senderId: user._id,
            content: args.content,
            type: args.type,
            storageId: args.storageId,
            replyToId: args.replyToId,
            isDeleted: false,
        });

        // Update last message in conversation
        await ctx.db.patch(args.conversationId, {
            lastMessageId: messageId,
        });

        // Update unread counts for other participants
        const members = await ctx.db
            .query("conversationMembers")
            .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
            .collect();

        for (const member of members) {
            if (member.userId !== user._id) {
                const unread = await ctx.db
                    .query("unreadCounts")
                    .withIndex("by_conversationId_userId", (q) =>
                        q.eq("conversationId", args.conversationId).eq("userId", member.userId)
                    )
                    .unique();

                if (unread) {
                    await ctx.db.patch(unread._id, { count: unread.count + 1 });
                } else {
                    await ctx.db.insert("unreadCounts", {
                        conversationId: args.conversationId,
                        userId: member.userId,
                        count: 1,
                    });
                }
            }
        }

        return messageId;
    },
});

export const list = query({
    args: {
        conversationId: v.id("conversations"),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const messagesPage = await ctx.db
            .query("messages")
            .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
            .order("desc")
            .paginate(args.paginationOpts);

        return {
            ...messagesPage,
            page: await Promise.all(
                messagesPage.page.map(async (msg) => {
                    const reactions = await ctx.db
                        .query("messageReactions")
                        .withIndex("by_messageId", (q) => q.eq("messageId", msg._id))
                        .collect();

                    let fileUrl = null;
                    if (msg.storageId) {
                        fileUrl = await ctx.storage.getUrl(msg.storageId);
                    }

                    let replyTo = null;
                    if (msg.replyToId) {
                        replyTo = await ctx.db.get(msg.replyToId);
                    }

                    return {
                        ...msg,
                        reactions,
                        fileUrl,
                        replyTo,
                    };
                })
            ),
        };
    },
});

export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});

export const deleteMessage = mutation({
    args: { messageId: v.id("messages") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        const message = await ctx.db.get(args.messageId);
        if (!message || message.senderId !== user?._id) {
            throw new Error("Unauthorized");
        }

        await ctx.db.patch(args.messageId, {
            content: "This message was deleted",
            isDeleted: true,
        });
    },
});

export const toggleReaction = mutation({
    args: { messageId: v.id("messages"), emoji: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) throw new Error("User not found");

        // Enforce one reaction per user per message. If the user already reacted:
        // - with the same emoji: remove (toggle off)
        // - with a different emoji: update to the new emoji (show last used)
        // Collect any reactions this user has on the message (may be multiple
        // if old data allowed it). We'll handle duplicates safely:
        // - if a reaction with the same emoji exists -> remove it (toggle off)
        // - else -> update the first found to the new emoji and remove any extras
        const existingByUser = await ctx.db
            .query("messageReactions")
            .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
            .filter((q) => q.eq(q.field("userId"), user._id))
            .collect();

        if (existingByUser.length > 0) {
            // If there's an exact match, delete that one (toggle off)
            const exact = existingByUser.find((r: any) => r.emoji === args.emoji);
            if (exact) {
                await ctx.db.delete(exact._id);
                // cleanup any other duplicates just in case
                for (const dup of existingByUser) {
                    if (dup._id !== exact._id) await ctx.db.delete(dup._id);
                }
            } else {
                // No exact match: update first record to new emoji and delete the rest
                const first = existingByUser[0];
                await ctx.db.patch(first._id, { emoji: args.emoji });
                for (let i = 1; i < existingByUser.length; i++) {
                    await ctx.db.delete(existingByUser[i]._id);
                }
            }
        } else {
            await ctx.db.insert("messageReactions", {
                messageId: args.messageId,
                userId: user._id,
                emoji: args.emoji,
            });
        }
    },
});

export const editMessage = mutation({
    args: { messageId: v.id("messages"), content: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        const message = await ctx.db.get(args.messageId);
        if (!message || message.senderId !== user?._id) {
            throw new Error("Unauthorized");
        }

        await ctx.db.patch(args.messageId, {
            content: args.content,
            isEdited: true,
        });
    },
});

export const markRead = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) return;

        const unread = await ctx.db
            .query("unreadCounts")
            .withIndex("by_conversationId_userId", (q) =>
                q.eq("conversationId", args.conversationId).eq("userId", user._id)
            )
            .unique();

        if (unread) {
            await ctx.db.patch(unread._id, { count: 0 });
        }
    },
});

export const setTyping = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) return;

        const existing = await ctx.db
            .query("typingIndicators")
            .withIndex("by_conversationId_userId", (q) =>
                q.eq("conversationId", args.conversationId).eq("userId", user._id)
            )
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, { lastUpdate: Date.now() });
        } else {
            await ctx.db.insert("typingIndicators", {
                conversationId: args.conversationId,
                userId: user._id,
                lastUpdate: Date.now(),
            });
        }
    },
});

export const getTyping = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const threshold = Date.now() - 3000; // 3 seconds ago
        const typing = await ctx.db
            .query("typingIndicators")
            .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
            .collect();

        const activeTyping = typing.filter((t) => t.lastUpdate > threshold);

        let currentUserId: any = null;
        if (identity) {
            const user = await ctx.db
                .query("users")
                .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
                .unique();
            currentUserId = user?._id;
        }

        return await Promise.all(
            activeTyping
                .filter((t) => t.userId !== currentUserId)
                .map(async (t) => {
                    const user = await ctx.db.get(t.userId);
                    return user?.name || "Unknown";
                })
        );
    },
});
