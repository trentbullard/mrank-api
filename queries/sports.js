import _ from "lodash";
import { query } from "./helpers";

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
    enabled as "enabled"
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
