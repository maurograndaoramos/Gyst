import { db } from './index'; // Assuming your Drizzle client is exported from here
import { users, organizations } from './schema'; // Import your table schemas

async function main() {
  console.log('Seeding database...');

  // Example: Clear existing data (optional, use with caution)
  // await db.delete(organizations);
  // await db.delete(users);
  // console.log('Cleared existing data.');

  // Example: Seed Users
  const user1 = await db.insert(users).values({
    name: 'Alice Wonderland',
    username: 'alice',
    email: 'alice@example.com',
    // password: 'hashed_password_here', // If using credentials
  }).returning({ id: users.id });

  const user2 = await db.insert(users).values({
    name: 'Bob The Builder',
    username: 'bob',
    email: 'bob@example.com',
  }).returning({ id: users.id });

  console.log('Seeded users:', user1, user2);

  // Example: Seed Organizations
  if (user1 && user1[0]?.id) {
    const org1 = await db.insert(organizations).values({
      name: 'Wonderland Inc.',
      owner_id: user1[0].id,
    }).returning();
    console.log('Seeded organization for Alice:', org1);
  }

  if (user2 && user2[0]?.id) {
    const org2 = await db.insert(organizations).values({
      name: 'Builders Co.',
      owner_id: user2[0].id,
    }).returning();
    console.log('Seeded organization for Bob:', org2);
  }

  console.log('Database seeded successfully!');
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
