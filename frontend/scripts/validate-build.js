#!/usr/bin/env node

/**
 * Build Validation Script
 * Validates that production builds exclude test files and meet quality standards
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
/* eslint-enable @typescript-eslint/no-require-imports */

console.log('🔍 Validating production build...');

const distPath = path.join(__dirname, '..', 'dist');

// Check if build exists
if (!fs.existsSync(distPath)) {
  console.error('❌ Build directory not found. Run expo export first.');
  process.exit(1);
}

// Validation results
const results = {
  buildExists: false,
  testFilesExcluded: true,
  bundleSize: 0,
  criticalFiles: [],
  errors: [],
};

try {
  // Check build structure
  results.buildExists = fs.existsSync(distPath);
  
  // Recursively check for test files in build
  function checkForTestFiles(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        checkForTestFiles(fullPath);
      } else if (stat.isFile()) {
        // Check if test files are included (should not be)
        if (item.includes('.test.') || item.includes('.spec.') || item.includes('__tests__')) {
          results.testFilesExcluded = false;
          results.errors.push(`Test file found in build: ${fullPath}`);
        }
        
        // Track bundle size
        results.bundleSize += stat.size;
        
        // Track critical files
        if (item.endsWith('.js') || item.endsWith('.bundle')) {
          results.criticalFiles.push({
            file: item,
            size: stat.size,
            path: fullPath.replace(distPath, ''),
          });
        }
      }
    }
  }
  
  checkForTestFiles(distPath);
  
  // Format bundle size
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  console.log('\n📊 Build Validation Results:');
  console.log('=====================================');
  console.log(`✅ Build exists: ${results.buildExists}`);
  console.log(`${results.testFilesExcluded ? '✅' : '❌'} Test files excluded: ${results.testFilesExcluded}`);
  console.log(`📦 Total bundle size: ${formatBytes(results.bundleSize)}`);
  
  if (results.criticalFiles.length > 0) {
    console.log('\n📁 Critical Files:');
    results.criticalFiles
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .forEach(file => {
        console.log(`  ${file.file}: ${formatBytes(file.size)}`);
      });
  }
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  // Quality gates
  const maxBundleSize = 10 * 1024 * 1024; // 10MB limit
  if (results.bundleSize > maxBundleSize) {
    console.log(`\n⚠️  Bundle size exceeds ${formatBytes(maxBundleSize)} limit`);
    results.errors.push('Bundle size too large');
  }
  
  // Exit with appropriate code
  if (results.errors.length > 0) {
    console.log('\n❌ Build validation failed!');
    process.exit(1);
  } else {
    console.log('\n✅ Build validation passed!');
    process.exit(0);
  }
  
} catch (error) {
  console.error('❌ Build validation error:', error.message);
  process.exit(1);
}