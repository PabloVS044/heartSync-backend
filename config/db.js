const neo4j = require('neo4j-driver');
require('dotenv').config();

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'password'),
  { disableLosslessIntegers: true }
);

async function createIndexes() {
  const session = driver.session();
  try {
    const indexes = [
      'CREATE INDEX user_id IF NOT EXISTS FOR (u:User) ON (u.id)',
      'CREATE INDEX user_age IF NOT EXISTS FOR (u:User) ON (u.age)',
      'CREATE INDEX ad_id IF NOT EXISTS FOR (a:Advertisement) ON (a.id)',
    ];

    for (const query of indexes) {
      await session.run(query);
      console.log(`Index created: ${query}`);
    }
  } catch (error) {
    console.error('Error creating indexes:', error.message);
    throw error;
  } finally {
    await session.close();
  }
}

async function seedTestData() {
  const session = driver.session();
  try {
    const seedQueries = [
      `MERGE (u:User {id: 'test1', name: 'Ana', email: 'ana@test.com', age: 40, gender: 'female', interests: ['travel', 'music']})`,
      `MERGE (u:User {id: 'test2', name: 'Luis', email: 'luis@test.com', age: 25, gender: 'male', interests: ['sports', 'music']})`,
      `MERGE (a:Advertisement {id: 'ad1', title: 'Travel Deal', description: 'Explore the world!', targetedInterests: ['travel']})`,
    ];

    for (const query of seedQueries) {
      await session.run(query);
      console.log(`Test data seeded: ${query}`);
    }
  } catch (error) {
    console.error('Error seeding test data:', error.message);
  } finally {
    await session.close();
  }
}

async function initializeDatabase() {
  try {
    await createIndexes();
    if (process.env.NODE_ENV === 'development') {
      await seedTestData();
    }
  } catch (error) {
    console.error('Database initialization failed:', error.message);
  }
}

initializeDatabase().catch(error => {
  console.error('Error initializing database:', error.message);
});

module.exports = driver;