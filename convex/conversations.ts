import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getOrCreateConversation = mutation({
    args: { participantId: v.id("users") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) throw new Error("User not found");
        if (currentUser._id === args.participantId) throw new Error("Cannot chat with yourself");

        // Find common DM
        const myMemberships = await ctx.db
            .query("conversationMembers")
            .withIndex("by_userId", (q) => q.eq("userId", currentUser._id))
            .collect();

        for (const membership of myMemberships) {
            const conv = await ctx.db.get(membership.conversationId);
            if (conv && !conv.isGroup) {
                const otherMember = await ctx.db
                    .query("conversationMembers")
                    .withIndex("by_conversationId_userId", (q) =>
                        q.eq("conversationId", conv._id).eq("userId", args.participantId)
                    )
                    .unique();
                if (otherMember) return conv._id;
            }
        }

        // Create new conversation
        const conversationId = await ctx.db.insert("conversations", {
            isGroup: false,
        });

        await ctx.db.insert("conversationMembers", {
            conversationId,
            userId: currentUser._id,
            joinedAt: Date.now(),
        });

        await ctx.db.insert("conversationMembers", {
            conversationId,
            userId: args.participantId,
            joinedAt: Date.now(),
        });

        return conversationId;
    },
});

export const createGroup = mutation({
    args: {
        name: v.string(),
        participantIds: v.array(v.id("users")),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) throw new Error("User not found");

        const conversationId = await ctx.db.insert("conversations", {
            name: args.name,
            isGroup: true,
            adminId: user._id,
            groupDescription: args.description,
        });

        const allParticipants = [...new Set([...args.participantIds, user._id])];
        for (const userId of allParticipants) {
            await ctx.db.insert("conversationMembers", {
                conversationId,
                userId,
                joinedAt: Date.now(),
            });
        }

        return conversationId;
    },
});

export const getConversations = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) return [];

        const memberships = await ctx.db
            .query("conversationMembers")
            .withIndex("by_userId", (q) => q.eq("userId", user._id))
            .collect();

        const results = await Promise.all(
            memberships.map(async (membership) => {
                const conv = await ctx.db.get(membership.conversationId);
                if (!conv) return null;

                let otherUser = null;
                if (!conv.isGroup) {
                    const otherMembership = await ctx.db
                        .query("conversationMembers")
                        .withIndex("by_conversationId", (q) => q.eq("conversationId", conv._id))
                        .collect();
                    const otherUserId = otherMembership.find(m => m.userId !== user._id)?.userId;
                    if (otherUserId) {
                        const u = await ctx.db.get(otherUserId);
                        if (u) {
                            const ONLINE_THRESHOLD = 60_000;
                            u.isOnline = (u.lastSeen && Date.now() - u.lastSeen < ONLINE_THRESHOLD) || false;
                        }
                        otherUser = u;
                    } else {
                        otherUser = null;
                    }
                }

                const lastMessage = conv.lastMessageId
                    ? await ctx.db.get(conv.lastMessageId)
                    : null;

                const unreadCount = await (ctx.db
                    .query("unreadCounts") as any)
                    .withIndex("by_conversationId_userId", (q: any) =>
                        q.eq("conversationId", conv._id).eq("userId", user._id)
                    )
                    .unique();

                return {
                    ...conv,
                    otherUser,
                    lastMessage,
                    unreadCount: unreadCount?.count || 0,
                };
            })
        );

        return (results.filter(Boolean) as any[]).sort((a, b) => {
            const aTime = (a as any).lastMessage?._creationTime || (a as any)._creationTime;
            const bTime = (b as any).lastMessage?._creationTime || (b as any)._creationTime;
            return bTime - aTime;
        });
    },
});
