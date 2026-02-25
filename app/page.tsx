"use client";

import { Sidebar } from "@/components/chat/Sidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
// using image from public/ for Tars branding

export default function Home() {
  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const getOrCreate = useMutation(api.conversations.getOrCreateConversation);

  const handleSelectUser = async (id: string, isConversation?: boolean) => {
    if (isConversation) {
      setSelectedConversationId(id as Id<"conversations">);
      setSelectedUserId(null); // Clear selected user ID if picking a conversation
    } else {
      setSelectedUserId(id);
      const convId = await getOrCreate({ participantId: id as Id<"users"> });
      setSelectedConversationId(convId);
    }
  };

  return (
    <main className="flex h-screen w-full bg-[#f0f2f5] overflow-hidden">
      {/* Sidebar */}
      <div className={`${selectedConversationId ? 'hidden md:block' : 'block'} w-full md:w-[400px] flex-shrink-0 h-full z-20`}>
        <Sidebar
          onSelectUser={handleSelectUser}
          selectedUserId={selectedUserId || undefined}
          selectedConversationId={selectedConversationId || undefined}
        />
      </div>

      {/* Chat Area */}
      <div className={`${selectedConversationId ? 'block' : 'hidden md:flex'} flex-1 h-full bg-[#efeae2] relative`}>
        {selectedConversationId ? (
          <div className="flex flex-col h-full relative">
            <button
              onClick={() => setSelectedConversationId(null)}
              className="md:hidden absolute left-4 top-2 z-30 p-2 bg-transparent rounded-full text-[#54656f] hover:bg-black/5"
            >
              ←
            </button>
            <ChatArea conversationId={selectedConversationId} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#f0f2f5] border-l border-[#d1d7db]">
            <div className="h-24 w-24 bg-violet-100 rounded-full flex items-center justify-center mb-6 overflow-hidden">
              <img src="/download.png" alt="Tars" className="h-16 w-auto" />
            </div>
            <h1 className="text-3xl font-light text-[#41525d] mb-4">Tars-Chat Web</h1>
            <p className="text-[#667781] max-w-sm mx-auto text-[14px] leading-relaxed">
              Send and receive messages without keeping your phone online. Use Tars-Chat on up to 4 linked devices and 1 phone at the same time.
            </p>
            <div className="mt-auto py-8 text-[14px] text-[#8696a0] flex items-center gap-1.5 justify-center opacity-60">
              <span>🔒 End-to-end encrypted</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
