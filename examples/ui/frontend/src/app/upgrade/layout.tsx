import { Metadata } from 'next';
import { generatePageMetadata } from '../metadata';

export const metadata: Metadata = generatePageMetadata('upgrade');

export default function UpgradeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
