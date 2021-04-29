import * as assert from "assert";
import { MemberType, makeTaggedUnion, none } from "safety-match";

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
> = T; // Checks against `Player` using extends

type FortyData = {
  player: Player;
  otherPlayerPoint: Point;
};

const Score = makeTaggedUnion({
  Points: (points: PointsData) => points,
  Forty: (points: FortyData) => points,
  Deuce: none,
  Advantage: (player: Player) => player,
  Game: (player: Player) => player,
});

type Score = MemberType<typeof Score>;

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
    ? Score.Points({ ...points, [winner]: playerPoint })
    : Score.Forty({
        player: winner,
        otherPlayerPoint: points[opponent(winner)],
      });
};

const scoreForty = (winner: Player) => (forty: FortyData): Score => {
  if (forty.player === winner) {
    return Score.Game(winner);
  } else {
    const otherPlayerPoint = incrementPoint(forty.otherPlayerPoint);
    return otherPlayerPoint !== null
      ? Score.Forty({ ...forty, otherPlayerPoint })
      : Score.Deuce;
  }
};

const scoreDeuce = (winner: Player) => () => Score.Advantage(winner);

const scoreAdvantage = (winner: Player) => (player: Player): Score =>
  player === winner ? Score.Game(winner) : Score.Deuce;

const scoreGame = (_winner: Player) => (player: Player): Score =>
  Score.Game(player);

//
// State machine
//

const scorePoint = (score: Score, winner: Player): Score => {
  return score.match({
    Points: scorePoints(winner),
    Forty: scoreForty(winner),
    Deuce: scoreDeuce(winner),
    Advantage: scoreAdvantage(winner),
    Game: scoreGame(winner),
  });
};

//
// Main
//

const newGame = Score.Points({ playerOne: "love", playerTwo: "love" });

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
  Score.Points({ playerOne: "15", playerTwo: "love" })
);
assert.deepStrictEqual(
  secondBall,
  Score.Points({ playerOne: "30", playerTwo: "love" })
);
assert.deepStrictEqual(simpleGame, Score.Game("playerTwo"));
