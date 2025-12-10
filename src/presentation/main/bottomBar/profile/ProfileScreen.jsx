import { Image, ScrollView, StyleSheet, Text, View, Dimensions, Alert, ActivityIndicator, Modal, TextInput, TouchableOpacity, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileComponent from './ui/ProfileComponent';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { signOut, getCurrentUser, sendEmailChangeOTP, verifyEmailChangeOTP, checkLicenseAvailability } from '../../../../lib/auth';
import { getMyShops, getCurrentShopId } from '../../../../lib/shopAuth';
import { getSubscriptionStatus } from '../../../../lib/stripe';
import { useState, useCallback } from 'react';

const { width, height } = Dimensions.get('window');

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('customer');
  const [profileRole, setProfileRole] = useState('customer'); // Platform-level role
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userShops, setUserShops] = useState([]);
  const [currentShop, setCurrentShop] = useState(null);
  
  // Email Change Modal with OTP
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);
  const [emailChangeStep, setEmailChangeStep] = useState('email'); // 'email' or 'otp'
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOTP, setVerifyingOTP] = useState(false);

  // Subscription data (read-only display)
  const [subscription, setSubscription] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [licenseInfo, setLicenseInfo] = useState({ currentCount: 0, maxLicenses: 0 });

  // Fetch user data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        try {
          setLoading(true);
          const { user, profile } = await getCurrentUser();

          if (profile) {
            // Store user ID for subscription operations
            setCurrentUserId(user?.id);

            setUserData({
              name: profile.name || 'User',
              email: profile.email || user?.email || '',
              profileImage: profile.profile_image || null,
            });
            setIsSuperAdmin(profile.is_platform_admin || false);
            setProfileRole(profile.role || 'customer'); // Store platform-level role

            // Fetch subscription data for owners from PROFILE (not shop)
            // This runs before shop fetch since subscription belongs to owner
            if (profile.role === 'owner' && user?.id) {
              try {
                setLoadingSubscription(true);
                const [subscriptionData, licenseData] = await Promise.all([
                  getSubscriptionStatus(user.id),
                  checkLicenseAvailability()
                ]);
                setSubscription(subscriptionData);
                setLicenseInfo({
                  currentCount: licenseData.currentCount || 0,
                  maxLicenses: licenseData.maxLicenses || 0
                });
              } catch (subError) {
                console.error('Error fetching subscription:', subError);
              } finally {
                setLoadingSubscription(false);
              }
            }

            // Get user's shops and roles
            const { shops, error } = await getMyShops();
            if (!error && shops && shops.length > 0) {
              setUserShops(shops);

              // Get current shop from AsyncStorage or use first shop
              const currentShopId = await getCurrentShopId();
              const activeShop = currentShopId
                ? shops.find(s => s.shop_id === currentShopId) || shops[0]
                : shops[0];

              setCurrentShop(activeShop);
              setUserRole(activeShop.user_role || 'customer');
            } else {
              setUserRole('customer');
              setCurrentShop(null);
            }
          }
        } catch (error) {
          console.error('❌ Error fetching user data:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchUserData();
    }, [])
  );

  const handleSendOTP = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Error', 'Please enter a new email address');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (newEmail === userData?.email) {
      Alert.alert('Error', 'New email is the same as current email');
      return;
    }

    // Super admin cannot change email
    if (isSuperAdmin) {
      Alert.alert('Restricted', 'Super Admin cannot change email address for security reasons');
      return;
    }

    try {
      setChangingEmail(true);
      const result = await sendEmailChangeOTP(newEmail);

      if (result.success) {
        // Move to OTP verification step
        setEmailChangeStep('otp');
        Alert.alert('OTP Sent', 'A 6-digit verification code has been sent to your new email address.');
      } else {
        Alert.alert('Error', result.error || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('❌ Error sending OTP:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setChangingEmail(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode.trim() || otpCode.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit verification code');
      return;
    }

    try {
      setVerifyingOTP(true);
      const result = await verifyEmailChangeOTP(newEmail, otpCode);

      if (result.success) {
        Alert.alert(
          'Email Changed',
          result.message || 'Your email has been updated successfully.',
          [{ text: 'OK', onPress: () => {
            setEmailModalVisible(false);
            setNewEmail('');
            setOtpCode('');
            setEmailChangeStep('email');
            // If requires relogin, navigate to login
            if (result.requiresRelogin) {
              handleLogout();
            }
          }}]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to verify code');
      }
    } catch (error) {
      console.error('❌ Error verifying OTP:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setVerifyingOTP(false);
    }
  };

  const resetEmailModal = () => {
    setEmailModalVisible(false);
    setNewEmail('');
    setOtpCode('');
    setEmailChangeStep('email');
  };

  // Open website for subscription management
  const handleManageSubscription = () => {
    Linking.openURL('https://www.happyinline.com/dashboard');
  };

  const getPlanIcon = (planKey) => {
    switch (planKey) {
      case 'basic': return 'person';
      case 'starter': return 'people';
      case 'professional': return 'briefcase';
      case 'enterprise': return 'business';
      case 'unlimited': return 'infinite';
      default: return 'card';
    }
  };

  const getPlanColor = (planKey) => {
    switch (planKey) {
      case 'basic': return '#8E8E93';
      case 'starter': return '#007AFF';
      case 'professional': return '#34C759';
      case 'enterprise': return '#FF9500';
      case 'unlimited': return '#AF52DE';
      default: return '#0393d5';
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              
              console.log('🚪 Logging out...');
              const result = await signOut();

              if (result.success) {
                console.log('✅ Logout successful');
                console.log('👤 Profile role:', profileRole);

                // Navigate based on user role
                let targetScreen = 'WelcomeScreen'; // Default to main welcome screen

                // Admins/owners go to BusinessLoginScreen
                if (profileRole === 'admin' || profileRole === 'owner') {
                  targetScreen = 'BusinessLoginScreen';
                  console.log('🔄 Navigating admin/owner to BusinessLoginScreen...');
                } else {
                  // Customers go to WelcomeScreen (main entry point)
                  console.log('🔄 Navigating customer to WelcomeScreen...');
                }

                // Reset navigation stack
                navigation.reset({
                  index: 0,
                  routes: [{ name: targetScreen }],
                });
              } else {
                console.error('❌ Logout failed:', result.error);
                Alert.alert('Error', 'Failed to log out. Please try again.');
                setIsLoggingOut(false);
              }
            } catch (error) {
              console.error('❌ Logout error:', error);
              Alert.alert('Error', 'An unexpected error occurred.');
              setIsLoggingOut(false);
            }
          },
        },
      ],
      { cancelable: false } // User must choose an option
    );
  };

  return (
    <View style={styles.outerWrapper}>
      <View style={styles.container}>
        {/* SafeArea only for top app bar */}
        <SafeAreaView edges={['top', 'left', 'right']}>
          <View style={styles.appBar}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Icon name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Image
              source={require('../../../../../assets/logowithouttagline.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.titleContainer}>
              <Text style={styles.titleText}>Profile</Text>
            </View>
          </View>
        </SafeAreaView>

        {/* Scrollable area within border radius */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* User Info */}
          {loading ? (
            <View style={[styles.profileContainer, { paddingVertical: 40 }]}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={{ marginTop: 10, color: '#666' }}>Loading profile...</Text>
            </View>
          ) : (
            <View style={styles.profileContainer}>
              <View style={styles.profilePicWrapper}>
                <Image 
                  source={
                    userData?.profileImage 
                      ? { uri: userData.profileImage }
                      : require('../../../../../assets/image.png')
                  } 
                  style={styles.userProfilePic}
                  resizeMode="cover"
                />
                <View style={styles.editIconWrapper}>
                  <Icon name="pencil" size={15} color="white" />
                </View>
              </View>
              <Text style={styles.userName}>{userData?.name || 'User'}</Text>
              <Text style={styles.userEmail}>{userData?.email || ''}</Text>
              {currentShop && (
                <View style={styles.shopBadge}>
                  <Icon name="briefcase" size={14} color="#4A90E2" />
                  <Text style={styles.shopRoleText}>
                    {userRole.toUpperCase()} at {currentShop.shop_name}
                  </Text>
                </View>
              )}
              {userShops.length > 1 && (
                <TouchableOpacity 
                  style={styles.switchShopButton}
                  onPress={() => navigation.navigate('ShopSelectionScreen')}
                >
                  <Text style={styles.switchShopText}>Switch Shop ({userShops.length})</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={{ height: 20 }} />

          <ProfileComponent icon={'person-outline'} text={'Edit Profile'} onPress={() => navigation.navigate('EditProfileScreen')} />

          {/* Shop Management - for owners and admins only (not providers/barbers) */}
          {(profileRole === 'owner' || profileRole === 'admin') && (
            <ProfileComponent
              icon={'business-outline'}
              text={currentShop ? 'Manage Shop' : 'My Shops'}
              onPress={() => navigation.navigate('ShopSelectionScreen')}
            />
          )}


          {/* Change Email option - for owners and admins (not for platform admin) */}
          {(profileRole === 'owner' || userRole === 'admin') && !isSuperAdmin && (
            <ProfileComponent
              icon={'mail-outline'}
              text={'Change Email'}
              onPress={() => setEmailModalVisible(true)}
            />
          )}
          
          <ProfileComponent
            icon={'log-out-outline'}
            text={isLoggingOut ? 'Logging Out...' : 'Log Out'}
            onPress={handleLogout}
            disabled={isLoggingOut}
          />

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {/* Change Email Modal with OTP Flow */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={emailModalVisible}
        onRequestClose={resetEmailModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {emailChangeStep === 'email' ? 'Change Email' : 'Verify OTP'}
              </Text>
              <TouchableOpacity onPress={resetEmailModal}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {emailChangeStep === 'email' ? (
                // Step 1: Enter new email
                <>
                  <Text style={styles.currentEmailLabel}>Current Email</Text>
                  <Text style={styles.currentEmailText}>{userData?.email}</Text>

                  <Text style={styles.inputLabel}>New Email Address</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newEmail}
                    onChangeText={setNewEmail}
                    placeholder="Enter new email address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  <Text style={styles.noteText}>
                    📧 A 6-digit verification code will be sent to your new email address.
                  </Text>
                </>
              ) : (
                // Step 2: Enter OTP
                <>
                  <Text style={styles.currentEmailLabel}>New Email</Text>
                  <Text style={styles.currentEmailText}>{newEmail}</Text>

                  <Text style={styles.inputLabel}>Verification Code</Text>
                  <TextInput
                    style={[styles.textInput, styles.otpInput]}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    placeholder="Enter 6-digit code"
                    keyboardType="number-pad"
                    maxLength={6}
                  />

                  <Text style={styles.noteText}>
                    🔐 Enter the 6-digit code sent to {newEmail}
                  </Text>

                  <TouchableOpacity
                    style={styles.resendButton}
                    onPress={handleSendOTP}
                    disabled={changingEmail}
                  >
                    {changingEmail ? (
                      <ActivityIndicator size="small" color="#4A90E2" />
                    ) : (
                      <Text style={styles.resendButtonText}>Resend Code</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={emailChangeStep === 'email' ? resetEmailModal : () => setEmailChangeStep('email')}
                disabled={changingEmail || verifyingOTP}
              >
                <Text style={styles.modalCancelButtonText}>
                  {emailChangeStep === 'email' ? 'Cancel' : 'Back'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  (changingEmail || verifyingOTP) && styles.disabledButton
                ]}
                onPress={emailChangeStep === 'email' ? handleSendOTP : handleVerifyOTP}
                disabled={changingEmail || verifyingOTP}
              >
                {(changingEmail || verifyingOTP) ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {emailChangeStep === 'email' ? 'Send Code' : 'Verify'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    overflow: 'hidden',
  },
  appBar: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: 'center',
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  logo: {
    width: 50,
    height: 50,
  },
  titleContainer: {
    marginLeft: 10,
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    fontWeight: 'bold',
    fontSize: 20,
    color: 'black',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 15,
  },
  profileContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  profilePicWrapper: {
    width: 120,
    height: 120,
  },
  userProfilePic: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
  },
  editIconWrapper: {
    position: 'absolute',
    bottom: 10,
    right: 0,
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  userName: {
    fontWeight: 'bold',
    marginTop: 10,
    fontSize: 18,
    marginBottom: 4,
  },
  userEmail: {
    color: 'gray',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  currentEmailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  currentEmailText: {
    fontSize: 16,
    color: '#333',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  noteText: {
    fontSize: 13,
    color: '#FF9800',
    marginTop: 15,
    lineHeight: 20,
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
  },
  resendButton: {
    marginTop: 15,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  resendButtonText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalCancelButton: {
    backgroundColor: '#F5F5F5',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  modalCancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  shopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    alignSelf: 'center',
  },
  shopRoleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90E2',
    marginLeft: 6,
  },
  switchShopButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#4A90E2',
    alignSelf: 'center',
  },
  switchShopText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
  },
  // Subscription Section Styles
  subscriptionSection: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    paddingLeft: 4,
  },
  subscriptionLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#FFF',
    borderRadius: 16,
  },
  subscriptionLoadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
  },
  subscriptionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  planPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0393d5',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  planFeatures: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
  },
  licenseSection: {
    marginBottom: 16,
  },
  licenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  licenseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  licenseCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0393d5',
  },
  licenseBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  licenseBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  licenseWarning: {
    fontSize: 12,
    color: '#FF9500',
    marginTop: 6,
    fontStyle: 'italic',
  },
  billingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  billingText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentMethodText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  refundBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  refundBannerText: {
    fontSize: 13,
    color: '#0393d5',
    fontWeight: '600',
    marginLeft: 10,
  },
  subscriptionActions: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
    gap: 10,
  },
  upgradeButton: {
    backgroundColor: '#0393d5',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  cancelButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  noSubscriptionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  noSubscriptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
  },
  noSubscriptionSubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  resubscribeButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  resubscribeButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  subscribeButton: {
    backgroundColor: '#0393d5',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  subscribeButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  // Web manage notice styles
  webManageNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  webManageText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
});

