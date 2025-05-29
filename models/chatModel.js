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
    // Fetch the chat
    const result = await session.run(
      `MATCH (c:Chat {id: $chatId})
       RETURN c`,
      { chatId }
    );

    if (!result.records.length) {
      return null;
    }

    const chat = result.records[0].get('c').properties;
    // Parse JSON strings to objects
    let messages = chat.messages.map(json => JSON.parse(json));

    // Update messages where senderId is not userId and isRead is false
    messages = messages.map(msg => {
      if (msg.senderId !== userId && !msg.isRead) {
        return { ...msg, isRead: true };
      }
      return msg;
    });

    // Serialize messages back to JSON strings
    const updatedMessagesJson = messages.map(msg => JSON.stringify(msg));

    // Update the chat node with the new messages array
    const updateResult = await session.run(
      `MATCH (c:Chat {id: $chatId})
       SET c.messages = $updatedMessagesJson
       RETURN c`,
      { chatId, updatedMessagesJson }
    );

    const updatedChat = updateResult.records[0].get('c').properties;
    // Parse messages back to objects for the response
    updatedChat.messages = updatedChat.messages.map(json => JSON.parse(json));

    return updatedChat;
  } catch (error) {
    console.error('Error in markMessagesAsRead:', error.message, error.stack);
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