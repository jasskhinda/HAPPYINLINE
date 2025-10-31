import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SettingAppBar from '../../../../components/appBar/SettingAppBar';

const BarberReviewsScreen = () => {
  // Mock reviews data - in real app this would come from API
  const [reviews] = useState([
    {
      id: '1',
      customerName: 'John Smith',
      customerImage: require('../../../../../assets/image.png'),
      rating: 5,
      review: 'Excellent service! The haircut was exactly what I wanted. Very professional and skilled barber. Highly recommend!',
      date: '2 days ago',
      services: ['Haircut', 'Beard Trim']
    },
    {
      id: '2',
      customerName: 'Mike Johnson',
      customerImage: require('../../../../../assets/image.png'),
      rating: 4,
      review: 'Great experience. Professional and skilled barber. Will definitely come back. The atmosphere was very welcoming.',
      date: '1 week ago',
      services: ['Haircut']
    },
    {
      id: '3',
      customerName: 'David Wilson',
      customerImage: require('../../../../../assets/image.png'),
      rating: 5,
      review: 'Amazing attention to detail. Best barber in town! The service quality exceeded my expectations.',
      date: '2 weeks ago',
      services: ['Haircut', 'Shave', 'Hair Style']
    },
    {
      id: '4',
      customerName: 'Alex Brown',
      customerImage: require('../../../../../assets/image.png'),
      rating: 4,
      review: 'Good service and friendly staff. Clean and professional environment. Would recommend to friends.',
      date: '3 weeks ago',
      services: ['Beard Care']
    },
    {
      id: '5',
      customerName: 'Tom Anderson',
      customerImage: require('../../../../../assets/image.png'),
      rating: 5,
      review: 'Fantastic haircut! The barber really listened to what I wanted and delivered perfectly. Great job!',
      date: '1 month ago',
      services: ['Haircut', 'Treatment']
    }
  ]);

  const averageRating = (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1);
  const totalReviews = reviews.length;

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
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.customerInfo}>
          <Image
            source={item.customerImage}
            style={styles.customerImage}
            resizeMode="cover"
          />
          <View style={styles.customerDetails}>
            <Text style={styles.customerName}>{item.customerName}</Text>
            <Text style={styles.reviewDate}>{item.date}</Text>
            <View style={styles.servicesContainer}>
              {item.services.map((service, index) => (
                <View key={index} style={styles.serviceTag}>
                  <Text style={styles.serviceText}>{service}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        <View style={styles.reviewRating}>
          {renderStarRating(item.rating, 16)}
        </View>
      </View>
      <Text style={styles.reviewText}>{item.review}</Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{averageRating}</Text>
            <View style={styles.starsContainer}>
              {renderStarRating(parseFloat(averageRating), 18)}
            </View>
            <Text style={styles.statLabel}>Average Rating</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalReviews}</Text>
            <Text style={styles.statLabel}>Total Reviews</Text>
          </View>
        </View>
      </View>
      <Text style={styles.sectionTitle}>Customer Reviews</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.container}>
        <SettingAppBar title="Customer Reviews" />
        
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          renderItem={renderReviewItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </View>
  );
};

export default BarberReviewsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEEEEE',
  },
  listContent: {
    paddingBottom: 20,
  },
  headerSection: {
    padding: 20,
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  reviewCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  customerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceTag: {
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 5,
    marginBottom: 2,
  },
  serviceText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '500',
  },
  reviewRating: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  reviewText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});