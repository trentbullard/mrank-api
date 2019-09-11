import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();
import * as db from "./queries";

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
  response.json({ info: "Node.js, Express, and Postgres API" });
});

app.get("/sports", (request, response) => {
  log(request);
  db.getSports(request, response);
});

app.get("/sports/:id", (request, response) => {
  log(request);
  db.getSportById(request, response);
});

app.get("/players", (request, response) => {
  log(request);
  db.getPlayers(request, response);
});

app.post("/players", (request, response) => {
  log(request);
  db.createPlayer(request, response);
});

app.get("/games", (request, response) => {
  log(request);
  db.getGames(request, response);
});

app.get("/games/:id", (request, response) => {
  log(request);
  db.getGameById(request, response);
});

app.post("/games", (request, response) => {
  log(request);
  db.createGame(request, response);
});

app.patch("/goal", (request, response) => {
  log(request);
  db.scoreGoal(request, response);
});

app.post("/elos", (request, response) => {
  log(request);
  db.createElo(request, response);
});

app.patch("/elos", (request, response) => {
  log(request);
  db.updateElos(request, response);
});

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
