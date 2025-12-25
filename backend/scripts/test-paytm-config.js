#!/usr/bin/env node

/**
 * Paytm Configuration Diagnostic Script
 * 
 * This script helps diagnose Paytm payment integration issues by:
 * 1. Checking if all required environment variables are set
 * 2. Validating the format of credentials
 * 3. Testing checksum generation
 * 4. Verifying callback URL format
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const backendEnvPath = join(__dirname, '../.env');
const rootEnvPath = join(__dirname, '../../.env');

dotenv.config({ path: backendEnvPath });
dotenv.config({ path: rootEnvPath });

console.log('\n========================================');
console.log('Paytm Configuration Diagnostic Tool');
console.log('========================================\n');

// Check environment variables
const PAYTM_MERCHANT_ID = (process.env.PAYTM_MERCHANT_ID || '').replace(/^["']|["']$/g, '');
const PAYTM_MERCHANT_KEY = (process.env.PAYTM_MERCHANT_KEY || '').replace(/^["']|["']$/g, '');
const PAYTM_WEBSITE = (process.env.PAYTM_WEBSITE || 'DEFAULT').replace(/^["']|["']$/g, '');
const PAYTM_INDUSTRY_TYPE = (process.env.PAYTM_INDUSTRY_TYPE || 'Retail109').replace(/^["']|["']$/g, '');
const PAYTM_CHANNEL_ID = (process.env.PAYTM_CHANNEL_ID || 'WEB').replace(/^["']|["']$/g, '');
const PAYTM_CALLBACK_URL = (process.env.PAYTM_CALLBACK_URL || '').replace(/^["']|["']$/g, '');
const PAYTM_PAYMENT_URL = (process.env.PAYTM_PAYMENT_URL || 'https://securegw.paytm.in/theia/processTransaction').replace(/^["']|["']$/g, '').trim();

let hasErrors = false;

// Test 1: Check Merchant ID
console.log('1. Checking Merchant ID...');
if (!PAYTM_MERCHANT_ID) {
  console.log('   ❌ ERROR: PAYTM_MERCHANT_ID is missing');
  hasErrors = true;
} else if (PAYTM_MERCHANT_ID.length < 5) {
  console.log('   ⚠️  WARNING: Merchant ID seems too short:', PAYTM_MERCHANT_ID);
  hasErrors = true;
} else {
  console.log('   ✅ Merchant ID is set:', PAYTM_MERCHANT_ID.substring(0, 10) + '...');
}

// Test 2: Check Merchant Key
console.log('\n2. Checking Merchant Key...');
if (!PAYTM_MERCHANT_KEY) {
  console.log('   ❌ ERROR: PAYTM_MERCHANT_KEY is missing');
  hasErrors = true;
} else if (PAYTM_MERCHANT_KEY.length < 10) {
  console.log('   ⚠️  WARNING: Merchant Key seems too short');
  hasErrors = true;
} else {
  console.log('   ✅ Merchant Key is set (length:', PAYTM_MERCHANT_KEY.length + ')');
}

// Test 3: Check Callback URL
console.log('\n3. Checking Callback URL...');
if (!PAYTM_CALLBACK_URL) {
  console.log('   ❌ ERROR: PAYTM_CALLBACK_URL is missing');
  hasErrors = true;
} else if (!PAYTM_CALLBACK_URL.startsWith('http://') && !PAYTM_CALLBACK_URL.startsWith('https://')) {
  console.log('   ⚠️  WARNING: Callback URL should start with http:// or https://');
  console.log('   Current value:', PAYTM_CALLBACK_URL);
  hasErrors = true;
} else {
  console.log('   ✅ Callback URL is set:', PAYTM_CALLBACK_URL);
  
  // Check if callback URL is accessible (for production)
  if (PAYTM_CALLBACK_URL.includes('localhost')) {
    console.log('   ⚠️  WARNING: Using localhost callback URL. This will only work in development.');
    console.log('   For production, use your actual domain.');
  }
}

// Test 4: Check Payment URL
console.log('\n4. Checking Payment URL...');
if (!PAYTM_PAYMENT_URL) {
  console.log('   ❌ ERROR: PAYTM_PAYMENT_URL is missing');
  hasErrors = true;
} else if (!PAYTM_PAYMENT_URL.includes('paytm.in') && !PAYTM_PAYMENT_URL.includes('paytm.com')) {
  console.log('   ❌ ERROR: Payment URL does not appear to be a valid Paytm URL');
  console.log('   Current value:', PAYTM_PAYMENT_URL);
  hasErrors = true;
} else if (!PAYTM_PAYMENT_URL.startsWith('https://')) {
  console.log('   ⚠️  WARNING: Payment URL should use HTTPS, not HTTP');
  console.log('   Current value:', PAYTM_PAYMENT_URL);
  hasErrors = true;
} else {
  console.log('   ✅ Payment URL is set:', PAYTM_PAYMENT_URL);
  
  // Check if using staging vs production
  if (PAYTM_PAYMENT_URL.includes('securegw-stage.paytm.in')) {
    console.log('   ℹ️  INFO: Using STAGING environment');
  } else if (PAYTM_PAYMENT_URL.includes('securegw.paytm.in')) {
    console.log('   ℹ️  INFO: Using PRODUCTION environment');
  }
}

// Test 5: Check other parameters
console.log('\n5. Checking other parameters...');
console.log('   WEBSITE:', PAYTM_WEBSITE || 'NOT SET');
console.log('   INDUSTRY_TYPE:', PAYTM_INDUSTRY_TYPE || 'NOT SET');
console.log('   CHANNEL_ID:', PAYTM_CHANNEL_ID || 'NOT SET');

// Test 6: Test checksum generation
console.log('\n6. Testing checksum generation...');
if (PAYTM_MERCHANT_ID && PAYTM_MERCHANT_KEY) {
  try {
    const testParams = {
      MID: PAYTM_MERCHANT_ID,
      WEBSITE: PAYTM_WEBSITE,
      INDUSTRY_TYPE_ID: PAYTM_INDUSTRY_TYPE,
      CHANNEL_ID: PAYTM_CHANNEL_ID,
      ORDER_ID: 'TEST_ORDER_123',
      CUST_ID: 'TEST_USER',
      MOBILE_NO: '9999999999',
      EMAIL: 'test@example.com',
      TXN_AMOUNT: '100.00',
      CALLBACK_URL: PAYTM_CALLBACK_URL
    };
    
    // Generate checksum
    const sortedKeys = Object.keys(testParams).sort();
    const string = sortedKeys
      .map((k) => `${k}=${testParams[k]}`)
      .join('&');
    const hashString = string + '&' + PAYTM_MERCHANT_KEY;
    const hash = crypto.createHash('sha256').update(hashString).digest('hex');
    
    console.log('   ✅ Checksum generation works');
    console.log('   Sample checksum (first 20 chars):', hash.substring(0, 20) + '...');
    console.log('   Checksum length:', hash.length, '(should be 64 for SHA256)');
    
    if (hash.length !== 64) {
      console.log('   ⚠️  WARNING: Checksum length is not 64. Expected 64 for SHA256.');
      hasErrors = true;
    }
  } catch (error) {
    console.log('   ❌ ERROR: Checksum generation failed:', error.message);
    hasErrors = true;
  }
} else {
  console.log('   ⚠️  SKIPPED: Cannot test checksum without Merchant ID and Key');
}

// Test 7: Environment consistency check
console.log('\n7. Checking environment consistency...');
const isProductionUrl = PAYTM_PAYMENT_URL.includes('securegw.paytm.in') && !PAYTM_PAYMENT_URL.includes('stage');
const isStagingUrl = PAYTM_PAYMENT_URL.includes('securegw-stage.paytm.in');

if (isProductionUrl && PAYTM_CALLBACK_URL.includes('localhost')) {
  console.log('   ⚠️  WARNING: Using production Paytm URL with localhost callback');
  console.log('   This configuration will not work. Use staging URL for localhost testing.');
  hasErrors = true;
} else if (isStagingUrl && !PAYTM_CALLBACK_URL.includes('localhost') && !PAYTM_CALLBACK_URL.includes('127.0.0.1')) {
  console.log('   ℹ️  INFO: Using staging Paytm URL (good for testing)');
}

// Summary
console.log('\n========================================');
console.log('Diagnostic Summary');
console.log('========================================\n');

if (hasErrors) {
  console.log('❌ ERRORS FOUND: Please fix the issues above before testing payments.');
  console.log('\nCommon fixes:');
  console.log('1. Ensure all environment variables are set in backend/.env');
  console.log('2. Verify Merchant ID and Key are correct from Paytm dashboard');
  console.log('3. Ensure Callback URL is whitelisted in Paytm dashboard');
  console.log('4. For localhost testing, use staging URL: https://securegw-stage.paytm.in/theia/processTransaction');
  console.log('5. For production, use production URL: https://securegw.paytm.in/theia/processTransaction');
  process.exit(1);
} else {
  console.log('✅ All basic checks passed!');
  console.log('\nNext steps:');
  console.log('1. Ensure callback URL is whitelisted in Paytm dashboard');
  console.log('2. Test a payment transaction');
  console.log('3. Check server logs for any payment errors');
  console.log('4. Verify checksum in Paytm dashboard matches your implementation');
  process.exit(0);
}

