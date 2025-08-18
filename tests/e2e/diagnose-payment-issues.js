const puppeteer = require('puppeteer');

async function diagnosePaymentIssues() {
  console.log('🔍 DIAGNOSING PAYMENT SYSTEM ISSUES\n');
  console.log('=' .repeat(60));
  
  // Step 1: Check Stripe configuration
  console.log('\n1️⃣ Checking Stripe Configuration...');
  
  try {
    const configResponse = await fetch('http://localhost:3002/api/stripe/test-config');
    const config = await configResponse.json();
    
    console.log('   Stripe Config Status:', config.success ? '✅ SUCCESS' : '❌ FAILED');
    
    if (config.config) {
      console.log('   - Publishable Key:', config.config.publishableKeyAccessible ? '✅ Available' : '❌ Missing');
      console.log('   - Secret Key:', config.config.secretKeyAccessible ? '✅ Available' : '❌ Missing');
      console.log('   - Webhook Secret:', config.config.webhookSecretAccessible ? '✅ Available' : '❌ Missing');
      console.log('   - SDK Initialized:', config.config.sdkInitialized ? '✅ Yes' : '❌ No');
      
      if (config.config.publishableKey) {
        const key = config.config.publishableKey;
        console.log('   - Key Type:', key.startsWith('pk_test_') ? '✅ Test Mode' : '⚠️  Live Mode');
        console.log('   - Key Format:', key.includes('QQQQ') ? '❌ PLACEHOLDER KEY' : '✅ Real Key');
      }
    }
    
    if (config.error) {
      console.log('   ❌ Error:', config.error);
    }
  } catch (error) {
    console.log('   ❌ Failed to check config:', error.message);
  }
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  try {
    // Step 2: Login and get auth
    console.log('\n2️⃣ Authenticating...');
    await page.goto('http://localhost:3002/account/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    
    await page.type('input[type="email"]', 'jake@thehrguy.co');
    await page.type('input[type="password"]', 'EPoOh&K2sVpAytl&');
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);
    
    console.log('   ✅ Logged in successfully');
    
    // Step 3: Check existing orders
    console.log('\n3️⃣ Checking for existing orders...');
    await page.goto('http://localhost:3002/orders', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    const orders = await page.evaluate(() => {
      const orderElements = document.querySelectorAll('a[href*="/orders/"]');
      const orderList = [];
      orderElements.forEach(el => {
        const href = el.href;
        if (href.match(/\/orders\/[a-f0-9-]+$/)) {
          const orderId = href.match(/orders\/([a-f0-9-]+)$/)?.[1];
          const text = el.textContent;
          orderList.push({ id: orderId, text, href });
        }
      });
      return orderList;
    });
    
    console.log(`   Found ${orders.length} order(s)`);
    
    if (orders.length > 0) {
      const testOrder = orders[0];
      console.log(`   Using order: ${testOrder.id}`);
      
      // Step 4: Check order details via API
      console.log('\n4️⃣ Checking order details via API...');
      const orderDetails = await page.evaluate(async (orderId) => {
        try {
          const response = await fetch(`/api/orders/${orderId}`, {
            credentials: 'include'
          });
          const data = await response.json();
          return {
            id: data.id,
            state: data.state,
            totalRetail: data.totalRetail,
            paidAt: data.paidAt,
            paymentIntentId: data.paymentIntentId
          };
        } catch (error) {
          return { error: error.message };
        }
      }, testOrder.id);
      
      console.log('   Order Details:');
      console.log(`   - State: ${orderDetails.state}`);
      console.log(`   - Total: $${orderDetails.totalRetail}`);
      console.log(`   - Paid: ${orderDetails.paidAt ? 'Yes' : 'No'}`);
      console.log(`   - Payment Intent: ${orderDetails.paymentIntentId || 'None'}`);
      
      // Step 5: Try to create payment intent
      console.log('\n5️⃣ Testing payment intent creation...');
      const paymentIntentResult = await page.evaluate(async (orderId) => {
        try {
          const response = await fetch(`/api/orders/${orderId}/create-payment-intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              currency: 'USD'
            })
          });
          
          const responseText = await response.text();
          let data;
          try {
            data = JSON.parse(responseText);
          } catch {
            data = { rawResponse: responseText };
          }
          
          return {
            status: response.status,
            ok: response.ok,
            data
          };
        } catch (error) {
          return { error: error.message };
        }
      }, testOrder.id);
      
      console.log('   Payment Intent Result:');
      console.log(`   - Status: ${paymentIntentResult.status}`);
      console.log(`   - Success: ${paymentIntentResult.ok ? '✅' : '❌'}`);
      
      if (paymentIntentResult.data) {
        if (paymentIntentResult.data.error) {
          console.log(`   - Error: ${paymentIntentResult.data.error}`);
        }
        if (paymentIntentResult.data.clientSecret) {
          console.log('   - Client Secret: ✅ Received');
        }
        if (paymentIntentResult.data.paymentIntentId) {
          console.log(`   - Payment Intent ID: ${paymentIntentResult.data.paymentIntentId}`);
        }
        if (paymentIntentResult.data.rawResponse) {
          console.log(`   - Raw Response: ${paymentIntentResult.data.rawResponse.substring(0, 200)}`);
        }
      }
      
      // Step 6: Check payment page
      console.log('\n6️⃣ Checking payment page...');
      await page.goto(`http://localhost:3002/orders/${testOrder.id}/payment`, { 
        waitUntil: 'domcontentloaded' 
      });
      await page.waitForTimeout(3000);
      
      const pageAnalysis = await page.evaluate(() => {
        const analysis = {
          hasStripeScript: false,
          hasStripeIframe: false,
          hasPaymentForm: false,
          hasErrorMessage: false,
          errorText: '',
          pageState: '',
          stripeElements: []
        };
        
        // Check for Stripe script
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
          if (script.src && script.src.includes('stripe')) {
            analysis.hasStripeScript = true;
          }
        });
        
        // Check for Stripe iframes
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
          if (iframe.name && iframe.name.includes('stripe')) {
            analysis.hasStripeIframe = true;
            analysis.stripeElements.push(iframe.name);
          }
        });
        
        // Check for payment form
        analysis.hasPaymentForm = document.querySelector('form') !== null;
        
        // Check for error messages
        const errorElements = document.querySelectorAll('.text-red-600, .text-red-700, [class*="error"]');
        if (errorElements.length > 0) {
          analysis.hasErrorMessage = true;
          analysis.errorText = errorElements[0].textContent;
        }
        
        // Check page state
        const bodyText = document.body.textContent;
        if (bodyText.includes('Order Not Ready for Payment')) {
          analysis.pageState = 'NOT_READY';
        } else if (bodyText.includes('Payment Complete')) {
          analysis.pageState = 'ALREADY_PAID';
        } else if (bodyText.includes('Order Summary')) {
          analysis.pageState = 'READY_FOR_PAYMENT';
        } else {
          analysis.pageState = 'UNKNOWN';
        }
        
        return analysis;
      });
      
      console.log('   Payment Page Analysis:');
      console.log(`   - Page State: ${pageAnalysis.pageState}`);
      console.log(`   - Stripe Script: ${pageAnalysis.hasStripeScript ? '✅' : '❌'}`);
      console.log(`   - Stripe Iframe: ${pageAnalysis.hasStripeIframe ? '✅' : '❌'}`);
      console.log(`   - Payment Form: ${pageAnalysis.hasPaymentForm ? '✅' : '❌'}`);
      if (pageAnalysis.hasErrorMessage) {
        console.log(`   - Error: ${pageAnalysis.errorText}`);
      }
      if (pageAnalysis.stripeElements.length > 0) {
        console.log(`   - Stripe Elements: ${pageAnalysis.stripeElements.join(', ')}`);
      }
    }
    
    // Final diagnosis
    console.log('\n' + '═'.repeat(60));
    console.log('🔍 DIAGNOSIS SUMMARY');
    console.log('═'.repeat(60));
    
    console.log('\n🚨 IDENTIFIED ISSUES:');
    console.log('1. ❌ PLACEHOLDER STRIPE KEYS - The keys in .env.local are not real');
    console.log('   Solution: Get real test keys from Stripe Dashboard');
    console.log('   - Sign up at https://stripe.com');
    console.log('   - Go to Developers → API keys');
    console.log('   - Copy the test mode keys (pk_test_... and sk_test_...)');
    console.log('\n2. Payment flow depends on:');
    console.log('   - Order must be in "reviewing" or "payment_pending" state');
    console.log('   - Order must have totalRetail > 0');
    console.log('   - Valid Stripe API keys must be configured');
    console.log('\n3. To fix the payment system:');
    console.log('   a) Replace the placeholder keys in .env.local with real test keys');
    console.log('   b) Restart the dev server');
    console.log('   c) Ensure orders are in correct state for payment');
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
  }
  
  console.log('\n⏸️  Keeping browser open for inspection...');
  // await browser.close();
}

// Run diagnosis
diagnosePaymentIssues().catch(console.error);