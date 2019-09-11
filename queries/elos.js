import _ from "lodash";
import { pool } from "./helpers";

export const updateElos = async (request, response) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query({
      text: `
        update elos set
          elo=$1
        where
          playerid=$2 and sportid=$3
      `,
      values: [
        request.body.updatedElos[0].elo,
        request.body.updatedElos[0].id,
        request.body.sport.id,
      ],
    });

    await client.query({
      text: `
        update elos set
          elo=$1
        where
          playerid=$2 and sportid=$3
      `,
      values: [
        request.body.updatedElos[1].elo,
        request.body.updatedElos[1].id,
        request.body.sport.id,
      ],
    });

    await client.query({
      text: `
        update elos set
          elo=$1
        where
          playerid=$2 and sportid=$3
      `,
      values: [
        request.body.updatedElos[2].elo,
        request.body.updatedElos[2].id,
        request.body.sport.id,
      ],
    });

    await client.query({
      text: `
        update elos set
          elo=$1
        where
          playerid=$2 and sportid=$3
      `,
      values: [
        request.body.updatedElos[3].elo,
        request.body.updatedElos[3].id,
        request.body.sport.id,
      ],
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    response.status(500).json({ message: "failed to update elos", error });
  } finally {
    client.release();
  }

  response.status(200).json({ success: true });
};

export const createElo = async (request, response) => {
  let sports = request.body.sports;
  let playerId = request.body.player.id;
  let elo = request.body.elo;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    _.each(sports, async sport => {
      await client.query({
        text: `insert into elos ("playerid", "sportid", "elo") values ($1,$2,$3)`,
        values: [playerId, sport.id, elo],
      });
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    response.status(500).json({ message: "failed to create elos", error });
  } finally {
    client.release();
  }
  response.status(200).json({ success: true });
};
