import { INITIAL_COUNTER, step } from "../util/fsm";
import Cam from "./Cam";
import React, { Component } from "react";
import man from "../assets/images/pushupman.png";
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
  pushReady
} from "../util/socket";

import { OTSession, OTPublisher, OTStreams, OTSubscriber, preloadScript } from 'opentok-react';
import './OT.css';

let gameLength = 10000;
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
    };
    this.update = this.update.bind(this);
    this.readyPlayer = this.readyPlayer.bind(this);
    this.startGame = this.startGame.bind(this);
  }

  componentDidMount() {
    onConnect((id) => this.setState({ id }));
    socket.open();

    this.setState({ id: socket.id });
    pullScore((scores) => {
      let ids = Object.keys(scores)
      if (ids.length === 2) {
        for (let id of ids) {
          console.log(id, this.state.id)
          if (id !== this.state.id) {
            this.setState({ opponentId: id});
          }
        }
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

  // handles setting gameEnded, gameStarted, and countingDown states based on current time
  componentDidUpdate() {
    if (this.state.gameStarted === true) {
      if (this.state.gameTimeEnd - Date.now() < 0) {
        this.setState({ gameEnded: true, gameStarted: false });
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

  // runs when onResult is called in the Camera object
  update(nextState) {
    if (this.state.gameStarted && this.state.countingDown === false) {
      const nextCounter = step(this.state.counter, nextState);
      if (nextCounter.count !== this.state.counter.count) {
        pushScore(nextCounter.count);
      }
      this.setState({ counter: nextCounter });
    } else {
      this.setState({});
    }
  }

  readyPlayer() {
    this.setState({ ready: !this.state.ready}, () => {
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
    let leaderboard = <div></div>;
    return (
      <div className="mx-96">
        <div>
          <img src={man} className="w-20 mx-auto mt-8"></img>
        </div>
        <h1 className="text-6xl">Pushup Battle</h1>
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
        <button onClick={this.readyPlayer} style={{backgroundColor: this.state.ready ? 'green' : 'red'}}>READY</button>
        {this.state.opponentId ? 
          <button style={{backgroundColor: this.state.playersReady[this.state.opponentId] ? 'green' : 'red'}}>READY</button> : null }

        {/* game timer */}
        <div>
          {this.state.gameTimeEnd - Date.now() > 0 &&
          this.state.gameTimeEnd - Date.now() < gameLength ? (
            <h1 className="text-xl">
              Timer: {(this.state.gameTimeEnd - Date.now()) / 1000}
            </h1>
          ) : null}
        </div>

        {/* counting down */}
        <h1 className="text-8xl">
          {this.state.gameTimeEnd - Date.now() > gameLength &&
          Math.ceil((this.state.gameTimeEnd - Date.now()) / 1000) <=
            gameLength / 1000 + 5
            ? Math.ceil((this.state.gameTimeEnd - Date.now()) / 1000) -
              gameLength / 1000
            : null}
        </h1>

        <Cam onResult={this.update}></Cam>
        

        <OTSession 
          apiKey={this.props.session.apiKey} 
          sessionId={this.props.session.sessionID} 
          token={this.props.session.token}>
          <div className="grid grid-cols-2 mt-16 gap-x-8 gap-y-8">
          <OTPublisher ß
            className="col-span-1 rounded overflow-hidden shadow-lg"/>
          <OTStreams>
            <OTSubscriber 
              className="col-span-1 rounded overflow-hidden shadow-lg"/>
          </OTStreams>
          </div>
        </OTSession>
        <div className="grid grid-cols-2 mt-16 gap-x-8 gap-y-8">
            <div className="col-span-1 rounded overflow-hidden">
              {this.state.counter.count}
            </div>
            <div className="col-span-1 rounded overflow-hidden">

            </div>
        </div>
      </div>
      
    );
  }
}

export default preloadScript(Lobby);
