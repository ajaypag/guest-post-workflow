const { db } = require('./lib/db/connection');

async function investigateNotificationBugs() {
  console.log('=== Publisher Notification System Bug Investigation ===\n');
  
  try {
    // Test 1: Check notification table structure and data
    console.log('1. Investigating notification records...');
    const notificationQuery = `
      SELECT 
        id, publisher_id, order_line_item_id, notification_type, 
        channel, status, sent_at, error_message, retry_count,
        created_at
      FROM publisher_order_notifications 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    const notifications = await db.execute(notificationQuery);
    console.log(`Found ${notifications.length} notification records`);
    
    if (notifications.length > 0) {
      console.log('\nRecent notifications:');
      notifications.forEach((notif, index) => {
        console.log(`${index + 1}. Type: ${notif.notification_type}, Status: ${notif.status}, Error: ${notif.error_message || 'None'}`);
      });
    } else {
      console.log('⚠️  No notification records found - this indicates notifications are not being created');
    }
    
    // Test 2: Check publisher assignment flow
    console.log('\n2. Checking publisher assignment flow...');
    const assignmentQuery = `
      SELECT 
        id, publisher_id, publisher_status, publisher_notified_at,
        assigned_domain, target_page_url, anchor_text, 
        created_at, modified_at
      FROM order_line_items 
      WHERE publisher_id IS NOT NULL 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    const assignments = await db.execute(assignmentQuery);
    console.log(`Found ${assignments.length} line items with publisher assignments`);
    
    if (assignments.length > 0) {
      console.log('\nRecent publisher assignments:');
      assignments.forEach((item, index) => {
        console.log(`${index + 1}. Publisher: ${item.publisher_id?.slice(-8)}, Status: ${item.publisher_status}, Notified: ${item.publisher_notified_at ? 'Yes' : 'No'}`);
      });
    }
    
    // Test 3: Check if email configuration is working
    console.log('\n3. Testing email configuration...');
    const resendApiKey = process.env.RESEND_API_KEY;
    console.log('RESEND_API_KEY configured:', resendApiKey ? 'Yes' : 'No');
    console.log('NEXTAUTH_URL configured:', process.env.NEXTAUTH_URL ? 'Yes' : 'No');
    
    // Test 4: Check publisher portal access
    console.log('\n4. Checking publisher portal endpoints...');
    const publisherQuery = `
      SELECT id, email, contact_name, status, created_at
      FROM publishers 
      WHERE status = 'active'
      LIMIT 3
    `;
    
    const publishers = await db.execute(publisherQuery);
    console.log(`Found ${publishers.length} active publishers`);
    
    if (publishers.length > 0) {
      console.log('\nActive publishers:');
      publishers.forEach((pub, index) => {
        console.log(`${index + 1}. Email: ${pub.email}, Name: ${pub.contact_name || 'Not set'}`);
      });
    }
    
    // Test 5: Check workflow integration
    console.log('\n5. Checking workflow integration...');
    const workflowQuery = `
      SELECT 
        oli.id, oli.workflow_id, oli.publisher_status,
        w.id as workflow_exists, w.status as workflow_status
      FROM order_line_items oli
      LEFT JOIN workflows w ON oli.workflow_id = w.id
      WHERE oli.workflow_id IS NOT NULL
      AND oli.publisher_id IS NOT NULL
      LIMIT 5
    `;
    
    const workflowIntegration = await db.execute(workflowQuery);
    console.log(`Found ${workflowIntegration.length} line items with workflow integration`);
    
    if (workflowIntegration.length > 0) {
      console.log('\nWorkflow integration status:');
      workflowIntegration.forEach((item, index) => {
        console.log(`${index + 1}. Workflow: ${item.workflow_id?.slice(-8)}, Exists: ${item.workflow_exists ? 'Yes' : 'No'}, Status: ${item.workflow_status || 'None'}`);
      });
    }
    
    // Test 6: Identify missing functionality
    console.log('\n6. Identifying missing functionality...');
    
    // Check for orders without notifications
    const missingNotificationsQuery = `
      SELECT COUNT(*) as count
      FROM order_line_items oli
      WHERE oli.publisher_id IS NOT NULL 
      AND oli.publisher_notified_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM publisher_order_notifications pon 
        WHERE pon.order_line_item_id = oli.id
      )
    `;
    
    const missingNotifications = await db.execute(missingNotificationsQuery);
    const missingCount = missingNotifications[0]?.count || 0;
    
    if (missingCount > 0) {
      console.log(`⚠️  Found ${missingCount} assigned orders missing notification records`);
    } else {
      console.log('✅ All assigned orders have corresponding notification records');
    }
    
    console.log('\n=== Investigation Summary ===');
    console.log('Key findings will be analyzed for bug patterns...');
    
  } catch (error) {
    console.error('❌ Error during investigation:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

investigateNotificationBugs().then(() => {
  console.log('\n✅ Investigation complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Investigation failed:', error);
  process.exit(1);
});