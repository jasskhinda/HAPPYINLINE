import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SelectableServiceItem = ({ service, selected, onToggle }) => {
  // Get fallback icon name based on service name (if no image uploaded)
  const getFallbackIcon = (service) => {
    const name = service.name.toLowerCase();
    
    // Haircut variations
    if (name.includes('haircut') || name.includes('hair cut')) return 'cut';
    
    // Shaving variations
    if (name.includes('shav') || name.includes('razor')) return 'cut-outline';
    
    // Beard variations
    if (name.includes('beard')) return 'help-circle-outline';
    
    // Treatment/Therapy variations
    if (name.includes('treatment') || name.includes('therapy') || name.includes('mask') || name.includes('condition')) return 'add-circle';
    
    // Styling variations
    if (name.includes('style') || name.includes('styling')) return 'star-outline';
    
    // Coloring variations
    if (name.includes('color') || name.includes('dye') || name.includes('highlight')) return 'color-palette-outline';
    
    // Trim variations
    if (name.includes('trim')) return 'cut';
    
    // Wash variations
    if (name.includes('wash') || name.includes('shampoo')) return 'water-outline';
    
    // Massage variations
    if (name.includes('massage')) return 'hand-left-outline';
    
    // Default icon
    return 'cut';
  };

  return (
    <TouchableOpacity
      style={[styles.container, selected && styles.containerSelected]}
      onPress={() => onToggle(service)}
      activeOpacity={0.7}
    >
      {/* Service Icon - Display uploaded image or fallback to icon */}
      <View style={[styles.iconContainer, selected && styles.iconContainerSelected]}>
        {service.icon_url ? (
          <Image 
            source={{ uri: service.icon_url }} 
            style={styles.serviceImage}
            resizeMode="cover"
          />
        ) : (
          <Ionicons 
            name={getFallbackIcon(service)} 
            size={24} 
            color='#FF6B6B'
          />
        )}
      </View>

      {/* Service Info */}
      <View style={styles.info}>
        <Text style={styles.name}>{service.name}</Text>
        {service.description && (
          <Text style={styles.description} numberOfLines={2}>
            {service.description}
          </Text>
        )}
      </View>

      {/* Checkmark */}
      {selected && (
        <View style={styles.checkmark}>
          <Ionicons name="checkmark-circle" size={26} color="#FF6B6B" />
        </View>
      )}
      {!selected && (
        <View style={styles.addCircle}>
          <Ionicons name="add-circle-outline" size={26} color="#CCCCCC" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    alignItems: 'center',
  },
  containerSelected: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFFFFF',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden', // Ensures image respects borderRadius
  },
  iconContainerSelected: {
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 3,
  },
  description: {
    fontSize: 12,
    color: '#9E9E9E',
    lineHeight: 16,
  },
  checkmark: {
    marginLeft: 6,
  },
  addCircle: {
    marginLeft: 6,
  },
});

export default SelectableServiceItem;
