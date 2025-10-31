import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import SettingAppBar from '../../../../components/appBar/SettingAppBar';

const RateServiceScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { barberName, bookingId } = route.params || {};
  
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);

  const handleStarPress = (starNumber) => {
    setRating(starNumber);
  };

  const handleSubmitRating = () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting.');
      return;
    }

    // Here you would typically send the rating and review to your backend
    Alert.alert(
      'Thank You!',
      'Your rating and review have been submitted successfully.',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const isSelected = i <= rating;
      const isHovered = i <= hoveredStar;
      
      stars.push(
        <TouchableOpacity
          key={i}
          style={styles.starButton}
          onPress={() => handleStarPress(i)}
          onPressIn={() => setHoveredStar(i)}
          onPressOut={() => setHoveredStar(0)}
        >
          <Ionicons
            name={isSelected || isHovered ? 'star' : 'star-outline'}
            size={40}
            color={isSelected || isHovered ? '#FFD700' : '#DDD'}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const getRatingText = () => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Tap to rate';
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.container}>
        <SettingAppBar title="Rate Service" />
        
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Barber Info */}
          <View style={styles.barberInfoSection}>
            <Text style={styles.questionText}>
              How was your experience with
            </Text>
            <Text style={styles.barberName}>{barberName}?</Text>
          </View>

          {/* Star Rating */}
          <View style={styles.ratingSection}>
            <Text style={styles.ratingLabel}>Your Rating</Text>
            <View style={styles.starsContainer}>
              {renderStars()}
            </View>
            <Text style={styles.ratingText}>{getRatingText()}</Text>
          </View>

          {/* Review Text Input */}
          <View style={styles.reviewSection}>
            <Text style={styles.reviewLabel}>
              Write a Review (Optional)
            </Text>
            <TextInput
              style={styles.reviewTextInput}
              value={review}
              onChangeText={setReview}
              placeholder="Share your experience with others..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>
              {review.length}/500 characters
            </Text>
          </View>

          {/* Quick Review Options */}
          <View style={styles.quickReviewSection}>
            <Text style={styles.quickReviewLabel}>Quick Reviews</Text>
            <View style={styles.quickReviewButtons}>
              {[
                'Professional Service',
                'Great Haircut',
                'Clean Environment',
                'Friendly Staff',
                'Value for Money',
                'On Time',
              ].map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickReviewButton}
                  onPress={() => {
                    const newReview = review ? `${review}, ${option}` : option;
                    if (newReview.length <= 500) {
                      setReview(newReview);
                    }
                  }}
                >
                  <Text style={styles.quickReviewButtonText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              rating > 0 ? styles.submitButtonActive : styles.submitButtonInactive
            ]}
            onPress={handleSubmitRating}
          >
            <Text style={[
              styles.submitButtonText,
              rating > 0 ? styles.submitButtonTextActive : styles.submitButtonTextInactive
            ]}>
              Submit Rating
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default RateServiceScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEEEEE',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  barberInfoSection: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
  questionText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  barberName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginTop: 5,
    textAlign: 'center',
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  starButton: {
    paddingHorizontal: 5,
  },
  ratingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  reviewSection: {
    marginBottom: 30,
  },
  reviewLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  reviewTextInput: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 120,
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  quickReviewSection: {
    marginBottom: 20,
  },
  quickReviewLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  quickReviewButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickReviewButton: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  quickReviewButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  submitSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#EEEEEE',
  },
  submitButton: {
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  submitButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  submitButtonInactive: {
    backgroundColor: '#DDD',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButtonTextActive: {
    color: 'white',
  },
  submitButtonTextInactive: {
    color: '#999',
  },
});