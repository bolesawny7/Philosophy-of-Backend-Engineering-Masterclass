import { useEffect, useRef, useState, useCallback } from "react";
import { Message } from "../types";

export function useSSE(roomId?: string) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [connected, setConnected] = useState(false);
    const eventSourceRef = useRef<EventSource | null>(null);

    const addMessage = useCallback((message: Message) => {
        setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === message.id)) {
                return prev;
            }
            return [...prev, message];
        });
    }, []);

    useEffect(() => {
        const url = roomId ? `/events?roomId=${roomId}` : "/events";
        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            console.log("[SSE] Connected");
            setConnected(true);
        };

        // Listen for 'connected' event from server
        eventSource.addEventListener("connected", (event) => {
            console.log("[SSE] Received connected event:", event.data);
            setConnected(true);
        });

        // Listen for 'message' events (new chat messages)
        eventSource.addEventListener("message", (event) => {
            try {
                console.log("[SSE] Received message event:", event.data);
                const data = JSON.parse(event.data);
                // The server sends { message: {...}, room: {...}, sender: {...} }
                if (data.message) {
                    // Attach the sender to the message object
                    const messageWithSender: Message = {
                        ...data.message,
                        sender: data.sender || data.message.sender,
                    };
                    addMessage(messageWithSender);
                }
            } catch (error) {
                console.error("[SSE] Error parsing message event:", error);
            }
        });

        // Listen for user_joined events
        eventSource.addEventListener("user_joined", (event) => {
            console.log("[SSE] User joined:", event.data);
        });

        // Listen for room_created events
        eventSource.addEventListener("room_created", (event) => {
            console.log("[SSE] Room created:", event.data);
        });

        eventSource.onerror = (error) => {
            console.error("[SSE] Error:", error);
            setConnected(false);
        };

        return () => {
            console.log("[SSE] Closing connection");
            eventSource.close();
            eventSourceRef.current = null;
        };
    }, [roomId, addMessage]);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    return { messages, connected, addMessage, clearMessages, setMessages };
}
