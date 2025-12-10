import { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
} from 'react-native';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';

const getPasswordValidationMessage = (password) => {
  if (password.length < 6) return { message: 'Password must be at least 6 characters', valid: false };
  if (!/[A-Z]/.test(password)) return { message: 'Password must contain at least one uppercase letter', valid: false };
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return { message: 'Password must contain one special character', valid: false };
  if (!/\d/.test(password)) return { message: 'Password must contain one numeric value', valid: false };
  return { message: 'Password is valid', valid: true };
};

const InputField = ({ type, value, onChange, isSignUp }) => {
  const [secure, setSecure] = useState(type === 'password' || type === 'confirmPassword');

  const isPassword = type === 'password';
  const isConfirmPassword = type === 'confirmPassword';

  const toggleSecureEntry = () => setSecure(!secure);
  const clearText = () => onChange('');
  const passwordValidation = (isPassword || isConfirmPassword)
  ? getPasswordValidationMessage(value)
  : null;

  return (
    <View>
      <View style={styles.inputContainer}>
        {/* Prefix Icon */}
        <View style={styles.iconLeft}>
          {type === 'email' ? (
            <MaterialIcons name="email" size={20} color="#4A90E2" />
          ) : (
            <Feather name="lock" size={20} color="#4A90E2" />
          )}
        </View>

        {/* Text Input */}
        <TextInput
          style={styles.input}
          placeholder={isConfirmPassword ? 'Enter confirm password' : isPassword ?  'Enter password' : 'Enter email'}
          value={value}
          onChangeText={onChange}
          secureTextEntry={(isPassword || isConfirmPassword) && secure}
          keyboardType={(isPassword || isConfirmPassword) ? 'default' : 'email-address'}
          autoCapitalize="none"
        />

        {/* Suffix Icons */}
        <View style={styles.iconRightContainer}>
          {value.length > 0 && !isPassword && !isConfirmPassword && (
            <TouchableOpacity onPress={clearText}>
              <Ionicons name="close-circle" size={20} color="#999" style={styles.iconRight} />
            </TouchableOpacity>
          )}
          {(isPassword || isConfirmPassword) && (
            <TouchableOpacity onPress={toggleSecureEntry}>
              <Feather
                name={secure ? 'eye-off' : 'eye'}
                size={20}
                color="#999"
                style={styles.iconRight}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {(isPassword || !isConfirmPassword) && value.length > 0 && passwordValidation && isSignUp === true && (
          <Text
            style={{
              color: passwordValidation.valid ? 'green' : 'red',
              fontSize: 13,
              marginTop: 5,
              marginLeft: 10,
            }}
          >
            {passwordValidation.message}
          </Text>
        )}
    </View>
  );
};

export default InputField;

const styles = StyleSheet.create({
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: 10,
      backgroundColor: '#fff',
    },
    iconLeft: {
      paddingRight: 8,
    },
    input: {
      flex: 1,
      paddingVertical: 10,
      fontSize: 16,
      letterSpacing: 0,
    },
    iconRightContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconRight: {
      marginLeft: 8,
    },
});