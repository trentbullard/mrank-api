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
    select * from users where email='${email}' and passwordhash='${passwordHash}'
  `;
  } catch (error) {
    response.status(500).json({ message: "error while authenticating", error });
    return null;
  }
  query(sqlQuery, response);
};

export const getUserBySessionId = (request, response) => {
  const sessionId = request.query.sessionId;
  const sqlQuery = `
    select * from users where sessionId='${sessionId}'
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
