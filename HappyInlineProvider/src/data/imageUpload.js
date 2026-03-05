import { supabase } from '../lib/supabase';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

/**
 * Upload shop images (logo, banner, cover) to Supabase Storage
 * @param {string} imageUri - Local image URI
 * @param {string} shopId - Shop ID for folder organization
 * @param {string} imageType - Type of image: 'logo', 'banner', or 'cover'
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const uploadShopImage = async (imageUri, shopId, imageType) => {
  try {
    if (!imageUri) {
      return { success: false, error: 'No image provided' };
    }

    // Get file extension
    const fileExtension = imageUri.split('.').pop().toLowerCase();
    const fileName = `${shopId}/${imageType}_${Date.now()}.${fileExtension}`;

    // Read file as base64 using legacy API
    const base64 = await readAsStringAsync(imageUri, {
      encoding: 'base64',
    });

    // Decode base64 to ArrayBuffer
    const arrayBuffer = decode(base64);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('shop-images')
      .upload(fileName, arrayBuffer, {
        contentType: `image/${fileExtension}`,
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('shop-images')
      .getPublicUrl(fileName);

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('Upload exception:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Upload service image to Supabase Storage
 * @param {string} imageUri - Local image URI
 * @param {string} shopId - Shop ID for folder organization
 * @param {string} serviceName - Service name for filename
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const uploadServiceImage = async (imageUri, shopId, serviceName) => {
  try {
    if (!imageUri) {
      return { success: false, error: 'No image provided' };
    }

    // Get file extension
    const fileExtension = imageUri.split('.').pop().toLowerCase();
    const sanitizedName = serviceName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `${shopId}/services/${sanitizedName}_${Date.now()}.${fileExtension}`;

    // Read file as base64 using legacy API
    const base64 = await readAsStringAsync(imageUri, {
      encoding: 'base64',
    });

    // Decode base64 to ArrayBuffer
    const arrayBuffer = decode(base64);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('shop-images')
      .upload(fileName, arrayBuffer, {
        contentType: `image/${fileExtension}`,
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('shop-images')
      .getPublicUrl(fileName);

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('Upload exception:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete an image from Supabase Storage
 * @param {string} imageUrl - Public URL of the image
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteShopImage = async (imageUrl) => {
  try {
    if (!imageUrl) {
      return { success: false, error: 'No image URL provided' };
    }

    // Extract file path from URL
    const urlParts = imageUrl.split('/shop-images/');
    if (urlParts.length < 2) {
      return { success: false, error: 'Invalid image URL' };
    }
    const filePath = urlParts[1];

    // Delete from Supabase Storage
    const { error } = await supabase.storage
      .from('shop-images')
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Delete exception:', error);
    return { success: false, error: error.message };
  }
};
