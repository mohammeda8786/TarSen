"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";

export function SyncUser() {
    const { user, isLoaded: identityLoaded } = useUser();
    const { getToken } = useAuth();
    const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
    const syncUser = useMutation(api.users.syncUser);

    useEffect(() => {
        const checkToken = async () => {
            const token = await getToken({ template: "convex" });
            console.log("SyncUser Diagnostic:", {
                identityLoaded,
                hasUser: !!user,
                isAuthenticated,
                hasToken: !!token
            });

            if (identityLoaded && user && isAuthenticated) {
                console.log("Attempting to sync user:", user.id);
                syncUser({
                    name: user.fullName || user.username || "Anonymous",
                    email: user.primaryEmailAddress?.emailAddress || "",
                    clerkId: user.id,
                    imageUrl: user.imageUrl,
                });
            }
        };

        checkToken();
    }, [identityLoaded, user, isAuthenticated, syncUser, getToken]);

    return null;
}
