const driver = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const neo4j = require('neo4j-driver');

const normalizeInterests = (interests) => {
  return [...new Set(interests.map(interest => interest.toLowerCase()))];
};

const createAd = async (adData) => {
  const session = driver.session();
  try {
    const normalizedInterests = normalizeInterests(adData.targetedInterests || []);
    const result = await session.run(
      `CREATE (a:Advertisement {
        id: $id,
        title: $title,
        description: $description,
        image: $image,
        createdAt: $createdAt
      })
      FOREACH (interest IN $targetedInterests |
        MERGE (i:Interest {name: interest})
        CREATE (a)-[:TARGETS_INTEREST]->(i)
      )
      RETURN a`,
      {
        id: uuidv4(),
        title: adData.title,
        description: adData.description,
        image: adData.image || '',
        createdAt: new Date().toISOString(),
        targetedInterests: normalizedInterests
      }
    );
    return result.records[0].get('a').properties;
  } catch (error) {
    throw error;
  } finally {
    await session.close();
  }
};

const getAd = async (id) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (a:Advertisement {id: $id})
       RETURN a`,
      { id }
    );
    return result.records.length > 0 ? result.records[0].get('a').properties : null;
  } finally {
    await session.close();
  }
};

const getAds = async (skip = 0, limit = 10) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (a:Advertisement)
       RETURN a
       ORDER BY a.createdAt DESC
       SKIP $skip
       LIMIT $limit`,
      { skip: neo4j.int(skip), limit: neo4j.int(limit) }
    );
    return result.records.map(record => record.get('a').properties);
  } finally {
    await session.close();
  }
};

const updateAd = async (id, adData) => {
  const session = driver.session();
  try {
    const normalizedInterests = normalizeInterests(adData.targetedInterests || []);
    const result = await session.run(
      `MATCH (a:Advertisement {id: $id})
       SET a.title = $title,
           a.description = $description,
           a.image = $image
       WITH a
       MATCH (a)-[r:TARGETS_INTEREST]->(i:Interest)
       DELETE r
       FOREACH (interest IN $targetedInterests |
         MERGE (i:Interest {name: interest})
         CREATE (a)-[:TARGETS_INTEREST]->(i)
       )
       RETURN a`,
      {
        id,
        title: adData.title,
        description: adData.description,
        image: adData.image || '',
        targetedInterests: normalizedInterests
      }
    );
    return result.records.length > 0 ? result.records[0].get('a').properties : null;
  } finally {
    await session.close();
  }
};

const deleteAd = async (id) => {
  const session = driver.session();
  try {
    await session.run(
      `MATCH (a:Advertisement {id: $id})
       DETACH DELETE a`,
      { id }
    );
    return true;
  } finally {
    await session.close();
  }
};

const getAdsForUser = async (userId, skip = 0, limit = 10) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User {id: $userId})-[:SHARES_INTEREST]->(i:Interest)<-[:TARGETS_INTEREST]-(a:Advertisement)
       RETURN a, count(i) AS sharedInterests
       ORDER BY rand()
       SKIP $skip
       LIMIT $limit`,
      { userId, skip: neo4j.int(skip), limit: neo4j.int(limit) }
    );
    return result.records.map(record => ({
      ...record.get('a').properties,
      sharedInterests: record.get('sharedInterests').low
    }));
  } finally {
    await session.close();
  }
};

module.exports = {
  createAd,
  getAd,
  getAds,
  updateAd,
  deleteAd,
  getAdsForUser
};