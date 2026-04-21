/**
 * Image Optimization and Persistence Utilities
 */

/**
 * Optimizes an existing URL by appending provider-specific transformation parameters.
 */
export const optimizeImageUrl = (url: string, width: number = 400, quality: number = 80): string => {
  if (!url || url.startsWith('data:')) return url;
  
  if (url.includes('ik.imagekit.io')) {
    const cleanUrl = url.split('?tr=')[0];
    return `${cleanUrl}?tr=w-${width},q-${quality}`;
  }

  if (url.includes('picsum.photos')) {
    return url.replace(/\/\d+\/\d+$/, `/${width}/${width}`);
  }

  return url;
};

/**
 * Calculates the approximate size of a Base64 string in bytes.
 */
export const getBase64Size = (base64String: string): number => {
  if (!base64String) return 0;
  const padding = (base64String.match(/=/g) || []).length;
  return (base64String.length * 0.75) - padding;
};

/**
 * Converts a remote URL to a base64 string.
 * Used to store images in local storage to save bandwidth on subsequent refreshes.
 */
export const urlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Failed to convert URL to base64:", error);
    return url; // Fallback to original URL if fetch fails
  }
};

/**
 * Compresses a File object and returns a Base64 string.
 */
export const compressImageFile = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width *= maxWidth / height;
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};