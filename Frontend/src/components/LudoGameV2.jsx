import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/**
 * LudoGameV2 Component
 * Uses server-authoritative game engine for secure multiplayer
 */
const LudoGameV2 = ({ table, onBack, onGameEnd }) => {
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [playerInfo, setPlayerInfo] = useState(null);
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const gameInitializedRef = useRef(false);
  const scriptsLoadedRef = useRef(false);

  useEffect(() => {
    if (!table) return;

    if (gameInitializedRef.current) {
      console.log('Game already initialized, skipping...');
      return;
    }

    // Get user ID from token
    const token = localStorage.getItem('token');
    let userId = null;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.userId;
      } catch (e) {
        console.error('Failed to decode token:', e);
      }
    }

    if (!userId) {
      console.error('No user ID found, cannot initialize game');
      return;
    }

    // Load CSS
    if (!document.querySelector('link[href="/css/style.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/css/style.css';
      document.head.appendChild(link);
    }

    // Load Google Fonts
    if (!document.querySelector('link[href*="Fredoka+One"]')) {
      const fontLink = document.createElement('link');
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap';
      fontLink.rel = 'stylesheet';
      document.head.appendChild(fontLink);
    }

    // Initialize socket connection
    const gameSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    setSocket(gameSocket);

    gameSocket.on('connect', () => {
      console.log('Game socket connected:', gameSocket.id);
      setIsConnected(true);

      // Join table room
      if (table.id && userId) {
        gameSocket.emit('join_table', {
          tableId: table.id,
          userId: userId
        });
        console.log('Joined table room:', table.id);

        // If game already has a gameId, try to get state or join the game
        if (table.gameId) {
          gameSocket.emit('game_join', {
            gameId: table.gameId,
            odId: userId
          });
        }
      }
    });

    gameSocket.on('disconnect', () => {
      console.log('Game socket disconnected');
      setIsConnected(false);
    });

    // Listen for game initialization from server
    gameSocket.on('game_initialized', (data) => {
      console.log('Game initialized:', data);
      setGameState(data.gameState);
      setPlayerInfo({
        index: data.playerIndex,
        color: data.color,
        playerNo: data.playerNo,
        opponentName: data.opponentName
      });

      // Initialize the V2 game script with the initialization data
      initializeGameScript(gameSocket, table.id, userId, table.players, data);
    });

    // Listen for game state updates
    gameSocket.on('game_state_update', (data) => {
      console.log('Game state update:', data);
      setGameState(data.gameState);

      // If we receive a state update and haven't initialized yet, do it now
      if (!gameInitializedRef.current && data.gameState) {
        // Determine player index from the game state
        const myPlayer = data.gameState.players.find(p => p.odId === userId);
        if (myPlayer) {
          const opponentPlayer = data.gameState.players.find(p => p.odId !== userId);
          setPlayerInfo({
            index: myPlayer.index,
            color: myPlayer.index === 0 ? 'r' : 'y',
            playerNo: myPlayer.index === 0 ? 1 : 3,
            opponentName: opponentPlayer?.name || 'Opponent'
          });

          // Create init data object
          const initData = {
            gameId: data.gameId,
            playerIndex: myPlayer.index,
            color: myPlayer.index === 0 ? 'r' : 'y',
            playerNo: myPlayer.index === 0 ? 1 : 3,
            opponentName: opponentPlayer?.name || 'Opponent',
            gameState: data.gameState
          };

          // Initialize the game script with the data
          initializeGameScript(gameSocket, table.id, userId, table.players, initData);
        }
      }
    });

    // Listen for reconnection
    gameSocket.on('game_reconnected', (data) => {
      console.log('Reconnected to game:', data);
      setGameState(data.gameState);
      setPlayerInfo({
        index: data.playerIndex,
        color: data.playerIndex === 0 ? 'r' : 'y',
        playerNo: data.playerIndex === 0 ? 1 : 3
      });
    });

    // Listen for game over
    gameSocket.on('game_over', (data) => {
      console.log('Game over:', data);
      setGameState(data.gameState);

      if (onGameEnd) {
        onGameEnd({
          winner: data.winner,
          reason: data.reason,
          isWinner: data.winner.playerIndex === playerInfo?.index
        });
      }
    });

    // Function to initialize game script
    const initializeGameScript = (socket, tableId, odId, players, initData = null) => {
      // Load jQuery if needed
      const loadScripts = () => {
        if (window.jQuery && window.initializeGameV2) {
          console.log('Initializing V2 game with data:', initData);
          gameInitializedRef.current = true;

          // Hide home container
          window.$('#home-container').css('display', 'none');
          window.$('main').css('display', 'block');

          // Initialize pawns for 2-player game
          setupPawns();

          // Initialize the V2 game engine with initialization data
          window.initializeGameV2(socket, tableId, odId, players, initData);
        } else {
          setTimeout(loadScripts, 100);
        }
      };

      // Load jQuery
      if (!window.jQuery) {
        const jqueryScript = document.createElement('script');
        jqueryScript.src = 'https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js';
        jqueryScript.async = false;
        document.body.appendChild(jqueryScript);

        jqueryScript.onload = () => {
          // Load V2 game script
          if (!scriptsLoadedRef.current) {
            scriptsLoadedRef.current = true;
            const gameScript = document.createElement('script');
            gameScript.src = '/script/ludo-game-v2.js';
            document.body.appendChild(gameScript);
            gameScript.onload = loadScripts;
          }
        };
      } else if (!scriptsLoadedRef.current) {
        scriptsLoadedRef.current = true;
        const gameScript = document.createElement('script');
        gameScript.src = '/script/ludo-game-v2.js';
        document.body.appendChild(gameScript);
        gameScript.onload = loadScripts;
      } else {
        loadScripts();
      }
    };

    // Set up pawns for 2-player game
    const setupPawns = () => {
      // Clear existing pawns
      window.$('.r-pawn1, .r-pawn2, .r-pawn3, .r-pawn4').remove();
      window.$('.y-pawn1, .y-pawn2, .y-pawn3, .y-pawn4').remove();

      // Add red pawns to home
      for (let i = 1; i <= 4; i++) {
        window.$(`#in-r-${i}`).append(`<div class='r-pawn${i}'></div>`);
      }

      // Add yellow pawns to home
      for (let i = 1; i <= 4; i++) {
        window.$(`#in-y-${i}`).append(`<div class='y-pawn${i}'></div>`);
      }
    };

    // Start the initialization process
    if (gameSocket.connected) {
      // Socket already connected, wait for game_initialized event
    } else {
      gameSocket.once('connect', () => {
        // Connection established, server will send game_initialized
      });
    }

    // Cleanup
    return () => {
      gameSocket.off('connect');
      gameSocket.off('disconnect');
      gameSocket.off('game_initialized');
      gameSocket.off('game_state_update');
      gameSocket.off('game_reconnected');
      gameSocket.off('game_over');
    };
  }, [table]);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {/* Connection Status */}
      {!isConnected && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#f44336',
          color: 'white',
          padding: '10px',
          textAlign: 'center',
          zIndex: 10000
        }}>
          Disconnected. Reconnecting...
        </div>
      )}

      {/* Player Info */}
      {playerInfo && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '8px',
          zIndex: 9999,
          fontSize: '14px'
        }}>
          <div>You: {playerInfo.color === 'r' ? 'Red' : 'Yellow'}</div>
          <div>Opponent: {playerInfo.opponentName || 'Player'}</div>
          <div>Bet: ₹{table?.betAmount || table?.bet_amount}</div>
        </div>
      )}

      {/* Home Container - Hidden when game starts */}
      <div id="home-container" style={{ display: table ? 'none' : 'block' }}>
        <div id="home">
          <div id="game-logo">
            <div>
              <img src="/images/gameLogo.svg" alt="Play Ludo Online" />
            </div>
            <div>Play Ludo Online</div>
          </div>
          <div id="noOfplayerBox">
            <div id="twoPlayer" className="noOfPlayer selected">2P</div>
            <div id="threePlayer" className="noOfPlayer">3P</div>
            <div id="fourPlayer" className="noOfPlayer">4P</div>
          </div>
          <button id="startGame">Start</button>
        </div>
      </div>

      {/* Main Game Board */}
      <main>
        <div className="game-container">
          <div className="wrap-box">
            <div className="game-box">
              {/* Top Dice Container */}
              <div className="dice-container dice-container-top row">
                <div className="col1 col">
                  <div className="diceBox redDiceBox" id="redDice"></div>
                </div>
                <div className="col2 col">
                  <div className="settingsContiner">
                    <button id="sound" className="setting"></button>
                    <button id="forfeit" className="setting" style={{
                      backgroundImage: 'url(/images/restart.svg)',
                      backgroundSize: 'contain'
                    }} title="Forfeit"></button>
                  </div>
                </div>
                <div className="col3 col">
                  <div className="diceBox greenDiceBox" id="greenDice"></div>
                </div>
              </div>

              {/* Ludo Board */}
              <div className="ludo-board row">
                {/* Row 1 */}
                <div className="row row1">
                  <div id="wrap-in-area">
                    <div className="red-zone in-area col" id="rPlayer">
                      <div className="row row1">
                        <div className="col col1">
                          <div className="r-circle pawn-box" id="in-r-1"></div>
                        </div>
                        <div className="col col2">
                          <div className="r-circle pawn-box" id="in-r-2"></div>
                        </div>
                      </div>
                      <div className="row row2">
                        <div className="col col1">
                          <div className="r-circle pawn-box" id="in-r-3"></div>
                        </div>
                        <div className="col col2">
                          <div className="r-circle pawn-box" id="in-r-4"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="btw-g-r out-area col">
                    <div className="row">
                      <div className="col"><div id="out11"></div></div>
                      <div className="col"><div id="out12"></div></div>
                      <div className="col"><div id="out13"></div></div>
                    </div>
                    <div className="row">
                      <div className="col"><div id="out10"></div></div>
                      <div className="col"><div id="g-out-1"></div></div>
                      <div className="col"><div id="out14"></div></div>
                    </div>
                    <div className="row">
                      <div className="col"><div id="out9"></div></div>
                      <div className="col"><div id="g-out-2"></div></div>
                      <div className="col"><div id="out15"></div></div>
                    </div>
                    <div className="row">
                      <div className="col"><div id="out8"></div></div>
                      <div className="col"><div id="g-out-3"></div></div>
                      <div className="col"><div id="out16"></div></div>
                    </div>
                    <div className="row">
                      <div className="col"><div id="out7"></div></div>
                      <div className="col"><div id="g-out-4"></div></div>
                      <div className="col"><div id="out17"></div></div>
                    </div>
                    <div className="row">
                      <div className="col"><div id="out6"></div></div>
                      <div className="col"><div id="g-out-5"></div></div>
                      <div className="col"><div id="out18"></div></div>
                    </div>
                  </div>

                  <div id="wrap-in-area">
                    <div className="green-zone in-area col" id="gPlayer">
                      <div className="row row1">
                        <div className="col col1">
                          <div className="g-circle pawn-box" id="in-g-1"></div>
                        </div>
                        <div className="col col2">
                          <div className="g-circle pawn-box" id="in-g-2"></div>
                        </div>
                      </div>
                      <div className="row row2">
                        <div className="col col1">
                          <div className="g-circle pawn-box" id="in-g-3"></div>
                        </div>
                        <div className="col col2">
                          <div className="g-circle pawn-box" id="in-g-4"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 2 */}
                <div className="row row2">
                  <div className="btw-r-b out-area col col1">
                    <div className="row">
                      <div className="col"><div id="out52"></div></div>
                      <div className="col"><div id="out1"></div></div>
                      <div className="col"><div id="out2"></div></div>
                      <div className="col"><div id="out3"></div></div>
                      <div className="col"><div id="out4"></div></div>
                      <div className="col"><div id="out5"></div></div>
                    </div>
                    <div className="row">
                      <div className="col"><div id="out51"></div></div>
                      <div className="col"><div id="r-out-1"></div></div>
                      <div className="col"><div id="r-out-2"></div></div>
                      <div className="col"><div id="r-out-3"></div></div>
                      <div className="col"><div id="r-out-4"></div></div>
                      <div className="col"><div id="r-out-5"></div></div>
                    </div>
                    <div className="row">
                      <div className="col"><div id="out50"></div></div>
                      <div className="col"><div id="out49"></div></div>
                      <div className="col"><div id="out48"></div></div>
                      <div className="col"><div id="out47"></div></div>
                      <div className="col"><div id="out46"></div></div>
                      <div className="col"><div id="out45"></div></div>
                    </div>
                  </div>

                  <div className="win-area col col2">
                    <div className="win-box" id="win-box1">
                      <div className="win-pawn-box" id="g-win-pawn-box"></div>
                    </div>
                    <div className="win-box" id="win-box2">
                      <div className="win-pawn-box" id="y-win-pawn-box"></div>
                    </div>
                    <div className="win-box" id="win-box3">
                      <div className="win-pawn-box" id="b-win-pawn-box"></div>
                    </div>
                    <div className="win-box" id="win-box4">
                      <div className="win-pawn-box" id="r-win-pawn-box"></div>
                    </div>
                  </div>

                  <div className="btw-y-g out-area col col3">
                    <div className="row">
                      <div className="col"><div id="out19"></div></div>
                      <div className="col"><div id="out20"></div></div>
                      <div className="col"><div id="out21"></div></div>
                      <div className="col"><div id="out22"></div></div>
                      <div className="col"><div id="out23"></div></div>
                      <div className="col"><div id="out24"></div></div>
                    </div>
                    <div className="row">
                      <div className="col"><div id="y-out-5"></div></div>
                      <div className="col"><div id="y-out-4"></div></div>
                      <div className="col"><div id="y-out-3"></div></div>
                      <div className="col"><div id="y-out-2"></div></div>
                      <div className="col"><div id="y-out-1"></div></div>
                      <div className="col"><div id="out25"></div></div>
                    </div>
                    <div className="row">
                      <div className="col"><div id="out31"></div></div>
                      <div className="col"><div id="out30"></div></div>
                      <div className="col"><div id="out29"></div></div>
                      <div className="col"><div id="out28"></div></div>
                      <div className="col"><div id="out27"></div></div>
                      <div className="col"><div id="out26"></div></div>
                    </div>
                  </div>
                </div>

                {/* Row 3 */}
                <div className="row row3">
                  <div id="wrap-in-area">
                    <div className="blue-zone in-area col" id="bPlayer">
                      <div className="row row1">
                        <div className="col col1">
                          <div className="b-circle pawn-box" id="in-b-1"></div>
                        </div>
                        <div className="col col2">
                          <div className="b-circle pawn-box" id="in-b-2"></div>
                        </div>
                      </div>
                      <div className="row row2">
                        <div className="col col1">
                          <div className="b-circle pawn-box" id="in-b-3"></div>
                        </div>
                        <div className="col col2">
                          <div className="b-circle pawn-box" id="in-b-4"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="btw-b-y out-area col">
                    <div className="row">
                      <div className="col"><div id="out44"></div></div>
                      <div className="col"><div id="b-out-5"></div></div>
                      <div className="col"><div id="out32"></div></div>
                    </div>
                    <div className="row">
                      <div className="col"><div id="out43"></div></div>
                      <div className="col"><div id="b-out-4"></div></div>
                      <div className="col"><div id="out33"></div></div>
                    </div>
                    <div className="row">
                      <div className="col"><div id="out42"></div></div>
                      <div className="col"><div id="b-out-3"></div></div>
                      <div className="col"><div id="out34"></div></div>
                    </div>
                    <div className="row">
                      <div className="col"><div id="out41"></div></div>
                      <div className="col"><div id="b-out-2"></div></div>
                      <div className="col"><div id="out35"></div></div>
                    </div>
                    <div className="row">
                      <div className="col"><div id="out40"></div></div>
                      <div className="col"><div id="b-out-1"></div></div>
                      <div className="col"><div id="out36"></div></div>
                    </div>
                    <div className="row">
                      <div className="col"><div id="out39"></div></div>
                      <div className="col"><div id="out38"></div></div>
                      <div className="col"><div id="out37"></div></div>
                    </div>
                  </div>

                  <div id="wrap-in-area">
                    <div className="yellow-zone in-area col" id="yPlayer">
                      <div className="row row1">
                        <div className="col col1">
                          <div className="y-circle pawn-box" id="in-y-1"></div>
                        </div>
                        <div className="col col2">
                          <div className="y-circle pawn-box" id="in-y-2"></div>
                        </div>
                      </div>
                      <div className="row row2">
                        <div className="col col1">
                          <div className="y-circle pawn-box" id="in-y-3"></div>
                        </div>
                        <div className="col col2">
                          <div className="y-circle pawn-box" id="in-y-4"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Dice Container */}
              <div className="dice-container dice-container-bottom row">
                <div className="col1 col">
                  <div className="diceBox blueDiceBox" id="blueDice"></div>
                </div>
                <div className="col2 col">
                  <div className="settingsContiner">
                    <button id="fullscreen" className="setting"></button>
                    <button id="exitfullscreen" className="setting"></button>
                  </div>
                </div>
                <div className="col3 col">
                  <div className="diceBox yellowDiceBox" id="yellowDice"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Alert Box */}
      <div id="alertBox">
        <p id="alertHeading">Forfeit Game?</p>
        <p style={{ fontSize: '14px', color: '#666' }}>You will lose the bet amount.</p>
        <button id="cancel" className="alertBtn">Cancel</button>
        <button id="ok" className="alertBtn">Forfeit</button>
      </div>

      {/* Preload Images */}
      <div id="preload" style={{ display: 'none' }}>
        <img src="/images/dice_roll.png" alt="" />
        <img src="/images/dice.png" alt="" />
        <img src="/images/pawns.png" alt="" />
        <img src="/images/star2.png" alt="" />
        <img src="/images/start_dice_roll2.png" alt="" />
        <img src="/images/sound-on.svg" alt="" />
        <img src="/images/sound-off.svg" alt="" />
        <img src="/images/restart.svg" alt="" />
        <img src="/images/fullscreen.svg" alt="" />
        <img src="/images/win1.png" alt="" />
        <img src="/images/win2.png" alt="" />
        <img src="/images/win3.png" alt="" />
        <img src="/images/wood-Board.jpg" alt="" />
      </div>
    </div>
  );
};

export default LudoGameV2;
