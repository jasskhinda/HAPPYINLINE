import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { createShop } from '../../lib/shopAuth';

const CreateShopScreen = () => {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Required', text2: 'Please enter your business name' });
      return;
    }

    setLoading(true);
    try {
      const result = await createShop({
        name: name.trim(),
        description: description.trim(),
        address: address.trim(),
        city: city.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });

      if (result.success) {
        Toast.show({ type: 'success', text1: 'Business Created!', text2: 'Your business is ready' });
        navigation.replace('ProviderMainScreen');
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: result.error || 'Failed to create business' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#4A90E2" />
        </TouchableOpacity>

        <Text style={styles.title}>Create Your Business</Text>
        <Text style={styles.subtitle}>Set up your business profile to start receiving bookings</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Business Name *</Text>
          <TextInput style={styles.input} placeholder="e.g., John's Barbershop" value={name} onChangeText={setName} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Tell customers about your business..." value={description} onChangeText={setDescription} multiline numberOfLines={3} textAlignVertical="top" />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput style={styles.input} placeholder="123 Main Street" value={address} onChangeText={setAddress} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>City</Text>
          <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone</Text>
          <TextInput style={styles.input} placeholder="(555) 123-4567" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} placeholder="business@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        </View>

        <TouchableOpacity style={[styles.createButton, !name.trim() && styles.disabledButton]} onPress={handleCreate} disabled={!name.trim() || loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.createButtonText}>Create Business</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  backButton: { marginTop: 16, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#000', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 32 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 8 },
  input: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#000' },
  textArea: { height: 100, paddingTop: 14 },
  createButton: { backgroundColor: '#4A90E2', borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 16 },
  createButtonText: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  disabledButton: { backgroundColor: '#CCC', opacity: 0.6 },
});

export default CreateShopScreen;
