import { pool } from "./helpers";

export const createLog = async (request, response) => {
  let actionType = request.body.actionType;
  let objectType = request.body.objectType;
  let objectId = request.body.objectId;
  let objectJson = request.body.objectJson;
  let message = request.body.message;
  let userId = request.body.currentUserId;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query({
      text: `insert into logs ("actiontype", "objecttype", "objectid", "objectjson", "message", "userid") values ($1,$2,$3,$4,$5,$6)`,
      values: [actionType, objectType, objectId, objectJson, message, userId],
    });
    await client.query("COMMIT");

    response.status(200).json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    response.status(500).json({ message: "failed to create log", error });
  } finally {
    client.release();
  }
};
