import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Modal,
  FlatList 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BarberProfileCard = ({ barberProfile }) => {
  const [showReviewsModal, setShowReviewsModal] = useState(false);

  const renderStarRating = (rating, size = 16) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<Ionicons key={i} name="star" size={size} color="#FFD700" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<Ionicons key={i} name="star-half" size={size} color="#FFD700" />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={size} color="#FFD700" />);
      }
    }
    return stars;
  };

  const renderReviewItem = ({ item }) => (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <Text style={styles.customerName}>{item.customerName}</Text>
        <View style={styles.reviewRating}>
          {renderStarRating(item.rating, 14)}
        </View>
      </View>
      <Text style={styles.reviewText}>{item.review}</Text>
      <View style={styles.reviewFooter}>
        <Text style={styles.reviewDate}>{item.date}</Text>
        <View style={styles.servicesTags}>
          {item.services.map((service, index) => (
            <View key={index} style={styles.serviceTag}>
              <Text style={styles.serviceTagText}>{service}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <>
      <View style={styles.profileCard}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image
            source={barberProfile.image}
            style={styles.profileImage}
            resizeMode="cover"
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{barberProfile.name}</Text>
            <Text style={styles.profileDescription}>{barberProfile.description}</Text>
            
            {/* Rating Section */}
            <View style={styles.ratingSection}>
              <View style={styles.starsContainer}>
                {renderStarRating(barberProfile.rating, 18)}
              </View>
              <Text style={styles.ratingText}>
                {barberProfile.rating} ({barberProfile.totalReviews} reviews)
              </Text>
            </View>
          </View>
        </View>

        {/* Services Section */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Your Services</Text>
          <View style={styles.servicesContainer}>
            {barberProfile.services.map((service, index) => (
              <View key={index} style={styles.serviceChip}>
                <Text style={styles.serviceChipText}>{service}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Reviews Section */}
        <View style={styles.reviewsSection}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Recent Reviews</Text>
            {barberProfile.reviews.length > 0 && (
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => setShowReviewsModal(true)}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="chevron-forward" size={16} color="#4CAF50" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Show message if no reviews */}
          {barberProfile.reviews.length === 0 ? (
            <View style={styles.noReviewsContainer}>
              <Ionicons name="chatbox-ellipses-outline" size={48} color="#DDD" />
              <Text style={styles.noReviewsTitle}>No Reviews Yet</Text>
              <Text style={styles.noReviewsText}>
                You haven't received any customer reviews yet.{'\n'}
                Keep providing great service to earn your first review! 💈
              </Text>
            </View>
          ) : (
            /* Show first 2 reviews */
            barberProfile.reviews.slice(0, 2).map((review) => (
              <View key={review.id} style={styles.reviewPreview}>
                <View style={styles.reviewPreviewHeader}>
                  <Text style={styles.reviewCustomerName}>{review.customerName}</Text>
                  <View style={styles.reviewPreviewRating}>
                    {renderStarRating(review.rating, 14)}
                  </View>
                </View>
                <Text style={styles.reviewPreviewText} numberOfLines={2}>
                  {review.review}
                </Text>
                <Text style={styles.reviewPreviewDate}>{review.date}</Text>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Reviews Modal */}
      <Modal
        visible={showReviewsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All Customer Reviews</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowReviewsModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={barberProfile.reviews}
            keyExtractor={(item) => item.id}
            renderItem={renderReviewItem}
            contentContainerStyle={styles.reviewsList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </>
  );
};

export default BarberProfileCard;

const styles = StyleSheet.create({
  profileCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 10,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  profileDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  servicesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceChip: {
    backgroundColor: '#E8F5E8',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  serviceChipText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  reviewsSection: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 15,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginRight: 4,
  },
  reviewPreview: {
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  reviewPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  reviewCustomerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  reviewPreviewRating: {
    flexDirection: 'row',
  },
  reviewPreviewText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 5,
  },
  reviewPreviewDate: {
    fontSize: 11,
    color: '#999',
  },
  // No Reviews Styles
  noReviewsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noReviewsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 15,
    marginBottom: 10,
  },
  noReviewsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#EEEEEE',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  reviewsList: {
    padding: 20,
  },
  reviewItem: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  reviewRating: {
    flexDirection: 'row',
  },
  reviewText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  servicesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceTag: {
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 5,
  },
  serviceTagText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '500',
  },
});