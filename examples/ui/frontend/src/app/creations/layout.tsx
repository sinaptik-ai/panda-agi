import { Metadata } from 'next';
import { generatePageMetadata } from '../metadata';

export const metadata: Metadata = generatePageMetadata('creations');

export default function CreationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
