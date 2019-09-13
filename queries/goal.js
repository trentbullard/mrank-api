import _ from "lodash";
import { query } from "./helpers";

export const scoreGoal = (request, response) => {
  if (
    _.isInteger(request.body.newScore) &&
    _.isInteger(request.body.teamPlayerId)
  ) {
    let sqlQuery = `
      update team_players
      set
        score=${request.body.newScore}
      where
        id=${request.body.teamPlayerId}
    `;
    query(sqlQuery, response);
  } else {
    response
      .status(400)
      .json({ error: "newScore and teamPlayerId must be integers" });
  }
};
