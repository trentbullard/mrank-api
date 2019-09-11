import _ from "lodash";
import { query, pool } from "./helpers";

export const getGames = (request, response) => {
  let limit = "";
  let sort = "";
  let order = "";
  if (request.query.sort.length) {
    sort = "order by ";
    _.each(request.query.sort, (field, index) => {
      if (index > 0) {
        sort += `,`;
      }
      sort += `${field}`;
      if (request.query.order.length >= index + 1) {
        order += `${request.query.order[index]}`;
      }
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
    g.sportId as "sportId",
    g.eloAwarded as "eloAwarded",
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
      sportId,
      eloAwarded
    from games
    ${sort} ${order}
    ${limit}
  ) g
    join game_teams gt on gt.gameid=g.id
    join teams t on t.id=gt.teamid
    join team_players tp on tp.teamid=t.id
    join players p on p.id=tp.playerid
    join elos e on e.playerid=p.id and e.sportid=g.sportId
  ${sort} ${order}
  `;
  query(sqlQuery, response);
};

export const getGameById = (request, response) => {
  let sqlQuery = `
  select
    g.id as "gameId",
    g.started as "started",
    g.sportId as "sportId",
    g.eloAwarded as "eloAwarded",
    t.name as "teamName",
    p.id as "playerId",
    p.name as "playerName",
    e.elo as "playerElo",
    tp.position as "position",
    tp.score as "score",
    tp.id as "teamPlayerId"
  from games g
    inner join game_teams gt on gt."gameid"=g.id
    inner join teams t on t.id=gt."teamid"
    inner join team_players tp on tp."teamid"=t.id
    inner join players p on p.id=tp."playerid"
    inner join elos e on e.playerid=p.id and e.sportid=g.sportid
  where
    g.id=${request.params.id}
  `;
  query(sqlQuery, response);
};

export const createGame = async (request, response) => {
  const sport = request.body.sport;
  const eloAwarded = request.body.eloAwarded;
  const started = request.body.started;
  const teams = request.body.teams;
  let positionNames = [];
  let playerIds = [];
  let teamNames = _.map(teams, team => {
    positionNames = _.union(
      positionNames,
      _.map(team.positions, position => {
        playerIds = _.union(playerIds, [position.player.id]);
        return position.name;
      }),
    );
    return team.name;
  });

  const gameRows = await pool.query({
    text:
      "insert into games (sportid, eloawarded, started) values ($1,$2,$3) returning *",
    values: [sport, eloAwarded, started],
  });

  const team1Rows = await pool.query({
    text: "insert into teams (name) values ($1) returning *",
    values: [teamNames[0]],
  });

  const team2Rows = await pool.query({
    text: "insert into teams (name) values ($1) returning *",
    values: [teamNames[1]],
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query({
      text:
        "insert into team_players (teamid, playerid, position) values ($1,$2,$3)",
      values: [team1Rows.rows[0].id, playerIds[0], positionNames[0]],
    });
    await client.query({
      text:
        "insert into team_players (teamid, playerid, position) values ($1,$2,$3)",
      values: [team1Rows.rows[0].id, playerIds[1], positionNames[1]],
    });
    await client.query({
      text:
        "insert into team_players (teamid, playerid, position) values ($1,$2,$3)",
      values: [team2Rows.rows[0].id, playerIds[2], positionNames[0]],
    });
    await client.query({
      text:
        "insert into team_players (teamid, playerid, position) values ($1,$2,$3)",
      values: [team2Rows.rows[0].id, playerIds[3], positionNames[1]],
    });

    await client.query({
      text: "insert into game_teams (gameid, teamid) values ($1,$2)",
      values: [gameRows.rows[0].id, team1Rows.rows[0].id],
    });
    await client.query({
      text: "insert into game_teams (gameid, teamid) values ($1,$2)",
      values: [gameRows.rows[0].id, team2Rows.rows[0].id],
    });

    await client.query("COMMIT");
    response.status(200).json({ id: gameRows.rows[0].id });
  } catch (error) {
    await client.query("ROLLBACK");
    response.status(500).json({ error });
  } finally {
    client.release();
  }
};
