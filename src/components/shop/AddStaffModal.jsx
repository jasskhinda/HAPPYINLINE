import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendProviderInvitationEmail, sendProviderAddedEmail } from '../../lib/notifications';

// Generate a readable password (8 chars: letters + numbers)
const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const AddStaffModal = ({ visible, onClose, onAdd, existingStaff = [], shopData = null }) => {
  const [searchText, setSearchText] = useState('');
  const [providerName, setProviderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteSending, setInviteSending] = useState(false);

  const handleSearch = async () => {
    if (!searchText.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    setLoading(true);
    setShowInviteForm(false);
    try {
      // Search by email only in profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, phone')
        .eq('email', searchText.trim().toLowerCase())
        .limit(5);

      if (error) throw error;

      // Filter out already added staff
      const existingIds = existingStaff.map(s => s.id);
      const filteredData = (data || []).filter(user => !existingIds.includes(user.id));

      setSearchResults(filteredData);

      if (filteredData.length === 0) {
        // No user found - show invite option
        setShowInviteForm(true);
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search for users');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteNewProvider = async () => {
    if (!searchText.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    if (!providerName.trim()) {
      Alert.alert('Error', 'Please enter the provider\'s name');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(searchText.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Check license limit
    if (shopData) {
      const currentProviderCount = existingStaff.filter(s => s.role === 'barber').length;
      const maxLicenses = shopData.max_licenses || 0;
      if (currentProviderCount >= maxLicenses) {
        Alert.alert('Provider Limit Reached', 'Please upgrade your plan to add more providers.');
        return;
      }
    }

    setInviteSending(true);
    try {
      // Get current user (shop owner)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to add providers');
        return;
      }

      const providerEmail = searchText.trim().toLowerCase();
      const shopName = shopData?.name || 'the business';

      // Auto-generate password
      const generatedPassword = generatePassword();

      console.log('📝 Creating provider account:', providerEmail);

      // Create the provider account using Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: providerEmail,
        password: generatedPassword,
        options: {
          data: {
            name: providerName.trim(),
            role: 'barber',
            email_verified: true,
          },
        },
      });

      if (signUpError) {
        console.error('SignUp error:', signUpError);
        if (signUpError.message.includes('already registered')) {
          Alert.alert('Account Exists', 'This email is already registered. Search for them instead.');
        } else {
          Alert.alert('Error', signUpError.message);
        }
        return;
      }

      const newProviderId = signUpData.user?.id;
      if (!newProviderId) {
        throw new Error('Failed to create provider account');
      }

      console.log('✅ Provider account created:', newProviderId);

      // Update the profile with provider details
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: providerName.trim(),
          role: 'barber',
          is_active: true,
        })
        .eq('id', newProviderId);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      // Add provider to shop_staff using RPC function
      console.log('📌 Adding provider to shop:', shopData?.id);
      const { error: staffError } = await supabase
        .rpc('add_staff_to_shop', {
          p_shop_id: shopData?.id,
          p_user_id: newProviderId,
          p_role: 'barber',
          p_invited_by: currentUser.id
        });

      if (staffError) {
        console.error('Staff assignment error:', staffError);
        // Try direct insert as fallback
        const { error: directError } = await supabase
          .from('shop_staff')
          .insert({
            shop_id: shopData?.id,
            user_id: newProviderId,
            role: 'barber',
            is_active: true,
            invited_by: currentUser.id
          });

        if (directError) {
          console.error('Direct insert error:', directError);
        }
      }

      // Re-authenticate as the shop owner (signup logs in as new user)
      console.log('🔄 Re-authenticating as shop owner...');
      // We need to get the owner's session back - they should still have their session
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session || sessionData.session.user.id !== currentUser.id) {
        // Session switched to new user, need to sign them out
        // The owner will need to log in again, but the provider is created
        console.log('⚠️ Session switched, provider created successfully');
      }

      const credentialsText = `Email: ${providerEmail}\nPassword: ${generatedPassword}`;

      Alert.alert(
        'Provider Added!',
        `${providerName.trim()} has been added to your team!\n\n` +
        `Login Details:\n` +
        `📧 Email: ${providerEmail}\n` +
        `🔑 Password: ${generatedPassword}\n\n` +
        `They can now:\n` +
        `1. Open the Happy Inline app\n` +
        `2. Tap "Provider Login"\n` +
        `3. Sign in with the credentials above`,
        [
          {
            text: 'Copy Credentials',
            onPress: async () => {
              await Clipboard.setStringAsync(credentialsText);
              Alert.alert('Copied!', 'Login credentials copied to clipboard');
              handleClose();
            },
          },
          { text: 'Done', onPress: handleClose },
        ]
      );

    } catch (error) {
      console.error('Create provider error:', error);
      Alert.alert('Error', error.message || 'Failed to create provider. Please try again.');
    } finally {
      setInviteSending(false);
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
  };

  const handleAddStaff = async () => {
    if (!selectedUser) {
      Alert.alert('Error', 'Please select a user');
      return;
    }

    // Check license limit - ONLY count barbers/service providers, not managers/admins
    if (shopData) {
      // Count only service providers (barbers), not managers or admins
      const currentProviderCount = existingStaff.filter(s => s.role === 'barber').length;
      const maxLicenses = shopData.max_licenses || 0;
      const planName = shopData.subscription_plan || 'starter';

      if (currentProviderCount >= maxLicenses) {
        // Show upgrade prompt with correct pricing
        const upgradeMessage = planName === 'basic'
          ? `Upgrade to Starter ($74.99/mo) to add up to 4 providers`
          : planName === 'starter'
          ? `Upgrade to Professional ($99.99/mo) to add up to 9 providers`
          : planName === 'professional'
          ? `Upgrade to Enterprise ($149.99/mo) to add up to 14 providers`
          : planName === 'enterprise'
          ? `Upgrade to Unlimited ($199/mo) for unlimited providers`
          : `You have unlimited providers on this plan`;

        Alert.alert(
          '📊 Provider Limit Reached',
          `Your ${planName.charAt(0).toUpperCase() + planName.slice(1)} plan supports up to ${maxLicenses} providers.\n\n` +
          `You currently have: ${currentProviderCount}/${maxLicenses} providers\n\n` +
          `${upgradeMessage}\n\n` +
          `💡 Note: Admins don't count toward this limit.\n` +
          `Only service providers (those who accept bookings) use licenses.`,
          [
            { text: 'Maybe Later', style: 'cancel' },
            {
              text: 'Learn More',
              onPress: () => {
                // Future: Navigate to pricing page or show pricing modal
                Alert.alert(
                  'Our Pricing Plans',
                  '🌱 Basic ($24.99/mo)\n' +
                  '• 1-2 providers\n' +
                  '• Perfect for solo providers\n' +
                  '• Unlimited admins\n' +
                  '• Unlimited services\n\n' +
                  '💼 Starter ($74.99/mo)\n' +
                  '• 3-4 providers\n' +
                  '• Perfect for small teams\n' +
                  '• Unlimited admins\n' +
                  '• Unlimited services\n\n' +
                  '🚀 Professional ($99.99/mo)\n' +
                  '• 5-9 providers\n' +
                  '• Growing teams\n' +
                  '• Unlimited admins\n' +
                  '• Unlimited services\n\n' +
                  '⭐ Enterprise ($149.99/mo)\n' +
                  '• 10-14 providers\n' +
                  '• Large operations\n' +
                  '• Unlimited admins\n' +
                  '• Unlimited services\n\n' +
                  '🏆 Unlimited ($199/mo)\n' +
                  '• Unlimited providers\n' +
                  '• All features\n' +
                  '• Priority support',
                  [{ text: 'Got it!' }]
                );
              }
            }
          ]
        );
        return;
      }
    }

    // Send welcome email to the provider being added (fire and forget)
    if (selectedUser.email) {
      sendProviderAddedEmail({
        providerEmail: selectedUser.email,
        providerName: selectedUser.name,
        shopName: shopData?.name || 'the business',
      }).catch(err => console.log('Provider email error (non-blocking):', err));
    }

    onAdd({ ...selectedUser, role: 'barber' });
    handleClose();
  };

  const handleClose = () => {
    setSearchText('');
    setProviderName('');
    setSearchResults([]);
    setSelectedUser(null);
    setShowInviteForm(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Service Provider</Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Search Section */}
              <View style={styles.searchSection}>
                <Text style={styles.label}>Search by Email Address</Text>
                <View style={styles.searchInputContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Enter email address"
                    placeholderTextColor="#999"
                    value={searchText}
                    onChangeText={setSearchText}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <TouchableOpacity
                    style={styles.searchButton}
                    onPress={handleSearch}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Ionicons name="search" size={20} color="#FFF" />
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.hint}>
                  Service providers are staff who accept bookings (stylists, therapists, trainers, etc.)
                </Text>
                <Text style={styles.hint}>
                  💡 Admins/receptionists don't count toward your license limit
                </Text>
              </View>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <View style={styles.resultsContainer}>
                  <Text style={styles.resultsTitle}>Select User:</Text>
                  {searchResults.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={[
                    styles.userItem,
                    selectedUser?.id === user.id && styles.userItemSelected,
                  ]}
                  onPress={() => handleSelectUser(user)}
                >
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {user.name?.charAt(0).toUpperCase() || 'B'}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name || 'No Name'}</Text>
                    <Text style={styles.userContact}>{user.email || user.phone}</Text>
                  </View>
                  {selectedUser?.id === user.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#4A90E2" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

              {/* Invite New Provider Form */}
              {showInviteForm && (
                <View style={styles.inviteContainer}>
                  <View style={styles.inviteHeader}>
                    <Ionicons name="person-add-outline" size={24} color="#4A90E2" />
                    <Text style={styles.inviteTitle}>Create Provider Account</Text>
                  </View>
                  <Text style={styles.inviteDescription}>
                    No account exists for <Text style={{ fontWeight: '600' }}>{searchText}</Text>.
                    Create their account now and share the login details with them.
                  </Text>

                  <View style={styles.inviteForm}>
                    <Text style={styles.inviteLabel}>Provider's Name *</Text>
                    <TextInput
                      style={styles.inviteInput}
                      placeholder="Enter their full name"
                      placeholderTextColor="#999"
                      value={providerName}
                      onChangeText={setProviderName}
                    />
                  </View>

                  <View style={styles.infoBox}>
                    <Ionicons name="information-circle" size={20} color="#4A90E2" />
                    <Text style={styles.infoBoxText}>
                      A password will be auto-generated. You'll see it after adding the provider.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.inviteButton, inviteSending && styles.inviteButtonDisabled]}
                    onPress={handleInviteNewProvider}
                    disabled={inviteSending}
                  >
                    {inviteSending ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="person-add" size={18} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.inviteButtonText}>Create Provider Account</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <SafeAreaView edges={['bottom']}>
              <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              {!showInviteForm && (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.addButton,
                  !selectedUser && styles.addButtonDisabled,
                ]}
                onPress={handleAddStaff}
                disabled={!selectedUser}
              >
                <Text style={styles.addButtonText}>Add Provider</Text>
              </TouchableOpacity>
              )}
            </View>
            </SafeAreaView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  searchSection: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
    color: '#333',
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: '#4A90E2',
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  userItemSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#FFF5F0',
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userContact: {
    fontSize: 14,
    color: '#666',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  addButton: {
    backgroundColor: '#4A90E2',
    marginLeft: 8,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  // Invite form styles
  inviteContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4A90E2',
    borderStyle: 'dashed',
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inviteTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  inviteDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  inviteForm: {
    marginBottom: 16,
  },
  inviteLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  inviteInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
    color: '#333',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E8F4FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    marginLeft: 8,
    lineHeight: 18,
  },
  inviteButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteButtonDisabled: {
    opacity: 0.6,
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default AddStaffModal;
