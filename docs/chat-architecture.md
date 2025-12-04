# Chat System Architecture & Flow Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture Design](#architecture-design)
3. [Technology Stack](#technology-stack)
4. [Message Flow](#message-flow)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Real-Time Communication](#real-time-communication)
8. [Microservice Queue Pattern](#microservice-queue-pattern)
9. [Key Components](#key-components)
10. [Security & Authorization](#security--authorization)
11. [Error Handling](#error-handling)
12. [Performance Considerations](#performance-considerations)

---

## Overview

The PeopleCore chat system is a **real-time messaging platform** built on a microservice architecture using **WebSocket-only for sending** and **HTTP-only for retrieval**. This hybrid approach optimizes for real-time performance while maintaining REST principles for data fetching.

### Key Features
- ✅ Real-time bidirectional messaging
- ✅ WebSocket-based message sending
- ✅ HTTP-based message retrieval
- ✅ Redis-based microservice queue
- ✅ Multi-device synchronization
- ✅ Read receipts
- ✅ Typing indicators
- ✅ Push notifications
- ✅ Online/offline status tracking
- ✅ Unread message counts

---

## Architecture Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Frontend)                        │
│  ┌──────────────┐              ┌─────────────────────────────┐ │
│  │   Socket.IO  │              │      HTTP REST Client       │ │
│  │   (Sending)  │              │     (Fetching/Reading)      │ │
│  └──────┬───────┘              └──────────┬──────────────────┘ │
└─────────┼──────────────────────────────────┼────────────────────┘
          │                                  │
          │ WebSocket                        │ HTTP
          │                                  │
┌─────────▼──────────────────────────────────▼────────────────────┐
│                    BACKEND (NestJS API)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              AppGateway (WebSocket Handler)               │  │
│  │  - Receives: user.message, user.typing, getOnlineUsers   │  │
│  │  - Publishes jobs to Redis microservice queues           │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                          │
│  ┌────────────────────▼─────────────────────────────────────┐  │
│  │         Redis Microservice Queue (Event Bus)             │  │
│  │  Queues: APPEVENTS.MESSAGE, APPEVENTS.SOCKET,           │  │
│  │          APPEVENTS.NOTIFICATION                          │  │
│  └────┬──────────────────────────────────────┬──────────────┘  │
│       │                                      │                  │
│  ┌────▼───────────────────────┐  ┌──────────▼──────────────┐  │
│  │ ChatMessageController      │  │ SocketEventController   │  │
│  │ Queue: APPEVENTS.MESSAGE   │  │ Queue: APPEVENTS.SOCKET │  │
│  │ - validateMessageAndSave   │  │ - sendMessage           │  │
│  │ - saveMessage              │  │ - sendUserTyping        │  │
│  └────┬───────────────────────┘  │ - broadcastUserOnline   │  │
│       │                          └──────────┬──────────────┘  │
│  ┌────▼───────────────────────┐  ┌──────────▼──────────────┐  │
│  │ ChatMessageService         │  │ SocketEventService      │  │
│  │ - Validates user/chat      │  │ - Redis Propagator      │  │
│  │ - Saves to PostgreSQL      │  │ - Broadcasts to clients │  │
│  │ - Publishes socket events  │  └─────────────────────────┘  │
│  └────────────────────────────┘                                │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              ChatController (HTTP Endpoints)              │  │
│  │  - GET /chat (list chats)                                │  │
│  │  - GET /chat/:chatUid/messages (get messages)            │  │
│  │  - GET /chat/:chatUid/messages/readAll (mark as read)    │  │
│  │  - POST /chat (create/find chat)                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                       │
                       │ PostgreSQL
                       ▼
              ┌─────────────────┐
              │    Database     │
              │  - chats        │
              │  - chat_messages│
              │  - users        │
              └─────────────────┘
```

### Design Principles

1. **Separation of Concerns**: WebSocket for sending, HTTP for fetching
2. **Event-Driven Architecture**: Microservice queue pattern with Redis
3. **Asynchronous Processing**: Non-blocking message flow through queues
4. **Multi-Device Sync**: Broadcast to both sender and recipient
5. **Scalability**: Redis Propagator enables horizontal scaling

---

## Technology Stack

### Backend
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL (via Sequelize ORM)
- **Real-Time**: Socket.IO with Redis adapter
- **Message Queue**: Redis (microservice transport)
- **Authentication**: JWT (via NextAuth v5)

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19 with shadcn/ui
- **Real-Time**: Socket.IO Client
- **HTTP Client**: Custom fetch wrapper
- **State**: React Context API

### Infrastructure
- **Redis**: Event bus + Socket.IO adapter
- **WebSocket**: Bidirectional communication
- **REST API**: CRUD operations

---

## Message Flow

### Complete Message Sending Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: User Types Message and Clicks Send                      │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: Frontend emits via Socket.IO                            │
│   socket.emit('user.message', {                                 │
│     toUserUid: '62e3cc70...',                                   │
│     chatUid: 'chat_88f966e0...',                                │
│     message: 'Hello!'                                            │
│   })                                                             │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 3: AppGateway receives WebSocket event                     │
│   @SubscribeMessage('user.message')                             │
│   handleMessageEvent(client, data)                              │
│   - Extracts authenticated user from JWT                        │
│   - Publishes job to APPEVENTS.MESSAGE queue                    │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 4: Redis Queue → ChatMessageController.execute()           │
│   @MsListener(APPEVENTS.MESSAGE)                                │
│   - Receives job with action: 'validateMessageAndSave'          │
│   - Calls ChatMessageService.validateMessageAndSave()           │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 5: Validate Message Data                                   │
│   ChatMessageService.validateMessageAndSave()                   │
│   - Validates toUserUid exists and is active                    │
│   - Validates chatUid exists and user has access                │
│   - Publishes 'saveMessage' job to MESSAGE queue                │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 6: Save Message to Database                                │
│   ChatMessageService.saveMessage()                              │
│   - Creates message record in PostgreSQL                        │
│   - Fetches complete message with user details                  │
│   - Publishes to SOCKET queue for broadcasting                  │
│   - Publishes to NOTIFICATION queue for push                    │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 7: Broadcast via Socket.IO                                 │
│   SocketEventController → SocketEventService.sendMessage()      │
│   - Emits 'user.message' to recipient (toUserId)                │
│   - Emits 'user.message' to sender (fromUserId) for multi-dev   │
│   - Uses Redis Propagator for multi-server distribution         │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 8: Frontend receives message                               │
│   socket.on('user.message', (data) => {                         │
│     - Updates chat list with latest message                     │
│     - If chat is active, appends message to messages array      │
│     - Updates unread count if not active chat                   │
│   })                                                             │
└──────────────────────────────────────────────────────────────────┘
```

### Message Retrieval Flow (HTTP)

```
┌──────────────────────────────────────────────────────────────────┐
│ User Opens Chat or Scrolls Up                                   │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ Frontend HTTP Request                                            │
│   GET /chat/:chatUid/messages?offset=0&limit=50                 │
│   Headers: Authorization: Bearer <JWT>                          │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ ChatController → ChatService.getChatMessages()                  │
│   - Validates user has access to chat                           │
│   - Queries chat_messages table with pagination                 │
│   - Includes fromUser and toUser relations                      │
│   - Orders by created_at DESC (newest first)                    │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ Response: { messages: [...], count, limit, offset }             │
│   Frontend updates state with fetched messages                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Chat Table
```sql
CREATE TABLE chats (
  id SERIAL PRIMARY KEY,
  uid VARCHAR(255) UNIQUE NOT NULL,
  user1_id INTEGER REFERENCES users(id) NOT NULL,
  user2_id INTEGER REFERENCES users(id) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

-- Indexes for performance
CREATE INDEX idx_chats_user1_id ON chats(user1_id);
CREATE INDEX idx_chats_user2_id ON chats(user2_id);
CREATE INDEX idx_chats_uid ON chats(uid);
CREATE INDEX idx_chats_active ON chats(active);
```

### ChatMessage Table
```sql
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  uid VARCHAR(255) UNIQUE NOT NULL,
  chat_id INTEGER REFERENCES chats(id) NOT NULL,
  from_user_id INTEGER REFERENCES users(id) NOT NULL,
  to_user_id INTEGER REFERENCES users(id) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

-- Indexes for performance
CREATE INDEX idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX idx_chat_messages_from_user_id ON chat_messages(from_user_id);
CREATE INDEX idx_chat_messages_to_user_id ON chat_messages(to_user_id);
CREATE INDEX idx_chat_messages_is_read ON chat_messages(is_read);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_uid ON chat_messages(uid);
```

### Entity Relationships
```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │       │    Chat     │       │ ChatMessage │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │───┐   │ id (PK)     │───┐   │ id (PK)     │
│ uid         │   │   │ uid         │   │   │ uid         │
│ name        │   └──→│ user1_id FK │   └──→│ chat_id FK  │
│ email       │   ┌──→│ user2_id FK │   ┌──→│ from_user_id│
│ avatar      │   │   │ created_at  │   │   │ to_user_id  │
│ active      │   │   │ updated_at  │   │   │ message     │
└─────────────┘   │   └─────────────┘   │   │ is_read     │
       ▲          │                      │   │ created_at  │
       │          │                      │   └─────────────┘
       └──────────┴──────────────────────┘
```

---

## API Endpoints

### Chat Management

#### Create or Find Chat
```http
POST /chat
Authorization: Bearer <JWT>
Content-Type: application/json

Request Body:
{
  "userUid": "62e3cc70-d0f0-11f0-905e-31f6d4c5438c"
}

Response (201 Created):
{
  "data": {
    "chat": {
      "id": 13,
      "uid": "chat_88f966e0-d0f0-11f0-905e-31f6d4c5438c",
      "user1Id": 9,
      "user2Id": 33,
      "user1": { "id": 9, "name": "Shahid", "avatar": "..." },
      "user2": { "id": 33, "name": "Colette", "avatar": null },
      "created_at": "2025-12-04T09:06:35.726Z"
    }
  },
  "message": "Chat ready"
}
```

#### Get My Chats
```http
GET /chat?offset=0&limit=50
Authorization: Bearer <JWT>

Response (200 OK):
{
  "data": {
    "chats": [
      {
        "id": 13,
        "uid": "chat_88f966e0...",
        "user1": { "id": 9, "name": "Shahid", ... },
        "user2": { "id": 33, "name": "Colette", ... },
        "messages": [
          { "uid": "msg_7ce4fc80...", "message": "Hey", "created_at": "..." }
        ],
        "unread_count": 2
      }
    ],
    "count": 5,
    "offset": 0,
    "limit": 50
  }
}
```

#### Get Chat Messages
```http
GET /chat/:chatUid/messages?offset=0&limit=50
Authorization: Bearer <JWT>

Response (200 OK):
{
  "data": {
    "messages": [
      {
        "id": 789,
        "uid": "msg_7ce4fc80-d117-11f0-af85-d5ade6f26663",
        "message": "Hey",
        "isRead": true,
        "fromUserId": 9,
        "toUserId": 33,
        "fromUser": { "id": 9, "name": "Shahid", "avatar": "..." },
        "toUser": { "id": 33, "name": "Colette", "avatar": null },
        "created_at": "2025-12-04T14:15:25.000Z"
      }
    ],
    "count": 50,
    "offset": 0,
    "limit": 50
  }
}
```

#### Mark All Messages as Read
```http
GET /chat/:chatUid/messages/readAll
Authorization: Bearer <JWT>

Response (200 OK):
{
  "data": {
    "chatUid": "chat_88f966e0...",
    "messagesRead": true
  },
  "message": "Messages marked as read"
}

Side Effect:
- Updates is_read = true for all messages in chat where to_user_id = current_user
- Emits 'messages.read' socket event to sender
```

---

## Real-Time Communication

### WebSocket Events

#### Client → Server (Emit)

**Send Message**
```typescript
socket.emit('user.message', {
  toUserUid: '62e3cc70-d0f0-11f0-905e-31f6d4c5438c',
  chatUid: 'chat_88f966e0-d0f0-11f0-905e-31f6d4c5438c',
  message: 'Hello!'
});
```

**Typing Indicator**
```typescript
socket.emit('user.typing', {
  toUserId: 33,
  isTyping: true,
  chatUid: 'chat_88f966e0-d0f0-11f0-905e-31f6d4c5438c'
});
```

**Request Online Users**
```typescript
socket.emit('getOnlineUsers');
```

#### Server → Client (Listen)

**Receive Message**
```typescript
socket.on('user.message', (data: { message: ChatMessage }) => {
  console.log('New message:', data.message);
  // Update UI with new message
});
```

**Typing Status**
```typescript
socket.on('user.typing', (data: { userId: number, chatUid: string, isTyping: boolean }) => {
  // Show/hide typing indicator
});
```

**Messages Read**
```typescript
socket.on('messages.read', (data: { chatUid: string, readBy: number }) => {
  // Update read status in UI
});
```

**User Online/Offline**
```typescript
socket.on('user.online', (data: { userId: number }) => {
  // Update online status indicator
});

socket.on('user.offline', (data: { userId: number }) => {
  // Update offline status indicator
});
```

**Online Users List**
```typescript
socket.on('onlineUsers.list', (data: { userIds: number[] }) => {
  // Update online users list
});
```

---

## Microservice Queue Pattern

### Queue Architecture

The system uses **Redis-based microservice queues** for decoupled, asynchronous processing:

```typescript
// Queue Constants (src/constants/index.ts)
export const APPEVENTS = {
  MESSAGE: 'controller.message',      // Chat message operations
  SOCKET: 'controller.socket-event',  // Socket event broadcasting
  NOTIFICATION: 'controller.notification', // Push notifications
  CHAT: 'controller.chat'             // Chat operations
};
```

### Queue Flow Pattern

```
┌─────────────┐      emit      ┌─────────────┐
│  Producer   │ ──────────────→ │ Redis Queue │
│ (Service)   │                 │  (Topic)    │
└─────────────┘                 └─────┬───────┘
                                      │
                                  subscribe
                                      │
                                      ▼
                               ┌─────────────┐
                               │  Consumer   │
                               │ (Controller)│
                               └─────────────┘
```

### Publishing Jobs

```typescript
// ChatMessageService publishes to MESSAGE queue
await this.msClient.executeJob(
  APPEVENTS.MESSAGE,
  new Job({
    app: process.env.APP_ID,           // Target app (for multi-app)
    action: 'saveMessage',              // Method to invoke
    owner: authenticatedUser,           // JWT user context
    payload: { message, toUser, chat }, // Data
    logging: true                       // Enable job logging
  })
);
```

### Consuming Jobs

```typescript
// ChatMessageController listens to MESSAGE queue
@MsListener(APPEVENTS.MESSAGE)
async execute(job: Job): Promise<void> {
  // Dynamically invoke service method based on job.action
  const response = await this.chatMessageService[job.action](job);
  
  // Mark job as complete in job log
  await this.msClient.jobDone(job, response);
}
```

### Job Lifecycle

```
1. Job Created → Job Log Entry (MongoDB)
2. Job Published → Redis Queue
3. Job Received → Consumer processes
4. Job Completed → Job Log Updated
```

---

## Key Components

### Backend Components

#### 1. AppGateway
**Location**: `src/app.gateway.ts`

WebSocket gateway handling real-time connections.

```typescript
@WebSocketGateway()
export class AppGateway {
  @SubscribeMessage('user.message')
  async handleMessageEvent(client: AuthenticatedSocket, data: SendMessageDto) {
    // Extract authenticated user from socket
    const owner = client.auth;
    
    // Publish to microservice queue
    await this.msClient.executeJob(APPEVENTS.MESSAGE, new Job({
      action: 'validateMessageAndSave',
      owner,
      payload: data
    }));
  }
}
```

#### 2. ChatMessageController
**Location**: `src/modules/sql/chat-message/chat-message.controller.ts`

Microservice queue consumer for message operations.

```typescript
@Controller('chat_message')
export class ChatMessageController {
  @MsListener(APPEVENTS.MESSAGE)
  async execute(job: Job): Promise<void> {
    const response = await this.chatMessageService[job.action](job);
    await this.client.jobDone(job, response);
  }
}
```

#### 3. ChatMessageService
**Location**: `src/modules/sql/chat-message/chat-message.service.ts`

Business logic for message handling.

**Key Methods**:
- `validateMessageAndSave(job)`: Validates user/chat existence, queues save job
- `saveMessage(job)`: Creates message in DB, broadcasts to socket, sends push notification

#### 4. SocketEventController
**Location**: `src/modules/socket-event/socket-event.controller.ts`

Microservice queue consumer for socket broadcasting.

```typescript
@Controller('socket-event')
export class SocketEventController {
  @MsListener(APPEVENTS.SOCKET)
  async execute(job: Job): Promise<void> {
    const response = await this.socketEventService[job.action](job);
    await this.client.jobDone(job, response);
  }
}
```

#### 5. SocketEventService
**Location**: `src/modules/socket-event/socket-event.service.ts`

Handles socket event broadcasting via Redis Propagator.

```typescript
@Injectable()
export class SocketEventService {
  async sendMessage(job: Job) {
    const message = job.payload;
    
    // Emit to recipient
    this.redisPropagatorService.propagateEvent({
      userId: `${message.toUserId}`,
      event: 'user.message',
      data: { message }
    });
    
    // Emit to sender (multi-device sync)
    this.redisPropagatorService.propagateEvent({
      userId: `${message.fromUserId}`,
      event: 'user.message',
      data: { message }
    });
  }
}
```

#### 6. ChatController
**Location**: `src/modules/sql/chat/chat.controller.ts`

HTTP REST endpoints for chat management.

**Key Endpoints**:
- `POST /chat`: Create/find chat
- `GET /chat`: List user's chats
- `GET /chat/:chatUid/messages`: Fetch messages
- `GET /chat/:chatUid/messages/readAll`: Mark as read

### Frontend Components

#### 1. useChat Hook
**Location**: `peoplecore-ui/hooks/use-chat.ts`

React hook managing chat state and socket listeners.

```typescript
export function useChat() {
  const { socket } = useSocketContext();
  
  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (data: { message: ChatMessage }) => {
      // Update messages if active chat
      if (activeChat && data.message.chatId === activeChat.id) {
        setMessages(prev => [...prev, data.message]);
      }
      
      // Update chat list
      setChats(prev => /* update logic */);
    };
    
    socket.on('user.message', handleNewMessage);
    return () => socket.off('user.message', handleNewMessage);
  }, [socket, activeChat]);
  
  const sendMessage = async (message: string) => {
    socket.emit('user.message', {
      toUserUid: activeChat.otherUser.uid,
      chatUid: activeChat.uid,
      message
    });
  };
  
  return { messages, sendMessage, ... };
}
```

#### 2. Socket Context
**Location**: `peoplecore-ui/contexts/socket.tsx`

Manages WebSocket connection lifecycle.

```typescript
export function SocketProvider({ children }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  
  useEffect(() => {
    if (!session?.accessToken) return;
    
    const newSocket = io(SOCKET_URL, {
      auth: { token: session.accessToken }
    });
    
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, [session]);
  
  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}
```

#### 3. API Client
**Location**: `peoplecore-ui/lib/fetch.ts`

HTTP client for chat operations.

```typescript
export const API = {
  // Get chat list
  async GetChats(params: QueryParams) {
    return this.Get('chat', params);
  },
  
  // Get messages
  async GetChatMessages(chatUid: string, params: QueryParams) {
    return this.Get(`chat/${chatUid}/messages`, params);
  },
  
  // Mark as read
  async MarkMessagesAsRead(chatUid: string) {
    return this.Get(`chat/${chatUid}/messages/readAll`);
  }
};
```

---

## Security & Authorization

### JWT Authentication

**Backend** (`socket-state.adapter.ts`):
```typescript
async handleConnection(client: Socket) {
  const token = client.handshake.auth.token;
  const { user, session } = await this.verifyToken(token);
  
  // Attach to socket for subsequent requests
  (client as AuthenticatedSocket).auth = user;
  
  // Track online status
  this.socketStateService.add(user.id, client);
}
```

**Frontend** (`socket.tsx`):
```typescript
const socket = io(SOCKET_URL, {
  auth: { token: session.accessToken }
});
```

### Access Control

#### Chat Access Guard
```typescript
@Injectable()
export class ChatAccessGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const chatUid = request.params.chatUid;
    const userId = request.user.id;
    
    // Verify user is participant in chat
    const chat = await this.chatService.findOne({
      where: {
        uid: chatUid,
        [Op.or]: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      }
    });
    
    return !!chat;
  }
}
```

### Subscription Check
Messages require active subscription (enforced via `ChatAccessGuard`).

---

## Error Handling

### Service Error Pattern

```typescript
async saveMessage(job: Job) {
  try {
    // Business logic
    return { error: false, data: messagePayload };
  } catch (error) {
    console.error('[ChatMessageService] saveMessage failed:', error.message);
    return { error, data: null };
  }
}
```

### Controller Error Pattern

```typescript
@MsListener(APPEVENTS.MESSAGE)
async execute(job: Job): Promise<void> {
  try {
    const response = await this.chatMessageService[job.action](job);
    await this.client.jobDone(job, response);
  } catch (error) {
    console.error('[ChatMessageController] Job failed:', {
      action: job.action,
      error: error.message
    });
    throw error;
  }
}
```

### Frontend Error Handling

```typescript
const sendMessage = async (message: string) => {
  try {
    socket.emit('user.message', { toUserUid, chatUid, message });
    // Optimistic UI update
    setMessages(prev => [...prev, tempMessage]);
  } catch (error) {
    toast.error('Failed to send message');
    // Rollback optimistic update
  }
};
```

---

## Performance Considerations

### Database Optimizations

1. **Indexes**: All foreign keys and frequently queried columns indexed
2. **Pagination**: All list endpoints support offset/limit
3. **Lazy Loading**: Messages fetched on-demand, not with chat list
4. **Efficient Queries**: Uses `required: false` for LEFT JOINs instead of INNER JOINs

### Real-Time Optimizations

1. **Redis Propagator**: Enables horizontal scaling across multiple servers
2. **Multi-Device Sync**: Message broadcast to both sender and recipient
3. **Typing Debouncing**: Frontend debounces typing events (300ms)
4. **Connection Pooling**: Socket.IO connection reuse

### Caching Strategy

1. **Online Users**: Cached in memory via SocketStateService
2. **Unread Counts**: Calculated via SQL query with Sequelize literal
3. **Chat List**: Recent chats cached on frontend

### Query Optimizations

```typescript
// Efficient unread count in chat list query
attributes: [
  'id', 'uid', 'user1Id', 'user2Id',
  [
    Sequelize.literal(
      `(SELECT COUNT(*) FROM chat_messages 
       WHERE chat_id = "Chat"."id" 
       AND to_user_id = ${owner.id} 
       AND is_read = false)`
    ),
    'unread_count'
  ]
]
```

---

## Troubleshooting

### Common Issues

#### 1. Messages Not Appearing in Real-Time

**Symptoms**: Messages save to DB but don't appear in chat window

**Diagnosis**:
```bash
# Check backend logs for socket broadcast
[SocketEventService.sendMessage] Broadcasting message
Emitted to recipient (userId: 33)
Emitted to sender (userId: 9)

# Check frontend console for socket connection
Socket connected: true
Socket ID: WU-_YvuVftzM6f9WAAAB

# Check if frontend is listening for events
[useChat] Attaching message listener
```

**Solutions**:
- Verify socket connection established
- Ensure `chatId` in message matches `activeChat.id`
- Check Redis is running for Socket.IO adapter
- Verify JWT token is valid

#### 2. Database Column Not Found

**Symptoms**: `SequelizeDatabaseError: column ChatMessage.type does not exist`

**Solution**: Remove non-existent columns from attributes array in query

```typescript
// BAD: Includes commented-out entity fields
attributes: ['id', 'uid', 'type', 'reaction']

// GOOD: Only existing columns
attributes: ['id', 'uid', 'message', 'isRead']
```

#### 3. Microservice Guard Blocking Messages

**Symptoms**: Controller never invoked, no logs

**Solution**: Remove HTTP-specific guards from microservice controllers

```typescript
// BAD: HTTP guard on microservice controller
@UseGuards(ChatAccessGuard)
@Controller('chat_message')
export class ChatMessageController

// GOOD: No guards for microservice listeners
@Controller('chat_message')
export class ChatMessageController
```

---

## Future Enhancements

### Planned Features
- [ ] Message reactions (emojis)
- [ ] File/image attachments
- [ ] Voice messages
- [ ] Group chats
- [ ] Message editing
- [ ] Message deletion (soft delete)
- [ ] Search messages
- [ ] Message threading
- [ ] Video/audio calls
- [ ] End-to-end encryption

### Scalability Improvements
- [ ] Message archival to S3 after 90 days
- [ ] Read replica for message fetching
- [ ] CDN for media attachments
- [ ] Message compression
- [ ] Horizontal pod autoscaling

---

## Conclusion

The PeopleCore chat system demonstrates a robust, scalable architecture for real-time messaging using:
- **WebSocket-only sending** for instant delivery
- **HTTP-only fetching** for reliable message retrieval
- **Redis microservice queues** for decoupled, asynchronous processing
- **Multi-device synchronization** for seamless cross-device experience
- **Production-ready error handling** and monitoring

This architecture supports horizontal scaling, real-time performance, and clean separation of concerns while maintaining code maintainability and developer experience.
