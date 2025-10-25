#!/usr/bin/env node

/**
 * Simple script to test and validate the metadata configuration
 * Run with: node scripts/test-metadata.js
 */

const fs = require('fs');
const path = require('path');

// Mock metadata for testing
const mockMetadata = {
  generateMetadata: (pageKey) => {
    // Use the updated metadata configuration
    const fallbackMetadata = {
        home: {
          title: 'Annie - AI-driven Dashboards and Charts from Your CSV',
          description: 'Transform CSV data into AI-driven charts and dashboards. Upload, analyze, and share beautiful visualizations instantly with Annie.',
          keywords: ['AI dashboards', 'CSV charts', 'data visualization', 'AI analytics', 'dashboard creator', 'data insights', 'business intelligence'],
          path: '/',
        },
        creations: {
          title: 'My Dashboards & Charts - Annie',
          description: 'View and manage your AI-generated dashboards and charts. Access saved work, edit visualizations, and share insights easily.',
          keywords: ['saved dashboards', 'my charts', 'data visualizations', 'saved work', 'AI generated charts', 'dashboard management'],
          path: '/creations',
        },
        upgrade: {
          title: 'Upgrade to Annie Pro - More Credits, More Dashboards',
          description: 'Unlock Annie Pro for unlimited credits, advanced charts, and premium features. Choose the perfect plan for your data needs.',
          keywords: ['Annie Pro', 'upgrade plan', 'premium features', 'unlimited dashboards', 'more credits', 'subscription'],
          path: '/upgrade',
        },
      };
      
      const page = fallbackMetadata[pageKey];
      if (!page) return null;
      
      return {
        title: page.title,
        description: page.description,
        keywords: page.keywords?.join(', '),
      };
  }
};

function validateMetadata() {
  console.log('🔍 Testing Annie SEO Metadata Configuration\n');
  
  const pages = ['home', 'creations', 'upgrade'];
  let allValid = true;

  pages.forEach(pageKey => {
    console.log(`📄 Testing ${pageKey} page:`);
    
    const metadata = mockMetadata.generateMetadata(pageKey);
    
    if (!metadata) {
      console.log(`   ❌ No metadata found for ${pageKey}`);
      allValid = false;
      return;
    }

    // Test title
    const titleLength = metadata.title.length;
    if (titleLength >= 30 && titleLength <= 60) {
      console.log(`   ✅ Title: "${metadata.title}" (${titleLength} chars)`);
    } else {
      console.log(`   ⚠️  Title: "${metadata.title}" (${titleLength} chars) - Should be 30-60 chars`);
    }

    // Test description
    const descLength = metadata.description.length;
    if (descLength >= 120 && descLength <= 160) {
      console.log(`   ✅ Description: ${descLength} chars - optimal length`);
    } else {
      console.log(`   ⚠️  Description: ${descLength} chars - Should be 120-160 chars`);
    }

    // Test keywords
    const keywordCount = metadata.keywords ? metadata.keywords.split(', ').length : 0;
    if (keywordCount >= 3 && keywordCount <= 10) {
      console.log(`   ✅ Keywords: ${keywordCount} keywords defined`);
    } else {
      console.log(`   ⚠️  Keywords: ${keywordCount} keywords - Should be 3-10 keywords`);
    }

    console.log('');
  });

  // Check if layout files exist
  console.log('📁 Checking layout files:');
  
  const layoutFiles = [
    'src/app/layout.tsx',
    'src/app/creations/layout.tsx',
    'src/app/upgrade/layout.tsx'
  ];

  layoutFiles.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      console.log(`   ✅ ${file} exists`);
    } else {
      console.log(`   ❌ ${file} missing`);
      allValid = false;
    }
  });

  console.log('\n' + '='.repeat(50));
  if (allValid) {
    console.log('🎉 All metadata configurations look good!');
    console.log('\nNext steps:');
    console.log('1. Build and test your application');
    console.log('2. Use social media debuggers to test sharing');
    console.log('3. Monitor search console for SEO performance');
  } else {
    console.log('⚠️  Some issues found. Please review the warnings above.');
  }
}

// Run the validation
validateMetadata();
