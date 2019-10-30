import _ from "lodash";
import { query, pool } from "./helpers";

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
  const sportId = request.body.sport;
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
      'insert into games (sportid, eloawarded, started) values ($1,$2,$3) returning id, sportid as "sportId", eloawarded as "eloAwarded", started',
    values: [sportId, eloAwarded, started],
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
    response.status(200).json(gameRows.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    response.status(500).json({ error });
  } finally {
    client.release();
  }
};
