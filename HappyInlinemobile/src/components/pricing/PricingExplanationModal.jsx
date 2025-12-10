import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PricingExplanationModal = ({ visible, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>How Our Pricing Works</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-circle" size={28} color="#0393d5" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
            {/* Main Concept */}
            <View style={styles.conceptCard}>
              <View style={styles.iconCircle}>
                <Ionicons name="people" size={32} color="#0393d5" />
              </View>
              <Text style={styles.conceptTitle}>License-Based Pricing</Text>
              <Text style={styles.conceptText}>
                Each license = 1 staff member who can accept bookings
              </Text>
            </View>

            {/* Simple Example */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Simple Example</Text>
              <View style={styles.exampleCard}>
                <View style={styles.exampleHeader}>
                  <Ionicons name="cut" size={20} color="#0393d5" />
                  <Text style={styles.exampleShopName}>Hair Salon with 5 Stylists</Text>
                </View>
                <View style={styles.providersList}>
                  <View style={styles.providerItem}>
                    <Ionicons name="person" size={16} color="#4CAF50" />
                    <Text style={styles.providerText}>Stylist 1: Sarah</Text>
                  </View>
                  <View style={styles.providerItem}>
                    <Ionicons name="person" size={16} color="#4CAF50" />
                    <Text style={styles.providerText}>Stylist 2: Mike</Text>
                  </View>
                  <View style={styles.providerItem}>
                    <Ionicons name="person" size={16} color="#4CAF50" />
                    <Text style={styles.providerText}>Stylist 3: Jessica</Text>
                  </View>
                  <View style={styles.providerItem}>
                    <Ionicons name="person" size={16} color="#4CAF50" />
                    <Text style={styles.providerText}>Stylist 4: David</Text>
                  </View>
                  <View style={styles.providerItem}>
                    <Ionicons name="person" size={16} color="#4CAF50" />
                    <Text style={styles.providerText}>Stylist 5: Amanda</Text>
                  </View>
                </View>
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>
                    ✅ Needs: Professional Plan ($99.99/mo)
                  </Text>
                </View>
              </View>
            </View>

            {/* What's Included */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Each License Includes</Text>
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Individual calendar for provider</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Customers can book with them</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Service assignment</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Booking notifications</Text>
                </View>
              </View>
            </View>

            {/* Unlimited Features */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Always Unlimited ✨</Text>
              <View style={styles.unlimitedCard}>
                <View style={styles.unlimitedItem}>
                  <Ionicons name="infinite" size={24} color="#0393d5" />
                  <Text style={styles.unlimitedText}>Services</Text>
                </View>
                <View style={styles.unlimitedItem}>
                  <Ionicons name="infinite" size={24} color="#0393d5" />
                  <Text style={styles.unlimitedText}>Customers</Text>
                </View>
                <View style={styles.unlimitedItem}>
                  <Ionicons name="infinite" size={24} color="#0393d5" />
                  <Text style={styles.unlimitedText}>Bookings</Text>
                </View>
              </View>
            </View>

            {/* Who Counts */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Who Counts as a Provider?</Text>

              <View style={styles.countsCard}>
                <Text style={styles.countsLabel}>✅ COUNTS (uses a license):</Text>
                <View style={styles.countsList}>
                  <Text style={styles.countsItem}>• Barbers/Stylists</Text>
                  <Text style={styles.countsItem}>• Massage Therapists</Text>
                  <Text style={styles.countsItem}>• Yoga Instructors</Text>
                  <Text style={styles.countsItem}>• Mechanics</Text>
                  <Text style={styles.countsItem}>• Anyone who accepts bookings</Text>
                </View>
              </View>

              <View style={styles.countsCard}>
                <Text style={styles.notCountsLabel}>❌ DOES NOT COUNT (Unlimited):</Text>
                <View style={styles.countsList}>
                  <Text style={styles.countsItem}>• Receptionists (no bookings)</Text>
                  <Text style={styles.countsItem}>• Admins (manage business)</Text>
                  <Text style={styles.countsItem}>• Owners (if not providing services)</Text>
                </View>
              </View>
            </View>

            {/* Real Examples */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Real-World Examples</Text>

              {/* Basic Example */}
              <View style={styles.realExampleCard}>
                <View style={styles.realExampleHeader}>
                  <View style={[styles.planPill, styles.basicPill]}>
                    <Text style={styles.planPillText}>BASIC</Text>
                  </View>
                  <Text style={styles.realExamplePrice}>$24.99/mo</Text>
                </View>
                <Text style={styles.realExampleTitle}>Solo Stylist</Text>
                <Text style={styles.realExampleDesc}>
                  1-2 staff working independently
                </Text>
                <View style={styles.realExampleStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>1-2</Text>
                    <Text style={styles.statLabel}>Licenses</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>∞</Text>
                    <Text style={styles.statLabel}>Services</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>∞</Text>
                    <Text style={styles.statLabel}>Customers</Text>
                  </View>
                </View>
              </View>

              {/* Starter Example */}
              <View style={styles.realExampleCard}>
                <View style={styles.realExampleHeader}>
                  <View style={[styles.planPill, styles.starterPill]}>
                    <Text style={styles.planPillText}>STARTER</Text>
                  </View>
                  <Text style={styles.realExamplePrice}>$74.99/mo</Text>
                </View>
                <Text style={styles.realExampleTitle}>Small Barbershop</Text>
                <Text style={styles.realExampleDesc}>
                  3-4 barbers accepting bookings
                </Text>
                <View style={styles.realExampleStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>3-4</Text>
                    <Text style={styles.statLabel}>Licenses</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>∞</Text>
                    <Text style={styles.statLabel}>Services</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>∞</Text>
                    <Text style={styles.statLabel}>Customers</Text>
                  </View>
                </View>
              </View>

              {/* Professional Example */}
              <View style={styles.realExampleCard}>
                <View style={styles.realExampleHeader}>
                  <View style={[styles.planPill, styles.proPill]}>
                    <Text style={styles.planPillText}>PROFESSIONAL</Text>
                  </View>
                  <Text style={styles.realExamplePrice}>$99.99/mo</Text>
                </View>
                <Text style={styles.realExampleTitle}>Yoga Studio</Text>
                <Text style={styles.realExampleDesc}>
                  1 admin + 6 instructors teaching classes
                </Text>
                <View style={styles.realExampleStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>5-9</Text>
                    <Text style={styles.statLabel}>Licenses</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>∞</Text>
                    <Text style={styles.statLabel}>Services</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>∞</Text>
                    <Text style={styles.statLabel}>Customers</Text>
                  </View>
                </View>
              </View>

              {/* Enterprise Example */}
              <View style={styles.realExampleCard}>
                <View style={styles.realExampleHeader}>
                  <View style={[styles.planPill, styles.enterprisePill]}>
                    <Text style={styles.planPillText}>ENTERPRISE</Text>
                  </View>
                  <Text style={styles.realExamplePrice}>$149.99/mo</Text>
                </View>
                <Text style={styles.realExampleTitle}>Dental Clinic</Text>
                <Text style={styles.realExampleDesc}>
                  1 admin + 12 dentists/hygienists
                </Text>
                <View style={styles.realExampleStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>10-14</Text>
                    <Text style={styles.statLabel}>Licenses</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>∞</Text>
                    <Text style={styles.statLabel}>Services</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>∞</Text>
                    <Text style={styles.statLabel}>Customers</Text>
                  </View>
                </View>
              </View>

              {/* Unlimited Example */}
              <View style={styles.realExampleCard}>
                <View style={styles.realExampleHeader}>
                  <View style={[styles.planPill, styles.unlimitedPill]}>
                    <Text style={styles.planPillText}>UNLIMITED</Text>
                  </View>
                  <Text style={styles.realExamplePrice}>$199/mo</Text>
                </View>
                <Text style={styles.realExampleTitle}>Large Spa</Text>
                <Text style={styles.realExampleDesc}>
                  Unlimited staff for your business
                </Text>
                <View style={styles.realExampleStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>∞</Text>
                    <Text style={styles.statLabel}>Licenses</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>∞</Text>
                    <Text style={styles.statLabel}>Services</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>∞</Text>
                    <Text style={styles.statLabel}>Customers</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Bottom CTA */}
            <View style={styles.bottomSection}>
              <View style={styles.refundBadge}>
                <Ionicons name="shield-checkmark" size={20} color="#0393d5" />
                <Text style={styles.refundText}>7-day money-back guarantee on all plans!</Text>
              </View>
              <Text style={styles.bottomText}>
                Choose the plan that fits your team size. You can always upgrade as you grow.
              </Text>

              <View style={styles.importantNote}>
                <Ionicons name="information-circle" size={20} color="#0393d5" />
                <Text style={styles.importantNoteText}>
                  Important: Each account can own one business. Need multiple locations? Upgrade your plan to add more providers instead.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer Button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.gotItButton} onPress={onClose}>
              <Text style={styles.gotItButtonText}>Got it, thanks!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#09264b',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    paddingHorizontal: 20,
  },
  conceptCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  conceptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#09264b',
    marginBottom: 8,
  },
  conceptText: {
    fontSize: 15,
    color: '#0393d5',
    textAlign: 'center',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#09264b',
    marginBottom: 12,
  },
  exampleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exampleShopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  providersList: {
    marginVertical: 12,
  },
  providerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  providerText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  planBadge: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  planBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'center',
  },
  featuresList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  unlimitedCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    borderWidth: 2,
    borderColor: '#0393d5',
  },
  unlimitedItem: {
    alignItems: 'center',
    marginVertical: 8,
    minWidth: '40%',
  },
  unlimitedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#09264b',
    marginTop: 6,
    textAlign: 'center',
  },
  countsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  countsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 8,
  },
  notCountsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#999',
    marginBottom: 8,
  },
  countsList: {
    marginLeft: 8,
  },
  countsItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  realExampleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#0393d5',
  },
  realExampleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  basicPill: {
    backgroundColor: '#F3E5F5',
  },
  starterPill: {
    backgroundColor: '#E3F2FD',
  },
  proPill: {
    backgroundColor: '#E8F5E9',
  },
  enterprisePill: {
    backgroundColor: '#FFF3E0',
  },
  planPillText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#09264b',
  },
  realExamplePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0393d5',
  },
  realExampleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#09264b',
    marginBottom: 4,
  },
  realExampleDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  realExampleStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0393d5',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
  },
  bottomSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  refundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  refundText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0393d5',
    marginLeft: 8,
  },
  unlimitedPill: {
    backgroundColor: '#E8F5E9',
  },
  bottomText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  importantNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF5F0',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#0393d5',
  },
  importantNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  gotItButton: {
    backgroundColor: '#0393d5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  gotItButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default PricingExplanationModal;
