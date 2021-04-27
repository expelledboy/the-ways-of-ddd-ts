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

class Points {
  constructor(public points: PointsData) {}

  score(winner: Player): Score {
    const playerPoint = incrementPoint(this.points[winner]);
    return playerPoint !== null
      ? new Points({ ...this.points, [winner]: playerPoint })
      : new Forty({
          player: winner,
          otherPlayerPoint: this.points[opponent(winner)],
        });
  }
}

class Forty {
  constructor(public forty: FortyData) {}

  score(winner: Player): Score {
    if (this.forty.player === winner) {
      return new Game(winner);
    } else {
      const otherPlayerPoint = incrementPoint(this.forty.otherPlayerPoint);
      return otherPlayerPoint !== null
        ? new Forty({ ...this.forty, otherPlayerPoint })
        : new Deuce();
    }
  }
}

class Deuce {
  score(winner: Player): Score {
    return new Advantage(winner);
  }
}

class Advantage {
  constructor(public player: Player) {}

  score(winner: Player): Score {
    return this.player === winner ? new Game(winner) : new Deuce();
  }
}

class Game {
  constructor(public player: Player) {}

  score(_winner: Player): Score {
    return new Game(this.player);
  }
}

type Score<
  T extends { score: (winner: Player) => Score } =
    | Points
    | Forty
    | Deuce
    | Advantage
    | Game
> = T;

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
// State machine
//

const scorePoint = (score: Score, winner: Player): Score => {
  return score.score(winner);
};

//
// Main
//

const newGame = new Points({ playerOne: "love", playerTwo: "love" });

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
  new Points({ playerOne: "15", playerTwo: "love" })
);
assert.deepStrictEqual(
  secondBall,
  new Points({ playerOne: "30", playerTwo: "love" })
);
assert.deepStrictEqual(simpleGame, new Game("playerTwo"));
