import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

const LudoGame = ({ table, onBack, onGameEnd }) => {
  const [socket, setSocket] = useState(null);
  const gameInitializedRef = useRef(false);
  const scriptsLoadedRef = useRef(false);

  useEffect(() => {
    if (!table) return; // Don't initialize if no table
    
    // Prevent multiple initializations
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

    // Load CSS (only if not already loaded)
    if (!document.querySelector('link[href="/css/style.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/css/style.css';
      document.head.appendChild(link);
    }

    // Load Google Fonts (only if not already loaded)
    if (!document.querySelector('link[href*="Fredoka+One"]')) {
      const fontLink = document.createElement('link');
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap';
      fontLink.rel = 'stylesheet';
      document.head.appendChild(fontLink);
    }

    // Initialize socket connection for multiplayer
    const gameSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    setSocket(gameSocket);

    // Wait for socket to connect before proceeding
    gameSocket.on('connect', () => {
      console.log('Game socket connected:', gameSocket.id);
      
      // Join table room immediately after connection
      if (table.id && userId) {
        gameSocket.emit('join_table', {
          tableId: table.id,
          userId: userId
        });
        console.log('Joined table room:', table.id);
      }
    });

    // Handle reconnection to active table
    gameSocket.on('table_joined', ({ table: tableData, userId: joinedUserId }) => {
      console.log('Rejoined active table:', tableData);
      // If game is already initialized, don't re-initialize
      // Just ensure socket handlers are set up
      if (gameInitializedRef.current && window.initializeSocket && tableData.id) {
        console.log('Game already initialized, re-initializing socket handlers only');
        window.initializeSocket(gameSocket, tableData.id);
      }
    });

    // Function to initialize game with table settings
    const initializeGame = () => {
      if (!table || gameInitializedRef.current) {
        console.log('Skipping game initialization - already initialized or no table');
        return;
      }
      
      // Ensure socket is connected
      if (!gameSocket.connected) {
        console.log('Socket not connected yet, waiting...');
        gameSocket.once('connect', () => {
          setTimeout(() => initializeGame(), 500);
        });
        return;
      }
      
      // Wait for the script to fully load and variables to be available
      const tryInitialize = (attempts = 0) => {
        console.log(`Attempting to initialize game, attempt ${attempts + 1}`);
        
        if (window.jQuery && window.$ && window.$('#twoPlayer').length > 0 && window.initializePlayerAssignment && window.initializeSocket) {
          console.log('Game scripts ready, initializing...');
          
          // Mark as initialized to prevent duplicate initialization
          gameInitializedRef.current = true;
          
          // Clear any existing pawns first to prevent duplicates
          window.$('.r-pawn1, .r-pawn2, .r-pawn3, .r-pawn4, .g-pawn1, .g-pawn2, .g-pawn3, .g-pawn4, .b-pawn1, .b-pawn2, .b-pawn3, .b-pawn4, .y-pawn1, .y-pawn2, .y-pawn3, .y-pawn4').remove();
          
          // Hide home container
          window.$('#home-container').css('display', 'none');
          
          // Set number of players to 2 for default tables
          // First trigger click on twoPlayer to set the variable in the script
          window.$('.selected').removeClass('selected');
          window.$('#twoPlayer').addClass('selected');
          
          // Trigger click and wait for it to process
          window.$('#twoPlayer').trigger('click');
          
          // Verify noOfPlayer is set correctly (check window.noOfPlayer if exposed, or wait)
          // Wait for the click to register and set noOfPlayer = 2
          setTimeout(() => {
            // Initialize player assignment for multiplayer BEFORE starting game
            if (table.players && userId && window.initializePlayerAssignment) {
              console.log('Initializing player assignment:', userId, table.players);
              window.initializePlayerAssignment(userId, table.players);
            }
            
            // Initialize socket for multiplayer AFTER player assignment
            if (table.id && gameSocket && window.initializeSocket) {
              console.log('Initializing socket for table:', table.id);
              // Initialize socket handlers
              window.initializeSocket(gameSocket, table.id);
            }
            
            // Check if game is already started (main is visible or pawns exist)
            const mainVisible = window.$('main').css('display') === 'block';
            const pawnsExist = window.$('.r-pawn1, .y-pawn1').length > 0;
            
            if (mainVisible || pawnsExist) {
              console.log('Game already started, skipping start...');
              return;
            }
            
            // Start the game automatically by clicking start button
            // This ensures noOfPlayer is already set from the click above
            setTimeout(() => {
              console.log('Starting game...');
              if (window.$('#startGame').length > 0) {
                // Hide home container and trigger start
                window.$('#home-container').css('display', 'none');
                window.$('#startGame').trigger('click');
                console.log('Game start triggered');
              } else {
                console.error('Start game button not found!');
              }
            }, 300);
          }, 200);
        } else if (attempts < 20) {
          // Retry if scripts aren't ready yet (increased attempts)
          setTimeout(() => tryInitialize(attempts + 1), 200);
        } else {
          console.error('Failed to initialize game after 20 attempts');
        }
      };
      
      setTimeout(() => tryInitialize(), 300);
    };

    // Load jQuery if not already loaded
    if (!window.jQuery) {
      console.log('Loading jQuery...');
      const jqueryScript = document.createElement('script');
      jqueryScript.src = 'https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js';
      jqueryScript.async = false; // Load synchronously to ensure order
      document.body.appendChild(jqueryScript);

      jqueryScript.onload = () => {
        console.log('jQuery loaded');
        // Load ludo-game.js after jQuery is loaded
        if (!scriptsLoadedRef.current) {
          scriptsLoadedRef.current = true;
          const gameScript = document.createElement('script');
          gameScript.src = '/script/ludo-game.js';
          document.body.appendChild(gameScript);
          
          // Initialize game after script loads
          gameScript.onload = () => {
            console.log('Ludo game script loaded');
            // Wait for socket connection before initializing
            if (gameSocket.connected) {
              initializeGame();
            } else {
              gameSocket.once('connect', () => {
                setTimeout(() => initializeGame(), 500);
              });
            }
          };
        }
      };
    } else {
      console.log('jQuery already loaded');
      // Check if game script is already loaded
      const existingScript = document.querySelector('script[src="/script/ludo-game.js"]');
      if (existingScript && scriptsLoadedRef.current) {
        // Script already loaded, initialize immediately
        console.log('Game script already loaded, initializing...');
        if (gameSocket.connected) {
          initializeGame();
        } else {
          gameSocket.once('connect', () => {
            setTimeout(() => initializeGame(), 500);
          });
        }
      } else {
        // jQuery already loaded, just load the game script
        if (!scriptsLoadedRef.current) {
          scriptsLoadedRef.current = true;
          const gameScript = document.createElement('script');
          gameScript.src = '/script/ludo-game.js';
          document.body.appendChild(gameScript);
          
          // Initialize game after script loads
          gameScript.onload = () => {
            console.log('Ludo game script loaded');
            if (gameSocket.connected) {
              initializeGame();
            } else {
              gameSocket.once('connect', () => {
                setTimeout(() => initializeGame(), 500);
              });
            }
          };
        }
      }
    }

    // Handle socket disconnection
    gameSocket.on('disconnect', () => {
      console.log('Game socket disconnected');
    });

    // Handle socket reconnection
    gameSocket.on('reconnect', (attemptNumber) => {
      console.log(`Game socket reconnected after ${attemptNumber} attempts`);
      // Rejoin table room after reconnection
      if (table.id && userId) {
        gameSocket.emit('join_table', {
          tableId: table.id,
          userId: userId
        });
        console.log('Rejoined table room after reconnection:', table.id);
      }
    });

    // Cleanup function
    return () => {
      console.log('Cleaning up LudoGame component');
      // Remove event listeners to prevent memory leaks
      gameSocket.off('connect');
      gameSocket.off('disconnect');
      gameSocket.off('reconnect');
      gameSocket.off('table_joined');
      // Don't disconnect socket - let it handle reconnection automatically
      // Only disconnect if component is truly unmounting
      // Reset refs only if we're completely cleaning up
      // gameInitializedRef.current = false;
      // scriptsLoadedRef.current = false;
    };
  }, [table]); // Re-run if table changes

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {/* Home Container - Hidden if table is provided */}
      <div id="home-container" style={{ display: table ? 'none' : 'block' }}>
        <div id="home">
          <div id="game-logo">
            <div>
              <img src="/images/gameLogo.svg" alt="Play Ludo Online" />
            </div>
            <div>Play Ludo Online</div>
          </div>
          <div id="noOfplayerBox">
            <div id="twoPlayer" className="noOfPlayer">2P</div>
            <div id="threePlayer" className="noOfPlayer">3P</div>
            <div id="fourPlayer" className="noOfPlayer selected">4P</div>
          </div>
          <button id="startGame">Start</button>
        </div>
        <div id="owner">
          Made By <a href="https://github.com/vishalmishra090">Vishal Mishra</a>
        </div>
      </div>

      {/* Main Game */}
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
                    <button id="restart" className="setting"></button>
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
        <p id="alertHeading">Restart The Game</p>
        <button id="cancel" className="alertBtn">Cancel</button>
        <button id="ok" className="alertBtn">Ok</button>
      </div>

      {/* Preload Images */}
      <div id="preload">
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

export default LudoGame;
