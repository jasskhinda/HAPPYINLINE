import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const PaymentSuccessScreen = ({ navigation, route }) => {
  const { planName, amount, refundDays, businessName } = route.params;

  const handleLogin = () => {
    // Navigate to business login screen
    navigation.replace('BusinessLoginScreen');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={80} color="#FFFFFF" />
          </View>
        </View>

        {/* Success Message */}
        <Text style={styles.title}>Payment Successful!</Text>
        <Text style={styles.subtitle}>
          Welcome to Happy Inline
        </Text>

        {/* Business Name */}
        <View style={styles.businessCard}>
          <Ionicons name="business" size={24} color="#0393d5" />
          <Text style={styles.businessName}>{businessName}</Text>
        </View>

        {/* Plan Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Plan</Text>
            <Text style={styles.detailValue}>{planName}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount Paid</Text>
            <Text style={styles.detailValue}>${amount}/month</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Refund Policy</Text>
            <Text style={styles.detailValue}>{refundDays}-day money-back guarantee</Text>
          </View>
        </View>

        {/* What's Next */}
        <View style={styles.nextStepsContainer}>
          <Text style={styles.nextStepsTitle}>What's Next:</Text>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>Complete your business profile</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>Add your services and pricing</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>Invite team members</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <Text style={styles.stepText}>Start accepting bookings!</Text>
          </View>
        </View>

        {/* Refund Info Card */}
        <View style={styles.refundCard}>
          <Ionicons name="shield-checkmark" size={20} color="#0393d5" />
          <Text style={styles.refundText}>
            Not satisfied? Contact us within {refundDays} days for a full refund. No questions asked.
          </Text>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleLogin}
        >
          <Text style={styles.continueButtonText}>Login to Your Business</Text>
          <Ionicons name="log-in" size={20} color="#FFF" />
        </TouchableOpacity>

        <Text style={styles.autoRedirectText}>
          Your account is ready! Please login to continue.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 30,
  },
  successCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  businessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 24,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0393d5',
    marginLeft: 12,
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 15,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  nextStepsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  nextStepsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0393d5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  refundCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#D0E8FF',
  },
  refundText: {
    flex: 1,
    fontSize: 14,
    color: '#0393d5',
    marginLeft: 12,
    lineHeight: 20,
  },
  continueButton: {
    backgroundColor: '#0393d5',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  autoRedirectText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default PaymentSuccessScreen;
