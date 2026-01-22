import React, { useState, useEffect, useRef } from 'react';
import { Message, Room, User } from '../types';
import { sendMessage, getRoom } from '../services/api';
import { useSSE } from '../hooks/useSSE';

interface ChatRoomProps {
  room: Room;
  currentUser: User;
  onBack: () => void;
}

export function ChatRoom({ room, currentUser, onBack }: ChatRoomProps) {
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages: sseMessages, connected, setMessages } = useSSE(room.id);

  // Load initial messages
  useEffect(() => {
    const loadRoom = async () => {
      try {
        const roomData = await getRoom(room.id) as Room;
        if (roomData?.messages) {
          setInitialMessages(roomData.messages);
        }
      } catch (error) {
        console.error('Failed to load room:', error);
      }
    };
    loadRoom();
  }, [room.id]);

  // Combine initial messages with SSE messages
  const allMessages = React.useMemo(() => {
    const combined = [...initialMessages];
    sseMessages.forEach(msg => {
      if (!combined.some(m => m.id === msg.id)) {
        combined.push(msg);
      }
    });
    return combined.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [initialMessages, sseMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || isSending) return;

    setIsSending(true);
    try {
      const newMessage = await sendMessage(room.id, currentUser.id, messageText.trim()) as Message;
      // Add message to initial messages to show immediately
      setInitialMessages(prev => [...prev, newMessage]);
      setMessageText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-room">
      <div className="chat-header">
        <button className="back-button" onClick={onBack}>←</button>
        <div className="room-info">
          <h2># {room.name}</h2>
          <span className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '● Connected' : '○ Disconnected'}
          </span>
        </div>
      </div>

      <div className="messages-container">
        {allMessages.length === 0 ? (
          <div className="no-messages">
            No messages yet. Start the conversation!
          </div>
        ) : (
          allMessages.map(message => (
            <div
              key={message.id}
              className={`message ${message.sender?.id === currentUser.id ? 'own' : ''}`}
            >
              <div className="message-header">
                <span className="sender-name">
                  {message.sender?.username || 'Unknown'}
                </span>
                <span className="message-time">{formatTime(message.createdAt)}</span>
              </div>
              <div className="message-content">{message.content}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="message-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Type a message..."
          disabled={isSending}
        />
        <button type="submit" disabled={isSending || !messageText.trim()}>
          {isSending ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
