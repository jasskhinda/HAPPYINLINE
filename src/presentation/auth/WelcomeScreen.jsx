import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBusinessPath = () => {
    navigation.navigate('BusinessLoginScreen');
  };

  const handleCustomerLogin = () => {
    navigation.navigate('CustomerLogin');
  };

  const handleScanQR = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Camera Access', 'Happy Inline needs camera access to scan QR codes. Scanning a business QR code lets you instantly register and book appointments with that shop.');
        return;
      }
    }
    setScanned(false);
    setShowScanner(true);
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setShowScanner(false);

    // Parse the QR code data
    // Support both formats:
    // 1. Deep link URL: happyinline://signup/shop/[shopId]
    // 2. Legacy format: HAPPYINLINE:SHOP:[shopId]
    let shopId = null;

    if (data.startsWith('happyinline://signup/shop/')) {
      shopId = data.replace('happyinline://signup/shop/', '');
    } else if (data.startsWith('HAPPYINLINE:SHOP:')) {
      shopId = data.replace('HAPPYINLINE:SHOP:', '');
    }

    if (shopId) {
      // Check if user is already logged in
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // User is logged in - navigate directly to shop details
        console.log('User already logged in, navigating to shop:', shopId);
        navigation.navigate('ShopDetailsScreen', { shopId });
      } else {
        // User not logged in - navigate to QRShopSignup which has proper UI for sign in/create account
        console.log('User not logged in, navigating to QRShopSignup:', shopId);
        navigation.navigate('QRShopSignup', { shopId });
      }
    } else {
      Alert.alert('Invalid QR Code', 'This QR code is not from Happy InLine');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.gradient}>
        {/* Logo/Brand Section */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/happyinlinelogo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* Trust Signal */}
          <View style={styles.trustBadge}>
            <Ionicons name="people" size={16} color="#4A90E2" />
            <Text style={styles.trustText}>Trusted by 10,000+ professionals</Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Customer Login Button */}
          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleCustomerLogin}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <View style={styles.iconCircleScan}>
                <Ionicons name="person" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.scanButtonText}>Customer Login</Text>
                <Text style={styles.buttonSubtextScan}>Sign in to book appointments</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Scan QR Code Button */}
          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleScanQR}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <View style={styles.iconCircleScan}>
                <Ionicons name="qr-code-outline" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.scanButtonText}>Scan QR Code</Text>
                <Text style={styles.buttonSubtextScan}>Register with your favorite business</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Business Owner Button */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleBusinessPath}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <View style={styles.iconCircleSecondary}>
                <Ionicons name="business" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.secondaryButtonText}>Business Owner Login</Text>
                <Text style={styles.buttonSubtextSecondary}>Sign in to manage your shop</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Features Preview */}
          <View style={styles.features}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4A90E2" />
              <Text style={styles.featureText}>Real-time booking</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4A90E2" />
              <Text style={styles.featureText}>Secure payments</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4A90E2" />
              <Text style={styles.featureText}>Easy to use</Text>
            </View>
          </View>
        </View>
      </View>

      {/* QR Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <SafeAreaView style={styles.scannerContainer} edges={['bottom']}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Scan QR Code</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowScanner(false)}
            >
              <Ionicons name="close-circle" size={40} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          >
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerFrame}>
                <View style={styles.cornerTopLeft} />
                <View style={styles.cornerTopRight} />
                <View style={styles.cornerBottomLeft} />
                <View style={styles.cornerBottomRight} />
              </View>
              <Text style={styles.scannerText}>
                Point your camera at your shop's QR code
              </Text>
            </View>
          </CameraView>

          {/* How It Works Section */}
          <View style={styles.howItWorksContainer}>
            <Text style={styles.howItWorksTitle}>How It Works</Text>
            <View style={styles.howItWorksItem}>
              <View style={styles.howItWorksNumber}>
                <Text style={styles.howItWorksNumberText}>1</Text>
              </View>
              <Text style={styles.howItWorksText}>
                Your favorite business has a unique QR code to share with customers
              </Text>
            </View>
            <View style={styles.howItWorksItem}>
              <View style={styles.howItWorksNumber}>
                <Text style={styles.howItWorksNumberText}>2</Text>
              </View>
              <Text style={styles.howItWorksText}>
                Scan it once to register - that business becomes your home screen
              </Text>
            </View>
            <View style={styles.howItWorksItem}>
              <View style={styles.howItWorksNumber}>
                <Text style={styles.howItWorksNumberText}>3</Text>
              </View>
              <Text style={styles.howItWorksText}>
                Book appointments directly with no distractions - just you and your favorite shop
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 24,
  },
  appName: {
    fontSize: 40,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 8,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 17,
    color: '#6E6E73',
    marginBottom: 20,
    fontWeight: '400',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    marginTop: 8,
    marginBottom: 40,
  },
  trustText: {
    color: '#666666',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  scanButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  secondaryButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconCircleSecondary: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3A7BC8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  buttonTextContainer: {
    flex: 1,
  },
  primaryButtonText: {
    fontSize: 19,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  secondaryButtonText: {
    fontSize: 19,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  buttonSubtext: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '400',
    opacity: 0.9,
  },
  buttonSubtextSecondary: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '400',
    opacity: 0.9,
  },
  features: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    color: '#000000',
    fontSize: 15,
    marginLeft: 12,
    fontWeight: '600',
  },
  iconCircleScan: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3A7BC8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scanButtonText: {
    fontSize: 19,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  buttonSubtextScan: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '400',
    opacity: 0.9,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scannerHeader: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#000000',
  },
  scannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    padding: 8,
    zIndex: 10,
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#4A90E2',
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#4A90E2',
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#4A90E2',
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#4A90E2',
    borderBottomRightRadius: 8,
  },
  scannerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 30,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  howItWorksContainer: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  howItWorksTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  howItWorksItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  howItWorksNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  howItWorksNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  howItWorksText: {
    flex: 1,
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
  },
});

export default WelcomeScreen;
