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

type Score =
  | { type: "Points"; data: PointsData }
  | { type: "Forty"; data: FortyData }
  | { type: "Deuce"; data: null }
  | { type: "Advantage"; data: Player }
  | { type: "Game"; data: Player };

//
// Utils
//

const of = <Tag extends Score["type"], T extends Extract<Score, { type: Tag }>>(
  type: T["type"],
  data: T["data"]
): Score => Object.freeze({ type, data }) as Score;

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
    ? of("Points", { ...points, [winner]: playerPoint })
    : of("Forty", {
        player: winner,
        otherPlayerPoint: points[opponent(winner)],
      });
};

const scoreForty = (winner: Player) => (forty: FortyData): Score => {
  if (forty.player === winner) {
    return of("Game", winner);
  } else {
    const otherPlayerPoint = incrementPoint(forty.otherPlayerPoint);
    return otherPlayerPoint !== null
      ? of("Forty", { ...forty, otherPlayerPoint })
      : of("Deuce", null);
  }
};

const scoreDeuce = (winner: Player) => () => of("Advantage", winner);

const scoreAdvantage = (winner: Player) => (player: Player): Score =>
  player === winner ? of("Game", winner) : of("Deuce", null);

const scoreGame = (_winner: Player) => (player: Player): Score =>
  of("Game", player);

//
// State machine
//

function whenType<
  T extends Score["type"],
  S extends Extract<Score, { type: T }>
>(tag: T, handle: (data: S["data"]) => Score) {
  // @ts-expect-error "TODO"
  return when({ type: tag }, (value: S) => handle(value.data));
}

const scorePoint = (score: Score, winner: Player): Score => {
  return match(score, [
    whenType("Points", scorePoints(winner)),
    whenType("Forty", scoreForty(winner)),
    whenType("Deuce", scoreDeuce(winner)),
    whenType("Advantage", scoreAdvantage(winner)),
    whenType("Game", scoreGame(winner)),
  ]);
};

//
// Main
//

const newGame = of("Points", { playerOne: "love", playerTwo: "love" });

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

assert.deepStrictEqual(firstBall, {
  type: "Points",
  data: { playerOne: "15", playerTwo: "love" },
});
assert.deepStrictEqual(secondBall, {
  type: "Points",
  data: { playerOne: "30", playerTwo: "love" },
});
assert.deepStrictEqual(simpleGame, { type: "Game", data: "playerTwo" });
