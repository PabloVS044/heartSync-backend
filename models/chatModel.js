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

const addMessage = async (chatId, senderId, content, image = null) => {
  const session = await driver.session();
  try {
    const messageId = uuidv4();
    const timestamp = new Date().toISOString();
    const isRead = false;

    // Create message object
    const message = {
      id: messageId,
      senderId,
      content,
      image: image || '', // Convert null to empty string
      timestamp,
      isRead
    };

    // Serialize message to JSON string
    const messageJson = JSON.stringify(message);

    const result = await session.run(
      `
        MATCH (c:Chat {id: $chatId})
        SET c.messages = coalesce(c.messages, []) + [$messageJson]
        RETURN c
      `,
      {
        chatId,
        messageJson
      }
    );

    const chat = result.records[0].get('c').properties;
    // Parse JSON strings back to objects
    chat.messages = chat.messages.map(json => JSON.parse(json));

    return chat;
  } catch (error) {
    console.error('Error in addMessage:', error.message, error.stack);
    throw error;
  } finally {
    await session.close();
  }
};

const getChat = async (chatId) => {
  const session = await driver.session();
  try {
    const result = await session.run(
      `
        MATCH (c:Chat {id: $chatId})
        RETURN c
      `,
      { chatId }
    );

    if (!result.records.length) {
      throw new Error('Chat not found');
    }

    const chat = result.records[0].get('c').properties;
    // Parse JSON strings to objects
    chat.messages = chat.messages.map(json => JSON.parse(json));

    return chat;
  } catch (error) {
    console.error('Error in getChat:', error.message, error.stack);
    throw error;
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
       WHERE other.id <> u.id
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

const markMessagesAsRead = async (chatId, userId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (c:Chat {id: $chatId})
       WITH c, [msg IN c.messages | 
         CASE WHEN msg.senderId <> $userId AND NOT msg.isRead
              THEN {id: msg.id, senderId: msg.senderId, content: msg.content, image: msg.image, timestamp: msg.timestamp, isRead: true}
              ELSE msg END] AS updatedMessages
       SET c.messages = updatedMessages
       RETURN c`,
      { chatId, userId }
    );
    return result.records.length > 0 ? result.records[0].get('c').properties : null;
  } catch (error) {
    throw error;
  } finally {
    await session.close();
  }
};

module.exports = {
  createChat,
  addMessage,
  getChat,
  getChatsForUser,
  markMessagesAsRead
};