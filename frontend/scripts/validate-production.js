#!/usr/bin/env node

/**
 * Production Validation Script
 * Comprehensive validation for production readiness
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
/* eslint-enable @typescript-eslint/no-require-imports */

console.log('🚀 Running comprehensive production validation...');

const results = {
  lint: false,
  typecheck: false,
  tests: false,
  coverage: false,
  build: false,
  performance: false,
  security: false,
};

const errors = [];

try {
  console.log('\n📝 Step 1: Lint Check...');
  execSync('npm run lint', { stdio: 'inherit', cwd: process.cwd() });
  results.lint = true;
  console.log('✅ Lint passed');
} catch (error) {
  errors.push('Lint failed');
  console.log('❌ Lint failed');
}

try {
  console.log('\n🔍 Step 2: TypeScript Check...');
  execSync('npm run typecheck', { stdio: 'inherit', cwd: process.cwd() });
  results.typecheck = true;
  console.log('✅ TypeScript check passed');
} catch (error) {
  errors.push('TypeScript check failed');
  console.log('❌ TypeScript check failed');
}

try {
  console.log('\n🧪 Step 3: Test Suite...');
  execSync('npm run test:ci', { stdio: 'inherit', cwd: process.cwd() });
  results.tests = true;
  console.log('✅ Tests passed');
} catch (error) {
  errors.push('Tests failed');
  console.log('❌ Tests failed');
}

try {
  console.log('\n📊 Step 4: Coverage Analysis...');
  // Check coverage thresholds
  const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
  if (fs.existsSync(coveragePath)) {
    const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    const totalCoverage = coverage.total;
    
    console.log(`Lines: ${totalCoverage.lines.pct}%`);
    console.log(`Statements: ${totalCoverage.statements.pct}%`);
    console.log(`Functions: ${totalCoverage.functions.pct}%`);
    console.log(`Branches: ${totalCoverage.branches.pct}%`);
    
    // Minimum coverage thresholds
    const minCoverage = {
      lines: 70,
      statements: 70,
      functions: 70,
      branches: 60,
    };
    
    const coveragePassed = 
      totalCoverage.lines.pct >= minCoverage.lines &&
      totalCoverage.statements.pct >= minCoverage.statements &&
      totalCoverage.functions.pct >= minCoverage.functions &&
      totalCoverage.branches.pct >= minCoverage.branches;
    
    if (coveragePassed) {
      results.coverage = true;
      console.log('✅ Coverage thresholds met');
    } else {
      errors.push('Coverage below minimum thresholds');
      console.log('❌ Coverage below minimum thresholds');
    }
  } else {
    console.log('⚠️  No coverage data found');
  }
} catch (error) {
  errors.push('Coverage analysis failed');
  console.log('❌ Coverage analysis failed');
}

try {
  console.log('\n🏗️  Step 5: Build Validation...');
  execSync('npm run test:build', { stdio: 'inherit', cwd: process.cwd() });
  results.build = true;
  console.log('✅ Build validation passed');
} catch (error) {
  errors.push('Build validation failed');
  console.log('❌ Build validation failed');
}

try {
  console.log('\n⚡ Step 6: Performance Analysis...');
  
  // Check for performance anti-patterns
  const performanceIssues = [];
  
  // Check for console.log statements in production code
  const checkForConsoleLogsinJSFiles = (dir) => {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('__tests__')) {
        checkForConsoleLogsinJSFiles(fullPath);
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx')) && !item.includes('.test.') && !item.includes('.spec.')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const consoleLogCount = (content.match(/console\.log/g) || []).length;
        if (consoleLogCount > 0) {
          performanceIssues.push(`${fullPath}: ${consoleLogCount} console.log statements`);
        }
      }
    }
  };
  
  checkForConsoleLogsinJSFiles(path.join(process.cwd(), 'components'));
  checkForConsoleLogsinJSFiles(path.join(process.cwd(), 'services'));
  
  if (performanceIssues.length === 0) {
    results.performance = true;
    console.log('✅ Performance analysis passed');
  } else {
    console.log('⚠️  Performance issues found:');
    performanceIssues.forEach(issue => console.log(`  - ${issue}`));
    console.log('✅ Performance analysis completed (with warnings)');
    results.performance = true; // Don't fail build for console.log warnings
  }
} catch (error) {
  errors.push('Performance analysis failed');
  console.log('❌ Performance analysis failed');
}

try {
  console.log('\n🔒 Step 7: Security Analysis...');
  
  // Basic security checks
  const securityIssues = [];
  
  // Check for hardcoded secrets (basic patterns)
  const checkForSecrets = (dir) => {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('__tests__')) {
        checkForSecrets(fullPath);
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx')) && !item.includes('.test.') && !item.includes('.spec.')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Check for potential secrets
        const secretPatterns = [
          /password\s*=\s*["'][^"']{8,}["']/i,
          /api_?key\s*=\s*["'][^"']{20,}["']/i,
          /secret\s*=\s*["'][^"']{16,}["']/i,
        ];
        
        secretPatterns.forEach((pattern, index) => {
          if (pattern.test(content)) {
            securityIssues.push(`${fullPath}: Potential hardcoded secret (pattern ${index + 1})`);
          }
        });
      }
    }
  };
  
  checkForSecrets(path.join(process.cwd(), 'components'));
  checkForSecrets(path.join(process.cwd(), 'services'));
  
  if (securityIssues.length === 0) {
    results.security = true;
    console.log('✅ Security analysis passed');
  } else {
    console.log('❌ Security issues found:');
    securityIssues.forEach(issue => console.log(`  - ${issue}`));
    errors.push('Security issues detected');
  }
} catch (error) {
  errors.push('Security analysis failed');
  console.log('❌ Security analysis failed');
}

// Final Results
console.log('\n🏆 Production Validation Results:');
console.log('=====================================');
console.log(`Lint: ${results.lint ? '✅' : '❌'}`);
console.log(`TypeCheck: ${results.typecheck ? '✅' : '❌'}`);
console.log(`Tests: ${results.tests ? '✅' : '❌'}`);
console.log(`Coverage: ${results.coverage ? '✅' : '❌'}`);
console.log(`Build: ${results.build ? '✅' : '❌'}`);
console.log(`Performance: ${results.performance ? '✅' : '❌'}`);
console.log(`Security: ${results.security ? '✅' : '❌'}`);

const passedCount = Object.values(results).filter(Boolean).length;
const totalCount = Object.keys(results).length;

console.log(`\nOverall: ${passedCount}/${totalCount} checks passed`);

if (errors.length > 0) {
  console.log('\n❌ Failed checks:');
  errors.forEach(error => console.log(`  - ${error}`));
  console.log('\n💥 Production validation FAILED!');
  process.exit(1);
} else {
  console.log('\n🎉 Production validation PASSED!');
  console.log('🚀 Ready for production deployment!');
  process.exit(0);
}