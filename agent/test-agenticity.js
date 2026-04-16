#!/usr/bin/env node
'use strict';

/**
 * Quick test script to verify agenticity improvements
 * Run: node test-agenticity.js
 */

const { runCodeReview } = require('./src/agent');

// Test 1: Code with critical security issue (should trigger toolExecutor)
const sqlInjectionCode = `
const express = require('express');
const db = require('./db');

app.get('/user/:id', (req, res) => {
  // SQL injection vulnerability!
  const query = "SELECT * FROM users WHERE id = " + req.params.id;
  db.query(query, (err, result) => {
    res.json(result);
  });
});
`;

// Test 2: Minimal code (should trigger low quality warning)
const minimalCode = "const x = 1;";

// Test 3: Good code (should pass verification)
const goodCode = `
function calculateTotal(items) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }
  
  return items.reduce((sum, item) => {
    if (typeof item.price !== 'number' || item.price < 0) {
      throw new Error('Invalid item price');
    }
    return sum + item.price;
  }, 0);
}

module.exports = { calculateTotal };
`;

async function testAgenticity() {
  console.log('🧪 Testing Agenticity Improvements\n');
  console.log('='.repeat(60));
  
  // Test 1: Critical issue detection + tool suggestions
  console.log('\n📋 Test 1: Critical Security Issue Detection');
  console.log('-'.repeat(60));
  try {
    const result1 = await runCodeReview(sqlInjectionCode);
    console.log(`✅ Language detected: ${result1.language}`);
    console.log(`✅ Issues found: ${result1.issues.length}`);
    console.log(`✅ Critical issues: ${result1.criticalIssueCount}`);
    console.log(`✅ Verification score: ${(result1.verificationScore * 100).toFixed(0)}%`);
    console.log(`✅ Suggested tools: ${result1.suggestedTools.length}`);
    if (result1.suggestedTools.length > 0) {
      console.log(`   Tools: ${result1.suggestedTools.map(t => t.tool).join(', ')}`);
    }
    if (result1.qualityWarning) {
      console.log(`⚠️  Quality warning: ${result1.qualityWarning}`);
    }
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
  }
  
  // Test 2: Quality warning detection
  console.log('\n📋 Test 2: Low Quality Output Detection');
  console.log('-'.repeat(60));
  try {
    const result2 = await runCodeReview(minimalCode);
    console.log(`✅ Review length: ${result2.review.length} chars`);
    console.log(`✅ Verification score: ${(result2.verificationScore * 100).toFixed(0)}%`);
    if (result2.qualityWarning) {
      console.log(`⚠️  Quality warning detected: ${result2.qualityWarning}`);
    }
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
  }
  
  // Test 3: Good code verification
  console.log('\n📋 Test 3: High Quality Code Analysis');
  console.log('-'.repeat(60));
  try {
    const result3 = await runCodeReview(goodCode);
    console.log(`✅ Language detected: ${result3.language}`);
    console.log(`✅ Issues found: ${result3.issues.length}`);
    console.log(`✅ Verification score: ${(result3.verificationScore * 100).toFixed(0)}%`);
    console.log(`✅ All verification checks:`);
    Object.entries(result3.verificationChecks).forEach(([check, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${check}`);
    });
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Agenticity test suite completed!\n');
}

// Check for GROQ_API_KEY
if (!process.env.GROQ_API_KEY) {
  console.error('❌ Error: GROQ_API_KEY not found in environment');
  console.error('   Run: cp .env.example .env');
  console.error('   Then add your API key to .env');
  process.exit(1);
}

testAgenticity().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
