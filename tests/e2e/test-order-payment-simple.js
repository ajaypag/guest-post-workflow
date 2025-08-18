const puppeteer = require('puppeteer');

async function testOrderPaymentSimple() {
  console.log('🧪 Testing Order Creation and Stripe Payment\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,  // Keep visible to see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ PAGE ERROR:', msg.text());
    }
  });
  
  try {
    // Step 1: Login as account user (jake@thehrguy.co)
    console.log('1️⃣ Logging in as account user...');
    await page.goto('http://localhost:3002/account/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    await page.type('input[type="email"]', 'jake@thehrguy.co');
    await page.type('input[type="password"]', 'EPoOh&K2sVpAytl&');
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);
    
    console.log('   ✅ Logged in successfully');
    console.log(`   Current URL: ${page.url()}`);
    
    // Step 2: Create an order via API using page context (has auth cookies)
    console.log('\n2️⃣ Creating test order via API...');
    
    const orderData = await page.evaluate(async () => {
      try {
        // First, let's get or create a client
        const clientResponse = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: 'Test Client for Payment',
            email: 'testclient@example.com',
            website: 'https://testclient.com'
          })
        });
        
        let clientId;
        if (clientResponse.ok) {
          const client = await clientResponse.json();
          clientId = client.id;
        } else {
          // Try to get existing clients
          const getClientsResponse = await fetch('/api/clients', {
            credentials: 'include'
          });
          if (getClientsResponse.ok) {
            const clients = await getClientsResponse.json();
            if (clients.length > 0) {
              clientId = clients[0].id;
            }
          }
        }
        
        // Create order
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            clientId: clientId || 'test-client-id',
            projectName: 'Test Order for Stripe Payment',
            orderType: 'content_creation',
            state: 'reviewing', // Start in reviewing state
            totalRetail: 299.00,
            subtotalRetail: 299.00,
            discountAmount: 0,
            estimatedLinksCount: 10,
            notes: 'Test order created for Stripe payment testing'
          })
        });
        
        if (!response.ok) {
          const error = await response.text();
          return { error: `Failed to create order: ${response.status} - ${error}` };
        }
        
        return await response.json();
      } catch (error) {
        return { error: error.message };
      }
    });
    
    if (orderData.error) {
      console.log('   ❌ Error creating order:', orderData.error);
      console.log('   Trying to find existing orders instead...');
      
      // Try to get existing orders
      await page.goto('http://localhost:3002/orders', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      
      // Look for order links
      const orderLinks = await page.$$eval('a[href*="/orders/"]', links => 
        links.map(link => link.href).filter(href => href.match(/\/orders\/[a-f0-9-]+$/))
      );
      
      if (orderLinks.length > 0) {
        const orderId = orderLinks[0].match(/orders\/([a-f0-9-]+)$/)?.[1];
        console.log(`   Found existing order: ${orderId}`);
        orderData.id = orderId;
      } else {
        console.log('   ❌ No orders found');
        return;
      }
    } else {
      console.log('   ✅ Order created successfully');
      console.log(`   Order ID: ${orderData.id}`);
      console.log(`   Total: $${orderData.totalRetail || 299}`);
    }
    
    // Step 3: Navigate to payment page
    console.log('\n3️⃣ Navigating to payment page...');
    const paymentUrl = `http://localhost:3002/orders/${orderData.id}/payment`;
    console.log(`   URL: ${paymentUrl}`);
    
    await page.goto(paymentUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000); // Wait for Stripe to load
    
    // Step 4: Check for Stripe elements
    console.log('\n4️⃣ Looking for Stripe payment form...');
    
    // Check if order is in correct state
    const pageContent = await page.content();
    if (pageContent.includes('Order Not Ready for Payment')) {
      console.log('   ⚠️  Order not in correct state for payment');
      console.log('   Trying to update order state...');
      
      // Try to update order state to payment_pending
      const updateResult = await page.evaluate(async (orderId) => {
        try {
          const response = await fetch(`/api/orders/${orderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              state: 'payment_pending'
            })
          });
          return { ok: response.ok, status: response.status };
        } catch (error) {
          return { error: error.message };
        }
      }, orderData.id);
      
      console.log('   Update result:', updateResult);
      
      // Reload page
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
    }
    
    // Look for Stripe iframe
    const stripeIframes = await page.$$('iframe[name*="__privateStripeFrame"]');
    if (stripeIframes.length > 0) {
      console.log(`   ✅ Found ${stripeIframes.length} Stripe iframe(s)`);
      
      // Step 5: Fill in test card details
      console.log('\n5️⃣ Entering test card details...');
      
      for (let i = 0; i < stripeIframes.length; i++) {
        const frame = await stripeIframes[i].contentFrame();
        if (frame) {
          // Try to find and fill card fields
          try {
            // Card number
            const cardInput = await frame.$('[name="cardnumber"], [placeholder*="Card number"], [placeholder*="card"]');
            if (cardInput) {
              await cardInput.type('4242424242424242');
              console.log('   ✅ Card number entered');
            }
            
            // Expiry
            const expInput = await frame.$('[name="exp-date"], [placeholder*="MM / YY"], [placeholder*="Expiry"]');
            if (expInput) {
              await expInput.type('1234');
              console.log('   ✅ Expiry date entered');
            }
            
            // CVC
            const cvcInput = await frame.$('[name="cvc"], [placeholder*="CVC"], [placeholder*="Security"]');
            if (cvcInput) {
              await cvcInput.type('123');
              console.log('   ✅ CVC entered');
            }
            
            // ZIP/Postal
            const zipInput = await frame.$('[name="postal"], [placeholder*="ZIP"], [placeholder*="Postal"]');
            if (zipInput) {
              await zipInput.type('12345');
              console.log('   ✅ ZIP code entered');
            }
          } catch (error) {
            console.log(`   Error filling iframe ${i}:`, error.message);
          }
        }
      }
      
      // Step 6: Submit payment
      console.log('\n6️⃣ Submitting payment...');
      
      // Look for submit button
      const submitButtons = await page.$$('button[type="submit"], button:has-text("Pay"), button:has-text("Submit")');
      console.log(`   Found ${submitButtons.length} potential submit button(s)`);
      
      if (submitButtons.length > 0) {
        // Click the first submit button
        await submitButtons[0].click();
        console.log('   ✅ Payment submitted');
        
        // Wait for response
        await page.waitForTimeout(5000);
        
        // Check result
        const finalUrl = page.url();
        console.log(`   Final URL: ${finalUrl}`);
        
        if (finalUrl.includes('success')) {
          console.log('   🎉 Payment successful!');
        } else {
          const errorText = await page.$eval('.text-red-600, .text-red-700, [class*="error"]', el => el.textContent).catch(() => null);
          if (errorText) {
            console.log('   ❌ Payment error:', errorText);
          } else {
            console.log('   ⚠️  Payment status unclear');
          }
        }
      }
    } else {
      console.log('   ❌ No Stripe payment form found');
      console.log('   Page may not have Stripe integration or order state is incorrect');
      
      // Check what's on the page
      const hasPaymentForm = await page.$('form') !== null;
      const hasStripeScript = await page.$('script[src*="stripe"]') !== null;
      
      console.log(`   Has form: ${hasPaymentForm}`);
      console.log(`   Has Stripe script: ${hasStripeScript}`);
    }
    
    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 PAYMENT TEST SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Order ID: ${orderData.id}`);
    console.log(`Payment URL: ${paymentUrl}`);
    console.log('Status: Check browser window for results');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\n⏸️  Keeping browser open for manual inspection...');
  console.log('Close the browser window when done.');
  
  // Keep browser open for manual inspection
  // await browser.close();
}

// Run the test
testOrderPaymentSimple().catch(console.error);