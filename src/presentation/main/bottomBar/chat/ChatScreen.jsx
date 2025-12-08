import { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import FlexibleInputField from '../../../../components/inputTextField/FlexibleInputField';
import ChatListItem from './component/ChatListItem';

const ChatScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const dummyChats = [
    { id: 1, name: 'Olive Smith', unreadCount: 3 },
    { id: 2, name: 'Liam Johnson', unreadCount: 0 },
    { id: 3, name: 'Emma Brown', unreadCount: 1 },
    { id: 4, name: 'Noah Davis', unreadCount: 5 },
  ];

  return (
    <View style={styles.outerWrapper}>
      {/* App Bar inside SafeArea only */}
      <SafeAreaView style={styles.appBarWrapper} edges={['top', 'left', 'right']}>
        <View style={styles.appBar}>
          <Image
            source={require('../../../../../assets/logowithouttagline.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.titleContainer}>
            <Text style={styles.titleText}>Chat</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Scrollable content with border radius */}
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.searchWrapper}>
            <FlexibleInputField
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search..."
              showPrefixIcon={true}
              prefixIcon={<Ionicons name="search" size={20} color="#999" />}
            />
          </View>

          {dummyChats.map((chat) => (
            <ChatListItem
              key={chat.id}
              name={chat.name}
              unreadCount={chat.unreadCount}
              image={require('../../../../../assets/logowithouttagline.png')}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  appBarWrapper: {
    backgroundColor: '#F8F9FA',
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  titleContainer: {
    marginLeft: 10,
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    fontWeight: 'bold',
    fontSize: 20,
    color: 'black',
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 40,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  searchWrapper: {
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
});
