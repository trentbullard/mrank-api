import _ from "lodash";
import { pool } from "./helpers";

export const getTeam = async (request, response) => {
  const { id: teamId } = request.params;
  const client = await pool.connect();
  try {
    const text = `
      select *
      from teams
      where id=$1`;
    const values = [teamId];
    const logText = `
      select *
      from teams
      where id=${teamId}`;
    console.log(`  db:`, logText.replace(/\n/g, " ").replace(/\s\s+/g, " "));
    await client.query("BEGIN");
    const { rows } = await client.query({ text, values });
    await client.query("COMMIT");
    response.status(200).json(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    response.status(500).json({ error: error.stack });
  } finally {
    client.release();
  }
};

export const getTeamPlayers = async (request, response) => {
  const { id: teamId } = request.params;
  const client = await pool.connect();
  try {
    const text = `
      select
        id,
        playerid as "playerId",
        teamid as "teamId",
        position,
        score
      from team_players
      where teamid=$1`;
    const values = [teamId];
    const logText = `
      select
        id,
        playerid as "playerId",
        teamid as "teamId",
        position,
        score
      from team_players
      where teamid=${teamId}`;
    console.log(`  db:`, logText.replace(/\n/g, " ").replace(/\s\s+/g, " "));
    await client.query("BEGIN");
    const { rows } = await client.query({ text, values });
    await client.query("COMMIT");
    response.status(200).json(rows);
  } catch (error) {
    await client.query("ROLLBACK");
    response.status(500).json({ error: error.stack });
  } finally {
    client.release();
  }
};
