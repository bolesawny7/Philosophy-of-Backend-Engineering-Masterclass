export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  members: User[];
  messages: Message[];
  createdAt: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: User;
  roomId: string;
  createdAt: string;
}

export interface SSEEvent {
  type: 'connected' | 'message' | 'user_joined' | 'user_left' | 'room_created';
  data: unknown;
}
