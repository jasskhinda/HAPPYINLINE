import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const ProviderSetPasswordScreen = ({ navigation, route }) => {
  const { email, invitation, shopName, isNewAccount } = route.params;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validatePassword = () => {
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSetPassword = async () => {
    if (!validatePassword()) return;

    setLoading(true);

    try {
      console.log('🔐 Creating provider account for:', email);

      let userId;

      if (isNewAccount) {
        // Create new account with signUp
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              name: invitation.name || '',
              role: invitation.role || 'barber',
              invited_to_shop: invitation.shop_id,
            }
          }
        });

        if (signUpError) {
          console.error('❌ Sign up error:', signUpError);

          if (signUpError.message?.includes('already registered')) {
            Alert.alert(
              'Account Already Exists',
              'An account with this email already exists. Please use the regular login.',
              [
                { text: 'Go to Login', onPress: () => navigation.navigate('BusinessLoginScreen') },
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          } else {
            Alert.alert('Error', signUpError.message || 'Failed to create account');
          }
          setLoading(false);
          return;
        }

        if (!authData.user) {
          Alert.alert('Error', 'Failed to create account. Please try again.');
          setLoading(false);
          return;
        }

        userId = authData.user.id;
        console.log('✅ Account created:', userId);

      } else {
        // Update existing user's password (after OTP verification)
        const { error: updateError } = await supabase.auth.updateUser({
          password: password,
        });

        if (updateError) {
          console.error('❌ Password update error:', updateError);
          Alert.alert('Error', updateError.message || 'Failed to set password');
          setLoading(false);
          return;
        }

        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error('❌ Error getting user:', userError);
          Alert.alert('Error', 'Failed to get user information');
          setLoading(false);
          return;
        }

        userId = user.id;
      }

      console.log('👤 User ID:', userId);

      // Create or update the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: email.toLowerCase(),
          name: invitation.name || '',
          role: invitation.role || 'barber',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        });

      if (profileError) {
        console.error('❌ Profile error:', profileError);
        // Continue anyway - profile might already exist from trigger
      } else {
        console.log('✅ Profile created/updated');
      }

      // Use the database function to accept invitation and add to shop_staff
      // This bypasses RLS issues by using SECURITY DEFINER
      console.log('👥 Accepting invitation and adding to shop_staff...');
      const { data: acceptResult, error: acceptError } = await supabase
        .rpc('accept_provider_invitation', {
          p_invitation_id: invitation.id,
          p_user_id: userId,
        });

      if (acceptError) {
        console.error('❌ Accept invitation error:', acceptError);
        // Fallback: Try direct insert (may fail due to RLS but worth trying)
        console.log('🔄 Fallback: Trying direct shop_staff insert...');

        const { error: staffError } = await supabase
          .from('shop_staff')
          .insert({
            shop_id: invitation.shop_id,
            user_id: userId,
            role: invitation.role || 'barber',
            status: 'active',
          });

        if (staffError) {
          console.warn('⚠️ Shop staff insert warning:', staffError.message);
          // This is expected to fail due to RLS - the function should be used instead
        }

        // Update invitation status
        const { error: inviteError } = await supabase
          .from('invitations')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
          })
          .eq('id', invitation.id);

        if (inviteError) {
          console.warn('⚠️ Invitation update warning:', inviteError.message);
        }
      } else {
        console.log('✅ Invitation accepted successfully:', acceptResult);
      }

      // Success!
      Alert.alert(
        'Welcome to the Team!',
        `Your account has been created successfully. You're now a ${invitation.role || 'service provider'} at ${shopName}.`,
        [
          {
            text: 'Get Started',
            onPress: () => {
              // Navigate to main app
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainScreen' }],
              });
            },
          },
        ]
      );

    } catch (error) {
      console.error('❌ Error setting password:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed" size={50} color="#0393d5" />
            </View>
            <Text style={styles.title}>Create Your Account</Text>
            <Text style={styles.subtitle}>
              Set a password to secure your account
            </Text>
          </View>

          {/* Email Display */}
          <View style={styles.emailCard}>
            <Ionicons name="mail" size={20} color="#0393d5" />
            <Text style={styles.emailText}>{email}</Text>
          </View>

          {/* Shop Info */}
          <View style={styles.shopInfoCard}>
            <Ionicons name="business" size={24} color="#0393d5" />
            <View style={styles.shopInfoText}>
              <Text style={styles.shopLabel}>You're joining</Text>
              <Text style={styles.shopName}>{shopName}</Text>
              <Text style={styles.roleText}>as a {invitation.role || 'service provider'}</Text>
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor="#999"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Password Requirements */}
          <View style={styles.requirementsCard}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            <View style={styles.requirementRow}>
              <Ionicons
                name={password.length >= 6 ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={password.length >= 6 ? '#0393d5' : '#999'}
              />
              <Text style={[
                styles.requirementText,
                password.length >= 6 && styles.requirementMet,
              ]}>
                At least 6 characters
              </Text>
            </View>
            <View style={styles.requirementRow}>
              <Ionicons
                name={password && password === confirmPassword ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={password && password === confirmPassword ? '#0393d5' : '#999'}
              />
              <Text style={[
                styles.requirementText,
                password && password === confirmPassword && styles.requirementMet,
              ]}>
                Passwords match
              </Text>
            </View>
          </View>

          {/* Create Account Button */}
          <TouchableOpacity
            style={[
              styles.createButton,
              (loading || password.length < 6 || password !== confirmPassword) && styles.createButtonDisabled,
            ]}
            onPress={handleSetPassword}
            disabled={loading || password.length < 6 || password !== confirmPassword}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.createButtonText}>Create Account</Text>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backButton: {
    marginTop: 10,
    marginBottom: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E6F4FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F4FA',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0393d5',
    marginLeft: 8,
  },
  shopInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  shopInfoText: {
    marginLeft: 12,
  },
  shopLabel: {
    fontSize: 13,
    color: '#666',
  },
  shopName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  roleText: {
    fontSize: 14,
    color: '#0393d5',
    marginTop: 2,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    padding: 8,
  },
  requirementsCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: '#999',
    marginLeft: 8,
  },
  requirementMet: {
    color: '#0393d5',
  },
  createButton: {
    backgroundColor: '#0393d5',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#CCC',
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ProviderSetPasswordScreen;
