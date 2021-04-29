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

type Score = {
  Points: PointsData;
  Forty: FortyData;
  Deuce: null;
  Advantage: Player;
  Game: Player;
};

type Event = {
  ScorePoint: Player;
  RainedOff: null;
  PlayerInjury: Player;
};

type TaggedUnion<
  T extends Record<string, unknown>,
  K extends keyof T = keyof T
> = K extends keyof T ? Pick<T, K> : never;

type PickScore<K> = K extends keyof Score ? Pick<Score, K> : never;

type Transition<
  E extends keyof Event,
  F extends keyof Score,
  T extends keyof Score
> = (score: Score[F]) => (event: Event[E]) => PickScore<T>;

type StateMachine<
  T extends {
    [_ in keyof Event]?: {
      [_ in keyof Score]?: keyof Score;
    };
  }
> = {
  [E in keyof T & keyof Event]: {
    [S in keyof T[E] & keyof Score]: T[E][S] extends keyof Score
      ? Transition<E, S, T[E][S]>
      : never;
  };
};

type Game = StateMachine<{
  ScorePoint: {
    Points: "Points" | "Forty";
    Forty: "Forty" | "Deuce" | "Game";
    Deuce: "Advantage";
    Advantage: "Deuce" | "Game";
    Game: "Game";
  };
}>;

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

const of = <S extends keyof Score, T extends Score[S]>(
  type: S,
  data: T
): Pick<Score, S> => (({ [type]: data } as unknown) as Pick<Score, S>);

const applyEvent = (fsm: Game) => <
  S extends keyof Score,
  E extends keyof Event
>(
  score: TaggedUnion<Score>,
  event: TaggedUnion<Event>
): TaggedUnion<Score> => {
  const tag = {
    event: Object.keys(event)[0] as E,
    score: Object.keys(score)[0] as S,
  };

  const value = {
    event: (event as Pick<Event, E>)[tag.event],
    score: (score as Pick<Score, S>)[tag.score],
  };

  // @ts-expect-error "TODO"
  const handle = fsm[tag.event]![tag.score]; // eslint-disable-line

  if (!handle) {
    return score;
  }

  return handle(value.score)(value.event) as TaggedUnion<Score>;
};

//
// Transitions
//

const scorePoints = (points: PointsData) => (
  winner: Player
): PickScore<"Points" | "Forty"> => {
  const playerPoint = incrementPoint(points[winner]);
  return playerPoint !== null
    ? of("Points", { ...points, [winner]: playerPoint })
    : of("Forty", {
        player: winner,
        otherPlayerPoint: points[opponent(winner)],
      });
};

const scoreForty = (forty: FortyData) => (
  winner: Player
): PickScore<"Forty" | "Deuce" | "Game"> => {
  if (forty.player === winner) {
    return of("Game", winner);
  } else {
    const otherPlayerPoint = incrementPoint(forty.otherPlayerPoint);
    return otherPlayerPoint !== null
      ? of("Forty", { ...forty, otherPlayerPoint })
      : of("Deuce", null);
  }
};

const scoreDeuce = () => (winner: Player): PickScore<"Advantage"> => {
  return of("Advantage", winner);
};

const scoreAdvantage = (player: Player) => (
  winner: Player
): PickScore<"Game" | "Deuce"> => {
  return player === winner ? of("Game", winner) : of("Deuce", null);
};

const scoreGame = (player: Player) => (_winner: Player): PickScore<"Game"> => {
  return of("Game", player);
};

//
// FSM
//

export const fsm: Game = {
  ScorePoint: {
    Points: scorePoints,
    Forty: scoreForty,
    Deuce: scoreDeuce,
    Advantage: scoreAdvantage,
    Game: scoreGame,
  },
};

const scorePoint = applyEvent(fsm);

//
// Main
//

const newGame = of("Points", { playerOne: "love", playerTwo: "love" });

const scoreSequence = (events: TaggedUnion<Event>[]) =>
  // @ts-expect-error "TODO"
  events.reduce(scorePoint, newGame);

const playerOne = { ScorePoint: "playerOne" } as Pick<Event, "ScorePoint">;
const playerTwo = { ScorePoint: "playerTwo" } as Pick<Event, "ScorePoint">;

//
// Usage
//

const firstBall = scorePoint(newGame, playerOne);
const secondBall = scorePoint(firstBall, playerOne);

const simpleGame = scoreSequence([
  playerTwo,
  playerTwo,
  playerOne,
  playerTwo,
  playerOne,
  playerOne,
  playerTwo,
  playerTwo,
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
