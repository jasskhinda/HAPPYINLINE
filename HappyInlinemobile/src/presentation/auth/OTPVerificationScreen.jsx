import { StyleSheet, Text, TouchableOpacity, View, TextInput, Keyboard } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import CircularProgressBar from '../../components/loadingBar/CircularProgressBar';
import { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { verifyEmailOTP, sendEmailOTP } from '../../lib/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

const OTPVerificationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { email, isSignup, userType, businessData } = route.params || {};

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleOtpChange = (value, index) => {
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (value && index === 5) {
      // Last digit entered, dismiss keyboard
      Keyboard.dismiss();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      Toast.show({
        type: 'error',
        text1: 'Invalid OTP',
        text2: 'Please enter the 6-digit code',
      });
      return;
    }

    // Dismiss keyboard
    Keyboard.dismiss();
    
    setLoading(true);

    try {
      console.log('🔐 Verifying OTP for:', email);
      
      const result = await verifyEmailOTP(email, otpCode);
      
      if (result.success) {
        console.log('✅ OTP verified successfully');
        console.log('📋 Full Profile data:', JSON.stringify(result.profile, null, 2));
        
        // SIMPLE CHECK: If user exists in database with a name, skip name input screen
        // This works for:
        // 1. Admin-created users (manager/barber/admin) - already have names
        // 2. Returning customers - already completed profile
        // 3. New signups - no profile or no name yet
        
        console.log('🔍 Detailed User check:');
        console.log('   result.profile:', result.profile);
        console.log('   Profile exists:', !!result.profile);
        console.log('   Profile name value:', result.profile?.name);
        console.log('   Name is string:', typeof result.profile?.name === 'string');
        console.log('   Name after trim:', result.profile?.name?.trim());
        console.log('   Role:', result.profile?.role);
        
        const userExistsInDatabase = result.profile && 
                                     result.profile.name && 
                                     result.profile.name.trim() !== '';
        
        console.log('   ✅✅✅ User exists in database:', userExistsInDatabase);

        if (userExistsInDatabase) {
          // User exists in database with name → Go straight to MainScreen
          console.log('→ User exists in database, going directly to MainScreen');

          const roleLabel = result.profile.role === 'admin' || result.profile.role === 'super_admin' ? 'Admin' :
                           result.profile.role === 'owner' ? 'Owner' :
                           result.profile.role === 'barber' ? 'Barber' : '';

          Toast.show({
            type: 'success',
            text1: `Welcome back${roleLabel ? ' ' + roleLabel : ''}!`,
            text2: `Hi ${result.profile.name}`,
          });
          navigation.replace('MainScreen');
        } else {
          // User does NOT exist in database → Show name input screen
          console.log('→ User does not exist in database, showing name input screen');
          Toast.show({
            type: 'success',
            text1: 'Verified!',
            text2: "Let's set up your profile",
          });
          // Pass fromOTP flag to indicate we're coming from authentication
          navigation.replace('Onboarding', { fromOTP: true });
        }
      } else {
        let errorMessage = result.error || 'Please try again';
        
        if (result.error?.includes('expired')) {
          errorMessage = 'OTP has expired. Please request a new one';
        } else if (result.error?.includes('invalid')) {
          errorMessage = 'Invalid OTP code. Please check and try again';
        }
        
        Toast.show({
          type: 'error',
          text1: 'Verification Failed',
          text2: errorMessage,
        });
        
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
      
    } catch (error) {
      console.error('❌ Error in handleVerifyOTP:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An unexpected error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    setLoading(true);

    try {
      console.log('📧 Resending OTP to:', email);
      
      const result = await sendEmailOTP(email);
      
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'OTP Sent!',
          text2: 'Check your email for the new code',
        });
        
        setResendTimer(60);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Resend Failed',
          text2: result.error || 'Please try again',
        });
      }
      
    } catch (error) {
      console.error('❌ Error in handleResendOTP:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not resend OTP',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{flex: 1, backgroundColor: '#FFFFFF'}}>
      <View style={styles.container}>
        {loading && <CircularProgressBar loaderText={"Verifying..."} />}

        <SafeAreaView style={{flex: 1}}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              console.log('🔙 Back button pressed - navigating to EmailAuthScreen');
              navigation.replace('EmailAuthScreen');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="mail-outline" size={80} color="#4A90E2" />
            </View>

            <Text style={styles.heading}>Check Your Email</Text>
            <Text style={styles.description}>
              We sent a 6-digit verification code to
            </Text>
            <Text style={styles.email}>{email}</Text>

            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[
                    styles.otpInput,
                    digit && styles.otpInputFilled,
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.verifyButton, otp.join('').length !== 6 && styles.verifyButtonDisabled]} 
              onPress={handleVerifyOTP}
              disabled={otp.join('').length !== 6}
            >
              <Text style={styles.verifyButtonText}>Verify Code</Text>
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code? </Text>
              <TouchableOpacity onPress={handleResendOTP} disabled={!canResend}>
                <Text style={[styles.resendLink, !canResend && styles.resendLinkDisabled]}>
                  {canResend ? 'Resend' : `Resend in ${resendTimer}s`}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoContainer}>
              <Ionicons name="information-circle-outline" size={16} color="#666" />
              <Text style={styles.infoText}>
                The code will expire in 10 minutes
              </Text>
            </View>

          </View>
        </SafeAreaView>
      </View>

      <View style={{flexDirection: 'row', marginTop: 10, justifyContent: 'center', paddingVertical: 40}}></View>
    </View>
  );
};

export default OTPVerificationScreen;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F8F9FA',
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 999,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heading: {
    color: '#4A90E2',
    fontWeight: 'bold',
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    color: 'rgba(0, 0, 0, 0.6)',
    fontSize: 15,
    textAlign: 'center',
  },
  email: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 40,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 30,
  },
  otpInput: {
    width: 50,
    height: 60,
    backgroundColor: 'white',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  otpInputFilled: {
    borderColor: '#4A90E2',
    backgroundColor: '#FFF5F5',
  },
  verifyButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 10,
  },
  verifyButtonDisabled: {
    backgroundColor: 'rgba(255, 107, 107, 0.5)',
  },
  verifyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  resendText: {
    color: 'rgba(0, 0, 0, 0.6)',
    fontSize: 14,
  },
  resendLink: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resendLinkDisabled: {
    color: 'rgba(0, 0, 0, 0.4)',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    gap: 5,
  },
  infoText: {
    color: '#666',
    fontSize: 12,
  },
});
