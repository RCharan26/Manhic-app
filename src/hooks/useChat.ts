import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClerkAuthContext } from '@/contexts/ClerkAuthContext';
import { useToast } from '@/hooks/use-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';

const MAX_MESSAGE_LENGTH = 1000;

export interface Message {
  id: string;
  request_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: 'text' | 'image' | 'location' | 'system';
  is_read: boolean;
  created_at: string;
}

export interface ChatParticipant {
  userId: string;
  name: string | null;
  role: 'customer' | 'mechanic' | null;
  isOnline: boolean;
}

export const useChat = (requestId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState<ChatParticipant | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const { userId, fullName } = useClerkAuthContext();
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch messages and participant info
  const fetchMessages = useCallback(async () => {
    if (!requestId || !userId) return;

    try {
      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messagesData as Message[]);

      // Get the service request to find the other user
      const { data: requestData, error: requestError } = await supabase
        .from('service_requests')
        .select('customer_id, mechanic_id')
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;

      if (requestData) {
        const isCustomer = requestData.customer_id === userId;
        const otherUserId = isCustomer ? requestData.mechanic_id : requestData.customer_id;

        if (otherUserId) {
          // Fetch other user's profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('user_id', otherUserId)
            .maybeSingle();

          setOtherUser({
            userId: otherUserId,
            name: profileData?.full_name || (isCustomer ? 'Mechanic' : 'Customer'),
            role: profileData?.role || (isCustomer ? 'mechanic' : 'customer'),
            isOnline: false,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [requestId, userId]);

  // Send a message with validation
  const sendMessage = useCallback(async (content: string, type: 'text' | 'image' | 'location' = 'text') => {
    if (!requestId || !userId || !otherUser?.userId) {
      toast({
        title: "Cannot send message",
        description: "Chat session not initialized",
        variant: "destructive",
      });
      return false;
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      toast({
        title: "Cannot send empty message",
        description: "Please enter a message",
        variant: "destructive",
      });
      return false;
    }

    if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
      toast({
        title: "Message too long",
        description: `Maximum ${MAX_MESSAGE_LENGTH} characters allowed`,
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          request_id: requestId,
          sender_id: userId,
          receiver_id: otherUser.userId,
          content: trimmedContent,
          message_type: type,
        });

      if (error) throw error;
      
      // Stop typing indicator when message is sent
      setIsTyping(false);
      broadcastTyping(false);
      
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive",
      });
      return false;
    }
  }, [requestId, userId, otherUser, toast]);

  // Broadcast typing status
  const broadcastTyping = useCallback((typing: boolean) => {
    if (channelRef.current && userId) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, typing },
      });
    }
  }, [userId]);

  // Handle typing with debounce
  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      broadcastTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      broadcastTyping(false);
    }, 2000);
  }, [isTyping, broadcastTyping]);

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!requestId || !userId) return;

    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('request_id', requestId)
        .eq('receiver_id', userId)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [requestId, userId]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!requestId || !userId) return;

    fetchMessages();

    // Create channel for messages and presence
    const channel = supabase
      .channel(`chat-${requestId}`, {
        config: { presence: { key: userId } },
      })
      // Listen for new messages
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
          
          // Mark as read if we're the receiver
          if (newMessage.receiver_id === userId) {
            markAsRead();
          }
        }
      )
      // Listen for typing events
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== userId) {
          setOtherUserTyping(payload.typing);
        }
      })
      // Track presence
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const otherUserPresent = Object.keys(state).some(
          (key) => key !== userId
        );
        setOtherUser((prev) => prev ? { ...prev, isOnline: otherUserPresent } : null);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        if (key !== userId) {
          setOtherUser((prev) => prev ? { ...prev, isOnline: true } : null);
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key !== userId) {
          setOtherUser((prev) => prev ? { ...prev, isOnline: false } : null);
          setOtherUserTyping(false);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, name: fullName });
        }
      });

    channelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [requestId, userId, fullName, fetchMessages, markAsRead]);

  return {
    messages,
    loading,
    sendMessage,
    markAsRead,
    handleTyping,
    otherUser,
    otherUserTyping,
  };
};
