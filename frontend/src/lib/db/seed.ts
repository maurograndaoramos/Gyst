import { db } from './index';
import { hashPassword } from '../auth/credentials';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Seeding database...');

  try {
    // Hash passwords for test users
    const alicePassword = await hashPassword('password123');
    const bobPassword = await hashPassword('password123');

    // Create test users directly with SQL to avoid schema mismatch
    const user1Id = 'alice-test-id';
    const user2Id = 'bob-test-id';

    await db.run(sql`
      INSERT INTO user (id, name, username, email, password, created_at, updated_at)
      VALUES (${user1Id}, ${'Alice Wonderland'}, ${'alice'}, ${'alice@example.com'}, ${alicePassword}, ${Date.now()}, ${Date.now()})
    `);

    await db.run(sql`
      INSERT INTO user (id, name, username, email, password, created_at, updated_at)
      VALUES (${user2Id}, ${'Bob The Builder'}, ${'bob'}, ${'bob@example.com'}, ${bobPassword}, ${Date.now()}, ${Date.now()})
    `);

    console.log('Seeded users: alice, bob');

    // Create organizations
    const org1Id = 'wonderland-org-id';
    const org2Id = 'builders-org-id';

    await db.run(sql`
      INSERT INTO organization (id, name, owner_id, created_at, updated_at)
      VALUES (${org1Id}, ${'Wonderland Inc.'}, ${user1Id}, ${Date.now()}, ${Date.now()})
    `);

    await db.run(sql`
      INSERT INTO organization (id, name, owner_id, created_at, updated_at)
      VALUES (${org2Id}, ${'Builders Co.'}, ${user2Id}, ${Date.now()}, ${Date.now()})
    `);

    // Update users with organizationId
    await db.run(sql`UPDATE user SET organizationId = ${org1Id} WHERE id = ${user1Id}`);
    await db.run(sql`UPDATE user SET organizationId = ${org2Id} WHERE id = ${user2Id}`);

    console.log('Seeded organizations and linked users');
    console.log('Database seeded successfully!');
    console.log('Test login: alice@example.com / password123');
    console.log('Test login: bob@example.com / password123');

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Optional: Close database connection if your setup requires it
    // await db.session?.end(); // Example for some drivers
    console.log('Seeding script finished.');
  });
