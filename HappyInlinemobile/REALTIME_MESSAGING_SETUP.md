# Real-Time Messaging Setup Guide

## Problem
Messages are not appearing instantly - users need to refresh the app to see new messages.

## Solution Steps

### Step 1: Enable Realtime in Supabase Dashboard (CRITICAL)

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Database** → **Replication** (in the left sidebar)
4. Find the **`messages`** table in the list
5. Click the toggle to **enable Realtime** for the `messages` table
6. Also find the **`conversations`** table and enable Realtime
7. Wait a few seconds for the changes to take effect

**Important:** If you don't see the Replication section, you may need to run the SQL script first.

### Step 2: Run the SQL Script

1. Go to **SQL Editor** in your Supabase Dashboard
2. Open the file: `database/ENABLE_REALTIME_MESSAGING.sql`
3. Copy and paste the SQL into the editor
4. Click **Run** to execute

The script will:
- Add the `messages` table to the realtime publication
- Add the `conversations` table to the realtime publication
- Verify that realtime is properly enabled

### Step 3: Verify Realtime is Working

After enabling realtime, check the console logs in your app:

**Look for these success messages:**
```
🔌 Creating subscription for conversation: <id>
📡 Subscription status changed: SUBSCRIBED
✅ Successfully subscribed to real-time messages
```

**Watch out for these error messages:**
```
❌ Channel error - real-time updates may not work
⏰ Subscription timed out
❌ Subscription error: <error details>
```

### Step 4: Test the Messaging

1. **Restart your app** (close completely and reopen)
2. Open a chat conversation as User A
3. On another device (or browser), open the same conversation as User B
4. Send a message from User A
5. The message should appear **instantly** on User B's screen (no refresh needed)

### Step 5: Check Console Logs

When a message is sent, you should see:
```
✅ Message sent successfully: <message_id>
```

When a message is received in real-time, you should see:
```
🔔 Real-time event received: <payload>
✅ Message fetched, calling callback: <message_data>
✅ Adding new message to chat
```

## Common Issues and Solutions

### Issue 1: "CHANNEL_ERROR" in logs
**Solution:** Realtime is not enabled on your Supabase project. Follow Step 1 above.

### Issue 2: Messages appear with delay
**Solution:** This is normal. The optimistic UI shows your sent messages instantly. The recipient should see messages within 1-2 seconds if realtime is enabled.

### Issue 3: "Subscription timed out"
**Solution:**
- Check your internet connection
- Verify your Supabase project is online
- Check if you've exceeded your Supabase plan's realtime connection limit

### Issue 4: Works for sender but not recipient
**Solution:**
- Ensure BOTH users have the chat screen open
- Verify realtime is enabled on the `messages` table (Step 1)
- Check that both users are in the same conversation

### Issue 5: No console logs about subscription
**Solution:**
- The subscription might not be initializing
- Check that `conversationId` is valid
- Ensure the user is logged in

## Technical Details

### How It Works

1. **Optimistic UI:** When you send a message, it appears instantly in YOUR chat (no waiting)
2. **Database Insert:** The message is saved to Supabase
3. **Real-Time Event:** Supabase broadcasts an INSERT event to all subscribers
4. **Live Update:** The recipient's app receives the event and displays the new message

### Files Modified

- `src/lib/supabase.js` - Added realtime configuration
- `src/lib/messaging.js` - Enhanced subscription with logging and status callbacks
- `src/presentation/main/bottomBar/chat/ChatConversationScreen.jsx` - Optimistic UI updates
- `database/ENABLE_REALTIME_MESSAGING.sql` - SQL script to enable realtime

### Supabase Realtime Configuration

```javascript
// src/lib/supabase.js
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { ... },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
```

### Subscription Code

```javascript
// src/lib/messaging.js
export const subscribeToMessages = (conversationId, callback) => {
  const subscription = supabase
    .channel(`messages:${conversationId}`, {
      config: {
        broadcast: { self: true }, // Receive messages sent by yourself
      },
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    }, async (payload) => {
      // Fetch full message and call callback
    })
    .subscribe();

  return subscription;
};
```

## Verification Checklist

- [ ] Realtime enabled on `messages` table in Supabase Dashboard
- [ ] Realtime enabled on `conversations` table in Supabase Dashboard
- [ ] SQL script executed successfully
- [ ] App restarted after making changes
- [ ] Console shows "SUBSCRIBED" status
- [ ] Sent messages appear instantly (optimistic UI)
- [ ] Received messages appear within 1-2 seconds
- [ ] No error messages in console

## Need Help?

If real-time messaging still doesn't work after following all steps:

1. Check your Supabase plan - free tier has limits on realtime connections
2. Verify your Supabase project is not paused
3. Check browser/device console for error messages
4. Try on a different device or network
5. Check Supabase project logs for errors

## Alternative: Polling Fallback

If realtime absolutely won't work, you can implement polling as a fallback:

```javascript
// Poll for new messages every 3 seconds
useEffect(() => {
  const interval = setInterval(() => {
    loadMessages();
  }, 3000);

  return () => clearInterval(interval);
}, [conversationId]);
```

However, this is **not recommended** as it:
- Increases database queries
- Uses more bandwidth
- Provides a worse user experience
- May hit rate limits

Always try to get realtime working first!
