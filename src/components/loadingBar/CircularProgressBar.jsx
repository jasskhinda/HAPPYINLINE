import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';

const CircularProgressBar = ({loaderText}) => {
  return (
    <View style={styles.overlay}>
        <ActivityIndicator size="large" color="#FFC067" />
        {loaderText ? <Text style={styles.loaderText}>{loaderText}</Text> : null}
    </View>
  )
}

export default CircularProgressBar;

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Semi-transparent background
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    elevation: 1000,
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
