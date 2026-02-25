import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const syncUser = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        clerkId: v.string(),
        imageUrl: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        console.log("Syncing user. Identity:", identity?.subject, "Args:", args.clerkId);
        if (!identity) {
            console.error("Sync failed: Not authenticated");
            throw new Error("Not authenticated");
        }

        const existingUser = await (ctx.db
            .query("users") as any)
            .withIndex("by_clerkId", (q: any) => q.eq("clerkId", args.clerkId))
            .unique();

        if (existingUser) {
            await ctx.db.patch(existingUser._id, {
                name: args.name,
                email: args.email,
                imageUrl: args.imageUrl,
                isOnline: true,
                lastSeen: Date.now(),
            });
            return existingUser._id;
        }

        const userId = await ctx.db.insert("users", {
            name: args.name,
            email: args.email,
            clerkId: args.clerkId,
            imageUrl: args.imageUrl,
            isOnline: true,
            lastSeen: Date.now(),
        });

        return userId;
    },
});

export const getUsers = query({
    args: { search: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        console.log("Getting users. Identity:", identity?.subject);
        if (!identity) return [];

        const currentUser = await (ctx.db
            .query("users") as any)
            .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
            .unique();

        let users = await ctx.db.query("users").collect();

        if (args.search) {
            const searchLower = args.search.toLowerCase();
            users = users.filter((u) => u.name.toLowerCase().includes(searchLower));
        }

        return users.filter((u) => u.clerkId !== identity.subject);
    },
});

export const updateStatus = mutation({
    args: { isOnline: v.boolean() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const user = await (ctx.db
            .query("users") as any)
            .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
            .unique();

        if (user) {
            await ctx.db.patch(user._id, {
                isOnline: args.isOnline,
                lastSeen: Date.now(),
            });
        }
    },
});

export const getMe = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        return await (ctx.db
            .query("users") as any)
            .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
            .unique();
    },
});

export const debugUsers = query({
    handler: async (ctx) => {
        return await ctx.db.query("users").collect();
    },
});
