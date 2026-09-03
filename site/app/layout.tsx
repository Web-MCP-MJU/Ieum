import type { Metadata } from 'next';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ieum — Rail spatial accessibility',
  description:
    'Explore, compare, route to, and select seats through one accessible human and agent interface.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
