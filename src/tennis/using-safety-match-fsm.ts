import * as assert from "assert";
import { makeTaggedUnion, none, MemberType } from "safety-match";

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

const Score = makeTaggedUnion({
  Points: (points: PointsData) => points,
  Forty: (points: FortyData) => points,
  Deuce: none,
  Advantage: (player: Player) => player,
  Game: (player: Player) => player,
});

type Score = MemberType<typeof Score>;

const Event = makeTaggedUnion({
  ScorePoint: (player: Player) => player,
});

type Event = MemberType<typeof Event>;

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

const scorePoints = (points: PointsData) => (winner: Player): Score => {
  const playerPoint = incrementPoint(points[winner]);
  return playerPoint !== null
    ? Score.Points({ ...points, [winner]: playerPoint })
    : Score.Forty({
        player: winner,
        otherPlayerPoint: points[opponent(winner)],
      });
};

const scoreForty = (forty: FortyData) => (winner: Player): Score => {
  if (forty.player === winner) {
    return Score.Game(winner);
  } else {
    const otherPlayerPoint = incrementPoint(forty.otherPlayerPoint);
    return otherPlayerPoint !== null
      ? Score.Forty({ ...forty, otherPlayerPoint })
      : Score.Deuce;
  }
};

const scoreDeuce = () => (winner: Player): Score => {
  return Score.Advantage(winner);
};

const scoreAdvantage = (player: Player) => (winner: Player): Score => {
  return player === winner ? Score.Game(winner) : Score.Deuce;
};

const scoreGame = (player: Player) => (_winner: Player): Score => {
  return Score.Game(player);
};

//
// FSM
//

const scorePoint = (score: Score, event: Event): Score =>
  event.match({
    ScorePoint: score.match({
      Points: scorePoints,
      Forty: scoreForty,
      Deuce: scoreDeuce,
      Advantage: scoreAdvantage,
      Game: scoreGame,
    }),
  });

//
// Main
//

const newGame = Score.Points({ playerOne: "love", playerTwo: "love" });

const scoreSequence = (events: Event[]) => events.reduce(scorePoint, newGame);

//
// Usage
//

const firstBall = scorePoint(newGame, Event.ScorePoint("playerOne"));
const secondBall = scorePoint(firstBall, Event.ScorePoint("playerOne"));

const simpleGame = scoreSequence(
  ([
    "playerTwo",
    "playerTwo",
    "playerOne",
    "playerTwo",
    "playerOne",
    "playerOne",
    "playerTwo",
    "playerTwo",
  ] as Player[]).map(Event.ScorePoint)
);

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
