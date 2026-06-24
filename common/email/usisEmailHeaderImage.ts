const USIS_EMAIL_HEADER_IMAGE_SRC = 'https://ik.imagekit.io/astrasolutions/Leon%20NHS/USIS/Leon-NHS_USIS-Header-Image-email.jpg';
const USIS_EMAIL_HEADER_IMAGE_NAME = 'Leon-NHS_USIS-Header-Image-email.jpg';
const USIS_EMAIL_HEADER_IMAGE_MIME_TYPE = 'image/jpeg';

export type UsisEmailHeaderImagePayload = {
  headerImageSrc: string;
  headerImageBase64: string;
  headerImageMimeType: string;
  headerImageName: string;
};

let cachedHeaderImagePromise: Promise<UsisEmailHeaderImagePayload> | null = null;

export async function loadUsisEmailHeaderImagePayload() {
  if (!cachedHeaderImagePromise) {
    cachedHeaderImagePromise = Promise.resolve({
      headerImageSrc: USIS_EMAIL_HEADER_IMAGE_SRC,
      headerImageBase64: '',
      headerImageMimeType: USIS_EMAIL_HEADER_IMAGE_MIME_TYPE,
      headerImageName: USIS_EMAIL_HEADER_IMAGE_NAME,
    });
  }

  return cachedHeaderImagePromise;
}
