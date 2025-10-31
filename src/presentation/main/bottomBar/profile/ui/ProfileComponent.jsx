import { Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const ProfileComponent = ({icon, text, onPress, disabled = false}) => {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={{marginTop: 25, opacity: disabled ? 0.5 : 1}}
      disabled={disabled}
    >
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Icon name={icon} size={27} color="black" />
            <Text style={{fontWeight: 'bold', marginLeft: 12, fontSize: 17, flex: 1}}>
                {text}
            </Text>
            <Icon name="chevron-forward-outline" size={27} color="black" />
        </View>
    </TouchableOpacity>
  )
}

export default ProfileComponent