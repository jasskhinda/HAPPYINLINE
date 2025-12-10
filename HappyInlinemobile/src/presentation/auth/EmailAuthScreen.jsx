import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import CircularProgressBar from '../../components/loadingBar/CircularProgressBar';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { signUpWithEmail, signInWithEmail, isValidEmail } from '../../lib/auth';

const EmailAuthScreen = ({ route }) => {
  const navigation = useNavigation();

  // Get params from navigation
  const { isSignIn, prefillEmail } = route?.params || {};

  const [email, setEmail] = useState(prefillEmail || '');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    // Validate email
    if (!email.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Email Required',
        text2: 'Please enter your email address',
      });
      return;
    }

    if (!isValidEmail(email)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Email',
        text2: 'Please enter a valid email address',
      });
      return;
    }

    setLoading(true);

    try {
      const emailLower = email.toLowerCase().trim();
      
      console.log('📧 Attempting to send OTP to:', emailLower);
      
      // Try signup first (it checks if email exists and handles accordingly)
      let result = await signUpWithEmail(emailLower);
      let isNewUser = true;
      
      // If email already exists, try login instead
      if (!result.success && result.error?.includes('already registered')) {
        console.log('👤 Email exists, switching to login...');
        result = await signInWithEmail(emailLower);
        isNewUser = false;
      }
      
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Check Your Email!',
          text2: 'We sent you a verification code',
        });
        
        // Navigate to OTP verification screen
        navigation.replace('OTPVerificationScreen', {
          email: emailLower,
          isSignup: isNewUser
        });
      } else {
        // Handle error
        Toast.show({
          type: 'error',
          text1: 'Failed',
          text2: result.error || 'Please try again',
        });
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{flex: 1, backgroundColor: '#FFFFFF'}}>
      <View style={styles.container}>
        {/* LOADING BAR */}
        {loading && <CircularProgressBar loaderText={"Sending OTP..."} />}

        {/* REST PART */}
        <SafeAreaView style={{flex: 1}}>
          {/* BACK BUTTON */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('GetStarted')}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>

          <ScrollView
            style={{ flex: 1, borderBottomRightRadius: 60, borderBottomLeftRadius: 60, paddingHorizontal: 15 }}
            contentContainerStyle={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* HEADING */}
            <Text style={styles.authHeading}>
              Welcome to Happy Inline
            </Text>
            <Text style={styles.authDescription}>
              Enter your email to continue
            </Text>

            <View style={{marginTop: 40}} />

            {/* EMAIL INPUT */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="rgba(0, 0, 0, 0.4)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* INFO MESSAGE */}
            <View style={{ paddingHorizontal: 5, marginBottom: 20, marginTop: 5 }}>
              <Text style={{ fontSize: 13, color: 'rgba(0, 0, 0, 0.6)', textAlign: 'center' }}>
                📧 We'll send a verification code to your email
              </Text>
            </View>

            {/* CONTINUE BUTTON */}
            <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
              <Text style={{color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 16}}>
                Continue
              </Text>
            </TouchableOpacity>

            {/* TERMS OF SERVICE */}
            <View style={{ paddingHorizontal: 15, marginTop: 25 }}>
              <Text style={{ textAlign: 'center', flexWrap: 'wrap', fontSize: 12, color: 'rgba(0, 0, 0, 0.6)' }}>
                By continuing, you agree to Happy Inline{' '}
                <Text style={{ color: '#4A90E2', fontWeight: 'bold' }}>
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text style={{ color: '#4A90E2', fontWeight: 'bold' }}>
                  Privacy Policy
                </Text>
              </Text>
            </View>

          </ScrollView>
        </SafeAreaView>
      </View>

      {/* Bottom section with different background */}
      <View style={{flexDirection: 'row', marginTop: 10, justifyContent: 'center', paddingVertical: 40}}></View>
    </View>
  );
};

export default EmailAuthScreen;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'start',
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60
  },  
  authHeading: {
    color: '#4A90E2',
    fontWeight: 'bold',
    fontSize: 30
  },
  authDescription: {
    color: 'rgba(0, 0, 0, 0.4)',
    fontSize: 15,
    marginTop: 7
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  continueButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 20,
    marginTop: 10,
    padding: 18,
    marginHorizontal: 10,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
  },
  toggleText: {
    color: 'rgba(0, 0, 0, 0.6)',
    fontSize: 14,
  },
  toggleLink: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
