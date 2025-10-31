import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const ShopPendingReview = ({ route, navigation }) => {
  const { shopId } = route.params;
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchShopStatus();
  }, []);

  const fetchShopStatus = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);

    try {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('id', shopId)
        .single();

      if (error) throw error;

      setShop(data);

      // If status changed, navigate accordingly
      if (data.status === 'approved') {
        navigation.replace('MainScreen');
      } else if (data.status === 'rejected') {
        // Stay on this screen but show rejection reason
      }
    } catch (error) {
      console.error('Error fetching shop status:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchShopStatus(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      </SafeAreaView>
    );
  }

  const isRejected = shop?.status === 'rejected';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6B6B']} />
        }
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, isRejected && styles.iconCircleRejected]}>
            <Ionicons
              name={isRejected ? 'close-circle' : 'time'}
              size={80}
              color={isRejected ? '#F44336' : '#FF9800'}
            />
          </View>
        </View>

        {/* Title & Message */}
        {isRejected ? (
          <>
            <Text style={styles.title}>Shop Not Approved</Text>
            <Text style={styles.subtitle}>
              Your shop submission needs some changes before approval
            </Text>

            {/* Rejection Reason */}
            {shop.rejection_reason && (
              <View style={styles.reasonCard}>
                <View style={styles.reasonHeader}>
                  <Ionicons name="information-circle" size={20} color="#F44336" />
                  <Text style={styles.reasonTitle}>Reason for Rejection</Text>
                </View>
                <Text style={styles.reasonText}>{shop.rejection_reason}</Text>
              </View>
            )}

            {/* Action Items */}
            <View style={styles.actionCard}>
              <Text style={styles.actionTitle}>What to Do Next</Text>

              <View style={styles.actionItem}>
                <View style={styles.actionBullet}>
                  <Text style={styles.actionBulletText}>1</Text>
                </View>
                <Text style={styles.actionText}>
                  Review the feedback above carefully
                </Text>
              </View>

              <View style={styles.actionItem}>
                <View style={styles.actionBullet}>
                  <Text style={styles.actionBulletText}>2</Text>
                </View>
                <Text style={styles.actionText}>
                  Make the necessary changes to your shop
                </Text>
              </View>

              <View style={styles.actionItem}>
                <View style={styles.actionBullet}>
                  <Text style={styles.actionBulletText}>3</Text>
                </View>
                <Text style={styles.actionText}>
                  Resubmit your shop for review
                </Text>
              </View>
            </View>

            {/* Buttons */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.replace('EditShop', { shopId })}
            >
              <Ionicons name="create-outline" size={20} color="#FFF" />
              <Text style={styles.primaryButtonText}>Edit Shop & Resubmit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.replace('MainScreen')}
            >
              <Text style={styles.secondaryButtonText}>Go to Dashboard</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Review in Progress</Text>
            <Text style={styles.subtitle}>
              Your shop "{shop?.name}" is being reviewed by our team
            </Text>

            {/* Info Cards */}
            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="time-outline" size={24} color="#FF6B6B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Review Time</Text>
                <Text style={styles.infoText}>
                  Typically 24-48 hours. We'll notify you as soon as we're done!
                </Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="notifications-outline" size={24} color="#FF6B6B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>You'll Be Notified</Text>
                <Text style={styles.infoText}>
                  We'll send you a notification once your shop is approved or if we need any changes
                </Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="create-outline" size={24} color="#FF6B6B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Continue Editing</Text>
                <Text style={styles.infoText}>
                  You can still edit your shop details while waiting for approval
                </Text>
              </View>
            </View>

            {/* What We Review */}
            <View style={styles.reviewChecklistCard}>
              <Text style={styles.reviewChecklistTitle}>What We Review</Text>

              <View style={styles.checklistItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.checklistText}>Business information accuracy</Text>
              </View>

              <View style={styles.checklistItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.checklistText}>Service offerings and pricing</Text>
              </View>

              <View style={styles.checklistItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.checklistText}>Shop images and branding</Text>
              </View>

              <View style={styles.checklistItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.checklistText}>Operating hours and location</Text>
              </View>
            </View>

            {/* Buttons */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.replace('MainScreen')}
            >
              <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={onRefresh}>
              <Ionicons name="refresh" size={20} color="#FF6B6B" />
              <Text style={styles.secondaryButtonText}>Check Status</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleRejected: {
    backgroundColor: '#FFEBEE',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  reasonCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reasonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
    marginLeft: 8,
  },
  reasonText: {
    fontSize: 15,
    color: '#C62828',
    lineHeight: 22,
  },
  actionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  actionBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionBulletText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  reviewChecklistCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    marginBottom: 24,
  },
  reviewChecklistTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checklistText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
});

export default ShopPendingReview;
