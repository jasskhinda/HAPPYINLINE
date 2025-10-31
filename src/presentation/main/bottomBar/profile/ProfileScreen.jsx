import { Image, ScrollView, StyleSheet, Text, View, Dimensions, Alert, ActivityIndicator, Modal, TextInput, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileComponent from './ui/ProfileComponent';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { signOut, getCurrentUser, changeEmail } from '../../../../lib/auth';
import { getMyShops, getCurrentShopId } from '../../../../lib/shopAuth';
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
  
  // Email Change Modal
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);

  // Fetch user data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        try {
          setLoading(true);
          const { user, profile } = await getCurrentUser();
          
          if (profile) {
            setUserData({
              name: profile.name || 'User',
              email: profile.email || user?.email || '',
              profileImage: profile.profile_image || null,
            });
            setIsSuperAdmin(profile.is_platform_admin || false);
            setProfileRole(profile.role || 'customer'); // Store platform-level role

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

  const handleChangeEmail = async () => {
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
      const result = await changeEmail(newEmail);

      if (result.success) {
        Alert.alert(
          'Verification Sent',
          result.message || 'Please check your new email to verify the change',
          [{ text: 'OK', onPress: () => {
            setEmailModalVisible(false);
            setNewEmail('');
          }}]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to change email');
      }
    } catch (error) {
      console.error('❌ Error changing email:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setChangingEmail(false);
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

                // Managers/owners go to BusinessLoginScreen
                if (profileRole === 'manager' || profileRole === 'admin' || profileRole === 'owner') {
                  targetScreen = 'BusinessLoginScreen';
                  console.log('🔄 Navigating manager/owner to BusinessLoginScreen...');
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
            <Image 
              source={require('../../../../../assets/logo.png')} 
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
              <ActivityIndicator size="large" color="#FF6B6B" />
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
                  <Icon name="briefcase" size={14} color="#FF6B35" />
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

          {/* Shop Management - for owners and staff members */}
          {(profileRole === 'owner' || profileRole === 'manager' || profileRole === 'admin' || (currentShop && userRole !== 'customer')) && (
            <ProfileComponent
              icon={'business-outline'}
              text={currentShop ? 'Manage Shop' : 'My Shops'}
              onPress={() => navigation.navigate('ShopSelectionScreen')}
            />
          )}

          {/* Staff Management - for owners and admins */}
          {(profileRole === 'owner' || userRole === 'admin') && (
            <ProfileComponent
              icon={'people-outline'}
              text={'Manage Staff'}
              onPress={() => {
                if (!currentShop) {
                  Alert.alert(
                    'No Shop Selected',
                    'Please select a shop first to manage staff.',
                    [
                      {
                        text: 'Select Shop',
                        onPress: () => navigation.navigate('ShopSelectionScreen')
                      },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                } else {
                  navigation.navigate('StaffManagementScreen', {
                    shopId: currentShop.shop_id,
                    section: 'managers'
                  });
                }
              }}
            />
          )}

          {/* Admin specific options - Change Email (not for platform admin) */}
          {(userRole === 'admin') && !isSuperAdmin && (
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

      {/* Change Email Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={emailModalVisible}
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Email</Text>
              <TouchableOpacity onPress={() => setEmailModalVisible(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
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
                ⚠️ A verification email will be sent to the new address. You must verify it to complete the change.
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setEmailModalVisible(false);
                  setNewEmail('');
                }}
                disabled={changingEmail}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, changingEmail && styles.disabledButton]}
                onPress={handleChangeEmail}
                disabled={changingEmail}
              >
                {changingEmail ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Change</Text>
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
    backgroundColor: '#9F9F87',
  },
  container: {
    flex: 1,
    backgroundColor: '#EEEEEE',
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
  logo: {
    width: 50,
    height: 50,
    borderRadius: 40,
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
    backgroundColor: '#FF6B6B',
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
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  saveButton: {
    backgroundColor: '#FF6B6B',
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  cancelButtonText: {
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
    color: '#FF6B35',
    marginLeft: 6,
  },
  switchShopButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FF6B35',
    alignSelf: 'center',
  },
  switchShopText: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
  },
});

