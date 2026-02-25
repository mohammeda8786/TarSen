import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useRef } from "react";
import { Send, MoreVertical, Paperclip, Smile, X, Image as ImageIcon, File as FileIcon, Loader2 } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { MessageItem } from "@/components/chat/MessageItem";
import { cn } from "@/lib/utils";

export function ChatArea({ conversationId }: { conversationId: Id<"conversations"> }) {
    const [content, setContent] = useState("");
    const [replyingTo, setReplyingTo] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const [previewFile, setPreviewFile] = useState<{ url: string; type: "image" | "file"; file: File } | null>(null);

    const { results: messages, status, loadMore } = usePaginatedQuery(
        api.messages.list,
        { conversationId },
        { initialNumItems: 30 }
    );

    const conversation = useQuery(api.conversations.getConversations)?.find(c => c._id === conversationId);
    const typingUsers = useQuery(api.messages.getTyping, { conversationId });
    const send = useMutation(api.messages.send);
    const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
    const markRead = useMutation(api.messages.markRead);
    const setTyping = useMutation(api.messages.setTyping);
    const currentUser = useQuery(api.users.getMe);

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);

    useEffect(() => {
        if (!content.trim()) return;
        const timeout = setTimeout(() => {
            setTyping({ conversationId });
        }, 500);
        return () => clearTimeout(timeout);
    }, [content, conversationId, setTyping]);

    useEffect(() => {
        markRead({ conversationId });
    }, [conversationId, markRead]);

    useEffect(() => {
        if (isAtBottom && messages && messages.length > 0) {
            scrollRef.current?.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [messages, isAtBottom]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isImg = file.type.startsWith("image/");
        setPreviewFile({
            url: URL.createObjectURL(file),
            type: isImg ? "image" : "file",
            file
        });
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() && !previewFile) return;

        setUploading(true);
        let storageId = undefined;
        let type: "text" | "image" | "file" = "text";

        if (previewFile) {
            const postUrl = await generateUploadUrl();
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": previewFile.file.type },
                body: previewFile.file,
            });
            const { storageId: sId } = await result.json();
            storageId = sId;
            type = previewFile.type;
        }

        await send({
            conversationId,
            content: content.trim() || (type === "image" ? "📷 Image" : "📄 File"),
            type,
            storageId,
            replyToId: replyingTo?._id,
        });

        setContent("");
        setPreviewFile(null);
        setReplyingTo(null);
        setUploading(false);
        setIsAtBottom(true);
    };

    if (!currentUser) return null;

    return (
        <div className="flex-1 flex flex-col h-full bg-[#efeae2] relative overflow-hidden">
            {/* Header */}
            <div className="px-4 py-2 border-b flex items-center justify-between bg-[#f0f2f5] z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden border border-gray-200">
                        {conversation?.otherUser?.imageUrl ? (
                            <img src={conversation.otherUser.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <img src="/download.png" alt="Tars" className="h-5 w-5 text-gray-500" />
                        )}
                    </div>
                    <div className="flex flex-col">
                        <h2 className="font-semibold text-[#111b21] leading-tight">
                            {conversation?.isGroup ? conversation.name : conversation?.otherUser?.name || "Chat"}
                        </h2>
                        {typingUsers && typingUsers.length > 0 ? (
                            <p className="text-[11px] text-[#7c3aed] font-medium leading-tight">
                                {typingUsers.join(", ")} is typing...
                            </p>
                        ) : (
                            <p className="text-[11px] text-[#667781] leading-tight flex items-center gap-1">
                                {conversation?.otherUser?.isOnline ? (
                                    <span className="text-[#7c3aed]">online</span>
                                ) : "offline"}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-black/5 rounded-full text-[#54656f]">
                        <MoreVertical className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                onScroll={(e) => {
                    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                    setIsAtBottom(scrollHeight - scrollTop <= clientHeight + 100);
                    if (scrollTop < 100 && status === "CanLoadMore") loadMore(20);
                }}
                className="flex-1 overflow-y-auto p-4 sm:px-10 md:px-20 space-y-2 flex flex-col-reverse custom-scrollbar"
                style={{
                    backgroundImage: `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`,
                    backgroundBlendMode: "overlay",
                    backgroundColor: "#efeae2"
                }}
            >
                <div className="h-2" /> {/* Bottom spacer */}

                {messages?.map((msg) => (
                    <div key={msg._id} onDoubleClick={() => setReplyingTo(msg)}>
                        <MessageItem
                            message={msg}
                            isMe={msg.senderId === currentUser._id}
                        />
                    </div>
                ))}

                {!messages && status === "LoadingFirstPage" && (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-[#667781]" />
                    </div>
                )}

                {status === "LoadingMore" && (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-[#667781]" />
                    </div>
                )}
            </div>

            {/* Composer Container */}
            <div className="flex flex-col bg-[#f0f2f5] border-t">
                {/* Reply Preview in Composer */}
                {replyingTo && (
                    <div className="px-4 py-2 border-l-4 border-[#7c3aed] bg-white/50 flex items-center justify-between m-2 rounded-lg">
                        <div className="flex flex-col py-1 overflow-hidden">
                            <span className="text-xs font-bold text-[#7c3aed]">
                                Replying to {replyingTo.senderId === currentUser._id ? "yourself" : "contact"}
                            </span>
                            <span className="text-xs text-[#667781] truncate">{replyingTo.content}</span>
                        </div>
                        <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-black/5 rounded-full">
                            <X className="h-4 w-4 text-[#667781]" />
                        </button>
                    </div>
                )}

                {/* File Preview */}
                {previewFile && (
                    <div className="p-3 m-2 bg-white rounded-lg shadow-sm relative group max-w-xs border border-gray-200">
                        {previewFile.type === "image" ? (
                            <img src={previewFile.url} alt="upload preview" className="h-32 w-full object-cover rounded-md" />
                        ) : (
                            <div className="flex items-center gap-2 p-2">
                                <FileIcon className="h-8 w-8 text-blue-500" />
                                <span className="text-xs font-medium truncate">{previewFile.file.name}</span>
                            </div>
                        )}
                        <button
                            onClick={() => setPreviewFile(null)}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-md"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                )}

                <div className="p-3 flex items-center gap-2">
                    <div className="flex gap-1">
                        <input
                            type="file"
                            hidden
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="image/*,application/pdf,application/msword,text/plain"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-[#54656f] hover:bg-black/5 rounded-full transition-colors"
                        >
                            <Paperclip className="h-6 w-6" />
                        </button>
                        <button type="button" className="p-2 text-[#54656f] hover:bg-black/5 rounded-full transition-colors">
                            <Smile className="h-6 w-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSend} className="flex-1 flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Type a message"
                            className="flex-1 bg-white rounded-lg px-4 py-2.5 text-[15px] text-[#111b21] placeholder-[#667781] outline-none border-none shadow-sm"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            disabled={uploading}
                        />
                        <button
                            type="submit"
                            disabled={(!content.trim() && !previewFile) || uploading}
                            className="p-2.5 text-[#54656f] hover:bg-black/5 rounded-full transition-all disabled:opacity-30"
                        >
                            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6" />}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

