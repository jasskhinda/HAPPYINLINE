import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FlexibleInputField = ({
  value,
  onChangeText,
  placeholder = 'Enter text',
  showPrefixIcon = false,
  prefixIcon = null,
  inputStyle = {},
  containerStyle = {},
  onFocus,
  onBlur,
  autoFocus = false,
}) => {
  const clearText = () => {
    onChangeText('');
    // Don't dismiss keyboard when clearing - let user continue typing
  };

  return (
    <View style={[styles.inputContainer, containerStyle]}>
      {showPrefixIcon && (
        <View style={styles.iconLeft}>
          {prefixIcon}
        </View>
      )}

      <TextInput
        style={[styles.input, inputStyle]}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        autoCapitalize="none"
        autoFocus={autoFocus}
        placeholderTextColor="#999"
        returnKeyType="search"
        clearButtonMode="never"
      />

      {value.length > 0 && (
        <TouchableOpacity onPress={clearText}>
          <Ionicons name="close-circle" size={20} color="#999" style={styles.iconRight} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default FlexibleInputField;

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
    paddingVertical: 8,
    fontSize: 16,
    color: '#000',
  },
  iconRight: {
    marginLeft: 8,
  },
});
