import _ from "lodash";
import { query, pool } from "./helpers";

export const getSports = (request, response) => {
  let where = "";
  let andString = "";
  if (request.query.where) {
    where += `where `;
    _.forEach(JSON.parse(request.query.where), (value, key) => {
      where += `${andString} ${key}=${value}`;
      andString = " and";
    });
  }
  let sqlQuery = `
  select
    id as "id",
    name as "name",
    winningscore as "winningScore",
    teamnames as "teamNames",
    positionnames as "positionNames",
    enabled as "enabled",
    playersperteam as "playersPerTeam",
    iconname as "iconName"
  from sports
  ${where}
  order by id asc
  `;
  query(sqlQuery, response);
};

export const getSportById = (request, response) => {
  let sqlQuery = `
  select
    id as "id",
    name as "name",
    winningscore as "winningScore",
    teamnames as "teamNames",
    positionnames as "positionNames"
  from sports where id=${request.params.id}
  `;
  query(sqlQuery, response);
};

export const createSport = async (request, response) => {
  const {
    startingElo,
    name,
    winningScore,
    teamNames,
    positionNames,
    playersPerTeam,
    iconName,
  } = request.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const sportRows = await client.query({
      text:
        "insert into sports (name, winningscore, teamnames, positionnames, playersperteam, iconname) values ($1,$2,$3,$4,$5,$6) returning *",
      values: [
        name,
        winningScore,
        teamNames.replace(", ", ","),
        positionNames.replace(", ", ","),
        playersPerTeam,
        iconName,
      ],
    });
    const sport = sportRows.rows[0];

    await client.query({
      text:
        "insert into elos (playerid, sportid, elo) select p.id, $1, $2 from players p",
      values: [sport.id, startingElo],
    });

    await client.query("COMMIT");
    response.status(200).json(sport);
  } catch (error) {
    await client.query("ROLLBACK");
    response
      .status(500)
      .json({ message: "failed to create sport", error: `${error.stack}` });
  } finally {
    client.release();
  }
};

export const deleteSport = async (request, response) => {
  const client = await pool.connect();
  const text = `
    delete from sports where id=$1
  `;
  const values = [request.params.id];
  console.log(`  db:`, text.replace(/\n/g, " ").replace(/\s\s+/g, " "));
  client.query(text, values, err => {
    if (err) {
      response
        .status(500)
        .json({ message: "failed to delete user", error: err.stack });
    } else {
      response.status(200).json({ success: true });
    }
  });
};

export const updateSport = async (request, response) => {
  const {
    name,
    winningScore,
    teamNames,
    positionNames,
    enabled,
    playersPerTeam,
    iconName,
  } = request.body;
  const { id } = request.params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const sportRows = await client.query({
      text:
        "update sports set name=$1, winningscore=$2, teamnames=$3, positionnames=$4, playersperteam=$5, iconname=$6, enabled=$7 where id=$8 returning *",
      values: [
        name,
        winningScore,
        teamNames.replace(", ", ","),
        positionNames.replace(", ", ","),
        playersPerTeam,
        iconName,
        enabled,
        id,
      ],
    });
    const sport = sportRows.rows[0];

    await client.query("COMMIT");
    response.status(200).json(sport);
  } catch (error) {
    await client.query("ROLLBACK");
    response
      .status(500)
      .json({ message: "failed to create sport", error: `${error.stack}` });
  } finally {
    client.release();
  }
};
