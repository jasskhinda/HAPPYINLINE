import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const ChatListItem = ({ name, unreadCount, image }) => {
  const navigation = useNavigation();

  const handlePress = () => {
    navigation.navigate('ChatConversationScreen', {
      userName: name,
      userImage: image,
    });
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Image
        source={image}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>

      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default ChatListItem;

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 15,
    marginVertical: 8,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  logo: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
  },
  name: {
    flex: 1,
    fontWeight: 'bold',
    fontSize: 17,
    marginLeft: 10,
    color: '#333',
  },
  badge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
});
