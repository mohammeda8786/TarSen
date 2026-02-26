"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function OnlineStatus() {
    const updateStatus = useMutation(api.users.updateStatus);
    const heartbeat = useRef<number | null>(null);

    useEffect(() => {
        // mark online on mount
        updateStatus({ isOnline: true });

        const handleVisibility = () => {
            if (document.hidden) {
                updateStatus({ isOnline: false });
            } else {
                updateStatus({ isOnline: true });
            }
        };

        const handleBeforeUnload = () => {
            updateStatus({ isOnline: false });
        };

        document.addEventListener("visibilitychange", handleVisibility);
        window.addEventListener("beforeunload", handleBeforeUnload);

        // periodic heartbeat to refresh lastSeen
        heartbeat.current = window.setInterval(() => {
            updateStatus({ isOnline: true });
        }, 30000);

        return () => {
            if (heartbeat.current) clearInterval(heartbeat.current);
            document.removeEventListener("visibilitychange", handleVisibility);
            window.removeEventListener("beforeunload", handleBeforeUnload);
            updateStatus({ isOnline: false });
        };
    }, [updateStatus]);

    return null;
}
