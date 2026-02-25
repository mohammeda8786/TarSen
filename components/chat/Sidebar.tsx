import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Search, LogOut, User as UserIcon, MessageSquare, PlusCircle, MoreVertical, Filter } from "lucide-react";
import { useAuth, UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { format, isToday, isThisYear } from "date-fns";

export function Sidebar({
    onSelectUser,
    selectedUserId,
    selectedConversationId
}: {
    onSelectUser: (id: string, isConversation?: boolean) => void;
    selectedUserId?: string;
    selectedConversationId?: string;
}) {
    const [search, setSearch] = useState("");
    const users = useQuery(api.users.getUsers, { search });
    const conversations = useQuery(api.conversations.getConversations);

    const formatLastMessageTime = (timestamp: number) => {
        const date = new Date(timestamp);
        if (isToday(date)) return format(date, "h:mm a");
        if (isThisYear(date)) return format(date, "MMM d");
        return format(date, "dd/MM/yy");
    };

    return (
        <div className="flex flex-col h-full w-full bg-white border-r border-[#d1d7db] overflow-hidden">
            {/* Sidebar Header */}
            <div className="px-4 py-2.5 bg-[#f0f2f5] flex items-center justify-between">
                <div className="flex items-center">
                    <UserButton />
                </div>
                <div className="flex items-center gap-2 text-[#54656f]">
                    <button className="p-2 hover:bg-black/5 rounded-full transition-colors" title="New Community">
                        <PlusCircle className="h-6 w-6" />
                    </button>
                    <button className="p-2 hover:bg-black/5 rounded-full transition-colors" title="New Chat">
                        <MessageSquare className="h-6 w-6" />
                    </button>
                    <button className="p-2 hover:bg-black/5 rounded-full transition-colors">
                        <MoreVertical className="h-6 w-6" />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="p-2 flex items-center gap-2">
                <div className="flex-1 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 h-full flex items-center">
                        <Search className="h-4 w-4 text-[#54656f]" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search or start new chat"
                        className="w-full pl-12 pr-4 py-1.5 bg-[#f0f2f5] border-none rounded-lg text-[15px] text-[#111b21] placeholder-[#667781] outline-none focus:ring-0"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button className="p-1 hover:bg-black/5 rounded-full text-[#54656f]">
                    <Filter className="h-5 w-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Conversations List */}
                {!search && conversations && conversations.length > 0 && conversations.map((conv) => (
                    <button
                        key={conv._id}
                        onClick={() => onSelectUser(conv._id, true)}
                        className={cn(
                            "w-full flex items-center gap-3 p-3 transition-colors border-b border-[#f0f2f5]",
                            selectedConversationId === conv._id ? "bg-[#f0f2f5]" : "hover:bg-[#f5f6f6]"
                        )}
                    >
                        <div className="relative flex-shrink-0">
                            <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                                {conv.isGroup ? (
                                    <div className="bg-emerald-100 w-full h-full flex items-center justify-center">
                                        <UserIcon className="h-6 w-6 text-emerald-600" />
                                    </div>
                                ) : (
                                    <img
                                        src={conv.otherUser?.imageUrl}
                                        alt=""
                                        className="h-full w-full object-cover"
                                    />
                                )}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0 pr-1">
                            <div className="flex items-center justify-between mb-0.5">
                                <h3 className="text-[17px] font-normal text-[#111b21] truncate">
                                    {conv.isGroup ? conv.name : conv.otherUser?.name}
                                </h3>
                                <span className={cn(
                                    "text-[12px]",
                                    conv.unreadCount > 0 ? "text-[#00a884] font-medium" : "text-[#667781]"
                                )}>
                                    {conv.lastMessage && formatLastMessageTime(conv.lastMessage._creationTime)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-[14px] text-[#667781] truncate">
                                    {conv.lastMessage?.content || "No messages yet"}
                                </p>
                                {conv.unreadCount > 0 && (
                                    <span className="bg-[#25d366] text-white text-[12px] font-semibold h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center">
                                        {conv.unreadCount}
                                    </span>
                                )}
                            </div>
                        </div>
                    </button>
                ))}

                {/* Search / Discover */}
                {(search || (conversations && conversations.length === 0)) && (
                    <div className="divide-y divide-[#f0f2f5]">
                        {users?.map((user) => (
                            <button
                                key={user._id}
                                onClick={() => onSelectUser(user._id, false)}
                                className={cn(
                                    "w-full flex items-center gap-3 p-3 transition-colors",
                                    selectedUserId === user._id ? "bg-[#f0f2f5]" : "hover:bg-[#f5f6f6]"
                                )}
                            >
                                <img
                                    src={user.imageUrl}
                                    alt=""
                                    className="h-12 w-12 rounded-full object-cover"
                                />
                                <div className="flex-1 text-left min-w-0">
                                    <h3 className="text-[17px] font-normal text-[#111b21] truncate">{user.name}</h3>
                                    <p className="text-[14px] text-[#667781] truncate">
                                        {user.isOnline ? "Online" : "Hey there! I am using WhatsApp."}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
