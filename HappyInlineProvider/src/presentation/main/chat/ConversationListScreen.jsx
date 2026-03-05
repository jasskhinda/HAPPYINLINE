import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Image, TextInput, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getCurrentUser } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';

const POLL_INTERVAL = 5000; // Poll every 5 seconds

const ConversationListScreen = () => {
  const navigation = useNavigation();
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState(null);
  const pollingRef = useRef(null);

  const loadConversations = async () => {
    try {
      const { profile } = await getCurrentUser();
      if (!profile) return;
      setUserId(profile.id);

      // Get conversations where current user is a participant
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          user1:profiles!conversations_user1_id_fkey(id, name, profile_image),
          user2:profiles!conversations_user2_id_fkey(id, name, profile_image)
        `)
        .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Conversations query error:', error);
        return;
      }

      if (data) {
        // Get conversation IDs to count unread messages per conversation
        const conversationIds = data.map(c => c.id);
        let unreadCounts = {};

        if (conversationIds.length > 0) {
          const { data: unreadMessages, error: unreadError } = await supabase
            .from('messages')
            .select('conversation_id')
            .in('conversation_id', conversationIds)
            .eq('is_read', false)
            .neq('sender_id', profile.id);

          if (!unreadError && unreadMessages) {
            unreadMessages.forEach(msg => {
              unreadCounts[msg.conversation_id] = (unreadCounts[msg.conversation_id] || 0) + 1;
            });
          }
        }

        // Map to show the OTHER participant's info + unread count
        const mapped = data.map(conv => {
          const otherUser = conv.user1?.id === profile.id ? conv.user2 : conv.user1;
          return {
            ...conv,
            otherUser,
            unread_count: unreadCounts[conv.id] || 0,
          };
        });
        setConversations(mapped);
        setFilteredConversations(mapped);
      }
    } catch (error) {
      console.error('Load conversations error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    loadConversations();
    // Start polling while screen is focused
    pollingRef.current = setInterval(() => {
      loadConversations();
    }, POLL_INTERVAL);

    return () => {
      // Stop polling when screen loses focus
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []));

  useEffect(() => {
    if (search.trim()) {
      const filtered = conversations.filter(c =>
        c.otherUser?.name?.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredConversations(filtered);
    } else {
      setFilteredConversations(conversations);
    }
  }, [search, conversations]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString();
  };

  const renderConversation = ({ item }) => (
    <TouchableOpacity
      style={styles.conversationCard}
      onPress={() => navigation.navigate('ChatConversationScreen', {
        conversationId: item.id,
        recipientId: item.otherUser?.id,
        recipientName: item.otherUser?.name,
      })}
    >
      {item.otherUser?.profile_image ? (
        <Image source={{ uri: item.otherUser.profile_image }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={24} color="#666" />
        </View>
      )}
      <View style={styles.conversationInfo}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{item.otherUser?.name || 'Customer'}</Text>
          <Text style={styles.time}>{formatTime(item.last_message_at || item.updated_at)}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.last_message_text || 'No messages yet'}
        </Text>
      </View>
      {item.unread_count > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unread_count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.screenTitle}>Messages</Text>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={60} color="#CCC" />
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>Messages from customers will appear here</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  screenTitle: { fontSize: 28, fontWeight: 'bold', color: '#000', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EBEBEB',
    borderRadius: 12, marginHorizontal: 20, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  conversationCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center',
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  conversationInfo: { flex: 1, marginLeft: 12 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: '#000', flex: 1 },
  time: { fontSize: 12, color: '#999', marginLeft: 8 },
  lastMessage: { fontSize: 14, color: '#666', marginTop: 4 },
  unreadBadge: {
    backgroundColor: '#4A90E2', borderRadius: 12, minWidth: 24, height: 24,
    justifyContent: 'center', alignItems: 'center', marginLeft: 8, paddingHorizontal: 6,
  },
  unreadText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#CCC', marginTop: 8 },
});

export default ConversationListScreen;
