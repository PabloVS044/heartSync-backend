const driver = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const createChat = async (matchId) => {
  const session = driver.session();
  try {
    const chatId = uuidv4();
    const createdAt = new Date().toISOString();
    const result = await session.run(
      `MATCH (m:Match {id: $matchId})
       CREATE (c:Chat {
         id: $chatId,
         createdAt: $createdAt,
         messages: []
       })
       CREATE (m)-[:HAS_CHAT]->(c)
       RETURN c`,
      { matchId, chatId, createdAt }
    );
    return result.records[0].get('c').properties;
  } catch (error) {
    throw error;
  } finally {
    await session.close();
  }
};

const addMessage = async (chatId, senderId, content) => {
  const session = driver.session();
  try {
    const message = {
      id: uuidv4(),
      senderId,
      content,
      timestamp: new Date().toISOString()
    };
    const result = await session.run(
      `MATCH (c:Chat {id: $chatId})
       SET c.messages = coalesce(c.messages, []) + [$message]
       RETURN c`,
      { chatId, message }
    );
    return result.records[0].get('c').properties;
  } catch (error) {
    throw error;
  } finally {
    await session.close();
  }
};

const getChat = async (chatId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (c:Chat {id: $chatId})
       RETURN c`,
      { chatId }
    );
    return result.records.length > 0 ? result.records[0].get('c').properties : null;
  } finally {
    await session.close();
  }
};

const getChatsForUser = async (userId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User {id: $userId})-[:HAS_MATCH]->(m:Match)-[:HAS_CHAT]->(c:Chat)
       MATCH (other:User)-[:HAS_MATCH]->(m)
       WHERE other <> u
       RETURN c, other`,
      { userId }
    );
    return result.records.map(record => {
      const chat = record.get('c').properties;
      const otherUser = record.get('other').properties;
      delete otherUser.password;
      return { chat, otherUser };
    });
  } finally {
    await session.close();
  }
};

module.exports = {
  createChat,
  addMessage,
  getChat,
  getChatsForUser
};