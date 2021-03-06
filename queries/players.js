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
  const page = parseInt(request.query.page);
  const limit = request.query.limit || 10;
  const paginate = page ? `limit ${limit} offset ${(page - 1) * limit}` : "";
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
    ${paginate}
  `;
  query(sqlQuery, response);
};

export const getPlayer = async (request, response) => {
  const { id: playerId } = request.params;
  const { sportId } = request.query;
  const client = await pool.connect();
  try {
    const text = `
      select
        p.id,
        p.name,
        e.elo
      from players p
        inner join elos e on e.playerid=p.id
      where p.id=$1 and e.sportid=$2`;
    const values = [playerId, sportId];
    const logText = `
      select
        p.id,
        p.name,
        e.elo
      from players p
        inner join elos e on e.playerid=p.id
      where p.id=${playerId} and e.sportid=${sportId}`;
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

export const getPlayerNames = (_request, response) => {
  query("select name from players", response);
};

export const createPlayer = async (request, response) => {
  const { sports, elo, name } = request.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const playerRows = await client.query({
      text: `insert into players ("name") values ($1) returning *`,
      values: [name],
    });
    let player = playerRows.rows[0];

    _.each(sports, async sport => {
      await client.query({
        text: `insert into elos ("playerid", "sportid", "elo") values ($1,$2,$3)`,
        values: [player.id, sport.id, elo],
      });
    });

    await client.query("COMMIT");
    response.status(200).json(player);
  } catch (error) {
    await client.query("ROLLBACK");
    response
      .status(500)
      .json({ message: "failed to create player", error: `${error.stack}` });
  } finally {
    client.release();
  }
};

export const editPlayer = async (request, response) => {
  const client = await pool.connect();
  const { name } = request.body;
  const { id: playerId } = request.params;
  try {
    const text = `
      update players
      set
        name=$1
      where
        id=$2
      returning *`;
    const values = [name, playerId];
    console.log(`  db:`, text.replace(/\n/g, " ").replace(/\s\s+/g, " "));
    client.query(text, values, (err, result) => {
      if (err) {
        response
          .status(500)
          .json({ message: "failed to update player", error: err.stack });
      } else {
        response.status(200).json(result.rows[0]);
      }
    });
  } catch (error) {
    response.status(500).json({ message: "failed to update player", error });
  } finally {
    client.release();
  }
};

export const deletePlayer = async (request, response) => {
  const client = await pool.connect();
  const text = `
    delete from players where id=$1
  `;
  const values = [request.params.id];
  console.log(`  db:`, text.replace(/\n/g, " ").replace(/\s\s+/g, " "));
  client.query(text, values, (err, result) => {
    if (err) {
      response
        .status(500)
        .json({ message: "failed to delete player", error: err.stack });
    } else {
      response.status(200).json({ success: true });
    }
  });
};
