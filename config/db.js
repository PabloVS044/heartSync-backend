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
      'CREATE INDEX IF NOT EXISTS FOR (u:User) ON (u.id)',
      'CREATE INDEX IF NOT EXISTS FOR (u:User) ON (u.age)',
      'CREATE INDEX IF NOT EXISTS FOR (u:User) ON (u.bio)',
      'CREATE INDEX IF NOT EXISTS FOR (u:User) ON (u.lastActive)',
      'CREATE INDEX IF NOT EXISTS FOR (g:Gender) ON (g.name)',
      'CREATE INDEX IF NOT EXISTS FOR (c:Country) ON (c.name)',
      'CREATE INDEX IF NOT EXISTS FOR (i:Interest) ON (i.name)'
    ];

    for (const query of indexes) {
      await session.run(query);
      console.log(`Índice creado: ${query}`);
    }
  } catch (error) {
    console.error('Error al crear índices:', error.message);
  } finally {
    await session.close();
  }
}

createIndexes().catch(error => {
  console.error('Error iniciando índices:', error);
});

module.exports = driver;