const { db } = require('./src/lib/db/index.js');
const { users, organizations } = require('./src/lib/db/schema.js');

async function createTestData() {
  try {
    console.log('Creating test data...');
    
    // Create a test organization first
    const org = await db.insert(organizations).values({
      name: 'Test Organization',
      owner_id: 'test-user-id' // We'll create this user next
    }).returning();
    
    console.log('Created organization:', org);
    
    // Create a test user
    const user = await db.insert(users).values({
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
      organizationId: org[0].id,
      created_at: new Date(),
      updated_at: new Date()
    }).returning();
    
    console.log('Created user:', user);
    console.log('Test data created successfully!');
    
  } catch (error) {
    console.error('Error creating test data:', error);
  }
}

createTestData();
