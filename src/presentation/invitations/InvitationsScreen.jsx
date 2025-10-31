import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { fetchPendingInvitations, acceptInvitation, declineInvitation } from '../../lib/shopAuth';

const InvitationsScreen = ({ navigation }) => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      const result = await fetchPendingInvitations();
      if (result.success) {
        setInvitations(result.invitations || []);
      } else {
        Alert.alert('Error', result.error || 'Failed to load invitations');
      }
    } catch (error) {
      console.error('❌ Error loading invitations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInvitations();
  };

  const handleAccept = async (invitation) => {
    Alert.alert(
      'Accept Invitation',
      `Join ${invitation.shops?.name || 'this shop'} as ${invitation.role}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              setProcessingId(invitation.id);
              const result = await acceptInvitation(invitation.id);
              
              if (result.success) {
                Alert.alert(
                  'Success!',
                  `You are now ${invitation.role === 'manager' ? 'a manager' : 'a barber'} at ${invitation.shops?.name}`,
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Reload invitations
                        loadInvitations();
                        // Navigate to home
                        navigation.navigate('Home');
                      }
                    }
                  ]
                );
              } else {
                Alert.alert('Error', result.error || 'Failed to accept invitation');
              }
            } catch (error) {
              console.error('❌ Error accepting invitation:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setProcessingId(null);
            }
          }
        }
      ]
    );
  };

  const handleDecline = async (invitation) => {
    Alert.alert(
      'Decline Invitation',
      `Decline invitation from ${invitation.shops?.name || 'this shop'}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingId(invitation.id);
              const result = await declineInvitation(invitation.id);
              
              if (result.success) {
                // Remove from list
                setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
                Alert.alert('Success', 'Invitation declined');
              } else {
                Alert.alert('Error', result.error || 'Failed to decline invitation');
              }
            } catch (error) {
              console.error('❌ Error declining invitation:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setProcessingId(null);
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) {
      return 'Expires today';
    } else if (diffDays === 1) {
      return 'Expires tomorrow';
    } else {
      return `Expires in ${diffDays} days`;
    }
  };

  const getRoleIcon = (role) => {
    return role === 'manager' ? 'briefcase' : 'cut';
  };

  const getRoleColor = (role) => {
    return role === 'manager' ? '#2196F3' : '#FF9800';
  };

  const renderInvitation = ({ item }) => {
    const isProcessing = processingId === item.id;
    const roleColor = getRoleColor(item.role);

    return (
      <View style={styles.invitationCard}>
        {/* Shop Logo/Icon */}
        <View style={[styles.shopIcon, { backgroundColor: roleColor + '20' }]}>
          <Ionicons name="storefront" size={32} color={roleColor} />
        </View>

        {/* Invitation Details */}
        <View style={styles.invitationContent}>
          {/* Shop Name */}
          <Text style={styles.shopName} numberOfLines={1}>
            {item.shops?.name || 'Shop'}
          </Text>

          {/* Role Badge */}
          <View style={styles.roleRow}>
            <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
              <Ionicons name={getRoleIcon(item.role)} size={14} color="#FFF" />
              <Text style={styles.roleText}>{item.role.toUpperCase()}</Text>
            </View>
          </View>

          {/* Shop Address */}
          {item.shops?.address && (
            <View style={styles.addressRow}>
              <Ionicons name="location" size={14} color="#666" />
              <Text style={styles.addressText} numberOfLines={1}>
                {item.shops.address}
              </Text>
            </View>
          )}

          {/* Invited By */}
          {item.invited_by_profile?.name && (
            <View style={styles.invitedByRow}>
              <Ionicons name="person" size={14} color="#666" />
              <Text style={styles.invitedByText}>
                Invited by {item.invited_by_profile.name}
              </Text>
            </View>
          )}

          {/* Message */}
          {item.message && (
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{item.message}</Text>
            </View>
          )}

          {/* Expiration */}
          <View style={styles.expirationRow}>
            <Ionicons name="time-outline" size={14} color="#999" />
            <Text style={styles.expirationText}>
              {formatDate(item.expires_at)}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.declineButton, isProcessing && styles.buttonDisabled]}
              onPress={() => handleDecline(item)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#666" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={20} color="#666" />
                  <Text style={styles.declineButtonText}>Decline</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acceptButton, isProcessing && styles.buttonDisabled]}
              onPress={() => handleAccept(item)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="mail-open-outline" size={80} color="#CCC" />
      <Text style={styles.emptyTitle}>No Invitations</Text>
      <Text style={styles.emptyText}>
        You don't have any pending shop invitations at the moment.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shop Invitations</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading invitations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shop Invitations</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Invitations List */}
      <FlatList
        data={invitations}
        renderItem={renderInvitation}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContainer,
          invitations.length === 0 && styles.listContainerEmpty
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B6B']}
          />
        }
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    padding: 15,
  },
  listContainerEmpty: {
    flex: 1,
  },
  invitationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shopIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  invitationContent: {
    flex: 1,
  },
  shopName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  addressText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  invitedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  invitedByText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  messageBox: {
    backgroundColor: '#F8F8F8',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B6B',
  },
  messageText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  expirationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  expirationText: {
    fontSize: 12,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    gap: 6,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    gap: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default InvitationsScreen;
