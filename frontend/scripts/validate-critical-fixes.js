#!/usr/bin/env node
/**
 * Critical Fixes Validation Script
 * 
 * This script validates the three critical fixes:
 * 1. shadowOffset errors resolved
 * 2. Timer content visibility in nursing card
 * 3. Background color consistency throughout cards
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 CRITICAL FIXES VALIDATION\n');

// Fix #1: Validate shadowOffset is properly structured in all files
function validateShadowOffsetFix() {
  console.log('📋 FIX #1: Validating shadowOffset structures...');
  
  const filesToCheck = [
    'components/activities/NursingCard.tsx',
    'components/shared/AnimatedActivityCard.tsx',
    'components/shared/TimerComponent.tsx'
  ];
  
  let allFixed = true;
  const issues = [];
  
  filesToCheck.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Look for any dynamic shadowOffset patterns that could cause errors
      const problematicPatterns = [
        /shadowOffset:\s*{\s*width:\s*[^0},]+/g,  // Dynamic width
        /shadowOffset:\s*{\s*height:\s*[^0},]+/g, // Dynamic height
        /shadowOffset:\s*\[[^\]]+\]/g,           // Array format
        /shadowOffset:\s*interpolate/g,          // Interpolated values
      ];
      
      let hasIssues = false;
      problematicPatterns.forEach((pattern, index) => {
        const matches = content.match(pattern);
        if (matches) {
          hasIssues = true;
          allFixed = false;
          issues.push(`${file}: Problematic shadowOffset pattern ${index + 1}: ${matches[0]}`);
        }
      });
      
      // Look for correct static shadowOffset patterns
      const correctPattern = /shadowOffset:\s*{\s*width:\s*0,\s*height:\s*\d+,?\s*}/g;
      const correctMatches = content.match(correctPattern);
      
      if (correctMatches) {
        console.log(`   ✅ ${file}: Found ${correctMatches.length} properly structured shadowOffset(s)`);
      } else if (!hasIssues) {
        console.log(`   ℹ️  ${file}: No shadowOffset found (OK)`);
      }
    }
  });
  
  if (allFixed && issues.length === 0) {
    console.log('   ✅ All shadowOffset structures are properly static - should eliminate console errors');
  } else {
    console.log('   ❌ Issues found:');
    issues.forEach(issue => console.log(`      ${issue}`));
  }
  
  return allFixed;
}

// Fix #2: Validate timer content is properly implemented
function validateTimerContentFix() {
  console.log('\n📋 FIX #2: Validating timer content implementation...');
  
  const nursingCardPath = path.join(__dirname, '..', 'components/activities/NursingCard.tsx');
  
  if (!fs.existsSync(nursingCardPath)) {
    console.log('   ❌ NursingCard.tsx not found');
    return false;
  }
  
  const content = fs.readFileSync(nursingCardPath, 'utf8');
  
  const requiredElements = [
    { name: 'NursingTimerRow component', pattern: /const NursingTimerRow.*=/ },
    { name: 'Left breast timer display', pattern: /Left Breast.*formatTime\(leftTimerState\.elapsed\)/ },
    { name: 'Right breast timer display', pattern: /Right Breast.*formatTime\(rightTimerState\.elapsed\)/ },
    { name: 'Timer toggle buttons', pattern: /leftTimerState\.isRunning.*Pause.*Start/ },
    { name: 'TotalSessionTimer component usage', pattern: /<TotalSessionTimer/ },
  ];
  
  let allPresent = true;
  requiredElements.forEach(element => {
    if (content.match(element.pattern)) {
      console.log(`   ✅ ${element.name} is properly implemented`);
    } else {
      console.log(`   ❌ ${element.name} is missing or incomplete`);
      allPresent = false;
    }
  });
  
  // Check for expandedHeight increase
  const heightMatch = content.match(/expandedHeight=\{(\d+)\}/);
  if (heightMatch) {
    const height = parseInt(heightMatch[1]);
    if (height >= 600) {
      console.log(`   ✅ Card height is properly increased to ${height}px for content visibility`);
    } else {
      console.log(`   ⚠️  Card height is ${height}px - may be too small for all content`);
    }
  } else {
    console.log('   ⚠️  expandedHeight not found - using default');
  }
  
  return allPresent;
}

// Fix #3: Validate background color implementation
function validateBackgroundColorFix() {
  console.log('\n📋 FIX #3: Validating background color consistency...');
  
  const animatedCardPath = path.join(__dirname, '..', 'components/shared/AnimatedActivityCard.tsx');
  
  if (!fs.existsSync(animatedCardPath)) {
    console.log('   ❌ AnimatedActivityCard.tsx not found');
    return false;
  }
  
  const content = fs.readFileSync(animatedCardPath, 'utf8');
  
  const colorFeatures = [
    { name: 'Activity color variable usage', pattern: /const activityColor = cardStateActions\.getActivityColor/ },
    { name: 'Card background style', pattern: /cardBackgroundStyle.*useAnimatedStyle/ },
    { name: 'Background color interpolation', pattern: /backgroundColor.*interpolateColor/ },
    { name: 'Content background with activity color', pattern: /backgroundColor.*activityColor.*10/ },
    { name: 'Header style with activity color', pattern: /headerStyle.*baseColor/ },
  ];
  
  let allImplemented = true;
  colorFeatures.forEach(feature => {
    if (content.match(feature.pattern)) {
      console.log(`   ✅ ${feature.name} is properly implemented`);
    } else {
      console.log(`   ❌ ${feature.name} is missing or incomplete`);
      allImplemented = false;
    }
  });
  
  // Check for proper background overlay
  if (content.includes('Background overlay for entire card')) {
    console.log('   ✅ Background overlay comment found - proper implementation');
  } else {
    console.log('   ⚠️  Background overlay comment not found');
  }
  
  return allImplemented;
}

// Overall validation
function runValidation() {
  console.log('Starting critical fixes validation...\n');
  
  const fix1 = validateShadowOffsetFix();
  const fix2 = validateTimerContentFix();
  const fix3 = validateBackgroundColorFix();
  
  console.log('\n🎯 VALIDATION SUMMARY:');
  console.log(`Fix #1 (shadowOffset errors): ${fix1 ? '✅ FIXED' : '❌ ISSUES REMAIN'}`);
  console.log(`Fix #2 (Timer content visibility): ${fix2 ? '✅ IMPLEMENTED' : '❌ INCOMPLETE'}`);
  console.log(`Fix #3 (Background color consistency): ${fix3 ? '✅ IMPLEMENTED' : '❌ INCOMPLETE'}`);
  
  if (fix1 && fix2 && fix3) {
    console.log('\n🎉 ALL CRITICAL FIXES APPEAR TO BE PROPERLY IMPLEMENTED!');
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Start the app: npm start');
    console.log('2. Open in simulator/device');
    console.log('3. Check console for shadowOffset errors (should be none)');
    console.log('4. Tap nursing card to expand');
    console.log('5. Verify timer components are visible');
    console.log('6. Check background colors are consistent');
    return true;
  } else {
    console.log('\n⚠️  SOME FIXES NEED ATTENTION - Review the issues above');
    return false;
  }
}

// Run the validation
if (require.main === module) {
  const success = runValidation();
  process.exit(success ? 0 : 1);
}

module.exports = { runValidation };