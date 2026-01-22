const API_URL = '/graphql';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return result.data as T;
}

// User operations
export async function createUser(username: string, email: string) {
  const query = `
    mutation CreateUser($username: String!, $email: String!) {
      createUser(username: $username, email: $email) {
        id
        username
        email
        createdAt
      }
    }
  `;
  const result = await graphqlRequest<{ createUser: unknown }>(query, { username, email });
  return result.createUser;
}

export async function getUsers() {
  const query = `
    query {
      users {
        id
        username
        email
        createdAt
      }
    }
  `;
  const result = await graphqlRequest<{ users: unknown[] }>(query);
  return result.users;
}

// Room operations
export async function createRoom(name: string, description: string, creatorId: string) {
  const query = `
    mutation CreateRoom($name: String!, $description: String!, $creatorId: ID!) {
      createRoom(name: $name, description: $description, creatorId: $creatorId) {
        id
        name
        description
        createdAt
      }
    }
  `;
  // Ensure description is not empty - use name as fallback
  const desc = description.trim() || name;
  const result = await graphqlRequest<{ createRoom: unknown }>(query, { name, description: desc, creatorId });
  return result.createRoom;
}

export async function getRooms() {
  const query = `
    query {
      rooms {
        id
        name
        description
        createdAt
        members {
          id
          username
        }
      }
    }
  `;
  const result = await graphqlRequest<{ rooms: unknown[] }>(query);
  return result.rooms;
}

export async function getRoom(id: string) {
  const query = `
    query GetRoom($id: ID!) {
      room(id: $id) {
        id
        name
        description
        createdAt
        members {
          id
          username
        }
        messages {
          id
          content
          createdAt
          sender {
            id
            username
          }
        }
      }
    }
  `;
  const result = await graphqlRequest<{ room: unknown }>(query, { id });
  return result.room;
}

export async function joinRoom(roomId: string, userId: string) {
  const query = `
    mutation JoinRoom($roomId: ID!, $userId: ID!) {
      joinRoom(roomId: $roomId, userId: $userId) {
        id
        name
        members {
          id
          username
        }
      }
    }
  `;
  const result = await graphqlRequest<{ joinRoom: unknown }>(query, { roomId, userId });
  return result.joinRoom;
}

// Message operations
export async function sendMessage(roomId: string, senderId: string, content: string) {
  const query = `
    mutation SendMessage($roomId: ID!, $senderId: ID!, $content: String!) {
      sendMessage(roomId: $roomId, senderId: $senderId, content: $content) {
        id
        content
        createdAt
        sender {
          id
          username
        }
      }
    }
  `;
  const result = await graphqlRequest<{ sendMessage: unknown }>(query, { roomId, senderId, content });
  return result.sendMessage;
}

export async function getMessages(roomId: string) {
  const query = `
    query GetMessages($roomId: ID!) {
      messages(roomId: $roomId) {
        id
        content
        createdAt
        sender {
          id
          username
        }
      }
    }
  `;
  const result = await graphqlRequest<{ messages: unknown[] }>(query, { roomId });
  return result.messages;
}
