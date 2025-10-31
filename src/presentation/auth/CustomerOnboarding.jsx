import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const CustomerOnboarding = ({ navigation }) => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides = [
    {
      id: 1,
      icon: 'search',
      iconColor: '#FF6B6B',
      iconBg: '#FFE5E5',
      title: 'Find the Best Barbers',
      subtitle: 'Discover top-rated shops and professionals near you',
      features: [
        { icon: 'location', text: 'Browse shops nearby' },
        { icon: 'star', text: 'Read real reviews' },
        { icon: 'images', text: 'View portfolios' },
      ],
    },
    {
      id: 2,
      icon: 'calendar',
      iconColor: '#34C759',
      iconBg: '#E8F5E9',
      title: 'Book Instantly',
      subtitle: 'Choose your service, pick a time, and you\'re done!',
      features: [
        { icon: 'time', text: 'Real-time availability' },
        { icon: 'notifications', text: 'Instant confirmation' },
        { icon: 'sync', text: 'Easy rescheduling' },
      ],
    },
    {
      id: 3,
      icon: 'person-circle',
      iconColor: '#FF6B6B',
      iconBg: '#FFE5E5',
      title: 'Manage Everything',
      subtitle: 'Track bookings, save favorites, and more',
      features: [
        { icon: 'heart', text: 'Save favorite shops' },
        { icon: 'list', text: 'View booking history' },
        { icon: 'chatbubbles', text: 'Message directly' },
      ],
    },
  ];

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / width);
        setCurrentIndex(index);
      },
    }
  );

  const goToNext = () => {
    if (currentIndex < slides.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (currentIndex + 1) * width,
        animated: true,
      });
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = () => {
    navigation.replace('CustomerRegistration');
  };

  const handleGetStarted = () => {
    navigation.replace('CustomerRegistration');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {slides.map((slide, index) => (
          <View key={slide.id} style={styles.slide}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <View style={[styles.iconCircle, { backgroundColor: slide.iconBg }]}>
                <Ionicons name={slide.icon} size={80} color={slide.iconColor} />
              </View>
            </View>

            {/* Text */}
            <View style={styles.textContainer}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>

              {/* Features */}
              <View style={styles.features}>
                {slide.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureItem}>
                    <View style={styles.featureIconContainer}>
                      <Ionicons name={feature.icon} size={20} color={slide.iconColor} />
                    </View>
                    <Text style={styles.featureText}>{feature.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Section */}
      <View style={styles.bottomContainer}>
        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {slides.map((_, index) => {
            const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Continue Button */}
        <TouchableOpacity style={styles.continueButton} onPress={goToNext}>
          <Text style={styles.continueButtonText}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Continue'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>

        {/* Sign In Link */}
        <TouchableOpacity
          style={styles.signInContainer}
          onPress={() => navigation.navigate('CustomerLogin')}
        >
          <Text style={styles.signInText}>
            Already have an account? <Text style={styles.signInLink}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEEEEE',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  slide: {
    width: width,
    flex: 1,
    paddingTop: 100,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    paddingHorizontal: 32,
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
  features: {
    marginTop: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  bottomContainer: {
    paddingHorizontal: 32,
    paddingBottom: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
    marginHorizontal: 4,
  },
  continueButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  signInContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  signInText: {
    fontSize: 15,
    color: '#666',
  },
  signInLink: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
});

export default CustomerOnboarding;
