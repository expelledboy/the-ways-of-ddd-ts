import * as assert from "assert";
import { faste } from "faste";

type Player = "playerOne" | "playerTwo";

const Actions = ["score", "concede"];
const Points = ["love", "15", "30", "40", "advantage", "winner"];

type Action = typeof Actions[0];
type Point = typeof Points[0];

const Transitions: Record<Point, Point[]> = {
  love: ["15"],
  15: ["30"],
  30: ["40"],
  40: ["advantage"],
  advantage: ["40", "winner"],
  winner: [],
};

interface Score {
  put(message: Action): void;
  phase(): Point;
}

interface Game {
  playerOne: Score;
  playerTwo: Score;
  complete: boolean;
  points: {
    kata: Point | "deuce";
    playerOne: Point;
    playerTwo: Point;
  };
}

//
// Utils
//

const opponent = (player: Player): Player =>
  player === "playerOne" ? "playerTwo" : "playerOne";

//
// State machine
//

const Score = faste()
  .withPhases(Points)
  .withTransitions(Transitions)
  .withMessages(Actions)
  .on("score", ["love"], ({ transitTo }) => transitTo("15"))
  .on("score", ["15"], ({ transitTo }) => transitTo("30"))
  .on("score", ["30"], ({ transitTo }) => transitTo("40"))
  .on("score", ["40"], ({ transitTo }) => transitTo("advantage"))
  .on("score", ["advantage"], ({ transitTo }) => transitTo("winner"))
  .on("concede", ["advantage"], ({ transitTo }) => transitTo("40"));

const calculatePoints = (game: Pick<Game, Player>): Game => {
  const playerOne = game.playerOne.phase();
  const playerTwo = game.playerTwo.phase();

  let kata = `${playerOne}:${playerTwo}`;
  if (kata === `40:40`) kata = "deuce";

  return {
    ...game,
    points: {
      kata,
      playerOne,
      playerTwo,
    },
    complete: [playerOne, playerTwo].some((point) => point === "winner"),
  };
};

const scorePoint = (game: Game, winner: Player): Game => {
  if (game.complete) return game;

  game[winner].put("score");
  game[opponent(winner)].put("concede");

  return calculatePoints(game);
};

//
// Main
//

const newGame = (): Game =>
  calculatePoints({
    playerOne: Score.create().start("love"),
    playerTwo: Score.create().start("love"),
  });

const scoreSequence = (wins: Player[]) => wins.reduce(scorePoint, newGame());

////
//// Usage
////

const firstBall = scorePoint(newGame(), "playerOne");
const secondBall = scorePoint(firstBall, "playerOne");

const simpleGame = scoreSequence([
  "playerTwo",
  "playerTwo",
  "playerOne",
  "playerTwo",
  "playerOne",
  "playerOne",
  "playerTwo",
  "playerTwo",
]);

console.log({
  firstBall: firstBall.points,
  secondBall: secondBall.points,
  simpleGame: simpleGame.points,
});

assert.deepStrictEqual(firstBall.points, {
  kata: "15:love",
  playerOne: "15",
  playerTwo: "love",
});
assert.deepStrictEqual(secondBall.points, {
  kata: "30:love",
  playerOne: "30",
  playerTwo: "love",
});
assert.deepStrictEqual(simpleGame.points, {
  kata: "40:winner",
  playerOne: "40",
  playerTwo: "winner",
});
