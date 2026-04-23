import { supabase } from '../database/database.js';
import path from 'path';

/**
 * Upload a single file to Supabase Storage
 * @param {Object} file - Express file object (from multer)
 * @param {string} folder - Destination folder (e.g., 'scenes', 'profiles')
 * @returns {Promise<string>} - Public URL of the uploaded file
 */
export const uploadFile = async (file, folder = 'general') => {
  if (!file) return null;

  const fileExt = path.extname(file.originalname).toLowerCase();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('scene-on')
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) {
    console.error('Supabase Storage Upload Error:', error);
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('scene-on')
    .getPublicUrl(filePath);

  return publicUrl;
};

/**
 * Delete a file from Supabase Storage
 * @param {string} publicUrl - Public URL of the file
 */
export const deleteFile = async (publicUrl) => {
  if (!publicUrl) return;

  try {
    // Extract relative path from public URL
    // URL format: https://.../storage/v1/object/public/scene-on/folder/filename.ext
    const parts = publicUrl.split('/storage/v1/object/public/scene-on/');
    if (parts.length < 2) return;

    const filePath = parts[1];
    const { error } = await supabase.storage
      .from('scene-on')
      .remove([filePath]);

    if (error) {
      console.error('Supabase Storage Delete Error:', error);
    }
  } catch (err) {
    console.error('Error parsing URL for deletion:', err);
  }
};
