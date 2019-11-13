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
