const neo4j = require('neo4j-driver');
require('dotenv').config();

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'password'),
  { disableLosslessIntegers: true }
);

async function createIndexes() {
  const session = driver.session();
  const maxRetries = 3;
  const retryDelay = 2000; // Lista de índices, incluyendo uno compuesto
  const indexes = [
    'CREATE INDEX idx_user_id IF NOT EXISTS FOR (u:User) ON (u.id)',
    'CREATE INDEX idx_user_age_bio IF NOT EXISTS FOR (u:User) ON (u.age, u.bio)',
    'CREATE INDEX idx_gender_name IF NOT EXISTS FOR (g:Gender) ON (g.name)',
    'CREATE INDEX idx_country_name IF NOT EXISTS FOR (c:Country) ON (c.name)',
    'CREATE INDEX idx_interest_name IF NOT EXISTS FOR (i:Interest) ON (i.name)',
    'CREATE INDEX idx_ad_id IF NOT EXISTS FOR (a:Advertisement) ON (a.id)',
  ];

  for (const query of indexes) {
    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        await session.run(query);
        console.log(`Index created successfully: ${query}`);
        break;
      } catch (error) {
        attempts++;
        console.error(`Attempt ${attempts} failed for index: ${query}. Error: ${error.message}`);
        if (attempts === maxRetries) {
          console.error(`Max retries reached for index: ${query}`);
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
}

// Ejecutar la creación de índices con manejo de errores
createIndexes()
  .then(() => console.log('All indexes created successfully'))
  .catch(error => console.error('Failed to initialize indexes:', error.message))
  .finally(async () => {
    await driver.close();
  });

module.exports = driver;