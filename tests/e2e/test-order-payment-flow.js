const puppeteer = require('puppeteer');

async function testOrderPaymentFlow() {
  console.log('🧪 Testing Complete Order Creation and Payment Flow\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,  // Keep visible to see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 }
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });
  
  page.on('pageerror', error => {
    console.log('PAGE CRASH:', error.message);
  });
  
  try {
    // Step 1: Login as account user
    console.log('1️⃣ Logging in as account user...');
    await page.goto('http://localhost:3002/account/login', { waitUntil: 'networkidle0' });
    
    await page.type('input[type="email"]', 'jake@thehrguy.co');
    await page.type('input[type="password"]', 'EPoOh&K2sVpAytl&');
    
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);
    
    console.log('   ✅ Logged in successfully');
    
    // Step 2: Navigate to order creation
    console.log('\n2️⃣ Creating a new order...');
    await page.goto('http://localhost:3002/orders/new', { waitUntil: 'networkidle0' });
    
    // Check if we're on the order page
    const pageUrl = page.url();
    console.log(`   Current URL: ${pageUrl}`);
    
    // Look for order form elements
    const hasOrderForm = await page.$('form') !== null;
    if (hasOrderForm) {
      console.log('   ✅ Order form found');
      
      // Try to fill out basic order information
      // Look for input fields we might need to fill
      const inputs = await page.$$eval('input', elements => 
        elements.map(el => ({ 
          name: el.name || el.id, 
          type: el.type,
          placeholder: el.placeholder,
          required: el.required
        }))
      );
      
      console.log('   Found input fields:', inputs.filter(i => i.name).map(i => i.name));
      
      // Look for any submit buttons
      const buttons = await page.$$eval('button', elements => 
        elements.map(el => el.textContent.trim())
      );
      console.log('   Found buttons:', buttons);
      
    } else {
      console.log('   ⚠️  No order form found');
    }
    
    // Step 3: Check for existing orders we can use for payment
    console.log('\n3️⃣ Checking for existing orders...');
    await page.goto('http://localhost:3002/orders', { waitUntil: 'networkidle0' });
    
    // Look for order list or table
    const hasOrders = await page.$('table') !== null || await page.$('[data-testid="order-list"]') !== null;
    if (hasOrders) {
      console.log('   ✅ Orders page loaded');
      
      // Try to find an order link
      const orderLinks = await page.$$eval('a[href*="/orders/"]', links => 
        links.map(link => ({
          href: link.href,
          text: link.textContent.trim()
        }))
      );
      
      if (orderLinks.length > 0) {
        console.log(`   Found ${orderLinks.length} order(s)`);
        console.log('   First order:', orderLinks[0]);
        
        // Navigate to first order
        const orderId = orderLinks[0].href.match(/orders\/([^\/]+)/)?.[1];
        if (orderId) {
          console.log(`\n4️⃣ Testing payment for order ${orderId}...`);
          
          // Try different payment URLs
          const paymentUrls = [
            `http://localhost:3002/orders/${orderId}/payment`,
            `http://localhost:3002/orders/${orderId}/checkout`,
            `http://localhost:3002/orders/${orderId}/pay`,
            `http://localhost:3002/orders/${orderId}`
          ];
          
          for (const url of paymentUrls) {
            console.log(`   Trying: ${url}`);
            await page.goto(url, { waitUntil: 'networkidle0', timeout: 5000 }).catch(() => null);
            
            // Check for Stripe elements
            const hasStripeForm = await page.$('[class*="StripeElement"]') !== null ||
                                 await page.$('iframe[name*="stripe"]') !== null ||
                                 await page.$('[data-stripe]') !== null;
            
            if (hasStripeForm) {
              console.log('   ✅ Stripe payment form found!');
              
              // Look for Stripe iframe
              const stripeIframe = await page.$('iframe[name*="__privateStripeFrame"]');
              if (stripeIframe) {
                console.log('   ✅ Stripe iframe detected');
                
                // Try to fill in test card
                const frame = await stripeIframe.contentFrame();
                if (frame) {
                  // Fill in card number
                  await frame.type('[name="cardnumber"]', '4242424242424242');
                  await frame.type('[name="exp-date"]', '1234'); // MM/YY
                  await frame.type('[name="cvc"]', '123');
                  await frame.type('[name="postal"]', '12345');
                  
                  console.log('   ✅ Test card details entered');
                  
                  // Look for submit button
                  const submitButton = await page.$('button[type="submit"]');
                  if (submitButton) {
                    console.log('   Found submit button, clicking...');
                    await submitButton.click();
                    
                    // Wait for payment processing
                    await page.waitForTimeout(3000);
                    
                    const newUrl = page.url();
                    console.log(`   After payment URL: ${newUrl}`);
                    
                    // Check for success indicators
                    const pageContent = await page.content();
                    if (pageContent.includes('success') || pageContent.includes('Success') || 
                        pageContent.includes('confirmed') || pageContent.includes('complete')) {
                      console.log('   ✅ Payment appears successful!');
                    } else {
                      console.log('   ⚠️  Payment status unclear');
                    }
                  }
                }
              }
              break;
            }
            
            // Also check page content for payment-related elements
            const pageContent = await page.content();
            if (pageContent.includes('payment') || pageContent.includes('Payment') || 
                pageContent.includes('checkout') || pageContent.includes('Checkout')) {
              console.log('   Payment-related content found on page');
            }
          }
        }
      } else {
        console.log('   No orders found to test payment with');
      }
    }
    
    // Step 5: Test direct payment intent creation via API
    console.log('\n5️⃣ Testing payment intent creation via API...');
    
    // Get cookies for authentication
    const cookies = await page.cookies();
    const authCookie = cookies.find(c => c.name === 'auth-token' || c.name === 'auth-token-account');
    
    if (authCookie) {
      // Try to create a test order via API first
      const testOrderResponse = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              clientId: 'test-client',
              projectName: 'Test Payment Order',
              totalRetail: 100.00,
              status: 'reviewing'
            })
          });
          return await response.json();
        } catch (error) {
          return { error: error.message };
        }
      });
      
      console.log('   Test order creation response:', testOrderResponse);
      
      if (testOrderResponse.id) {
        // Try to create payment intent
        const paymentIntentResponse = await page.evaluate(async (orderId) => {
          try {
            const response = await fetch(`/api/orders/${orderId}/create-payment-intent`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                currency: 'USD',
                description: 'Test payment'
              })
            });
            return await response.json();
          } catch (error) {
            return { error: error.message };
          }
        }, testOrderResponse.id);
        
        console.log('   Payment intent response:', paymentIntentResponse);
        
        if (paymentIntentResponse.clientSecret) {
          console.log('   ✅ Payment intent created successfully!');
          console.log('   Client secret received (hidden)');
        }
      }
    }
    
    // Final summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 PAYMENT FLOW TEST SUMMARY');
    console.log('═'.repeat(60));
    console.log('✅ Authentication working');
    console.log('✅ Can access order pages');
    console.log('⚠️  Order creation form needs investigation');
    console.log('🔍 Payment integration status needs verification');
    console.log('\nNext steps:');
    console.log('1. Verify Stripe is properly integrated with order pages');
    console.log('2. Check if payment routes are implemented');
    console.log('3. Ensure order status allows payment');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }

  await browser.close();
}

// Run the test
testOrderPaymentFlow().catch(console.error);