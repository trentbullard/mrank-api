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

const processRequest = (request, response) => {
  log(request);
  if (!auth(request)) {
    response.status(401).json({ error: "token did not match" });
    return false;
  }
  return true;
};

app.use(cors());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
);

app.get("/", (request, response) => {
  if (processRequest(request, response)) {
    response.json({ info: "Node.js, Express, and Postgres API" });
  }
});

app.get("/sports", (request, response) => {
  if (processRequest(request, response)) {
    db.getSports(request, response);
  }
});

app.get("/sports/:id", (request, response) => {
  if (processRequest(request, response)) {
    db.getSportById(request, response);
  }
});

app.get("/players/names", (request, response) => {
  if (processRequest(request, response)) {
    db.getPlayerNames(request, response);
  }
});

app.get("/players", (request, response) => {
  if (processRequest(request, response)) {
    db.getPlayers(request, response);
  }
});

app.post("/players", (request, response) => {
  if (processRequest(request, response)) {
    db.createPlayer(request, response);
  }
});

app.patch("/players/:id", (request, response) => {
  if (processRequest(request, response)) {
    db.editPlayer(request, response);
  }
});

app.delete("/players/:id", (request, response) => {
  if (processRequest(request, response)) {
    db.deletePlayer(request, response);
  }
});

app.get("/games", (request, response) => {
  if (processRequest(request, response)) {
    db.getGames(request, response);
  }
});

app.post("/games", (request, response) => {
  if (processRequest(request, response)) {
    db.createGame(request, response);
  }
});

app.patch("/goal", (request, response) => {
  if (processRequest(request, response)) {
    db.scoreGoal(request, response);
  }
});

app.post("/elos", (request, response) => {
  if (processRequest(request, response)) {
    db.createElo(request, response);
  }
});

app.patch("/elos", (request, response) => {
  if (processRequest(request, response)) {
    db.updateElos(request, response);
  }
});

app.post("/logs", (request, response) => {
  if (processRequest(request, response)) {
    db.createLog(request, response);
  }
});

app.get("/session", (request, response) => {
  if (processRequest(request, response)) {
    db.getUserBySessionId(request, response);
  }
});

app.get("/auth", (request, response) => {
  if (processRequest(request, response)) {
    db.authenticateUser(request, response);
  }
});

app.post("/login", (request, response) => {
  if (processRequest(request, response)) {
    db.login(request, response);
  }
});

app.get("/users", (request, response) => {
  if (processRequest(request, response)) {
    db.getUsers(request, response);
  }
});

app.get("/users/:id", (request, response) => {
  if (processRequest(request, response)) {
    db.getUserByUserId(request, response);
  }
});

app.post("/users", (request, response) => {
  if (processRequest(request, response)) {
    db.createUser(request, response);
  }
});

app.patch("/users/:id", (request, response) => {
  if (processRequest(request, response)) {
    db.editUser(request, response);
  }
});

app.delete("/users/:id", (request, response) => {
  if (processRequest(request, response)) {
    db.deleteUser(request, response);
  }
});

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
