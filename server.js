import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();
import * as db from "./queries";
import { auth } from "./queries/helpers";

const app = express();
const port = process.env.PORT || 3002;

const log = ({ method, url, params, query, body }) => {
  console.log(`\n[${new Date().toISOString()}]`);
  console.log(`Request: ${method} - ${url}`);
  console.log(`  params: `, params);
  console.log(`  query: `, query);
  console.log(`  body: `, body);
};

app.use(cors());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
);

app.get("/", (request, response) => {
  log(request);
  if (!auth(request)) {
    response.status(401).json({ error: "token did not match" });
    return null;
  }
  response.json({ info: "Node.js, Express, and Postgres API" });
});

app.get("/sports", (request, response) => {
  log(request);
  if (!auth(request)) {
    response.status(401).json({ error: "token did not match" });
    return null;
  }
  db.getSports(request, response);
});

app.get("/sports/:id", (request, response) => {
  log(request);
  if (!auth(request)) {
    response.status(401).json({ error: "token did not match" });
    return null;
  }
  db.getSportById(request, response);
});

app.get("/players", (request, response) => {
  log(request);
  if (!auth(request)) {
    response.status(401).json({ error: "token did not match" });
    return null;
  }
  db.getPlayers(request, response);
});

app.post("/players", (request, response) => {
  log(request);
  if (!auth(request)) {
    response.status(401).json({ error: "token did not match" });
    return null;
  }
  db.createPlayer(request, response);
});

app.get("/games", (request, response) => {
  log(request);
  if (!auth(request)) {
    response.status(401).json({ error: "token did not match" });
    return null;
  }
  db.getGames(request, response);
});

app.post("/games", (request, response) => {
  log(request);
  if (!auth(request)) {
    response.status(401).json({ error: "token did not match" });
    return null;
  }
  db.createGame(request, response);
});

app.patch("/goal", (request, response) => {
  log(request);
  if (!auth(request)) {
    response.status(401).json({ error: "token did not match" });
    return null;
  }
  db.scoreGoal(request, response);
});

app.post("/elos", (request, response) => {
  log(request);
  if (!auth(request)) {
    response.status(401).json({ error: "token did not match" });
    return null;
  }
  db.createElo(request, response);
});

app.patch("/elos", (request, response) => {
  log(request);
  if (!auth(request)) {
    response.status(401).json({ error: "token did not match" });
    return null;
  }
  db.updateElos(request, response);
});

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
