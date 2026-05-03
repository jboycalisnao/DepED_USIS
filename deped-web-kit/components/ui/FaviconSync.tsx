import { useEffect } from 'react';

type FaviconSyncProps = {
  href: string;
};

export function FaviconSync({ href }: FaviconSyncProps) {
  useEffect(() => {
    const existing =
      document.querySelector<HTMLLinkElement>('link[rel="icon"]') ??
      document.createElement('link');

    existing.rel = 'icon';
    existing.type = 'image/png';
    existing.sizes = '64x64';

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 64;
      const inset = 6;
      const maxDrawableSize = size - inset * 2;
      const scale = Math.min(
        maxDrawableSize / image.naturalWidth,
        maxDrawableSize / image.naturalHeight
      );
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      const x = (size - drawWidth) / 2;
      const y = (size - drawHeight) / 2;

      canvas.width = size;
      canvas.height = size;

      const context = canvas.getContext('2d');
      if (!context) {
        existing.href = href;
        return;
      }

      context.clearRect(0, 0, size, size);
      context.drawImage(image, x, y, drawWidth, drawHeight);
      existing.href = canvas.toDataURL('image/png');
    };

    image.onerror = () => {
      existing.href = href;
    };

    image.src = href;

    if (!existing.parentNode) {
      document.head.appendChild(existing);
    }
  }, [href]);

  return null;
}
