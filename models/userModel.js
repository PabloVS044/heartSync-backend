const driver = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const createUser = async (userData) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `CREATE (u:User {
        id: $id, 
        name: $name, 
        surname: $surname, 
        email: $email, 
        age: $age, 
        country: $country, 
        gender: $gender, 
        interests: $interests, 
        photos: $photos
      })
      MERGE (c:Country {name: $country})
      MERGE (g:Gender {name: $gender})
      CREATE (u)-[:FROM_COUNTRY]->(c)
      CREATE (u)-[:HAS_GENDER]->(g)
      FOREACH (interest IN $interests | 
        MERGE (i:Interest {name: interest}) 
        CREATE (u)-[:SHARES_INTEREST]->(i)
      )
      RETURN u`,
      {
        id: uuidv4(),
        name: userData.name,
        surname: userData.surname,
        email: userData.email,
        age: userData.age,
        country: userData.country,
        gender: userData.gender,
        interests: userData.interests,
        photos: userData.photos
      }
    );
    return result.records[0].get('u').properties;
  } finally {
    await session.close();
  }
};

const getUser = async (id) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User {id: $id}) 
       RETURN u`,
      { id }
    );
    return result.records.length > 0 ? result.records[0].get('u').properties : null;
  } finally {
    await session.close();
  }
};

const updateUser = async (id, userData) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User {id: $id})
       SET u.name = $name, 
           u.surname = $surname, 
           u.email = $email, 
           u.age = $age, 
           u.country = $country, 
           u.gender = $gender, 
           u.interests = $interests, 
           u.photos = $photos
       MERGE (c:Country {name: $country})
       MERGE (g:Gender {name: $gender})
       CREATE (u)-[:FROM_COUNTRY]->(c)
       CREATE (u)-[:HAS_GENDER]->(g)
       WITH u
       MATCH (u)-[r:SHARES_INTEREST]->(i:Interest)
       DELETE r
       FOREACH (interest IN $interests | 
         MERGE (i:Interest {name: interest}) 
         CREATE (u)-[:SHARES_INTEREST]->(i)
       )
       RETURN u`,
      {
        id,
        name: userData.name,
        surname: userData.surname,
        email: userData.email,
        age: userData.age,
        country: userData.country,
        gender: userData.gender,
        interests: userData.interests,
        photos: userData.photos
      }
    );
    return result.records.length > 0 ? result.records[0].get('u').properties : null;
  } finally {
    await session.close();
  }
};

const deleteUser = async (id) => {
  const session = driver.session();
  try {
    await session.run(
      `MATCH (u:User {id: $id}) 
       DETACH DELETE u`,
      { id }
    );
    return true;
  } finally {
    await session.close();
  }
};

const setPreferences = async (userId, minAge, maxAge) => {
  const session = driver.session();
  try {
    await session.run(
      `MATCH (u:User {id: $userId})
       SET u.minAgePreference = $minAge, u.maxAgePreference = $maxAge`,
      { userId, minAge, maxAge }
    );
    return true;
  } finally {
    await session.close();
  }
};

const getMatches = async (userId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User {id: $userId})-[:HAS_GENDER]->(g:Gender)
       MATCH (potential:User)-[:HAS_GENDER]->(pg:Gender)
       WHERE g.name = 'male' AND pg.name = 'female' 
       AND potential.age >= u.minAgePreference 
       AND potential.age <= u.maxAgePreference
       MATCH (u)-[:SHARES_INTEREST]->(i:Interest)<-[:SHARES_INTEREST]-(potential)
       MATCH (u)-[:FROM_COUNTRY]->(c:Country)<-[:FROM_COUNTRY]-(potential)
       MERGE (u)-[m:MATCHES_WITH]->(potential)
       RETURN potential, count(i) as sharedInterests
       ORDER BY sharedInterests DESC
       LIMIT 10`,
      { userId }
    );
    return result.records.map(record => ({
      ...record.get('potential').properties,
      sharedInterests: record.get('sharedInterests').low
    }));
  } finally {
    await session.close();
  }
};

module.exports = {
  createUser,
  getUser,
  updateUser,
  deleteUser,
  setPreferences,
  getMatches
};