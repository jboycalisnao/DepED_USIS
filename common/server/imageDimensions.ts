export type ImageDimensions = {
  width: number;
  height: number;
};

const readUInt24BE = (bytes: Buffer, offset: number) =>
  (bytes[offset] << 16) + (bytes[offset + 1] << 8) + bytes[offset + 2];

const readJpegDimensions = (bytes: Buffer): ImageDimensions | null => {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    const segmentLength = bytes.readUInt16BE(offset + 2);
    if (segmentLength < 2) return null;

    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isStartOfFrame) {
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + segmentLength;
  }

  return null;
};

const readPngDimensions = (bytes: Buffer): ImageDimensions | null => {
  const pngSignature = '89504e470d0a1a0a';
  if (bytes.length < 24 || bytes.subarray(0, 8).toString('hex') !== pngSignature) return null;
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
};

const readWebpDimensions = (bytes: Buffer): ImageDimensions | null => {
  if (bytes.length < 30 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') {
    return null;
  }

  const chunkType = bytes.toString('ascii', 12, 16);
  if (chunkType === 'VP8X' && bytes.length >= 30) {
    return {
      width: 1 + readUInt24BE(Buffer.from([bytes[26], bytes[25], bytes[24]]), 0),
      height: 1 + readUInt24BE(Buffer.from([bytes[29], bytes[28], bytes[27]]), 0),
    };
  }

  if (chunkType === 'VP8L' && bytes.length >= 25) {
    const value = bytes.readUInt32LE(21);
    return {
      width: (value & 0x3fff) + 1,
      height: ((value >> 14) & 0x3fff) + 1,
    };
  }

  if (chunkType === 'VP8 ' && bytes.length >= 30) {
    return {
      width: bytes.readUInt16LE(26) & 0x3fff,
      height: bytes.readUInt16LE(28) & 0x3fff,
    };
  }

  return null;
};

export const readImageDimensions = (bytes: Buffer, mimeType: string): ImageDimensions | null => {
  if (mimeType === 'image/png') return readPngDimensions(bytes);
  if (mimeType === 'image/jpeg') return readJpegDimensions(bytes);
  if (mimeType === 'image/webp') return readWebpDimensions(bytes);
  return null;
};

export const assertSquareImage = (bytes: Buffer, mimeType: string) => {
  const dimensions = readImageDimensions(bytes, mimeType);
  if (!dimensions) throw new Error('Unable to read image dimensions. Use a valid JPG, PNG, or WebP image.');
  if (dimensions.width !== dimensions.height) {
    throw new Error(`Profile picture must be square. Uploaded image is ${dimensions.width}x${dimensions.height}.`);
  }
  return dimensions;
};
