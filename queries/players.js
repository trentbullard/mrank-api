import _ from "lodash";
import { query, pool } from "./helpers";

export const getPlayers = (request, response) => {
  const sort = request.query.sort || [];
  const order = request.query.order || [];
  let comma = "";
  const orderClause = _.reduce(
    _.zip(sort, order),
    (acc, value) => {
      let clause = `${comma}${value[0]} ${value[1]}`;
      comma = ",";
      return (acc += clause);
    },
    "order by ",
  );
  const page = request.query.page;
  const limit = request.query.limit || 10;
  const sportId = request.query.sportId
    ? `and e.sportid=${request.query.sportId}`
    : "";

  let sqlQuery = `
    select
      p.*,
      e.elo as "elo",
      e.sportid as "sport"
    from players p
      inner join elos e on e.playerid=p.id ${sportId}
    order by sport asc, elo desc, p.name asc
  `;
  query(sqlQuery, response);
};

export const createPlayer = async (request, response) => {
  let sports = request.body.sports;
  let elo = request.body.elo;
  let name = request.body.name;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const playerRows = await client.query({
      text: `insert into players ("name") values ($1) returning *`,
      values: [name],
    });
    let playerId = playerRows.rows[0].id;

    _.each(sports, async sport => {
      await client.query({
        text: `insert into elos ("playerid", "sportid", "elo") values ($1,$2,$3)`,
        values: [playerId, sport.id, elo],
      });
    });

    await client.query("COMMIT");
    response.status(200).json({ id: playerId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.log(`createPlayer -> error`, error);
    response
      .status(500)
      .json({ message: "failed to create player", error: `${error}` });
  } finally {
    client.release();
  }
};
