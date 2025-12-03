// Minimal GraphQL example using graphql-yoga
// Run: node examples/communication/graphql/graphql_server.js
import { createServer } from 'http';
import { createYoga, createSchema } from 'graphql-yoga';

const typeDefs = /* GraphQL */ `
    """Represents a user's profile metadata."""
    type Profile {
        name: String!
        email: String!
        joinedAt: String!
        bio: String
    }

    enum Role { ADMIN USER GUEST }

    """Primary user entity in the system."""
    type User {
        id: Int!
        active: Boolean!
        role: Role!
        profile: Profile!
        friends: [User!]!
        posts: [Post!]!
    }

    """A content post authored by a user."""
    type Post {
        id: Int!
        title: String!
        body: String!
        author: User!
        tags: [String!]!
        createdAt: String!
    }

    """Input payload for creating a Post."""
    input PostInput {
        title: String!
        body: String!
        tags: [String!]
    }

    # Union to demonstrate polymorphic search results
    union SearchResult = User | Post

    type Query {
        user(id: Int!): User
        users: [User!]!
        posts: [Post!]!
        search(term: String!): [SearchResult!]!
    }

    type Mutation {
        createPost(userId: Int!, input: PostInput!): Post!
    }

    # Schema documentation examples:
    # Query examples:
    #   { user(id:1){ id role profile{ name email } friends{ id } posts{ title } } }
    #   { posts { id title author { id profile { name } } } }
    #   { search(term:"Graph") { ... on Post { id title } ... on User { id profile { name } } } }
    # Mutation example:
    #   mutation { createPost(userId:1, input:{ title:"Hello", body:"World", tags:["intro"]}) { id title tags author { id } } }
`;

// In-memory sample data (would normally come from DB).
const profiles = {
    1: { name: 'Ada', email: 'ada@example.com', joinedAt: new Date('2024-01-10').toISOString(), bio: 'Mathematician & pioneer.' },
    2: { name: 'Grace', email: 'grace@example.com', joinedAt: new Date('2024-02-15').toISOString(), bio: 'Inventor of COBOL.' },
    3: { name: 'Linus', email: 'linus@example.com', joinedAt: new Date('2024-03-01').toISOString(), bio: 'Kernel maintainer.' }
};

//TODO: Revisited
let postsStore = [
    { id: 1, title: 'Graph Intro', body: 'Why GraphQL?', authorId: 1, tags: ['graphql','intro'], createdAt: new Date('2024-05-01').toISOString() },
    { id: 2, title: 'Systems', body: 'Queues & Backpressure', authorId: 2, tags: ['systems'], createdAt: new Date('2024-05-02').toISOString() },
    { id: 3, title: 'Concurrency', body: 'Threads vs Events', authorId: 1, tags: ['concurrency'], createdAt: new Date('2024-05-03').toISOString() }
];

const usersStore = [
    { id: 1, active: true, role: 'ADMIN', friendIds: [2,3] },
    { id: 2, active: true, role: 'USER', friendIds: [1] },
    { id: 3, active: false, role: 'GUEST', friendIds: [1] }
];

// Prevent infinite recursion (cyclic friendships & author links) by tracking visited user ids.
function buildUser(u, visited){
    if (!u) return null;
    // If visited is not provided or is something like a numeric index from Array.map, initialize a Set.
    if (!(visited instanceof Set)) visited = new Set();
    if (visited.has(u.id)) {
        return { id: u.id, active: u.active, role: u.role, profile: profiles[u.id], friends: [], posts: [] };
    }
    visited.add(u.id);
    return {
        id: u.id,
        active: u.active,
        role: u.role,
        profile: profiles[u.id],
        friends: u.friendIds.map(fid => buildUser(usersStore.find(x => x.id === fid), visited)),
        posts: postsStore.filter(p => p.authorId === u.id).map(p => buildPost(p, visited))
    };
}

function buildPost(p, visited){
    if (!(visited instanceof Set)) visited = new Set();
    return {
        id: p.id,
        title: p.title,
        body: p.body,
        author: buildUser(usersStore.find(u => u.id === p.authorId), visited),
        tags: p.tags,
        createdAt: p.createdAt
    };
}

const resolvers = {
    Query: {
        user: (_parent, args) => {
            const u = usersStore.find(u=>u.id===args.id);
            return u ? buildUser(u) : null;
        },
        users: () => usersStore.map(u => buildUser(u)),
        posts: () => postsStore.map(p => buildPost(p)),
        search: (_p, { term }) => {
            const t = term.toLowerCase();
            const userMatches = usersStore.filter(u => profiles[u.id].name.toLowerCase().includes(t)).map(buildUser);
            const postMatches = postsStore.filter(p => p.title.toLowerCase().includes(t)).map(buildPost);
            return [...userMatches, ...postMatches];
        }
    },
    Mutation: {
        createPost: (_p, { userId, input }) => {
            const userExists = usersStore.some(u=>u.id===userId);
            if (!userExists) throw new Error('User not found');
            const newId = postsStore.length ? Math.max(...postsStore.map(p=>p.id)) + 1 : 1;
            const post = {
                id: newId,
                title: input.title,
                body: input.body,
                tags: input.tags || [],
                authorId: userId,
                createdAt: new Date().toISOString()
            };
            postsStore.push(post);
            return buildPost(post);
        }
    },
    // Needed to resolve union type (GraphQL needs a discriminator)
    SearchResult: {
        __resolveType(obj){
            if (Object.prototype.hasOwnProperty.call(obj, 'email') || obj.profile) return 'User';
            if (Object.prototype.hasOwnProperty.call(obj, 'body')) return 'Post';
            return null;
        }
    }
};

const yoga = createYoga({ schema: createSchema({ typeDefs, resolvers }) });
const server = createServer(yoga);
server.listen(4600, () => console.log('GraphQL on :4600 → POST /graphql. Try queries: { users { id role profile { name email } } } | { search(term:"Graph") { ... on Post { id title } ... on User { id profile { name } } } }'));