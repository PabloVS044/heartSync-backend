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

    // Create message object with reactions array
    const message = {
      id: messageId,
      senderId,
      content,
      image: image || '',
      timestamp,
      isRead,
      reactions: [] // Initialize empty reactions array
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
    chat.messages = chat.messages.map(json => JSON.parse(json));

    return chat;
  } catch (error) {
    console.error('Error in addMessage:', error.message, error.stack);
    throw error;
  } finally {
    await session.close();
  }
};

const addReactionToMessage = async (chatId, messageId, userId, emoji) => {
  const session = await driver.session();
  try {
    const result = await session.run(
      `MATCH (c:Chat {id: $chatId})
       RETURN c`,
      { chatId }
    );

    if (!result.records.length) {
      throw new Error('Chat not found');
    }

    const chat = result.records[0].get('c').properties;
    let messages = chat.messages.map(json => JSON.parse(json));

    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) {
      throw new Error('Message not found');
    }

    const message = messages[messageIndex];
    message.reactions = message.reactions || [];
    message.reactions = message.reactions.filter(reaction => reaction.userId !== userId);
    message.reactions.push({ userId, emoji });

    messages[messageIndex] = message;

    const updatedMessagesJson = messages.map(msg => JSON.stringify(msg));

    const updateResult = await session.run(
      `MATCH (c:Chat {id: $chatId})
       SET c.messages = $updatedMessagesJson
       RETURN c`,
      { chatId, updatedMessagesJson }
    );

    const updatedChat = updateResult.records[0].get('c').properties;
    updatedChat.messages = updatedChat.messages.map(json => JSON.parse(json));

    return updatedChat;
  } catch (error) {
    console.error('Error in addReactionToMessage:', error.message, error.stack);
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
       RETURN c`,
      { chatId }
    );

    if (!result.records.length) {
      return null;
    }

    const chat = result.records[0].get('c').properties;
    let messages = chat.messages.map(json => JSON.parse(json));

    messages = messages.map(msg => {
      if (msg.senderId !== userId && !msg.isRead) {
        return { ...msg, isRead: true };
      }
      return msg;
    });

    const updatedMessagesJson = messages.map(msg => JSON.stringify(msg));

    const updateResult = await session.run(
      `MATCH (c:Chat {id: $chatId})
       SET c.messages = $updatedMessagesJson
       RETURN c`,
      { chatId, updatedMessagesJson }
    );

    const updatedChat = updateResult.records[0].get('c').properties;
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
  addReactionToMessage,
  getChat,
  getChatsForUser,
  markMessagesAsRead
};