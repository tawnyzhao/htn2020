import { INITIAL_COUNTER, step } from "../util/fsm";
import Cam from "./Cam";
import React, { Component } from "react";
import man from "../assets/images/pushupman.png";
import pushdownman from "../assets/images/pushdownman.png";
import Confetti from "react-confetti";
import {
  socket,
  pullScore,
  pushScore,
  pullName,
  pushName,
  pullStart,
  onConnect,
  pushStart,
  pullReady,
  pushReady,
} from "../util/socket";

import {
  OTSession,
  OTPublisher,
  OTStreams,
  OTSubscriber,
  preloadScript,
} from "opentok-react";
import "./OT.css";

let gameLength = 10000;
let startWidth;
let canvasWidth;

function scoreToSize(score) {
  const CLASSES = [
    "text-lg",
    "text-xl",
    "text-2xl",
    "text-3xl",
    "text-4xl",
    "text-5xl",
    "text-6xl",
    "text-7xl",
    "text-8xl",
    "text-9xl",
  ];
  if (score >= CLASSES.length) return CLASSES[CLASSES.length - 1];
  return CLASSES[score];
}

class Lobby extends Component {
  constructor(props) {
    super(props);
    this.state = {
      counter: INITIAL_COUNTER,
      scores: {},
      names: {},
      playersReady: {},
      id: "",
      opponentId: "",
      name: "",
      ready: false,
      gameStarted: false,
      gameEnded: false,
      gameTimeEnd: -1,
      countingDown: false,
      width: 0,
      height: 0,
      confettiRunning: false,
      playerPosition: 0,
    };
    this.update = this.update.bind(this);
    this.readyPlayer = this.readyPlayer.bind(this);
    this.startGame = this.startGame.bind(this);
    this.updateWindowDimensions = this.updateWindowDimensions.bind(this);
  }

  componentDidMount() {
    this.updateWindowDimensions();
    window.addEventListener("resize", this.updateWindowDimensions);
    onConnect((id) => this.setState({ id }));
    socket.open();

    this.setState({ id: socket.id });
    pullScore((scores) => {
      let ids = Object.keys(scores);
      if (ids.length === 2) {
        for (let id of ids) {
          if (id !== this.state.id) {
            this.setState({ opponentId: id });
          }
        }
      } else {
        this.setState({ opponentId: "" });
      }
      this.setState({ scores });
    });
    pullName((names) => this.setState({ names }));
    pullReady((playersReady) => this.setState({ playersReady }));
    pullStart((endTime) =>
      this.setState({
        gameTimeEnd: endTime,
        gameStarted: true,
        gameEnded: false,
      })
    );
  }

  reset() {
    // pushScore(0);
    // pushReady(false);
    // let scores = this.state.scores;
    // scores[this.state.id] = 0;
    // let playersReady = this.state.playersReady;
    // playersReady[this.state.id] = false;
    // this.setState({
    //   counter: INITIAL_COUNTER,
    //   ready: false,
    //   scores: scores,
    //   playersReady: playersReady,
    // });
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.updateWindowDimensions);
  }

  updateWindowDimensions() {
    this.setState({ width: window.innerWidth, height: window.innerHeight });
  }

  // handles setting gameEnded, gameStarted, and countingDown states based on current time
  componentDidUpdate() {
    if (this.state.gameStarted === true) {
      if (this.state.gameTimeEnd - Date.now() < 0) {
        this.setState(
          { gameEnded: true, gameStarted: false },
          this.startConfetti()
        );
      } else if (
        this.state.gameTimeEnd - Date.now() >= gameLength &&
        this.state.countingDown === false
      ) {
        this.setState({ countingDown: true });
      } else if (
        this.state.gameTimeEnd - Date.now() <= gameLength &&
        this.state.countingDown === true
      ) {
        this.setState({ countingDown: false });
      }
    }
  }

  startConfetti() {
    if (
      this.state.scores[this.state.id] >
      this.state.scores[this.state.opponentId]
    ) {
      startWidth = 0;
      canvasWidth = this.state.width;
      this.setState({ confettiRunning: true }, this.reset());
    } else if (
      this.state.scores[this.state.id] <
      this.state.scores[this.state.opponentId]
    ) {
      startWidth = this.state.width / 2;
      canvasWidth = this.state.width;
      this.setState({ confettiRunning: true }, this.reset());
    } else if (
      this.state.scores[this.state.id] ===
      this.state.scores[this.state.opponentId]
    ) {
      startWidth = 0;
      canvasWidth = this.state.width * 2;
      this.setState({ confettiRunning: true }, this.reset());
    }
  }

  // runs when onResult is called in the Camera object
  update(nextState) {
    if (this.state.gameStarted && this.state.countingDown === false) {
      const nextCounter = step(this.state.counter, nextState);
      if (nextCounter.count !== this.state.counter.count) {
        pushScore(nextCounter.count);
      }
      this.setState({ counter: nextCounter, playerPosition: nextState });
    } else {
      this.setState({});
    }
  }

  readyPlayer() {
    this.setState({ ready: !this.state.ready }, () => {
      console.log(this.state.ready ? "ready" : "unready");
      pushReady(this.state.ready);
    });
  }

  //sends ping to start game to server
  startGame() {
    let endDate = Date.now() + gameLength + 5000;
    pushStart(endDate);
  }

  render() {
    let confetti = this.state.confettiRunning ? (
      <Confetti
        width={this.state.width}
        height={this.state.height}
        confettiSource={{
          x: startWidth,
          y: 0,
          w: canvasWidth / 2,
          h: this.state.height,
        }}
        recycle={false}
        numberOfPieces={600}
        tweenDuration={20000}
      />
    ) : null;

    let logo =
      this.state.playerPosition === 2 && this.state.playerPosition != 4 ? (
        <img
          src={man}
          className="w-20 mx-auto mt-20 align-baseline"
          style={{ filter: "drop-shadow(0 0 5px #808080)" }}
        ></img>
      ) : (
        <img
          src={pushdownman}
          className="w-20 mx-auto mt-20 align-baseline"
          style={{ filter: "drop-shadow(0 0 5px #808080)" }}
        ></img>
      );
    return (
      <div className="mx-96">
        {confetti}
        <div
          className="flex align-baseline mt-20 mb-5"
          style={{ height: "50px", alignItems: "flex-end" }}
        >
          {logo}
        </div>
        <h1 className="text-6xl font-light pb-1">Pushup Battle</h1>
        <h2 className="mt-2 text-xl">Room Code: {this.props.session.roomID}</h2>
        {/* 
        <input
          placeholder="Your Name"
          type="text"
          value={this.state.name}
          onChange={(event) => {
            const name = event.target.value;
            pushName(name);
            this.setState({ name });
          }}
        /> 
        */}

        {/* game timer */}
        <div style={{ height: "3rem" }}>
          {this.state.gameTimeEnd - Date.now() > 0 &&
          this.state.gameTimeEnd - Date.now() < gameLength ? (
            <React.Fragment>
              <p>Time Left:</p>
              <h1 className="text-5xl">
                {(this.state.gameTimeEnd - Date.now()) / 1000}
              </h1>
            </React.Fragment>
          ) : null}
          {/* counting down */}
          <h1 className="text-6xl">
            {this.state.gameTimeEnd - Date.now() > gameLength &&
            Math.ceil((this.state.gameTimeEnd - Date.now()) / 1000) <=
              gameLength / 1000 + 5
              ? Math.ceil((this.state.gameTimeEnd - Date.now()) / 1000) -
                gameLength / 1000
              : null}
          </h1>
        </div>

        <Cam onResult={this.update}></Cam>

        <OTSession
          apiKey={this.props.session.apiKey}
          sessionId={this.props.session.sessionID}
          token={this.props.session.token}
        >
          <div className="grid grid-cols-2 mt-16 gap-x-8 gap-y-8">
            <OTPublisher className="col-span-1 rounded-lg overflow-hidden shadow-lg" />
            <OTStreams>
              <OTSubscriber className="col-span-1 rounded-lg overflow-hidden shadow-lg" />
            </OTStreams>
          </div>
        </OTSession>

        <div className="grid grid-cols-2 mt-16 gap-x-8 gap-y-8">
          <div className="col-span-1 rounded overflow-hidden">
            {this.state.gameStarted || this.state.gameEnded ? (
              <span className={scoreToSize(this.state.counter.count)}>
                {this.state.counter.count}
              </span>
            ) : (
              <button
                onClick={this.readyPlayer}
                type="button"
                className={`px-4 py-2 text-white text-xl font-semibold rounded-lg shadow-lg focus:outline-none
                  ${
                    this.state.ready
                      ? "bg-green-500 hover:bg-green-600 active:bg-green-700"
                      : "bg-red-500 hover:bg-red-600 active:bg-red-700"
                  }
                `}
              >
                Ready
              </button>
            )}
          </div>
          <div className="col-span-1 rounded overflow-hidden">
            {this.state.opponentId ? (
              this.state.gameStarted || this.state.gameEnded ? (
                <span
                  className={scoreToSize(
                    this.state.scores[this.state.opponentId]
                  )}
                >
                  {this.state.scores[this.state.opponentId]}
                </span>
              ) : (
                <button
                  type="button"
                  className={`px-4 py-2 text-white text-xl font-semibold rounded-lg shadow-lg focus:outline-none
                  ${
                    this.state.playersReady[this.state.opponentId]
                      ? "bg-green-500 hover:bg-green-600 active:bg-green-700"
                      : "bg-red-500 hover:bg-red-600 active:bg-red-700"
                  }
                `}
                >
                  Ready
                </button>
              )
            ) : null}
          </div>
        </div>
      </div>
    );
  }
}

export default preloadScript(Lobby);
