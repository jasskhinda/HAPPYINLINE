import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';

import FlexibleInputField from '../../../../components/inputTextField/FlexibleInputField';
import { supabase } from '../../../../lib/supabase';
import { getCurrentUser } from '../../../../lib/auth';
import { getShopStaff } from '../../../../lib/shopAuth';
import { getOrCreateConversation, getUserConversations } from '../../../../lib/messaging';

/**
 * Standalone Chat Staff List Screen
 * Used for exclusive customers to select who to message from their linked shop
 * Shows staff with Provider/ADMIN tags
 */
const ChatStaffListScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  // Check if this screen is being used as a tab (no back button needed)
  const isTabScreen = route.name === 'ChatScreen';
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shopStaff, setShopStaff] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [shopId, setShopId] = useState(null);
  const [shopName, setShopName] = useState('');
  const pollingRef = useRef(null);

  // Lightweight refresh that only updates conversations (no loading flash)
  const refreshConversations = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const convResult = await getUserConversations(currentUserId);
      if (convResult.success) {
        setConversations(convResult.conversations);
      }
    } catch (error) {
      // Silent fail for background polling
    }
  }, [currentUserId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      // Start polling while screen is focused
      pollingRef.current = setInterval(() => {
        refreshConversations();
      }, 5000);

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      };
    }, [refreshConversations])
  );

  const loadData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { profile } = await getCurrentUser();
      if (!profile) {
        Alert.alert('Error', 'Please log in to access messages');
        return;
      }

      setCurrentUserId(profile.id);

      // Get the shop ID (exclusive customers have exclusive_shop_id)
      const customerShopId = profile.exclusive_shop_id;

      if (!customerShopId) {
        Alert.alert('No Shop', 'You are not linked to any shop. Messages are only available for shop customers.');
        setLoading(false);
        return;
      }

      setShopId(customerShopId);

      // Get shop details including owner
      const { data: shopData } = await supabase
        .from('shops')
        .select('name, created_by')
        .eq('id', customerShopId)
        .single();

      if (shopData) {
        setShopName(shopData.name);
      }

      // Load shop staff (providers + admin)
      const { success, staff, error } = await getShopStaff(customerShopId);

      let allStaff = staff || [];

      // Check if shop owner is already in staff list
      const ownerInStaff = allStaff.some(s => s.user?.id === shopData?.created_by);

      // If owner is not in staff list, fetch and add them
      if (shopData?.created_by && !ownerInStaff) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('id, name, email, phone, profile_image')
          .eq('id', shopData.created_by)
          .single();

        if (ownerProfile) {
          // Add owner as virtual staff entry with admin role
          allStaff = [
            {
              id: `owner-${ownerProfile.id}`,
              role: 'admin',
              bio: null,
              specialties: [],
              user: ownerProfile,
            },
            ...allStaff,
          ];
        }
      }

      // Sort: admin/owner first, then by name
      const sortedStaff = allStaff.sort((a, b) => {
        const aIsAdmin = a.role === 'admin' || a.role === 'owner';
        const bIsAdmin = b.role === 'admin' || b.role === 'owner';
        if (aIsAdmin && !bIsAdmin) return -1;
        if (!aIsAdmin && bIsAdmin) return 1;
        return (a.user?.name || '').localeCompare(b.user?.name || '');
      });
      setShopStaff(sortedStaff);

      // Load existing conversations to show unread counts
      const convResult = await getUserConversations(profile.id);
      if (convResult.success) {
        setConversations(convResult.conversations);
      }

    } catch (error) {
      console.error('Error loading chat data:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSelectStaff = async (staffMember) => {
    try {
      const recipientId = staffMember.user?.id;
      const recipientName = staffMember.user?.name || 'Staff';

      if (!recipientId || !currentUserId) {
        Alert.alert('Error', 'Unable to start conversation');
        return;
      }

      // Get or create conversation
      const result = await getOrCreateConversation(currentUserId, recipientId, shopId);

      if (result.success) {
        navigation.navigate('ChatConversationScreen', {
          conversationId: result.conversationId,
          recipientName: recipientName,
          recipientId: recipientId,
        });
      } else {
        Alert.alert('Error', result.error || 'Failed to start conversation');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      Alert.alert('Error', 'Failed to start conversation');
    }
  };

  const getUnreadCount = (staffUserId) => {
    // Find conversation with this staff member and get unread count
    const conversation = conversations.find(c =>
      (c.user1_id === staffUserId && c.user2_id === currentUserId) ||
      (c.user2_id === staffUserId && c.user1_id === currentUserId)
    );

    if (!conversation) return 0;

    // Check which user's unread count to show
    if (conversation.user1_id === currentUserId) {
      return conversation.user1_unread_count || 0;
    } else {
      return conversation.user2_unread_count || 0;
    }
  };

  const getRoleTag = (role) => {
    // Owner/admin roles get ADMIN tag
    if (role === 'admin' || role === 'owner') {
      return { label: 'ADMIN', color: '#9333EA', bgColor: '#9333EA20' };
    }
    return { label: 'Provider', color: '#3B82F6', bgColor: '#3B82F620' };
  };

  const filteredStaff = shopStaff.filter(staff => {
    if (!searchQuery.trim()) return true;
    const name = staff.user?.name?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return name.includes(query);
  });

  if (loading) {
    return (
      <View style={styles.outerWrapper}>
        <SafeAreaView style={styles.appBarWrapper} edges={['top', 'left', 'right']}>
          <View style={[styles.appBar, isTabScreen && styles.appBarTab]}>
            {!isTabScreen && (
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="chevron-back" size={24} color="#333" />
              </TouchableOpacity>
            )}
            <View style={styles.titleContainer}>
              <Text style={styles.titleText}>Messages</Text>
            </View>
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!shopId) {
    return (
      <View style={styles.outerWrapper}>
        <SafeAreaView style={styles.appBarWrapper} edges={['top', 'left', 'right']}>
          <View style={[styles.appBar, isTabScreen && styles.appBarTab]}>
            {!isTabScreen && (
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="chevron-back" size={24} color="#333" />
              </TouchableOpacity>
            )}
            <View style={styles.titleContainer}>
              <Text style={styles.titleText}>Messages</Text>
            </View>
          </View>
        </SafeAreaView>
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No Shop Linked</Text>
          <Text style={styles.emptySubtext}>
            Messages are available for shop customers only
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.outerWrapper}>
      <SafeAreaView style={styles.appBarWrapper} edges={['top', 'left', 'right']}>
        <View style={[styles.appBar, isTabScreen && styles.appBarTab]}>
          {!isTabScreen && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#333" />
            </TouchableOpacity>
          )}
          <View style={styles.titleContainer}>
            <Text style={styles.titleText}>Messages</Text>
            {shopName && (
              <Text style={styles.shopNameText}>{shopName}</Text>
            )}
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#4A90E2']}
            />
          }
        >
          <View style={styles.searchWrapper}>
            <FlexibleInputField
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search staff..."
              showPrefixIcon={true}
              prefixIcon={<Ionicons name="search" size={20} color="#999" />}
            />
          </View>

          <Text style={styles.sectionTitle}>Choose who to message:</Text>

          {filteredStaff.length === 0 ? (
            <View style={styles.noResultsContainer}>
              <Ionicons name="people-outline" size={48} color="#CCC" />
              <Text style={styles.noResultsText}>
                {searchQuery ? 'No staff found' : 'No staff available'}
              </Text>
            </View>
          ) : (
            filteredStaff.map((staff) => {
              const roleTag = getRoleTag(staff.role);
              const unreadCount = getUnreadCount(staff.user?.id);

              return (
                <TouchableOpacity
                  key={staff.id}
                  style={styles.staffCard}
                  onPress={() => handleSelectStaff(staff)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={
                      staff.user?.profile_image
                        ? { uri: staff.user.profile_image }
                        : require('../../../../../assets/logowithouttagline.png')
                    }
                    style={styles.staffImage}
                    resizeMode="cover"
                  />

                  <View style={styles.staffInfo}>
                    <View style={styles.staffNameRow}>
                      <Text style={styles.staffName} numberOfLines={1}>
                        {staff.user?.name || 'Staff Member'}
                      </Text>
                      <View style={[styles.roleTag, { backgroundColor: roleTag.bgColor }]}>
                        <Text style={[styles.roleTagText, { color: roleTag.color }]}>
                          {roleTag.label}
                        </Text>
                      </View>
                    </View>
                    {staff.bio && (
                      <Text style={styles.staffBio} numberOfLines={1}>
                        {staff.bio}
                      </Text>
                    )}
                    {staff.specialties && staff.specialties.length > 0 && (
                      <Text style={styles.staffSpecialties} numberOfLines={1}>
                        {staff.specialties.join(' • ')}
                      </Text>
                    )}
                  </View>

                  <View style={styles.staffRight}>
                    {unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={20} color="#CCC" />
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {/* Previous Chats Section */}
          {conversations.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Previous Chats</Text>
              {conversations.map((conv) => {
                // Find the other user in the conversation
                const isUser1 = conv.user1_id === currentUserId;
                const otherUserId = isUser1 ? conv.user2_id : conv.user1_id;
                const unreadCount = isUser1 ? (conv.user1_unread_count || 0) : (conv.user2_unread_count || 0);

                // Get the staff member info for this conversation
                const staffMember = shopStaff.find(s => s.user?.id === otherUserId);
                const recipientName = staffMember?.user?.name || conv.other_user_name || 'Staff Member';
                const recipientImage = staffMember?.user?.profile_image || conv.other_user_avatar;

                // Format time
                const formatTime = (timestamp) => {
                  if (!timestamp) return '';
                  const date = new Date(timestamp);
                  const now = new Date();
                  const diffInHours = (now - date) / (1000 * 60 * 60);

                  if (diffInHours < 24) {
                    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                  } else if (diffInHours < 168) {
                    return date.toLocaleDateString('en-US', { weekday: 'short' });
                  } else {
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }
                };

                return (
                  <TouchableOpacity
                    key={conv.id}
                    style={styles.chatCard}
                    onPress={() => navigation.navigate('ChatConversationScreen', {
                      conversationId: conv.id,
                      recipientName: recipientName,
                      recipientId: otherUserId,
                    })}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={
                        recipientImage
                          ? { uri: recipientImage }
                          : require('../../../../../assets/logowithouttagline.png')
                      }
                      style={styles.staffImage}
                      resizeMode="cover"
                    />

                    <View style={styles.chatInfo}>
                      <View style={styles.chatHeader}>
                        <Text style={styles.staffName} numberOfLines={1}>
                          {recipientName}
                        </Text>
                        <Text style={styles.chatTime}>
                          {formatTime(conv.last_message_at)}
                        </Text>
                      </View>
                      <Text style={styles.lastMessage} numberOfLines={1}>
                        {conv.last_message_text || 'No messages yet'}
                      </Text>
                    </View>

                    <View style={styles.staffRight}>
                      {unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={20} color="#CCC" />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

export default ChatStaffListScreen;

const styles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  appBarWrapper: {
    backgroundColor: '#F8F9FA',
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  appBarTab: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 5,
    marginRight: 5,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    fontWeight: 'bold',
    fontSize: 20,
    color: 'black',
  },
  shopNameText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  searchWrapper: {
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 10,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
    textAlign: 'center',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  staffCard: {
    marginHorizontal: 15,
    marginVertical: 6,
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  staffImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F0F0',
  },
  staffInfo: {
    flex: 1,
    marginLeft: 12,
  },
  staffNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  staffName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  roleTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  staffBio: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  staffSpecialties: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  staffRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadBadge: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  chatCard: {
    marginHorizontal: 15,
    marginVertical: 6,
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatTime: {
    fontSize: 12,
    color: '#999',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
});
