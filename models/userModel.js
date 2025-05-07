const driver = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Normalizar intereses: minúsculas y sin duplicados
const normalizeInterests = (interests) => {
  return [...new Set(interests.map(interest => interest.toLowerCase()))];
};

const createUser = async (userData) => {
  const session = driver.session();
  try {
    const defaultMinAge = userData.gender === 'male' ? 30 : 18;
    const defaultMaxAge = userData.gender === 'male' ? 80 : 25;
    const normalizedInterests = normalizeInterests(userData.interests);
    
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
        photos: $photos,
        bio: $bio,
        lastActive: $lastActive,
        minAgePreference: $minAgePreference,
        maxAgePreference: $maxAgePreference
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
        interests: normalizedInterests,
        photos: userData.photos,
        bio: userData.bio || '',
        lastActive: new Date().toISOString(),
        minAgePreference: userData.minAgePreference || defaultMinAge,
        maxAgePreference: userData.maxAgePreference || defaultMaxAge
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
    const normalizedInterests = normalizeInterests(userData.interests);
    
    const result = await session.run(
      `MATCH (u:User {id: $id})
       SET u.name = $name, 
           u.surname = $surname, 
           u.email = $email, 
           u.age = $age, 
           u.country = $country, 
           u.gender = $gender, 
           u.interests = $interests, 
           u.photos = $photos,
           u.bio = $bio,
           u.lastActive = $lastActive,
           u.minAgePreference = $minAgePreference,
           u.maxAgePreference = $maxAgePreference
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
        interests: normalizedInterests,
        photos: userData.photos,
        bio: userData.bio || '',
        lastActive: new Date().toISOString(),
        minAgePreference: userData.minAgePreference,
        maxAgePreference: userData.maxAgePreference
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
    const result = await session.run(
      `MATCH (u:User {id: $userId})-[:HAS_GENDER]->(g:Gender)
       WHERE (g.name = 'male' AND $minAge >= 31 AND $maxAge >= $minAge AND $maxAge <= 100)
         OR (g.name = 'female' AND $minAge >= 18 AND $maxAge <= 24 AND $maxAge >= $minAge)
       SET u.minAgePreference = $minAge, u.maxAgePreference = $maxAge
       RETURN u`,
      { userId, minAge, maxAge }
    );
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};

const addLike = async (userId, targetUserId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User {id: $userId}), (t:User {id: $targetUserId})
       WHERE u <> t
       CREATE (u)-[l:LIKES]->(t)
       WITH u, t
       MATCH (t)-[:LIKES]->(u)
       WHERE EXISTS((u)-[:LIKES]->(t))
       MERGE (u)-[m1:MATCHED]->(t)
       MERGE (t)-[m2:MATCHED]->(u)
       RETURN u, t, EXISTS((u)-[:MATCHED]->(t)) AS isMatched`,
      { userId, targetUserId }
    );
    const record = result.records[0];
    return {
      user: record.get('u').properties,
      target: record.get('t').properties,
      isMatched: record.get('isMatched')
    };
  } finally {
    await session.close();
  }
};

const getMatches = async (userId, skip = 0, limit = 10) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User {id: $userId})-[:HAS_GENDER]->(g:Gender)
       // Prioridad 1: Matches mutuos
       OPTIONAL MATCH (u)-[:MATCHED]->(matched:User)
       WHERE matched.age >= u.minAgePreference AND matched.age <= u.maxAgePreference
       // Prioridad 2: Usuarios que han dado like al usuario
       OPTIONAL MATCH (liked:User)-[:LIKES]->(u)
       WHERE liked.age >= u.minAgePreference 
         AND liked.age <= u.maxAgePreference
         AND NOT EXISTS((u)-[:MATCHED]->(liked))
         AND ((g.name = 'male' AND u.age < 25 AND liked.gender = 'female' AND liked.age > 30)
           OR (g.name = 'female' AND u.age > 30 AND liked.gender = 'male' AND liked.age < 25))
       // Prioridad 3: Coincidencias por intereses y país
       OPTIONAL MATCH (potential:User)-[:HAS_GENDER]->(pg:Gender)
       WHERE potential.age >= u.minAgePreference 
         AND potential.age <= u.maxAgePreference
         AND NOT EXISTS((u)-[:MATCHED]->(potential))
         AND NOT EXISTS((potential)-[:LIKES]->(u))
         AND ((g.name = 'male' AND u.age < 25 AND pg.name = 'female' AND potential.age > 30)
           OR (g.name = 'female' AND u.age > 30 AND pg.name = 'male' AND potential.age < 25))
       MATCH (u)-[:SHARES_INTEREST]->(i:Interest)<-[:SHARES_INTEREST]-(potential)
       MATCH (u)-[:FROM_COUNTRY]->(c:Country)<-[:FROM_COUNTRY]-(potential)
       WITH u, matched, liked, potential, count(i) AS sharedInterests
       WHERE matched IS NOT NULL OR liked IS NOT NULL OR potential IS NOT NULL
       RETURN 
         CASE 
           WHEN matched IS NOT NULL THEN {user: matched, type: 'matched', sharedInterests: 0}
           WHEN liked IS NOT NULL THEN {user: liked, type: 'liked', sharedInterests: 0}
           ELSE {user: potential, type: 'potential', sharedInterests: sharedInterests}
         END AS match
       ORDER BY 
         CASE 
           WHEN matched IS NOT NULL THEN 1
           WHEN liked IS NOT NULL THEN 2
           ELSE 3
         END, sharedInterests DESC
       SKIP $skip
       LIMIT $limit`,
      { userId, skip, limit }
    );
    return result.records.map(record => ({
      ...record.get('match').user.properties,
      matchType: record.get('match').type,
      sharedInterests: record.get('match').sharedInterests.low || 0
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
  addLike,
  getMatches
};