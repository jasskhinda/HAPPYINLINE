import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import Toast from 'react-native-toast-message';

const ShopReviewSubmission = ({ route, navigation }) => {
  const { shopId } = route.params;
  const [loading, setLoading] = useState(false);
  const [shop, setShop] = useState(null);
  const [shopStats, setShopStats] = useState({
    servicesCount: 0,
    barbersCount: 0,
    managersCount: 0,
  });

  useEffect(() => {
    fetchShopDetails();
  }, []);

  const fetchShopDetails = async () => {
    try {
      // Fetch shop details
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('*')
        .eq('id', shopId)
        .single();

      if (shopError) throw shopError;
      setShop(shopData);

      // Fetch shop statistics
      const [servicesRes, staffRes] = await Promise.all([
        supabase
          .from('shop_services')
          .select('id')
          .eq('shop_id', shopId),
        supabase
          .from('shop_staff')
          .select('role')
          .eq('shop_id', shopId)
      ]);

      const barbersCount = staffRes.data?.filter(s => s.role === 'barber').length || 0;
      const managersCount = staffRes.data?.filter(s => s.role === 'manager' || s.role === 'admin').length || 0;

      setShopStats({
        servicesCount: servicesRes.data?.length || 0,
        barbersCount,
        managersCount,
      });

    } catch (error) {
      console.error('Error fetching shop details:', error);
      Alert.alert('Error', 'Could not load shop details');
    }
  };

  const handleSubmitForReview = async () => {
    Alert.alert(
      'Submit for Review?',
      'Your shop will be reviewed by our team within 24-48 hours. You can continue editing while waiting for approval.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setLoading(true);
            try {
              // Update shop status to pending_review
              const { error } = await supabase
                .from('shops')
                .update({
                  status: 'pending_review',
                  submitted_for_review_at: new Date().toISOString(),
                })
                .eq('id', shopId);

              if (error) throw error;

              Toast.show({
                type: 'success',
                text1: 'Submitted for Review!',
                text2: 'We\'ll notify you once your shop is approved',
              });

              // Navigate to pending review screen
              navigation.replace('ShopPendingReview', { shopId });
            } catch (error) {
              console.error('Error submitting shop:', error);
              Alert.alert('Error', 'Could not submit shop for review. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (!shop) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </SafeAreaView>
    );
  }

  const isComplete = shopStats.servicesCount > 0 && shopStats.barbersCount > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Review & Submit</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.mainTitle}>Your Shop is Ready!</Text>
        <Text style={styles.subtitle}>
          Review your shop details before submitting for approval
        </Text>

        {/* Shop Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{shop.name}</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={styles.infoText}>
              {shop.address}, {shop.city}, {shop.state}
            </Text>
          </View>
          {shop.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call" size={16} color="#666" />
              <Text style={styles.infoText}>{shop.phone}</Text>
            </View>
          )}
          {shop.email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail" size={16} color="#666" />
              <Text style={styles.infoText}>{shop.email}</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="cut" size={24} color="#2196F3" />
            </View>
            <Text style={styles.statNumber}>{shopStats.servicesCount}</Text>
            <Text style={styles.statLabel}>Services</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="people" size={24} color="#9C27B0" />
            </View>
            <Text style={styles.statNumber}>{shopStats.barbersCount}</Text>
            <Text style={styles.statLabel}>Barbers</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="shield-checkmark" size={24} color="#FF9800" />
            </View>
            <Text style={styles.statNumber}>{shopStats.managersCount}</Text>
            <Text style={styles.statLabel}>Managers</Text>
          </View>
        </View>

        {/* What's Next */}
        <View style={styles.nextStepsCard}>
          <Text style={styles.nextStepsTitle}>What Happens Next?</Text>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Submission Review</Text>
              <Text style={styles.stepDescription}>
                Our team will review your shop details within 24-48 hours
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Approval Notification</Text>
              <Text style={styles.stepDescription}>
                You'll receive a notification once your shop is approved
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Go Live!</Text>
              <Text style={styles.stepDescription}>
                Your shop will be visible to customers and ready for bookings
              </Text>
            </View>
          </View>
        </View>

        {/* Note */}
        {!isComplete && (
          <View style={styles.warningCard}>
            <Ionicons name="alert-circle" size={20} color="#FF9800" />
            <Text style={styles.warningText}>
              Make sure you have at least 1 service and 1 barber before submitting
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="create-outline" size={20} color="#FF6B6B" />
          <Text style={styles.editButtonText}>Edit Shop</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, (!isComplete || loading) && styles.disabledButton]}
          onPress={handleSubmitForReview}
          disabled={!isComplete || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Submit for Review</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  nextStepsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  nextStepsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#E65100',
    marginLeft: 12,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#FF6B6B',
    gap: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  disabledButton: {
    backgroundColor: '#CCC',
    opacity: 0.6,
  },
});

export default ShopReviewSubmission;
