import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ProviderCard = ({ provider, onPress }) => {
  // Support both 'provider' and legacy 'barber' props for backward compatibility
  const data = provider || arguments[0]?.barber;
  
  const renderStarRating = (rating, size = 14) => {
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

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={{ flexDirection: 'row' }}>
        <Image
          source={require('../../../../../../assets/image.png')}
          style={styles.logo}
          resizeMode="cover"
        />
        <View style={{ justifyContent: 'center', flex: 1, paddingVertical: 15 }}>
          <Text style={styles.dateText}>{data.name}</Text>
          
          {/* RATING SECTION - Always show, even if 0 */}
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {renderStarRating(Number(data.rating) || 0, 14)}
            </View>
            <Text style={styles.ratingText}>
              {(Number(data.rating) || 0).toFixed(1)} ({Number(data.total_reviews) || 0} reviews)
            </Text>
          </View>
          
          <View style={{ flex: 1 }} />
          <Text style={styles.serviceText}>
            Services: {data.services?.join(', ') || 'N/A'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ProviderCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    marginTop: 7,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginHorizontal: 16,
  },
  logo: {
    width: 90,
    height: 120,
    borderRadius: 25,
    marginRight: 10,
    backgroundColor: '#F8F9FA'
  },
  statusBadge: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 4
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 11,
    textTransform: 'capitalize',
  },
  dateText: {
    color: 'black',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 17,
    marginBottom: 6,
  },
  nameText: {
    color: 'black',
    fontWeight: 'normal',
    marginLeft: 5,
    fontSize: 14,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 5,
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 6,
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  serviceText: {
    color: 'black',
    marginLeft: 5,
    paddingRight: 7,
  },
});
