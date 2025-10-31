import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const SettingAppBar = ({ title }) => {
  const navigation = useNavigation();

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={25} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {title}
        </Text>
      </View>
      <View style={styles.separator}/>
    </SafeAreaView>
  )
}

export default SettingAppBar

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: '#EEEEEE'
    },
    container: {
        flexDirection: 'row',
        padding: 10,
        alignItems: 'center',
        backgroundColor: '#EEEEEE'
    },
    backButton: {
        padding: 5,
    },
    title: {
        flex: 1,
        fontWeight: 'bold',
        fontSize: 18,
        marginLeft: 8
    },
    separator: {
        height: 1,
        width: '100%',
        backgroundColor: 'white'
    }
})