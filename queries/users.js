import _ from "lodash";
import {
  pool,
  query,
  decryptData,
  getPasswordHash,
  getSessionId,
} from "./helpers";

export const authenticateUser = (request, response) => {
  let sqlQuery = "";
  try {
    const cipher = request.query.cipher;
    const { email, password } = decryptData(cipher);
    const passwordHash = getPasswordHash(password);
    sqlQuery = `
    select
      id,
      isadmin as "isAdmin",
      email,
      createdat as "createdAt",
      sessionid as "sessionId",
      firstname as "firstName",
      lastname as "lastName"
    from users
    where
      email='${email}'
      and passwordhash='${passwordHash}'
  `;
  } catch (error) {
    response.status(500).json({ message: "error while authenticating", error });
    return null;
  }
  query(sqlQuery, response);
};

export const getUsers = (request, response) => {
  const sqlQuery = `
    select
      id,
      isadmin as "isAdmin",
      email,
      createdat as "createdAt",
      sessionid as "sessionId",
      firstname as "firstName",
      lastname as "lastName"
    from users
  `;
  query(sqlQuery, response);
};

export const getUserBySessionId = (request, response) => {
  const sessionId = request.query.sessionId;
  const sqlQuery = `
    select
      id,
      isadmin as "isAdmin",
      email,
      createdat as "createdAt",
      sessionid as "sessionId",
      firstname as "firstName",
      lastname as "lastName"
    from users
    where
      sessionid='${sessionId}'
  `;
  query(sqlQuery, response);
};

export const getUserByUserId = (request, response) => {
  const userId = request.query.userId;
  const sqlQuery = `
    select
      id,
      isadmin as "isAdmin",
      email,
      createdat as "createdAt",
      sessionid as "sessionId",
      firstname as "firstName",
      lastname as "lastName"
    from users
    where
      id='${userId}'
  `;
  query(sqlQuery, response);
};

export const login = async (request, response) => {
  const userId = request.body.userId;
  const sessionId = getSessionId(request);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query({
      text: `update users set sessionid=$1 where id=$2`,
      values: [sessionId, userId],
    });
    await client.query("COMMIT");
    response.status(200).json({ success: true, sessionId });
  } catch (error) {
    await client.query("ROLLBACK");
    response.status(500).json({ message: "failed to login", error });
  } finally {
    client.release();
  }
};

export const createUser = async (request, response) => {
  const client = await pool.connect();
  try {
    const cipher = request.query.cipher;
    const { email, password } = decryptData(cipher);
    const passwordHash = getPasswordHash(password);
    const sessionId = getSessionId(request);

    await client.query("BEGIN");
    const queryText = `insert into users ("email", "passwordhash", "sessionid") values (${email},${passwordHash},${sessionId}) returning *`;
    console.log(`  db:`, queryText.replace(/\n/g, " ").replace(/\s\s+/g, " "));
    const userRows = await client.query({
      text: `insert into users ("email", "passwordhash", "sessionid") values ($1,$2,$3) returning *`,
      values: [email, passwordHash, sessionId],
    });
    const user = userRows.rows[0];
    await client.query("COMMIT");

    response.status(200).json(user);
  } catch (error) {
    await client.query("ROLLBACK");
    response
      .status(500)
      .json({ message: "failed to create user", error: error.stack });
  } finally {
    client.release();
  }
};

export const editUser = async (request, response) => {
  const client = await pool.connect();
  let text;
  let values;
  try {
    const { id } = request.params;
    const userId = parseInt(id);
    if (!userId) {
      response.status(500).json({
        message: "failed to update user",
        error: "id param unrecognized",
        params: request.params,
      });
      return null;
    }
    const cipher = request.query.cipher;
    const { email, password, firstName, lastName, isAdmin } = decryptData(
      cipher,
    );

    const {
      rows: matchingRows,
    } = await client.query("select * from users where email=$1", [email]);
    if (!_.isEmpty(matchingRows) && matchingRows[0].id !== userId) {
      response.status(403).json({ error: "email already taken" });
      return null;
    }

    if (_.isEmpty(password)) {
      text = `
        update users
        set
          email=$1,
          firstname=$2,
          lastname=$3,
          isadmin=$4
        where
          id=$5
        returning *`;
      values = [email, firstName, lastName, !!isAdmin, userId];
    } else {
      const passwordHash = getPasswordHash(password);
      text = `
        update users
        set
          email=$1,
          firstname=$2,
          lastname=$3,
          isadmin=$4,
          passwordhash=$5
        where
          id=$6
        returning *`;
      values = [email, firstName, lastName, !!isAdmin, passwordHash, userId];
    }
    console.log(`  db:`, text.replace(/\n/g, " ").replace(/\s\s+/g, " "));
    const { rows: updatedRows } = await client.query(text, values);
    response.status(200).json(updatedRows[0]);
  } catch (error) {
    response.status(500).json({ message: "failed to update user", error });
  } finally {
    client.release();
  }
};

export const deleteUser = async (request, response) => {
  const client = await pool.connect();
  const text = `
    delete from users where id=$1
  `;
  const values = [request.params.id];
  const logText = `delete from users where id=${request.params.id}`;
  console.log(`  db:`, logText.replace(/\n/g, " ").replace(/\s\s+/g, " "));
  client.query(text, values, (err, result) => {
    if (err) {
      response
        .status(500)
        .json({ message: "failed to delete user", error: err.stack });
    } else {
      response.status(200).json({ success: true });
    }
  });
};
