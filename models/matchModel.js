const driver = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const neo4j = require('neo4j-driver');
const chatModel = require('./chatModel'); // Importar chatModel

const createMatch = async (userId1, userId2) => {
  const session = driver.session();
  try {
    const matchId = uuidv4();
    const createdAt = new Date().toISOString();
    const result = await session.run(
      `MATCH (u1:User {id: $userId1}), (u2:User {id: $userId2})
       WHERE u1 <> u2
       CREATE (m:Match {
         id: $matchId,
         createdAt: $createdAt
       })
       CREATE (u1)-[:HAS_MATCH]->(m)
       CREATE (u2)-[:HAS_MATCH]->(m)
       RETURN m, u1, u2`,
      { matchId, userId1, userId2, createdAt }
    );
    const record = result.records[0];
    
    // Crear un chat para el nuevo match
    const chat = await chatModel.createChat(matchId);

    return {
      match: record.get('m').properties,
      user1: record.get('u1').properties,
      user2: record.get('u2').properties,
      chat: chat // Incluir el chat creado en la respuesta
    };
  } catch (error) {
    throw error;
  } finally {
    await session.close();
  }
};

const getMatch = async (matchId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (m:Match {id: $matchId})
       MATCH (u:User)-[:HAS_MATCH]->(m)
       OPTIONAL MATCH (m)-[:HAS_CHAT]->(c:Chat)
       RETURN m, collect(u) AS users, c`,
      { matchId }
    );
    if (result.records.length === 0) return null;
    const record = result.records[0];
    return {
      match: record.get('m').properties,
      users: record.get('users').map(user => {
        const properties = user.properties;
        delete properties.password;
        return properties;
      }),
      chat: record.get('c') ? record.get('c').properties : null
    };
  } finally {
    await session.close();
  }
};

const getMatchesForUser = async (userId, skip = 0, limit = 10) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User {id: $userId})-[:HAS_MATCH]->(m:Match)
       MATCH (other:User)-[:HAS_MATCH]->(m)
       WHERE other <> u
       OPTIONAL MATCH (m)-[:HAS_CHAT]->(c:Chat)
       RETURN m, other, c
       ORDER BY m.createdAt DESC
       SKIP $skip
       LIMIT $limit`,
      { userId, skip: neo4j.int(skip), limit: neo4j.int(limit) }
    );
    return result.records.map(record => {
      const match = record.get('m').properties;
      const otherUser = record.get('other').properties;
      delete otherUser.password;
      const chat = record.get('c') ? record.get('c').properties : null;
      return { match, otherUser, chat };
    });
  } finally {
    await session.close();
  }
};

module.exports = {
  createMatch,
  getMatch,
  getMatchesForUser
};