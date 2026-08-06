/**
 * Canvas-based image compression function.
 * Resizes images exceeding `maxWidth` while preserving aspect ratio,
 * and compresses using HTML5 Canvas toBlob to target smaller file size (~200-400KB).
 *
 * @param {File|Blob} file - Input image file
 * @param {number} [maxWidth=1920] - Maximum allowable width in pixels
 * @param {number} [quality=0.8] - Compression quality factor (0.0 to 1.0)
 * @returns {Promise<File|Blob>} Resolves with the compressed File object
 */
export async function compressImage(file, maxWidth = 1920, quality = 0.8) {
  if (!file || !(file instanceof Blob || file instanceof File)) {
    return file;
  }

  // If not an image, return original file
  if (file.type && !file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => resolve(file); // Fallback to original on read error

    reader.onload = (event) => {
      const img = new Image();

      img.onerror = () => resolve(file); // Fallback on load error

      img.onload = () => {
        try {
          let { width, height } = img;

          // Scale down proportionally if image width exceeds maxWidth
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }

          // Draw image to canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Standardize output to image/jpeg for consistent compression
          const mimeType = 'image/jpeg';

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }

              // Build File object with original name (or default) and .jpg extension
              const originalName = file.name || 'captured_photo.jpg';
              const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
              const newFileName = `${nameWithoutExt}_compressed.jpg`;

              const compressedFile = new File([blob], newFileName, {
                type: mimeType,
                lastModified: Date.now(),
              });

              resolve(compressedFile);
            },
            mimeType,
            quality
          );
        } catch (err) {
          console.error('Image compression error:', err);
          resolve(file);
        }
      };

      img.src = event.target.result;
    };

    reader.readAsDataURL(file);
  });
}

export default compressImage;
