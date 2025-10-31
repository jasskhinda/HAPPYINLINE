# 💬 Super Admin Messaging Implementation Guide

## ✅ What's Been Implemented

### 1. **Database Schema** (CREATE_MESSAGING_SYSTEM.sql)
- ✅ `conversations` table - stores conversation metadata
- ✅ `messages` table - stores individual messages
- ✅ Triggers for auto-updating last message and unread counts
- ✅ RLS (Row Level Security) policies
- ✅ Helper functions:
  - `get_or_create_conversation()` - finds or creates conversation
  - `mark_conversation_read()` - marks all messages as read

### 2. **Messaging Functions** (src/lib/messaging.js)
- ✅ `getOrCreateConversation()` - get/create conversation between users
- ✅ `getConversationMessages()` - fetch all messages in conversation
- ✅ `sendMessage()` - send a message
- ✅ `markConversationAsRead()` - mark conversation as read
- ✅ `subscribeToMessages()` - real-time message subscription
- ✅ `getUserConversations()` - get all user's conversations

### 3. **UI Components**
- ✅ **SuperAdminChatScreen** - full-featured chat interface with:
  - Real-time messaging
  - Date separators
  - Read receipts
  - Typing indicators
  - Professional UI design
  - Auto-scroll to latest message

- ✅ **ShopDetailsScreen** - added "Message Manager" button:
  - Appears in Admin Actions card
  - Only visible to super admin
  - Finds shop manager and opens chat

### 4. **Navigation**
- ✅ Registered `SuperAdminChatScreen` in Main.jsx
- ✅ Navigation from ShopDetailsScreen → SuperAdminChatScreen

---

## 📋 Setup Steps

### Step 1: Run Database Migration
Run the SQL script in your Supabase dashboard:

```bash
# File: CREATE_MESSAGING_SYSTEM.sql
```

**How to run:**
1. Go to Supabase Dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy/paste the entire contents of `CREATE_MESSAGING_SYSTEM.sql`
5. Click "Run"

**Expected output:**
```
✅ Messaging system created successfully!
📝 Tables: conversations, messages
🔒 RLS policies enabled
⚡ Triggers and functions created
```

---

## 🧪 Testing the Messaging Feature

### Test Scenario 1: Super Admin → Shop Manager

**Setup:**
1. Login as super admin (info@jasskhinda.com)
2. Go to home screen (should see SuperAdminHomeScreen)
3. Click on "Avon Barber shop"

**Expected:**
- See "Admin Actions" card with orange border
- Three buttons visible:
  - Suspend Shop (or Resume Shop)
  - Delete Shop
  - **Message Manager** (NEW - blue background)

**Test:**
4. Click "Message Manager" button

**Expected:**
- Navigate to chat screen
- Header shows:
  - Manager name
  - Shop name
  - Back button
  - Info button (i icon)
- Orange banner: "Super Admin messaging shop manager"
- Empty state if no messages:
  - Chat bubble icon
  - "No messages yet"
  - "Start a conversation with the shop manager"

5. Type a message: "Hello, I reviewed your shop. Everything looks good!"
6. Click send button (paper plane icon)

**Expected:**
- Message appears on the right side (blue bubble)
- Shows timestamp
- Message saved to database
- Real-time update works

---

### Test Scenario 2: Manager Receives Message

**Setup:**
1. Logout from super admin
2. Login as shop manager/owner of "Avon Barber shop"

**TODO:** We need to implement the manager's messaging UI!

**For now, verify in Supabase:**
1. Go to Supabase Dashboard
2. Table Editor → `conversations`
3. You should see a new row with:
   - `participant_1_id` = super admin's ID
   - `participant_2_id` = manager's ID
   - `shop_id` = Avon Barber shop ID
   - `last_message_text` = your test message

4. Table Editor → `messages`
5. You should see your message with:
   - `sender_id` = super admin's ID
   - `message_text` = your test message
   - `is_delivered` = true

---

## 🎨 UI Features

### SuperAdminChatScreen Features:

**Header:**
- Back button
- Manager name
- Shop name subtitle
- Info button (shows manager email)

**Admin Notice Banner:**
- Orange background
- Shield icon
- "Super Admin messaging shop manager"

**Message Bubbles:**
- Your messages: Blue, right-aligned
- Their messages: White with border, left-aligned
- Timestamps on each message
- Date separators (Today, Yesterday, or date)

**Input Area:**
- Rounded text input
- Multi-line support (up to 1000 characters)
- Send button (disabled when empty)
- Shows loading spinner when sending

**Real-Time Updates:**
- New messages appear instantly
- Auto-scrolls to bottom
- Marks messages as read automatically

---

## 🔮 Next Steps

### 1. Manager Messaging UI (TODO)
Create a screen for shop managers to:
- View conversations with super admin
- Reply to messages
- See conversation history

**Files to create:**
- `ManagerChatScreen.jsx`
- Add navigation in manager view
- Show unread count badge

### 2. Notification System (TODO)
- Send push notifications when new message arrives
- Email notifications for offline users
- Unread message counter

### 3. Message Features (Optional Enhancements)
- Photo attachments
- Voice messages
- Message reactions (👍, ❤️, etc.)
- Typing indicators ("Manager is typing...")
- Message search
- Archive conversations

---

## 📊 Database Structure

### Conversations Table
```sql
conversations:
├── id (UUID)
├── participant_1_id (UUID) → profiles(id)
├── participant_2_id (UUID) → profiles(id)
├── shop_id (UUID) → shops(id) [optional]
├── type ('direct', 'support', 'shop_inquiry')
├── last_message_text (TEXT)
├── last_message_at (TIMESTAMP)
├── last_message_by (UUID)
├── unread_count_participant_1 (INTEGER)
├── unread_count_participant_2 (INTEGER)
├── is_archived (BOOLEAN)
├── created_at, updated_at
```

### Messages Table
```sql
messages:
├── id (UUID)
├── conversation_id (UUID) → conversations(id)
├── sender_id (UUID) → profiles(id)
├── message_text (TEXT)
├── attachment_url (TEXT) [optional]
├── attachment_type ('image', 'document', 'link')
├── is_read (BOOLEAN)
├── read_at (TIMESTAMP)
├── is_delivered (BOOLEAN)
├── delivered_at (TIMESTAMP)
├── is_deleted (BOOLEAN)
├── created_at, updated_at
```

---

## 🔒 Security (RLS Policies)

**Conversations:**
- Users can only see conversations they're part of
- Super admins can see all conversations
- Users can create conversations with others
- Users can update their own conversations

**Messages:**
- Users can only see messages in their conversations
- Users can only send messages in their conversations
- Super admins have read access to all messages
- Messages can be soft-deleted

---

## 🚀 How It Works (Flow)

### When Super Admin Clicks "Message Manager":

```
1. ShopDetailsScreen.handleMessageManager()
   ↓
2. Finds shop manager from staff list
   ↓
3. Navigation.navigate('SuperAdminChatScreen', {
      shopId, shopName, managerId, managerName, managerEmail
   })
   ↓
4. SuperAdminChatScreen.initializeChat()
   ↓
5. getCurrentUser() → Get super admin ID
   ↓
6. getOrCreateConversation(superAdminId, managerId, shopId)
   ↓
7. Supabase calls get_or_create_conversation() function
   ↓
8. Returns conversation ID (existing or newly created)
   ↓
9. loadMessages(conversationId)
   ↓
10. Displays messages in UI
   ↓
11. subscribeToMessages(conversationId)
   ↓
12. Real-time subscription active - listens for new messages
```

### When User Sends Message:

```
1. User types message and clicks send
   ↓
2. handleSendMessage()
   ↓
3. sendMessage(conversationId, userId, messageText)
   ↓
4. Insert into messages table
   ↓
5. Trigger: update_conversation_last_message()
   ↓
6. Updates conversations table:
   - last_message_text
   - last_message_at
   - last_message_by
   ↓
7. Trigger: increment_unread_count()
   ↓
8. Increments unread_count for OTHER participant
   ↓
9. Real-time subscription fires
   ↓
10. New message appears in both users' UI instantly
```

---

## 🐛 Troubleshooting

### Issue: "Unable to load user profile"
**Cause:** User not logged in or profile missing
**Fix:** Ensure user is authenticated and has profile in `profiles` table

### Issue: "Failed to load conversation"
**Cause:** Database function not created or RLS blocking access
**Fix:** Run CREATE_MESSAGING_SYSTEM.sql again

### Issue: Messages not appearing in real-time
**Cause:** Supabase real-time not enabled or subscription failed
**Fix:**
1. Check Supabase Dashboard → Database → Replication
2. Enable replication for `messages` table
3. Check browser console for subscription errors

### Issue: Can't send message (button disabled)
**Cause:** Empty message or missing conversationId
**Fix:** Type text in input field, check console for errors

### Issue: "Cannot read property 'id' of undefined"
**Cause:** Shop has no manager assigned
**Fix:** Ensure shop has at least one staff member with role 'manager' or 'admin'

---

## ✅ Checklist

Before testing:
- [ ] Run CREATE_MESSAGING_SYSTEM.sql in Supabase
- [ ] Verify tables created: `conversations`, `messages`
- [ ] Verify functions created: `get_or_create_conversation`, `mark_conversation_read`
- [ ] Enable real-time replication for `messages` table in Supabase
- [ ] Ensure super admin account exists: info@jasskhinda.com
- [ ] Ensure shop has a manager assigned

During testing:
- [ ] Super admin can see "Message Manager" button
- [ ] Clicking button opens SuperAdminChatScreen
- [ ] Chat screen shows manager name and shop name
- [ ] Can send messages
- [ ] Messages appear in UI immediately
- [ ] Messages saved to database (verify in Supabase)
- [ ] Unread counts update correctly

---

## 🎯 Current Status

✅ **Completed:**
- Database schema
- Messaging functions library
- SuperAdminChatScreen UI
- Navigation setup
- Message Manager button
- Real-time messaging

⏳ **Pending:**
- Run SQL script in Supabase
- Test messaging feature
- Manager-side messaging UI
- Push notifications

🔮 **Future Enhancements:**
- Photo/file attachments
- Typing indicators
- Message reactions
- Unread badges
- Conversation archive

---

Ready to test! 🚀

**Next Step:** Run the SQL script in Supabase and test messaging.
