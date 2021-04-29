import * as assert from "assert";
import { match, when } from "mch";

//
// Types that can not represent impossible states
//

type Player = "playerOne" | "playerTwo";
type Point = "love" | "15" | "30";

type PointsData<
  T extends Record<Player, Point> = {
    playerOne: Point;
    playerTwo: Point;
  }
> = T;

type FortyData = {
  player: Player;
  otherPlayerPoint: Point;
};

// eslint-disable-next-line
namespace Score {
  export class Points {
    constructor(public points: PointsData) {}
  }
  export class Forty {
    constructor(public points: FortyData) {}
  }
  export class Deuce {}
  export class Advantage {
    constructor(public player: Player) {}
  }
  export class Game {
    constructor(public player: Player) {}
  }
}

type Score =
  | Score.Points
  | Score.Forty
  | Score.Deuce
  | Score.Advantage
  | Score.Game;

//
// Utils
//

const opponent = (player: Player): Player =>
  player === "playerOne" ? "playerTwo" : "playerOne";

const incrementPoint = (currentPoint: Point): Point | null =>
  ({
    love: "15" as Point,
    "15": "30" as Point,
    "30": null,
  }[currentPoint]);

//
// Transitions
//

const scorePoints = (winner: Player) => (points: PointsData): Score => {
  const playerPoint = incrementPoint(points[winner]);
  return playerPoint !== null
    ? new Score.Points({ ...points, [winner]: playerPoint })
    : new Score.Forty({
        player: winner,
        otherPlayerPoint: points[opponent(winner)],
      });
};

const scoreForty = (winner: Player) => (forty: FortyData): Score => {
  if (forty.player === winner) {
    return new Score.Game(winner);
  } else {
    const otherPlayerPoint = incrementPoint(forty.otherPlayerPoint);
    return otherPlayerPoint !== null
      ? new Score.Forty({ ...forty, otherPlayerPoint })
      : new Score.Deuce();
  }
};

const scoreDeuce = (winner: Player) => () => new Score.Advantage(winner);

const scoreAdvantage = (winner: Player) => (player: Player): Score =>
  player === winner ? new Score.Game(winner) : new Score.Deuce();

const scoreGame = (_winner: Player) => (player: Player): Score =>
  new Score.Game(player);

//
// State machine
//

const scorePoint = (score: Score, winner: Player): Score => {
  return match(score, [
    when(Score.Points, (value) => scorePoints(winner)(value.points)),
    when(Score.Forty, (value) => scoreForty(winner)(value.points)),
    when(Score.Deuce, scoreDeuce(winner)),
    when(Score.Advantage, (value) => scoreAdvantage(winner)(value.player)),
    when(Score.Game, (value) => scoreGame(winner)(value.player)),
  ]);
};

//
// Main
//

const newGame = new Score.Points({ playerOne: "love", playerTwo: "love" });

const scoreSequence = (wins: Player[]) => wins.reduce(scorePoint, newGame);

//
// Usage
//

const firstBall = scorePoint(newGame, "playerOne");
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

console.log({ firstBall, secondBall, simpleGame });

assert.deepStrictEqual(
  firstBall,
  new Score.Points({ playerOne: "15", playerTwo: "love" })
);
assert.deepStrictEqual(
  secondBall,
  new Score.Points({ playerOne: "30", playerTwo: "love" })
);
assert.deepStrictEqual(simpleGame, new Score.Game("playerTwo"));
