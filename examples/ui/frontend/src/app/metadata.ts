import { Metadata } from 'next';

export interface PageMetadata {
  title: string;
  description: string;
  keywords: string[];
  path: string;
  ogImage?: string;
}

export const pageMetadata: Record<string, PageMetadata> = {
  home: {
    title: 'Annie - AI-driven Dashboards and Charts from Your CSV',
    description: 'Transform CSV data into AI-driven charts and dashboards. Upload, analyze, and share beautiful visualizations instantly with Annie.',
    keywords: ['AI dashboards', 'CSV charts', 'data visualization', 'AI analytics', 'dashboard creator', 'data insights', 'business intelligence'],
    path: '/',
    ogImage: '/og-home.png'
  },
  creations: {
    title: 'My Dashboards & Charts - Annie',
    description: 'View and manage your AI-generated dashboards and charts. Access saved work, edit visualizations, and share insights easily.',
    keywords: ['saved dashboards', 'my charts', 'data visualizations', 'saved work', 'AI generated charts', 'dashboard management'],
    path: '/creations',
    ogImage: '/og-creations.png'
  },
  upgrade: {
    title: 'Upgrade to Annie Pro - More Credits, More Dashboards',
    description: 'Unlock Annie Pro for unlimited credits, advanced charts, and premium features. Choose the perfect plan for your data needs.',
    keywords: ['Annie Pro', 'upgrade plan', 'premium features', 'unlimited dashboards', 'more credits', 'subscription'],
    path: '/upgrade',
    ogImage: '/og-upgrade.png'
  },
  'not-found': {
    title: 'Page Not Found - Annie',
    description: 'The page you are looking for could not be found. Return to Annie to continue creating amazing dashboards and charts from your data.',
    keywords: ['404', 'page not found', 'Annie'],
    path: '/404',
  }
};

export function generateMetadata(pageKey: string): Metadata {
  const page = pageMetadata[pageKey];
  if (!page) {
    return {
      title: 'Annie - AI-driven Dashboards and Charts',
      description: 'Transform your data into beautiful visualizations with AI-powered insights.',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const fullUrl = `${baseUrl}${page.path}`;

  return {
    title: page.title,
    description: page.description,
    keywords: page.keywords.join(', '),
    authors: [{ name: 'Annie AI' }],
    creator: 'Annie AI',
    publisher: 'Annie AI',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: page.path,
    },
    openGraph: {
      title: page.title,
      description: page.description,
      url: fullUrl,
      siteName: 'Annie',
      locale: 'en_US',
      type: 'website',
      images: page.ogImage ? [
        {
          url: page.ogImage,
          width: 1200,
          height: 630,
          alt: page.title,
        }
      ] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: page.title,
      description: page.description,
      creator: '@AnnieAI',
      images: page.ogImage ? [page.ogImage] : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
    },
  };
}

export function generatePageMetadata(pageKey: string): Metadata {
  return generateMetadata(pageKey);
}
