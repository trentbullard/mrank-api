import _ from "lodash";
import { query, pool, asyncEach } from "./helpers";

export const getGames = (request, response) => {
  let gameId = request.query.id;
  let where = gameId ? `where id=${request.query.id}` : "";
  let limit = "";
  let sort = "";
  if (!_.isEmpty(request.query.sort)) {
    let comma = "";
    sort = "order by ";
    _.each(request.query.sort, (field, index) => {
      let order = "";
      if (
        !_.isEmpty(request.query.order) &&
        request.query.order.length >= index + 1
      ) {
        order = `${request.query.order[index]}`;
      }
      sort += `${comma}${field} ${order}`;
      comma = ",";
    });
  }
  if (request.query.limit) {
    limit += `limit ${request.query.limit} `;
    if (request.query.page) {
      limit += `offset ${(request.query.page - 1) *
        (request.query.limit || 10)}`;
    }
  }
  let sqlQuery = `
  select
    g.id as "gameId",
    g.started as "started",
    g.sportid as "sportId",
    g.eloawarded as "eloAwarded",
    t.id as "teamId",
    t.name as "teamName",
    p.id as "playerId",
    p.name as "playerName",
    e.elo as "playerElo",
    tp.position as "position",
    tp.score as "score",
    tp.id as "teamPlayerId"
  from (
    select
      id,
      started,
      sportid,
      eloawarded
    from games
    ${where}
    ${sort}
    ${limit}
  ) g
    join game_teams gt on gt.gameid=g.id
    join teams t on t.id=gt.teamid
    join team_players tp on tp.teamid=t.id
    join players p on p.id=tp.playerid
    join elos e on e.playerid=p.id and e.sportid=g.sportId
  order by g.id desc, t.name asc, tp.position asc
  `;
  query(sqlQuery, response);
};

export const getTeamPlayer = async (request, response) => {
  const teamPlayerId = parseInt(request.params.id);
  if (!teamPlayerId) {
    response.status(400).json({
      message: "bad url params",
    });
    return null;
  }

  const client = await pool.connect();
  try {
    const text = `
      select
        p.name as "name",
        tp.id,
        tp.score,
        tp.position
      from team_players tp
        inner join players p on p.id=tp.playerid
      where
        tp.id=$1
    `;
    const values = [teamPlayerId];
    const dbLogText = `
      select
        p.name as "name",
        tp.id,
        tp.score,
        tp.position
      from team_players tp
        inner join players p on p.id=tp.playerid
      where
        tp.id=${teamPlayerId}
    `;
    console.log(`  db:`, dbLogText.replace(/\n/g, " ").replace(/\s\s+/g, " "));
    const { rows } = await client.query(text, values);
    response.status(200).json(rows[0]);
  } catch (error) {
    response
      .status(500)
      .json({ message: "failed to fetch team player", error: error.stack });
  } finally {
    client.release();
  }
};

export const createGame = async (request, response) => {
  const { sport: sportId, eloAwarded, started, teams } = request.body;
  const teamNames = _.map(Object.values(teams), team => {
    return team.name;
  });
  const teamPositions = _.reduce(
    Object.values(teams),
    (acc, team) => {
      return { ...acc, [team.name]: team.positions };
    },
    {},
  );

  let gameRows;
  let gameId;
  try {
    gameRows = await pool.query({
      text:
        'insert into games (sportid, eloawarded, started) values ($1,$2,$3) returning id, sportid as "sportId", eloawarded as "eloAwarded", started',
      values: [sportId, eloAwarded, started],
    });
    gameId = gameRows.rows[0].id;
  } catch (error) {
    response.status(500).json({ error: error.stack });
    return null;
  }

  const teamRecords = await insertTeams(teamNames);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await insertTeamPlayers(client, teamRecords, teamPositions);
    await insertGameTeams(client, gameId, teamRecords);
    await client.query("COMMIT");
    response.status(200).json(gameRows.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    response.status(500).json({ error: error.stack });
  } finally {
    client.release();
  }
};

export const deleteGame = async (request, response) => {
  const { id: gameId } = request.params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const gameTeamRows = await deleteGameTeams(client, gameId);
    await deleteGameAsync(client, gameId);
    await deleteTeamPlayers(client, gameTeamRows);
    await deleteTeams(client, gameTeamRows);
    await client.query("COMMIT");
    response.status(200).json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    response.status(500).json({ error: error.stack });
  } finally {
    client.release();
  }
};

const insertTeams = async teamNames => {
  return await asyncEach(teamNames, async name => {
    const { rows } = await pool.query({
      text: "insert into teams (name) values ($1) returning *",
      values: [name],
    });
    return rows[0];
  });
};

const insertTeamPlayers = async (client, teamRecords, teamPositions) => {
  asyncEach(Object.values(teamRecords), async teamRecord => {
    const positions = teamPositions[teamRecord.name];
    asyncEach(positions, async position => {
      await client.query({
        text:
          "insert into team_players (teamid, playerid, position) values ($1,$2,$3)",
        values: [teamRecord.id, position.player.id, position.name],
      });
    });
  });
};

const insertGameTeams = async (client, gameId, teamRecords) => {
  asyncEach(Object.values(teamRecords), async teamRecord => {
    await client.query({
      text: "insert into game_teams (gameid, teamid) values ($1,$2)",
      values: [gameId, teamRecord.id],
    });
  });
};

const deleteGameAsync = async (client, gameId) => {
  const text = `
    delete from games where id=$1 returning *
  `;
  const values = [gameId];
  const logText = `
    delete from games where id=${gameId} returning *
  `;
  console.log(`  db:`, logText.replace(/\n/g, " ").replace(/\s\s+/g, " "));
  const { rows } = await client.query({ text, values });
  return rows[0];
};

const deleteGameTeams = async (client, gameId) => {
  const text = `
    delete from game_teams where gameid=$1 returning *
  `;
  const values = [gameId];
  const logText = `
    delete from game_teams where gameid=${gameId} returning *
  `;
  console.log(`  db:`, logText.replace(/\n/g, " ").replace(/\s\s+/g, " "));
  const { rows } = await client.query({ text, values });
  return rows;
};

const deleteTeamPlayers = async (client, gameTeamRows) => {
  return await asyncEach(gameTeamRows, async gameTeamRow => {
    const teamId = gameTeamRow.teamid;
    const text = `
        delete from team_players where teamid=$1 returning *
      `;
    const values = [teamId];
    const logText = `
        delete from team_players where teamid=${teamId} returning *
      `;
    console.log(`  db:`, logText.replace(/\n/g, " ").replace(/\s\s+/g, " "));
    const { rows } = await client.query({ text, values });
    return rows;
  });
};

const deleteTeams = async (client, gameTeamRows) => {
  return await asyncEach(gameTeamRows, async gameTeamRow => {
    const teamId = gameTeamRow.teamid;
    const text = `
        delete from teams where id=$1 returning *
      `;
    const values = [teamId];
    const logText = `
        delete from teams where id=${teamId} returning *
      `;
    console.log(`  db:`, logText.replace(/\n/g, " ").replace(/\s\s+/g, " "));
    const { rows } = await client.query({ text, values });
    return rows;
  });
};
