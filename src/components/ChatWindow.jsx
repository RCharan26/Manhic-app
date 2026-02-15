import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@clerk/clerk-react";

/**
 * ChatWindow props:
 * - requestId: string (UUID or id matching messages.request_id)
 */
export default function ChatWindow({ requestId }) {
  const { getToken, userId: clerkUserId } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!requestId) return;
    let mounted = true;

    const loadMessages = async () => {
      setLoading(true);
      try {
        // Try to fetch messages via edge function if available
        const fnUrl = `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || ""}/secure-messaging-get`;
        console.log("Loading messages from:", fnUrl, "for request:", requestId);
        
        if (fnUrl) {
          const token = await getToken();
          console.log("Got token for loading:", token ? token.substring(0, 20) + "..." : "null");
          
          if (!token) {
            console.warn("No token available for loading messages");
          } else {
            const resp = await fetch(fnUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ request_id: requestId }),
            });
            console.log("Load messages response status:", resp.status);
            
            if (resp.ok) {
              const json = await resp.json();
              console.log("Loaded messages:", json.messages?.length || 0);
              if (mounted) setMessages(json.messages || []);
              setLoading(false);
              setTimeout(scrollToBottom, 100);
              return;
            } else {
              const errData = await resp.json().catch(() => ({}));
              console.error("Failed to load messages:", errData);
            }
          }
        }

        // Fallback: fetch directly from Supabase (requires Supabase Auth/RLS setup)
        console.log("Using fallback: fetching from Supabase directly");
        const { data, error } = await supabase
          .from("messages")
          .select("id, request_id, sender_id, message, created_at")
          .eq("request_id", requestId)
          .order("created_at", { ascending: true });
        if (error) throw error;
        if (mounted) setMessages(data || []);
      } catch (err) {
        console.error("Failed to fetch messages", err);
      } finally {
        setLoading(false);
        scrollToBottom();
      }
    };

    loadMessages();

    // Subscribe to realtime inserts for this request
    const channel = supabase.channel(`public:messages:request=${requestId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `request_id=eq.${requestId}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => String(m.id) === String(payload.new.id))) return prev;
            return [...prev, payload.new];
          });
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [requestId, getToken]);

  const scrollToBottom = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  };

  const sendMessage = async () => {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    if (!requestId) return;

    try {
      // Use Edge Function for secure writes (validates Clerk token)
      const fnUrl = `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || ""}/secure-messaging`;
      console.log("Sending message to:", fnUrl, "for request:", requestId);
      
      const token = await getToken();
      console.log("Got token:", token ? token.substring(0, 20) + "..." : "null");
      
      if (!token) {
        throw new Error("No authentication token available");
      }
      
      if (fnUrl) {
        const resp = await fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ request_id: requestId, message: trimmed }),
        });
        
        console.log("Response status:", resp.status);
        
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: "Unknown error" }));
          console.error("Server error:", err);
          throw new Error(err?.error || err?.message || "Failed to send message");
        }
        
        const result = await resp.json();
        console.log("Message sent successfully:", result);
        
        // Edge function inserts; realtime will deliver the new message
        setText("");
        setTimeout(scrollToBottom, 100);
        return;
      }

      // Fallback: direct insert (requires Supabase Auth RLS)
      const { data, error } = await supabase.from("messages").insert({ request_id: requestId, sender_id: clerkUserId, message: trimmed });
      if (error) throw error;
      setText("");
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error("Send message error:", err);
      alert("Failed to send message: " + err.message);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border rounded-md shadow-sm">
      <div className="px-4 py-2 border-b">
        <h3 className="text-sm font-semibold">Chat</h3>
        <p className="text-xs text-muted-foreground">Messages for request {requestId}</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-sm text-muted-foreground">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground">No messages yet</div>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_id === clerkUserId;
            return (
              <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-lg ${isMine ? "bg-primary text-white" : "bg-gray-100 text-gray-900"}`}>
                  <div className="text-sm whitespace-pre-wrap">{m.message}</div>
                  <div className="text-xs text-muted-foreground mt-1 text-right">{new Date(m.created_at).toLocaleString()}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-4 py-2 border-t">
        <div className="flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a message..."
            className="flex-1 min-h-[44px] max-h-36 px-3 py-2 border rounded resize-none focus:outline-none"
          />
          <button
            className="ml-2 px-4 py-2 bg-primary text-white rounded disabled:opacity-50"
            onClick={sendMessage}
            disabled={!text.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
