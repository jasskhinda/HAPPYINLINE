import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert, Platform, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { getCurrentUser, signOut } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';
import { getProviderShop } from '../../../lib/providerAuth';
import { removePushToken } from '../../../lib/notifications';
import Toast from 'react-native-toast-message';

const ProviderProfileScreen = () => {
  const navigation = useNavigation();
  const [profile, setProfile] = useState(null);
  const [shop, setShop] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const loadData = async () => {
    try {
      const { profile: p } = await getCurrentUser();
      setProfile(p);
      const shopResult = await getProviderShop();
      if (shopResult.success) {
        setShop(shopResult.shop);
        setRole(shopResult.role);
      }
    } catch (error) {
      console.error('Profile load error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await removePushToken();
          await signOut();
          navigation.reset({ index: 0, routes: [{ name: 'SplashScreen' }] });
        },
      },
    ]);
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Required', 'Please fill in both fields.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Too Short', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Your password has been updated.');
        setShowPasswordModal(false);
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const MenuItem = ({ icon, label, onPress, color = '#333', iconBg = '#F0F0F0', showArrow = true, isLast = false }) => (
    <TouchableOpacity
      style={[styles.menuItem, isLast && styles.menuItemLast]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={color === '#FF3B30' ? '#FF3B30' : '#FFF'} />
        </View>
        <Text style={[styles.menuItemText, color === '#FF3B30' && { color: '#FF3B30' }]}>{label}</Text>
      </View>
      {showArrow && <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        <Text style={styles.screenTitle}>Profile</Text>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={['#4A90E2', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileGradientHeader}
          />
          <View style={styles.avatarWrapper}>
            {profile?.profile_image ? (
              <Image source={{ uri: profile.profile_image }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={38} color="#9CA3AF" />
              </View>
            )}
          </View>
          <Text style={styles.profileName}>{profile?.name || 'Business Owner'}</Text>
          <Text style={styles.profileEmail}>{profile?.email || ''}</Text>
          <LinearGradient
            colors={['#4A90E2', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.roleBadge}
          >
            <Text style={styles.roleText}>{profile?.role === 'barber' ? 'Provider' : (profile?.role || 'Owner')}</Text>
          </LinearGradient>
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => navigation.navigate('EditProfileScreen')}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={16} color="#4A90E2" style={{ marginRight: 6 }} />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Business Section */}
        {shop && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BUSINESS</Text>
            <View style={styles.menuCard}>
              {role === 'owner' && (
                <>
                  <MenuItem
                    icon="storefront"
                    label="Shop Settings"
                    iconBg="#4A90E2"
                    onPress={() => navigation.navigate('ShopSettingsScreen', { shopId: shop.id })}
                  />
                  <MenuItem
                    icon="people"
                    label="Providers"
                    iconBg="#34C759"
                    onPress={() => navigation.navigate('StaffManagementScreen', { shopId: shop.id })}
                  />
                  <MenuItem
                    icon="list"
                    label="Services"
                    iconBg="#9C27B0"
                    onPress={() => navigation.navigate('ServicesManagementScreen', { shopId: shop.id })}
                  />
                  <MenuItem
                    icon="time"
                    label="Operating Hours"
                    iconBg="#FF9500"
                    onPress={() => navigation.navigate('OperatingHoursScreen', { shopId: shop.id })}
                  />
                  <MenuItem
                    icon="qr-code"
                    label="QR Code & Store ID"
                    iconBg="#6366F1"
                    onPress={() => navigation.navigate('ShopQRCodeScreen', { shopId: shop.id, shopName: shop.name })}
                  />
                </>
              )}
              <MenuItem
                icon="calendar"
                label="Calendar View"
                iconBg="#00BCD4"
                onPress={() => navigation.navigate('CalendarScreen', { shopId: shop.id })}
                isLast
              />
            </View>
          </View>
        )}

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="lock-closed"
              label="Change Password"
              iconBg="#FF9500"
              onPress={() => setShowPasswordModal(true)}
            />
            <MenuItem
              icon="log-out"
              label="Sign Out"
              onPress={handleSignOut}
              color="#FF3B30"
              iconBg="rgba(255, 59, 48, 0.12)"
              showArrow={false}
              isLast
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Happy InLine Business v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="New Password"
              placeholderTextColor="#999"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Confirm Password"
              placeholderTextColor="#999"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword(''); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleChangePassword}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  screenTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1A1A2E',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    letterSpacing: -0.5,
  },

  // Profile Card
  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginHorizontal: 20,
    alignItems: 'center',
    marginBottom: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#4A90E2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  profileGradientHeader: {
    width: '100%',
    height: 90,
  },
  avatarWrapper: {
    marginTop: -48,
    marginBottom: 14,
    borderRadius: 48,
    padding: 3,
    backgroundColor: '#FFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  profileImagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  profileEmail: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 18,
  },
  roleText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '700',
    textTransform: 'capitalize',
    letterSpacing: 0.5,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0E7FF',
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 10,
    marginBottom: 24,
    backgroundColor: '#F8FAFF',
  },
  editProfileText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    paddingHorizontal: 24,
    marginBottom: 10,
    letterSpacing: 1.2,
  },

  // Menu
  menuCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F5',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A2E',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F0F0F5',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 11,
    color: '#C7C7CC',
    letterSpacing: 0.3,
  },
});

export default ProviderProfileScreen;
