import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getPaymentStats,
  getAdminPaymentOverview,
  getAllPayments,
  STRIPE_PLANS
} from '../../lib/stripe';

const PaymentTrackingScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [shops, setShops] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'shops', 'payments'
  const [selectedShop, setSelectedShop] = useState(null);
  const [showShopModal, setShowShopModal] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'pending', 'cancelled'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, shopsData, paymentsData] = await Promise.all([
        getPaymentStats(),
        getAdminPaymentOverview(),
        getAllPayments({ limit: 50 })
      ]);

      setStats(statsData);
      setShops(shopsData || []);
      setPayments(paymentsData || []);
    } catch (error) {
      console.error('Error loading payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#34C759';
      case 'pending': return '#FF9500';
      case 'cancelled': return '#FF3B30';
      case 'refunded': return '#AF52DE';
      case 'succeeded': return '#34C759';
      case 'failed': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return 'checkmark-circle';
      case 'pending': return 'time';
      case 'cancelled': return 'close-circle';
      case 'refunded': return 'return-down-back';
      case 'succeeded': return 'checkmark';
      case 'failed': return 'close';
      default: return 'help-circle';
    }
  };

  const filteredShops = shops.filter(shop => {
    if (filter === 'all') return true;
    return shop.subscription_status === filter;
  });

  const renderStatsCard = (title, value, icon, color, subtitle = null) => (
    <View style={[styles.statsCard, { borderLeftColor: color }]}>
      <View style={styles.statsCardContent}>
        <View style={[styles.statsIconCircle, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.statsTextContainer}>
          <Text style={styles.statsValue}>{value}</Text>
          <Text style={styles.statsLabel}>{title}</Text>
          {subtitle && <Text style={styles.statsSubtitle}>{subtitle}</Text>}
        </View>
      </View>
    </View>
  );

  const renderShopItem = ({ item }) => (
    <TouchableOpacity
      style={styles.shopCard}
      onPress={() => {
        setSelectedShop(item);
        setShowShopModal(true);
      }}
    >
      <View style={styles.shopHeader}>
        <View style={styles.shopInfo}>
          <Text style={styles.shopName}>{item.name}</Text>
          <Text style={styles.shopEmail}>{item.email || item.profiles?.email}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.subscription_status) + '20' }]}>
          <Ionicons
            name={getStatusIcon(item.subscription_status)}
            size={14}
            color={getStatusColor(item.subscription_status)}
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.subscription_status) }]}>
            {item.subscription_status?.charAt(0).toUpperCase() + item.subscription_status?.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.shopDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Plan</Text>
          <Text style={styles.detailValue}>
            {STRIPE_PLANS[item.subscription_plan]?.name || item.subscription_plan}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Monthly</Text>
          <Text style={styles.detailValue}>{formatCurrency(item.monthly_amount)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Licenses</Text>
          <Text style={styles.detailValue}>{item.license_count || 0}/{item.max_licenses}</Text>
        </View>
      </View>

      <View style={styles.shopFooter}>
        <Text style={styles.shopFooterText}>
          Started: {formatDate(item.subscription_start_date)}
        </Text>
        {item.payment_method_brand && (
          <Text style={styles.shopFooterText}>
            {item.payment_method_brand?.toUpperCase()} ****{item.payment_method_last4}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderPaymentItem = ({ item }) => (
    <View style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentShopName}>{item.shops?.name || 'Unknown Shop'}</Text>
          <Text style={styles.paymentDate}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={[styles.paymentAmount, item.status === 'refunded' && styles.paymentRefunded]}>
          <Text style={[
            styles.paymentAmountText,
            item.status === 'refunded' && styles.paymentAmountRefunded
          ]}>
            {item.status === 'refunded' ? '-' : '+'}{formatCurrency(item.amount)}
          </Text>
        </View>
      </View>

      <View style={styles.paymentDetails}>
        <View style={[styles.paymentStatusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Ionicons
            name={getStatusIcon(item.status)}
            size={12}
            color={getStatusColor(item.status)}
          />
          <Text style={[styles.paymentStatusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
        <Text style={styles.paymentType}>{item.payment_type}</Text>
        <Text style={styles.paymentPlan}>{item.plan_name}</Text>
      </View>

      {item.description && (
        <Text style={styles.paymentDescription}>{item.description}</Text>
      )}
    </View>
  );

  const renderShopModal = () => (
    <Modal
      visible={showShopModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowShopModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Shop Details</Text>
            <TouchableOpacity onPress={() => setShowShopModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {selectedShop && (
            <ScrollView style={styles.modalBody}>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Business Information</Text>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Name:</Text>
                  <Text style={styles.modalValue}>{selectedShop.name}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Email:</Text>
                  <Text style={styles.modalValue}>{selectedShop.email}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Category:</Text>
                  <Text style={styles.modalValue}>{selectedShop.categories?.name || 'N/A'}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Owner:</Text>
                  <Text style={styles.modalValue}>{selectedShop.profiles?.name || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Subscription Details</Text>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Plan:</Text>
                  <Text style={styles.modalValue}>
                    {STRIPE_PLANS[selectedShop.subscription_plan]?.name}
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Status:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedShop.subscription_status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedShop.subscription_status) }]}>
                      {selectedShop.subscription_status}
                    </Text>
                  </View>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Monthly Amount:</Text>
                  <Text style={styles.modalValue}>{formatCurrency(selectedShop.monthly_amount)}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Licenses:</Text>
                  <Text style={styles.modalValue}>{selectedShop.license_count}/{selectedShop.max_licenses}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Start Date:</Text>
                  <Text style={styles.modalValue}>{formatDate(selectedShop.subscription_start_date)}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Next Billing:</Text>
                  <Text style={styles.modalValue}>{formatDate(selectedShop.next_billing_date)}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Refund Until:</Text>
                  <Text style={styles.modalValue}>{formatDate(selectedShop.refund_eligible_until)}</Text>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Payment Method</Text>
                {selectedShop.payment_method_brand ? (
                  <View style={styles.paymentMethodCard}>
                    <Ionicons name="card" size={24} color="#0393d5" />
                    <Text style={styles.paymentMethodText}>
                      {selectedShop.payment_method_brand?.toUpperCase()} ****{selectedShop.payment_method_last4}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.noPaymentMethod}>No payment method on file</Text>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0393d5" />
          <Text style={styles.loadingText}>Loading payment data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Tracking</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#0393d5" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {['overview', 'shops', 'payments'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <View style={styles.overviewContainer}>
            <Text style={styles.sectionTitle}>Revenue Overview</Text>
            <View style={styles.statsGrid}>
              {renderStatsCard(
                'Total Revenue',
                formatCurrency(stats.totalRevenue),
                'cash',
                '#34C759',
                'All time'
              )}
              {renderStatsCard(
                'This Month',
                formatCurrency(stats.monthlyRevenue),
                'calendar',
                '#0393d5'
              )}
              {renderStatsCard(
                'Total Refunds',
                formatCurrency(stats.totalRefunds),
                'return-down-back',
                '#FF3B30'
              )}
            </View>

            <Text style={styles.sectionTitle}>Subscriptions</Text>
            <View style={styles.statsGrid}>
              {renderStatsCard(
                'Active',
                stats.activeSubscriptions,
                'checkmark-circle',
                '#34C759'
              )}
              {renderStatsCard(
                'Pending',
                stats.pendingSubscriptions,
                'time',
                '#FF9500'
              )}
              {renderStatsCard(
                'Cancelled',
                stats.cancelledSubscriptions,
                'close-circle',
                '#FF3B30'
              )}
            </View>

            <Text style={styles.sectionTitle}>Payments</Text>
            <View style={styles.statsGrid}>
              {renderStatsCard(
                'Successful',
                stats.successfulPayments,
                'checkmark',
                '#34C759'
              )}
              {renderStatsCard(
                'Failed',
                stats.failedPayments,
                'close',
                '#FF3B30'
              )}
              {renderStatsCard(
                'Pending',
                stats.pendingPayments,
                'time',
                '#FF9500'
              )}
            </View>
          </View>
        )}

        {/* Shops Tab */}
        {activeTab === 'shops' && (
          <View style={styles.shopsContainer}>
            {/* Filter Buttons */}
            <View style={styles.filterContainer}>
              {['all', 'active', 'pending', 'cancelled'].map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterButton, filter === f && styles.filterButtonActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.filterButtonText, filter === f && styles.filterButtonTextActive]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.resultCount}>
              Showing {filteredShops.length} {filter === 'all' ? '' : filter} shops
            </Text>

            {filteredShops.map((shop, index) => (
              <View key={shop.id || index}>
                {renderShopItem({ item: shop })}
              </View>
            ))}
          </View>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <View style={styles.paymentsContainer}>
            <Text style={styles.resultCount}>
              Recent {payments.length} payments
            </Text>

            {payments.map((payment, index) => (
              <View key={payment.id || index}>
                {renderPaymentItem({ item: payment })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {renderShopModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  refreshButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#0393d5',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#0393d5',
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 12,
  },
  statsCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statsTextContainer: {
    flex: 1,
  },
  statsValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  statsLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  statsSubtitle: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  overviewContainer: {
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
  },
  filterButtonActive: {
    backgroundColor: '#0393d5',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#FFF',
  },
  resultCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  shopCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  shopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  shopEmail: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  shopDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  shopFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  shopFooterText: {
    fontSize: 12,
    color: '#999',
  },
  paymentCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentShopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  paymentDate: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  paymentAmount: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  paymentRefunded: {
    backgroundColor: '#FFEBEE',
  },
  paymentAmountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#34C759',
  },
  paymentAmountRefunded: {
    color: '#FF3B30',
  },
  paymentDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  paymentStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  paymentType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  paymentPlan: {
    fontSize: 12,
    color: '#0393d5',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  paymentDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  shopsContainer: {
    flex: 1,
  },
  paymentsContainer: {
    flex: 1,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 8,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
  },
  modalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  noPaymentMethod: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default PaymentTrackingScreen;
