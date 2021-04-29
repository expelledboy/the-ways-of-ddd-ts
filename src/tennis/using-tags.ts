import * as assert from "assert";

//
// Types that can not represent impossible states
//

type Player = "playerOne" | "playerTwo";
type Point = "love" | "15" | "30";

type PointsData = {
  playerOne: Point;
  playerTwo: Point;
};

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

const opponent = (player: Player): Player =>
  player === "playerOne" ? "playerTwo" : "playerOne";

const incrementPoint = (currentPoint: Point): Point | null =>
  ({
    love: "15" as Point,
    "15": "30" as Point,
    "30": null,
  }[currentPoint]);

const of = <Tag extends Score["type"], T extends Extract<Score, { type: Tag }>>(
  type: T["type"],
  data: T["data"]
): Score => Object.freeze({ type, data }) as Score;

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

// prettier-ignore
const scorePoint = (score: Score, winner: Player): Score => {
  switch (score.type) {
    case "Points": return scorePoints(winner)(score.data);
    case "Forty": return scoreForty(winner)(score.data);
    case "Deuce": return scoreDeuce(winner)();
    case "Advantage": return scoreAdvantage(winner)(score.data);
    case "Game": return scoreGame(winner)(score.data);
  }
};

// const scorePoint = (score: Score, winner: Player): Score => {
//   return {
//     Points: scorePoints,
//     Forty: scoreForty,
//     Deuce: scoreDeuce,
//     Advantage: scoreAdvantage,
//     Game: scoreGame,
//     // @ts-expect-error "We dont get validation on the handler"
//   }[score.type](winner)(score.data);
// };

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

assert.deepStrictEqual(
  firstBall,
  of("Points", { playerOne: "15", playerTwo: "love" })
);
assert.deepStrictEqual(
  secondBall,
  of("Points", { playerOne: "30", playerTwo: "love" })
);
assert.deepStrictEqual(simpleGame, of("Game", "playerTwo"));
