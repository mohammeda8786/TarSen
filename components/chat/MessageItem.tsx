"use client";

import { format, isToday, isYesterday, isThisYear } from "date-fns";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Trash, Trash2, Heart, Smile, ThumbsUp, AlertCircle, Check, CheckCheck, FileText, ExternalLink, Loader2, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

export function MessageItem({ message, isMe }: { message: any; isMe: boolean }) {
    const toggleReaction = useMutation(api.messages.toggleReaction);
    const deleteMessage = useMutation(api.messages.deleteMessage);
    const hideMessage = useMutation(api.messages.hideMessage);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isHiding, setIsHiding] = useState(false);

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        if (isToday(date)) return format(date, "p");
        if (isThisYear(date)) return format(date, "MMM d, p");
        return format(date, "MMM d yyyy, p");
    };

    const reactionCounts = message.reactions?.reduce((acc: Record<string, number>, r: any) => {
        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const isImage = message.type === "image";
    const isFile = message.type === "file";
    // If a message was deleted, render nothing (completely hidden)
    if (message.isDeleted) return null;
    return (
        <div className={cn("flex flex-col gap-0.5 w-full", isMe ? "items-end" : "items-start")}>
            <div className={cn(
                "max-w-[85%] sm:max-w-[70%] relative group transition-all duration-200",
                isMe ? "items-end" : "items-start"
            )}>
                {/* Reply Preview */}
                {message.replyTo && (
                    <div className={cn(
                        "mb-[-8px] px-2 pt-2 pb-3 rounded-t-xl text-xs border-l-4 bg-black/5 flex flex-col gap-0.5",
                        isMe ? "border-blue-500 mr-2 ml-4" : "border-violet-500 ml-2 mr-4"
                    )}>
                        <p className="font-bold opacity-70">
                            {message.replyTo.senderId === message.senderId ? "You" : "Other User"}
                        </p>
                        <p className="truncate opacity-60">{message.replyTo.content}</p>
                    </div>
                )}

                    <div className={cn(
                    "px-3 py-1.5 rounded-2xl shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]",
                    message.isDeleted
                        ? "bg-gray-100 text-gray-400 italic border border-gray-200"
                        : isMe
                            ? "bg-[#f2e9ff] text-[#111b21]"
                            : "bg-white text-[#111b21]"
                )}>
                    {/* Media Rendering */}
                    {isImage && message.fileUrl && (
                        <div className="mb-1 -mx-1 -mt-0.5 rounded-lg overflow-hidden border border-black/5">
                            <img src={message.fileUrl} alt="message attachment" className="max-h-60 w-full object-cover" />
                        </div>
                    )}

                    {isFile && message.fileUrl && (
                        <div className="flex items-center gap-3 bg-black/5 p-2 rounded-lg mb-1 min-w-[200px]">
                            <div className="p-2 bg-blue-500 rounded-lg text-white">
                                <FileText className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate text-[#111b21]">Document</p>
                                <a href={message.fileUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                                    View <ExternalLink className="h-2 w-2" />
                                </a>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                        {message.isDeleted ? (
                            // show a neutral background bubble placeholder for deleted messages
                            <div className={cn(
                                "rounded-2xl",
                                isMe ? "bg-gray-100 h-6 w-28" : "bg-gray-200 h-6 w-28"
                            )} />
                        ) : (
                            <>
                                <p className={cn(
                                    "text-[14.2px] leading-[19px] whitespace-pre-wrap flex-1 min-w-[60px]"
                                )}>
                                    {message.content}
                                    {message.isEdited && <span className="text-[10px] opacity-50 ml-1">(edited)</span>}
                                </p>

                                <div className="flex items-center gap-1 h-[15px] mb-[-2px] ml-auto">
                                    <span className="text-[10.5px] text-[#667781] leading-none uppercase">
                                        {formatTime(message._creationTime)}
                                    </span>
                                    {isMe && (
                                        <>
                                            <button
                                                onClick={async () => {
                                                    const ok = window.confirm("Delete this message for everyone?");
                                                    if (!ok) return;
                                                    try {
                                                        setIsDeleting(true);
                                                        await deleteMessage({ messageId: message._id });
                                                    } catch (err: any) {
                                                        console.error("Delete failed", err);
                                                        alert(err?.message || "Failed to delete message");
                                                    } finally {
                                                        setIsDeleting(false);
                                                    }
                                                }}
                                                title="Delete message for everyone"
                                                className="ml-2 p-2 rounded-full text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                                            >
                                                {isDeleting ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </button>
                                            <CheckCheck className="h-[15px] w-[15px] text-[#53bdeb] ml-1" />
                                        </>
                                    )}
                                    {/* Hide for me button visible to all users */}
                                    <button
                                        onClick={async () => {
                                            try {
                                                if (isHiding) return;
                                                setIsHiding(true);
                                                await hideMessage({ messageId: message._id });
                                            } catch (err: any) {
                                                console.error("Hide failed", err);
                                                alert(err?.message || "Failed to hide message");
                                            } finally {
                                                setIsHiding(false);
                                            }
                                        }}
                                        title="Hide message for me"
                                        className="ml-2 p-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center justify-center"
                                    >
                                        {isHiding ? <Loader2 className="h-3 w-3 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Reactions List */}
                    {reactionCounts && Object.keys(reactionCounts).length > 0 && (
                        <div className={cn(
                            "absolute -bottom-3 flex flex-wrap gap-0.5",
                            isMe ? "right-2" : "left-2"
                        )}>
                            {Object.entries(reactionCounts).map(([emoji, count]) => (
                                <span key={emoji} className="inline-flex items-center bg-white border border-gray-100 shadow-sm text-[11px] px-1 py-0.5 rounded-full select-none cursor-default hover:scale-110 transition-transform">
                                    {emoji} {Number(count) > 1 && <span className="ml-0.5 text-[#667781] font-medium">{String(count)}</span>}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions Portal (Simplified for now) */}
                {!message.isDeleted && (
                    <div className={cn(
                        "absolute -top-10 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1 bg-white border border-gray-100 shadow-xl rounded-full px-1.5 py-1 z-30",
                        isMe ? "right-0" : "left-0"
                    )}>
                        {isMe && (
                            <button
                                onClick={() => {
                                    const ok = window.confirm("Delete this message for everyone?");
                                    if (!ok) return;
                                    deleteMessage({ messageId: message._id }).catch((err) => {
                                        console.error(err);
                                        alert(err?.message || "Failed to delete message");
                                    });
                                }}
                                className="p-2 rounded-full bg-red-50 hover:bg-red-100 text-red-600 shadow-sm"
                                title="Delete for everyone"
                            >
                                <Trash className="h-4 w-4" />
                            </button>
                        )}
                        {EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => toggleReaction({ messageId: message._id, emoji })}
                                className="hover:scale-125 transition-transform p-1 text-base hover:bg-gray-50 rounded-full"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
