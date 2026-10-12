import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'i-Service',
    short_name: 'i-Service',
    start_url: '/',
    display: 'browser',
    background_color: '#0B0D10',
    theme_color: '#0B0D10',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
