const driver = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const neo4j = require('neo4j-driver');
const matchModel = require('./matchModel');
const chatModel = require('./chatModel');

const SALT_ROUNDS = 10;

const normalizeInterests = (interests) => {
  return [...new Set(interests.map(interest => interest.toLowerCase()))];
};

const createUser = async (userData) => {
  const session = driver.session();
  try {
    const defaultMinAge = userData.gender === 'male' ? 31 : 18;
    const defaultMaxAge = userData.gender === 'male' ? 50 : 24;
    const normalizedInterests = normalizeInterests(userData.interests || []);
    
    let hashedPassword = '';
    if (userData.password) {
      hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);
    } else {
      throw new Error('Password is required');
    }
    
    const result = await session.run(
      `CREATE (u:User {
        id: $id, 
        name: $name, 
        surname: $surname, 
        email: $email, 
        password: $password,
        age: $age, 
        country: $country, 
        gender: $gender, 
        interests: $interests, 
        photos: $photos,
        bio: $bio,
        lastActive: $lastActive,
        minAgePreference: $minAgePreference,
        maxAgePreference: $maxAgePreference,
        internationalMode: $internationalMode,
        likesGiven: $likesGiven,
        likesReceived: $likesReceived,
        matches: $matches,
        dislikesGiven: $dislikesGiven
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
        password: hashedPassword,
        age: userData.age,
        country: userData.country,
        gender: userData.gender,
        interests: normalizedInterests,
        photos: userData.photos || [],
        bio: userData.bio || '',
        lastActive: new Date().toISOString(),
        minAgePreference: userData.minAgePreference || defaultMinAge,
        maxAgePreference: userData.maxAgePreference || defaultMaxAge,
        internationalMode: userData.internationalMode || false,
        likesGiven: [],
        likesReceived: [],
        matches: [],
        dislikesGiven: []
      }
    );
    const user = result.records[0].get('u').properties;
    delete user.password;
    return user;
  } catch (error) {
    throw error;
  } finally {
    await session.close();
  }
};

const createOrUpdateGoogleUser = async (googleData) => {
  const session = driver.session();
  try {
    const { googleId, email, name, picture } = googleData;
    const normalizedName = name.split(' ');
    const firstName = normalizedName[0] || '';
    const surname = normalizedName.slice(1).join(' ') || '';
    const id = uuidv4();

    const result = await session.run(
      `MERGE (u:User {email: $email})
       ON CREATE SET
         u.id = $id,
         u.googleId = $googleId,
         u.name = $name,
         u.surname = $surname,
         u.email = $email,
         u.photos = [$picture],
         u.lastActive = $lastActive,
         u.likesGiven = [],
         u.likesReceived = [],
         u.matches = [],
         u.dislikesGiven = [],
         u.internationalMode = false,
         u.interests = [],
         u.bio = '',
         u.age = null,
         u.country = null,
         u.gender = null,
         u.minAgePreference = 18,
         u.maxAgePreference = 100
       ON MATCH SET
         u.googleId = $googleId,
         u.name = $name,
         u.surname = $surname,
         u.photos = CASE 
                     WHEN $picture IN coalesce(u.photos, []) THEN u.photos 
                     ELSE coalesce(u.photos, []) + $picture 
                    END,
         u.lastActive = $lastActive
       RETURN u`,
      {
        id,
        googleId,
        email,
        name: firstName,
        surname,
        picture,
        lastActive: new Date().toISOString()
      }
    );

    const user = result.records[0].get('u').properties;
    delete user.password;
    return user;
  } catch (error) {
    throw new Error(`Failed to create or update Google user: ${error.message}`);
  } finally {
    await session.close();
  }
};

const updateUserProfile = async (userId, userData) => {
  console.log(userId)
  console.log(userData)
  const session = driver.session();
  try {
    const normalizedInterests = normalizeInterests(userData.interests || []);
    const defaultMinAge = userData.gender === 'male' ? 31 : 18;
    const defaultMaxAge = userData.gender === 'male' ? 50 : 24;

    const updateData = {
      id: userId,
      age: userData.age || null,
      country: userData.country || null,
      gender: userData.gender || null,
      interests: normalizedInterests,
      photos: userData.photos || [],
      bio: userData.bio || '',
      minAgePreference: userData.minAgePreference || defaultMinAge,
      maxAgePreference: userData.maxAgePreference || defaultMaxAge,
      internationalMode: userData.internationalMode || false,
      lastActive: new Date().toISOString()
    };

    const result = await session.run(
      `MATCH (u:User {id: $id}) 
SET u.age = $age,
    u.country = $country,
    u.gender = $gender,
    u.interests = $interests,
    u.photos = $photos,
    u.bio = $bio,
    u.minAgePreference = $minAgePreference,
    u.maxAgePreference = $maxAgePreference,
    u.internationalMode = $internationalMode,
    u.lastActive = $lastActive
MERGE (c:Country {name: $country})
MERGE (g:Gender {name: $gender})
CREATE (u)-[:FROM_COUNTRY]->(c)
CREATE (u)-[:HAS_GENDER]->(g)
WITH u
MATCH (u)-[r:SHARES_INTEREST]->(i:Interest)
DELETE r
WITH u, $interests AS interests
FOREACH (interest IN interests | 
  MERGE (i:Interest {name: interest}) 
  CREATE (u)-[:SHARES_INTEREST]->(i)
)
RETURN u
`,
      updateData
    );

    const user = result.records.length > 0 ? result.records[0].get('u').properties : null;
    if (!user) {
      throw new Error('User not found');
    }
    delete user.password;
    return user;
  } catch (error) {
    throw new Error(`Failed to update user profile: ${error.message}`);
  } finally {
    await session.close();
  }
};

const loginUser = async (email, password) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User {email: $email}) 
       RETURN u`,
      { email }
    );
    if (result.records.length === 0) {
      throw new Error('User not found');
    }
    const user = result.records[0].get('u').properties;
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Incorrect password');
    }
    
    return { id: user.id, email: user.email };
  } catch (error) {
    throw error;
  } finally {
    await session.close();
  }
};

const getUser = async (id) => {
  console.log(`Fetching user with ID: ${id}`);
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User {id: $id}) 
       RETURN u`,
      { id }
    );
    const user = result.records.length > 0 ? result.records[0].get('u').properties : null;
    if (user) {
      delete user.password;
    }
    return user;
  } finally {
    await session.close();
  }
};

const getUsers = async (skip = 0, limit = 10) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User)
       RETURN u
       ORDER BY u.lastActive DESC
       SKIP $skip
       LIMIT $limit`,
      { skip: neo4j.int(skip), limit: neo4j.int(limit) }
    );
    const users = result.records.map(record => {
      const user = record.get('u').properties;
      delete user.password;
      return user;
    });
    return users;
  } finally {
    await session.close();
  }
};

const updateUser = async (id, userData) => {
  const session = driver.session();
  try {
    const normalizedInterests = normalizeInterests(userData.interests || []);
    const updateData = {
      id,
      name: userData.name,
      surname: userData.surname,
      email: userData.email,
      age: userData.age,
      country: userData.country,
      gender: userData.gender,
      interests: normalizedInterests,
      photos: userData.photos || [],
      bio: userData.bio || '',
      lastActive: new Date().toISOString(),
      minAgePreference: userData.minAgePreference,
      maxAgePreference: userData.maxAgePreference,
      internationalMode: userData.internationalMode || false
    };
    
    if (userData.password) {
      updateData.password = await bcrypt.hash(userData.password, SALT_ROUNDS);
    }
    
    const result = await session.run(
      `MATCH (u:User {id: $id})
       SET u.name = $name, 
           u.surname = $surname, 
           u.email = $email, 
           ${userData.password ? 'u.password = $password,' : ''}
           u.age = $age, 
           u.country = $country, 
           u.gender = $gender, 
           u.interests = $interests, 
           u.photos = $photos,
           u.bio = $bio,
           u.lastActive = $lastActive,
           u.minAgePreference = $minAgePreference,
           u.maxAgePreference = $maxAgePreference,
           u.internationalMode = $internationalMode
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
      updateData
    );
    const user = result.records.length > 0 ? result.records[0].get('u').properties : null;
    if (user) {
      delete user.password;
    }
    return user;
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
    const checkUsers = await session.run(
      `MATCH (u:User {id: $userId}), (t:User {id: $targetUserId})
       RETURN u, t`,
      { userId, targetUserId }
    );
    if (checkUsers.records.length === 0) {
      throw new Error('User or target user not found');
    }

    const matchId = uuidv4();
    const createdAt = new Date().toISOString();
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})-[:HAS_GENDER]->(ug:Gender),
            (t:User {id: $targetUserId})-[:HAS_GENDER]->(tg:Gender)
      WHERE u <> t
        AND ((ug.name = 'male' AND tg.name = 'female') OR (ug.name = 'female' AND tg.name = 'male'))
      SET u.likesGiven = coalesce(u.likesGiven, []) + $targetUserId,
          t.likesReceived = coalesce(t.likesReceived, []) + $userId
      WITH u, t
      OPTIONAL MATCH (u)-[:SHARES_INTEREST]->(i:Interest)<-[:SHARES_INTEREST]-(t)
      WITH u, t, collect(i.name) AS sharedInterests
      WHERE $targetUserId IN u.likesReceived AND $userId IN t.likesGiven
      CREATE (m:Match {
        id: $matchId,
        userId1: $userId,
        userId2: $targetUserId,
        user1Name: u.name,
        user2Name: t.name,
        sharedInterests: sharedInterests,
        createdAt: $createdAt
      })
      CREATE (u)-[:HAS_MATCH]->(m)
      CREATE (t)-[:HAS_MATCH]->(m)
      SET u.matches = coalesce(u.matches, []) + $targetUserId,
          t.matches = coalesce(t.matches, []) + $userId
      RETURN u, t, m, EXISTS((u)-[:HAS_MATCH]->(m)) AS isMatched
      `,
      { userId, targetUserId, matchId, createdAt }
    );

    if (result.records.length === 0) {
      return {
        user: checkUsers.records[0].get('u').properties,
        target: checkUsers.records[0].get('t').properties,
        isMatched: false,
        match: null,
        chat: null
      };
    }

    const record = result.records[0];
    const isMatched = record.get('isMatched');

    let chat = null;
    if (isMatched) {
      try {
        chat = await chatModel.createChat(matchId);
      } catch (chatError) {
        console.error(`Failed to create chat for match ${matchId}:`, chatError.message);
        throw new Error('Match created but chat creation failed');
      }
    }

    return {
      user: record.get('u').properties,
      target: record.get('t').properties,
      isMatched,
      match: isMatched ? record.get('m').properties : null,
      chat
    };
  } catch (error) {
    console.error(`Error in addLike for user ${userId} to ${targetUserId}:`, error.message);
    throw error;
  } finally {
    await session.close();
  }
};

const getMatches = async (userId, skip = 0, limit = 10) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})-[:HAS_GENDER]->(g:Gender)
      MATCH (u)-[:FROM_COUNTRY]->(uc:Country)
      MATCH (u)-[:SHARES_INTEREST]->(i:Interest)
      WITH u, uc, g, collect(i.name) AS userInterests, count(i) AS userInterestCount

      MATCH (potential:User)-[:HAS_GENDER]->(pg:Gender),
            (potential)-[:FROM_COUNTRY]->(pc:Country),
            (potential)-[:SHARES_INTEREST]->(pi:Interest)
      WHERE potential.id <> u.id
        AND NOT potential.id IN u.matches
        AND NOT potential.id IN u.dislikesGiven
        AND NOT potential.id IN u.likesGiven
        AND potential.age >= u.minAgePreference
        AND potential.age <= u.maxAgePreference
        AND u.age >= potential.minAgePreference
        AND u.age <= potential.maxAgePreference
        AND (u.internationalMode = true OR uc.name = pc.name)
        AND (potential.internationalMode = true OR pc.name = uc.name)
        AND (
          (g.name = 'male' AND pg.name = 'female') OR
          (g.name = 'female' AND pg.name = 'male')
        )

      WITH potential, userInterests, userInterestCount, collect(pi.name) AS potentialInterests
      WITH potential, 
           size([x IN potentialInterests WHERE x IN userInterests]) AS sharedInterestCount,
           userInterestCount
      WITH potential, 
           sharedInterestCount, 
           (sharedInterestCount * 100.0 / userInterestCount) AS matchPercentage

      RETURN 
        {
          user: potential, 
          type: 'potential', 
          sharedInterests: sharedInterestCount,
          matchPercentage: matchPercentage
        } AS match
      ORDER BY matchPercentage DESC, sharedInterestCount DESC
      SKIP $skip
      LIMIT $limit
      `,
      { userId, skip: neo4j.int(skip), limit: neo4j.int(limit) }
    );

    return result.records.map(record => ({
      ...record.get('match').user.properties,
      matchType: record.get('match').type,
      sharedInterests: record.get('match').sharedInterests.low || 0,
      matchPercentage: Math.round(record.get('match').matchPercentage * 100) / 100
    }));
  } finally {
    await session.close();
  }
};

const getMatchesUser = async (userId, skip = 0, limit = 10) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})-[:HAS_MATCH]->(m:Match)
      MATCH (other:User)-[:HAS_MATCH]->(m)
      WHERE other.id <> u.id
      OPTIONAL MATCH (m)-[:HAS_CHAT]->(c:Chat)
      MATCH (other)-[:SHARES_INTEREST]->(i:Interest)
      WITH m, other, collect(i.name) AS interests, c
      RETURN m, other, interests, c
      ORDER BY m.createdAt DESC
      SKIP $skip
      LIMIT $limit
      `,
      { userId, skip: neo4j.int(skip), limit: neo4j.int(limit) }
    );

    return result.records.map(record => {
      const match = record.get('m').properties;
      const otherUser = record.get('other').properties;
      const chat = record.get('c') ? record.get('c').properties : { id: null, messages: [] };
      delete otherUser.password;

      const isUser1 = match.userId1 === userId;
      const otherUserName = isUser1 ? match.user2Name : match.user1Name;
      const otherUserId = isUser1 ? match.userId2 : match.userId1;

      return {
        match,
        otherUser: {
          ...otherUser,
          name: otherUserName,
          id: otherUserId,
          interests: record.get('interests')
        },
        chat
      };
    });
  } finally {
    await session.close();
  }
};

const dislikeUser = async (userId, targetUserId) => {
  const session = driver.session();
  try {
    await session.run(
      `MATCH (u:User {id: $userId}), (t:User {id: $targetUserId})
       WHERE u <> t
       SET u.dislikesGiven = coalesce(u.dislikesGiven, []) + $targetUserId
       RETURN u`,
      { userId, targetUserId }
    );
    return true;
  } finally {
    await session.close();
  }
};

const unmatchUser = async (userId, targetUserId) => {
  const session = driver.session();
  try {
    await session.run(
      `
      MATCH (u:User {id: $userId})-[:HAS_MATCH]->(m:Match)<-[:HAS_MATCH]-(t:User {id: $targetUserId})
      OPTIONAL MATCH (m)-[:HAS_CHAT]->(c:Chat)
      SET u.matches = [x IN u.matches WHERE x <> $targetUserId],
          t.matches = [x IN t.matches WHERE x <> $userId]
      DETACH DELETE m, c
      RETURN true
      `,
      { userId, targetUserId }
    );
    return true;
  } catch (error) {
    console.error(`Error unmatching user ${userId} and ${targetUserId}:`, error.message);
    throw error;
  } finally {
    await session.close();
  }
};

module.exports = {
  createUser,
  createOrUpdateGoogleUser,
  updateUserProfile,
  loginUser,
  getUser,
  getUsers,
  updateUser,
  deleteUser,
  setPreferences,
  addLike,
  getMatches,
  getMatchesUser,
  dislikeUser,
  unmatchUser
};