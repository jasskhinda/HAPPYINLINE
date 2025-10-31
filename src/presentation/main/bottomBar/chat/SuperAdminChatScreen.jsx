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
import { getCurrentUser } from '../../../../lib/auth';
import {
  getOrCreateConversation,
  getConversationMessages,
  sendMessage,
  markConversationAsRead,
  subscribeToMessages,
  unsubscribeFromMessages,
} from '../../../../lib/messaging';

const SuperAdminChatScreen = ({ route, navigation }) => {
  const { shopId, shopName, managerId, managerName, managerEmail } = route.params;

  const [currentUserId, setCurrentUserId] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const flatListRef = useRef(null);
  const messageSubscription = useRef(null);

  useEffect(() => {
    initializeChat();

    return () => {
      // Cleanup subscription on unmount
      if (messageSubscription.current) {
        unsubscribeFromMessages(messageSubscription.current);
      }
    };
  }, []);

  const initializeChat = async () => {
    try {
      setLoading(true);

      // Get current user (super admin)
      const { user, profile } = await getCurrentUser();
      if (!user || !profile) {
        Alert.alert('Error', 'Unable to load user profile');
        navigation.goBack();
        return;
      }

      setCurrentUserId(profile.id);

      // Get or create conversation between super admin and shop manager
      const { success, conversationId: convId, error } = await getOrCreateConversation(
        profile.id,
        managerId,
        shopId
      );

      if (!success) {
        Alert.alert('Error', error || 'Failed to load conversation');
        navigation.goBack();
        return;
      }

      setConversationId(convId);

      // Load existing messages
      await loadMessages(convId);

      // Mark conversation as read
      await markConversationAsRead(convId, profile.id);

      // Subscribe to new messages (real-time)
      messageSubscription.current = subscribeToMessages(convId, (newMessage) => {
        console.log('📩 New message received:', newMessage);
        setMessages((prev) => [...prev, newMessage]);

        // Auto scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        // Mark as read if not from me
        if (newMessage.sender_id !== profile.id) {
          markConversationAsRead(convId, profile.id);
        }
      });

      setLoading(false);
    } catch (err) {
      console.error('Error initializing chat:', err);
      Alert.alert('Error', 'Failed to load chat');
      setLoading(false);
    }
  };

  const loadMessages = async (convId) => {
    try {
      const { success, messages: messagesData, error } = await getConversationMessages(convId);

      if (success) {
        setMessages(messagesData || []);

        // Auto scroll to bottom after loading
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 100);
      } else {
        console.error('Failed to load messages:', error);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !conversationId || !currentUserId || sending) {
      return;
    }

    const messageText = message.trim();
    setMessage(''); // Clear input immediately for better UX
    setSending(true);

    try {
      const { success, message: newMessage, error } = await sendMessage(
        conversationId,
        currentUserId,
        messageText
      );

      if (success) {
        // Message will be added via real-time subscription
        console.log('✅ Message sent successfully');

        // Auto scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Error', error || 'Failed to send message');
        setMessage(messageText); // Restore message on error
      }
    } catch (err) {
      console.error('Error sending message:', err);
      Alert.alert('Error', 'Failed to send message');
      setMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.sender_id === currentUserId;
    const showDate =
      index === 0 ||
      formatDate(messages[index - 1]?.created_at) !== formatDate(item.created_at);

    return (
      <>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
        )}
        <View
          style={[
            styles.messageContainer,
            isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
          ]}
        >
          <View
            style={[
              styles.messageBubble,
              isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isMyMessage ? styles.myMessageText : styles.otherMessageText,
              ]}
            >
              {item.message_text}
            </Text>
            <Text
              style={[
                styles.timeText,
                isMyMessage ? styles.myTimeText : styles.otherTimeText,
              ]}
            >
              {formatTime(item.created_at)}
            </Text>
          </View>
        </View>
      </>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{managerName}</Text>
            <Text style={styles.headerSubtitle}>{shopName}</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{managerName}</Text>
            <Text style={styles.headerSubtitle}>{shopName}</Text>
          </View>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() =>
              Alert.alert(
                'Manager Info',
                `Name: ${managerName}\nEmail: ${managerEmail}\nShop: ${shopName}`,
                [{ text: 'OK' }]
              )
            }
          >
            <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Admin Notice */}
        <View style={styles.adminNotice}>
          <Ionicons name="shield-checkmark" size={16} color="#FF6B35" />
          <Text style={styles.adminNoticeText}>
            Super Admin messaging shop manager
          </Text>
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={60} color="#CCC" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>
                Start a conversation with the shop manager
              </Text>
            </View>
          }
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!message.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!message.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  infoButton: {
    padding: 8,
  },
  adminNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  adminNoticeText: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  messagesContainer: {
    paddingVertical: 16,
    flexGrow: 1,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  myMessageBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myMessageText: {
    color: '#FFF',
  },
  otherMessageText: {
    color: '#333',
  },
  timeText: {
    fontSize: 11,
    marginTop: 4,
  },
  myTimeText: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'right',
  },
  otherTimeText: {
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 8,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
    marginRight: 12,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
  },
});

export default SuperAdminChatScreen;
