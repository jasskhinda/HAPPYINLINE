import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  getConversationMessages,
  sendMessage as sendMessageToDb,
  subscribeToMessages,
  markConversationAsRead,
} from '../../../../lib/messaging';
import {
  startPresenceHeartbeat,
  stopPresenceHeartbeat,
  getUserOnlineStatus,
  subscribeToUserPresence,
  unsubscribeFromPresence,
  formatLastSeen,
} from '../../../../lib/presence';
import { supabase } from '../../../../lib/supabase';

const ChatConversationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { conversationId, recipientName, recipientId } = route.params || {};

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [recipientOnline, setRecipientOnline] = useState(false);
  const [recipientLastSeen, setRecipientLastSeen] = useState(null);

  const flatListRef = useRef(null);
  const subscriptionRef = useRef(null);
  const presenceSubscriptionRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);

  useEffect(() => {
    console.log('🔄 ChatConversation useEffect triggered for conversation:', conversationId);

    initializeChat();

    return () => {
      // Cleanup subscriptions on unmount
      console.log('🧹 Cleaning up subscriptions for conversation:', conversationId);

      if (subscriptionRef.current) {
        // Call unsubscribe directly on the subscription object
        if (subscriptionRef.current.unsubscribe) {
          subscriptionRef.current.unsubscribe();
        }
        subscriptionRef.current = null;
      }

      if (presenceSubscriptionRef.current) {
        unsubscribeFromPresence(presenceSubscriptionRef.current);
        presenceSubscriptionRef.current = null;
      }

      if (heartbeatIntervalRef.current && currentUserId) {
        stopPresenceHeartbeat(heartbeatIntervalRef.current, currentUserId);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [conversationId, currentUserId]);

  const initializeChat = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to chat');
        navigation.goBack();
        return;
      }
      setCurrentUserId(user.id);

      if (!conversationId) {
        Alert.alert('Error', 'Conversation not found');
        navigation.goBack();
        return;
      }

      // Load existing messages
      await loadMessages();

      // Mark conversation as read
      await markConversationAsRead(conversationId, user.id);

      // Subscribe to new messages
      console.log('📡 Setting up real-time message subscription for conversation:', conversationId);
      console.log('📡 Current user ID for subscription:', user.id);

      subscriptionRef.current = subscribeToMessages(conversationId, (newMessage) => {
        console.log('📨 New message received via real-time:', {
          id: newMessage.id,
          sender_id: newMessage.sender_id,
          content: newMessage.content,
          created_at: newMessage.created_at
        });

        setMessages(prev => {
          console.log('🔍 Checking for duplicates...');
          console.log('   - New message ID:', newMessage.id);
          console.log('   - Existing message IDs:', prev.map(m => m.id));

          // Check for duplicates by ID (both string and number)
          const exists = prev.some(msg =>
            msg.id === newMessage.id.toString() ||
            msg.id === newMessage.id ||
            msg.id === `temp-${newMessage.id}` // Check against temp IDs too
          );

          if (exists) {
            console.log('⚠️ Message already exists, skipping');
            return prev;
          }

          console.log('✅ Adding new message to chat');
          const transformedMessage = transformMessage(newMessage, user.id);
          console.log('✅ Transformed message:', transformedMessage);

          return [...prev, transformedMessage];
        });

        // Mark as read when new message arrives
        markConversationAsRead(conversationId, user.id);

        // Auto scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      });
      console.log('✅ Real-time subscription established');

      // Start presence heartbeat for current user
      console.log('💓 Starting presence heartbeat for current user');
      heartbeatIntervalRef.current = startPresenceHeartbeat(user.id);

      // Get recipient's initial online status
      if (recipientId) {
        console.log('👤 Getting initial online status for recipient:', recipientId);
        const statusResult = await getUserOnlineStatus(recipientId);
        if (statusResult.success) {
          setRecipientOnline(statusResult.isOnline);
          setRecipientLastSeen(statusResult.lastSeen);
          console.log(`👤 Recipient online: ${statusResult.isOnline}`);
        }

        // Subscribe to recipient's presence updates
        console.log('👀 Subscribing to recipient presence updates');
        presenceSubscriptionRef.current = subscribeToUserPresence(recipientId, (presence) => {
          console.log('👤 Recipient presence updated:', presence);
          setRecipientOnline(presence.isOnline);
          setRecipientLastSeen(presence.lastSeen);
        });
      }

    } catch (error) {
      console.error('Error initializing chat:', error);
      Alert.alert('Error', 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    const result = await getConversationMessages(conversationId);

    if (result.success) {
      const { data: { user } } = await supabase.auth.getUser();
      const transformedMessages = result.messages.map(msg =>
        transformMessage(msg, user.id)
      );
      setMessages(transformedMessages);
    } else {
      console.error('Error loading messages:', result.error);
    }
  };

  const transformMessage = (dbMessage, currentUserId) => {
    return {
      id: dbMessage.id.toString(),
      text: dbMessage.content,
      sender: dbMessage.sender_id === currentUserId ? 'me' : 'other',
      timestamp: new Date(dbMessage.created_at),
      senderName: dbMessage.sender?.name || 'Unknown',
    };
  };

  const handleSendMessage = async () => {
    if (!message.trim() || sending) return;

    const messageText = message.trim();
    setMessage('');
    setSending(true);

    // Create optimistic message for immediate display
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      text: messageText,
      sender: 'me',
      timestamp: new Date(),
      senderName: 'You',
      sending: true, // Mark as sending
    };

    // Add optimistic message to UI immediately
    setMessages(prev => [...prev, optimisticMessage]);

    // Auto scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const result = await sendMessageToDb(
        conversationId,
        currentUserId,
        messageText
      );

      if (result.success) {
        console.log('✅ Message sent successfully:', result.message.id);

        // Replace optimistic message with real message
        setMessages(prev => {
          // Remove the optimistic message
          const filtered = prev.filter(msg => msg.id !== optimisticMessage.id);

          // Check if real-time already added this message
          const exists = filtered.some(msg => msg.id === result.message.id.toString());
          if (exists) {
            console.log('⚠️ Message already added by real-time, using that version');
            return filtered;
          }

          // Add the real message
          const realMessage = transformMessage(result.message, currentUserId);
          return [...filtered, realMessage];
        });

        // Auto scroll to bottom again
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        Alert.alert('Error', 'Failed to send message');
        // Restore message if send failed
        setMessage(messageText);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      Alert.alert('Error', 'Failed to send message');
      setMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleMoreOptionsPress = () => {
    Alert.alert(
      'More Options',
      'Choose an option',
      [
        { text: 'View Profile', onPress: () => console.log('View profile') },
        { text: 'Block User', style: 'destructive', onPress: () => console.log('Block user') },
        { text: 'Report User', style: 'destructive', onPress: () => console.log('Report user') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.sender === 'me';
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText
          ]}>
            {item.text}
          </Text>
          <Text style={[
            styles.timestampText,
            isMyMessage ? styles.myTimestampText : styles.otherTimestampText
          ]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={24} color="black" />
            </TouchableOpacity>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{recipientName || 'Chat'}</Text>
            </View>
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="black" />
          </TouchableOpacity>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{recipientName || 'Chat'}</Text>
            <View style={styles.statusRow}>
              {recipientOnline && <View style={styles.onlineIndicator} />}
              <Text style={[styles.userStatus, recipientOnline && styles.userStatusOnline]}>
                {recipientOnline ? 'Online' : formatLastSeen(recipientLastSeen)}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={handleMoreOptionsPress}>
              <Ionicons name="ellipsis-vertical" size={22} color="#4A90E2" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation!</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        <SafeAreaView>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              multiline
              maxLength={500}
              editable={!sending}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (message.trim() && !sending) ? styles.sendButtonActive : styles.sendButtonInactive
              ]}
              onPress={handleSendMessage}
              disabled={!message.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#999" />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={message.trim() ? 'white' : '#999'}
                />
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ChatConversationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  userInfo: {
    flex: 1,
    marginLeft: 15,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  userStatus: {
    fontSize: 13,
    color: '#999',
  },
  userStatusOnline: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 5,
  },
  chatContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 8,
  },
  messagesList: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  messageContainer: {
    marginVertical: 4,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  myMessageBubble: {
    backgroundColor: '#4A90E2',
  },
  otherMessageBubble: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: '#333',
  },
  timestampText: {
    fontSize: 12,
    marginTop: 4,
  },
  myTimestampText: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherTimestampText: {
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#4A90E2',
  },
  sendButtonInactive: {
    backgroundColor: '#F0F0F0',
  },
});