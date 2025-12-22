let playerNo = 0; // (red = 1, green = 2, yellow = 3, blue = 4)
let playerName = null; // store defult playerName
let diceBoxId = null; // store id value of dice box
let preDiceBoxId = null; // store id value of previou diceBoxId
let rndmNo = null; // generate rndmNo after dice is roll
let countSix = 0;
let cut = false;
let pass = false;
let flag = false;
let noOfPlayer = 4; // by default 4 player
let winningOrder = [];
let sound = true; // by default sound is on

// Multiplayer turn management
let currentPlayerColor = null; // 'r' for red, 'y' for yellow (2-player game)
let currentPlayerNo = null; // 1 for red, 3 for yellow (2-player game)
let isMyTurn = false; // Whether it's the current player's turn
let gameSocket = null; // Socket connection for multiplayer
let tableId = null; // Table ID for socket room

//      ALL Audio Variables

let rollAudio = new Audio("/music/diceRollingSound.mp3");
let openAudio = new Audio("/music/open-sound.wav");
let jumpAudio = new Audio("/music/jump-sound.mp3");
let cutAudio = new Audio("/music/cut-sound.wav");
let passAudio = new Audio("/music/pass-sound.mp3");
let winAudio = new Audio("/music/win-sound.mp3");

// function playSound(){
//   openAudio.play();
// }

/* ************      Varialbe Diclartion End *************** */

/* ************    Object Diclartion Start  *************** */

function Position(length) {
  for (let i = 1; i <= length; i++) {
    this[i] = [];
  }
}

function Player(startPoint, endPoint) {
  this.inArea = [];
  this.outArea = [];
  this.privateArea = [];
  this.winArea = [];
  this.startPoint = startPoint;
  this.endPoint = endPoint;
  this.privateAreaPos = new Position(5);
}

let players = {
  rPlayer: new Player("out1", "out51"),
  gPlayer: new Player("out14", "out12"),
  yPlayer: new Player("out27", "out25"),
  bPlayer: new Player("out40", "out38"),
};

let outAreaPos = new Position(52); //Create Array for indiviual Posititon

/* ************      Fuction Diclartion Start *************** */

/* Switch Function */

function switchDiceBoxId() {
  // switch the value of diceBoxId variable
  (playerNo == 1 && (diceBoxId = "#redDice")) ||
    (playerNo == 2 && (diceBoxId = "#greenDice")) ||
    (playerNo == 3 && (diceBoxId = "#yellowDice")) ||
    (playerNo == 4 && (diceBoxId = "#blueDice"));
}

function switchPlayerName() {
  // switch the value of playerName variable
  (playerNo == 1 && (playerName = "rPlayer")) ||
    (playerNo == 2 && (playerName = "gPlayer")) ||
    (playerNo == 3 && (playerName = "yPlayer")) ||
    (playerNo == 4 && (playerName = "bPlayer"));
}

/* Get Function */

function getNoFromValue(value) {
  return +value.match(/\d+/);
}

function getColorFromValue(value) {
  return value.charAt(0);
}

function getRotateValue(color) {
  let rotate = null;
  (color == "g" && (rotate = "-45deg")) ||
    (color == "y" && (rotate = "-135deg")) ||
    (color == "b" && (rotate = "-225deg")) ||
    (color == "r" && (rotate = "-315deg"));

  return rotate;
}

function getUpdatedWHoutAreaPos(noInId) {
  let posLength = outAreaPos[noInId].length;
  let wh = [];
  if (posLength > 0) {
    wh[0] = 100 / posLength;
    wh[1] = 100 / posLength;
    for (const cValue of outAreaPos[noInId]) {
      $("." + cValue).css({
        width: wh[0] + "%",
        height: wh[1] + "%",
        display: "inline-block",
      });
    }
  }

  return wh;
}

function getUpdatedWHprivateAreaPos(noInId) {
  let wh = [];
  let privateAreaLength = players[playerName].privateAreaPos[noInId].length;

  if (privateAreaLength > 0) {
    wh[0] = 100 / players[playerName].privateAreaPos[noInId].length;
    wh[1] = 100 / players[playerName].privateAreaPos[noInId].length;
    for (const cValue of players[playerName].privateAreaPos[noInId]) {
      $("." + cValue).css({
        width: wh[0] + "%",
        height: wh[1] + "%",
        display: "inline-block",
      });
    }
  }
  return wh;
}

function reUpdateOutAreaWH(...classArr) {
  for (const classV of classArr) {
    let theId = $("." + classV)
      .parent()
      .attr("id");
    let noInId = getNoFromValue(theId);
    getUpdatedWHoutAreaPos(noInId);
  }
}
function reUpdatePrivateAreaWH(...classArr) {
  for (const classV of classArr) {
    let theId = $("." + classV)
      .parent()
      .attr("id");
    let noInId = getNoFromValue(theId);
    getUpdatedWHprivateAreaPos(noInId);
  }
}

/* Check Function  */

function check52(id) {
  if (getNoFromValue(id) == 52) return true;

  return false;
}

function checkOutAreaEnd(id) {
  if (getNoFromValue(id) == getNoFromValue(players[playerName].endPoint)) {
    return true;
  }
  return false;
}

function checkprivateAreaEnd(id) {
  if (getNoFromValue(id) == 5) {
    return true;
  }

  return false;
}

/* Add and Remove funtion */

function removeAllGlow(...area) {
  for (const areaValue of area) {
    for (const classValue of players[playerName][areaValue]) {
      $("." + classValue).removeClass("glow");
    }
  }
}

function removeAllEvent(...area) {
  for (const areaValue of area) {
    for (const classValue of players[playerName][areaValue]) {
      $("." + classValue).off();
    }
  }
}

function addToArea(addValue, pName, areaName) {
  players[pName][areaName].push(addValue);
}

function removeFromArea(removeValue, pName, areaName) {
  let newArr = [];
  for (const classValue of players[pName][areaName]) {
    if (classValue != removeValue) {
      newArr.push(classValue);
    }
  }
  players[pName][areaName] = newArr;
}

function removeFromPrivateAreaPos(posValue, classValue, pName) {
  let newPrivateAreaPosArr = [];
  for (const cValue of players[pName].privateAreaPos[posValue]) {
    if (cValue != classValue) {
      newPrivateAreaPosArr.push(cValue);
    }
  }
  players[pName].privateAreaPos[posValue] = newPrivateAreaPosArr;
}

function addToPrivateAreaPos(posValue, classValue, pName) {
  players[pName].privateAreaPos[posValue].push(classValue);
}

function addToOutAreaPos(posValue, classValue) {
  outAreaPos[posValue].push(classValue);
}

function removeFromOutAreaPos(posValue, classValue) {
  let newPosArr = [];
  for (const cValue of outAreaPos[posValue]) {
    if (cValue != classValue) {
      newPosArr.push(cValue);
    }
  }
  outAreaPos[posValue] = newPosArr;
}

/* Main Funtion */

function nextPlayer() {
  if (winningOrder.length == noOfPlayer - 1) {
    setTimeout(function () {
      restartGame();
    }, 1000);
    return;
  }
  
  // Store flags before checking (they will be reset)
  const hadCut = cut;
  const hadPass = pass;
  // Check if player rolled 6 - only check rndmNo, not countSix (countSix is for tracking consecutive sixes)
  const rolledSix = (rndmNo == 5);
  const threeSixes = (countSix == 3);
  
  // Reset flags
  if (cut == true || pass == true) {
    countSix = 0;
    preDiceBoxId = null;
    pass = false;
    cut = false;
  }
  
  // Determine if player should get another turn
  // Player gets another turn ONLY if:
  // 1. They rolled 6 (rndmNo == 5) AND not 3 sixes in a row
  // 2. They cut an opponent's token (cut was true)
  // 3. One of their tokens completed the path (pass was true)
  const playerGetsAnotherTurn = (rolledSix && !threeSixes) || hadCut || hadPass;
  
  // Move to next player only if player doesn't get another turn
  if (!playerGetsAnotherTurn || threeSixes) {
    // Normal turn - move to next player
    if (playerNo == 4) playerNo = 0;
    playerNo++;
    countSix = 0; // Reset consecutive sixes counter
    preDiceBoxId = null;
    rndmNo = null; // Reset dice value
  } else {
    // Player gets another turn - reset flags but keep the same player
    if (hadCut || hadPass) {
      countSix = 0;
      preDiceBoxId = null;
      rndmNo = null;
    } else if (rolledSix && !threeSixes) {
      // Player rolled 6 - reset rndmNo for next roll, but keep countSix for tracking
      rndmNo = null;
      // countSix stays > 0 to track consecutive sixes
    }
  }

  if (diceBoxId != null) $(diceBoxId).removeClass("showDice");
  switchDiceBoxId();
  switchPlayerName();
  
  // Check if it's the current player's turn (multiplayer mode)
  isMyTurn = (currentPlayerNo !== null && playerNo === currentPlayerNo);
  
  // Emit turn change to other players via socket
  if (gameSocket && tableId) {
    gameSocket.emit('game_turn_change', {
      tableId: tableId,
      playerNo: playerNo,
      playerName: playerName
    });
  }
  
  // Animate player's ludo box based on turn
  animatePlayerTurn(playerNo, isMyTurn);
  
  // Show "Your turn" message if it's the current player's turn
  if (isMyTurn && currentPlayerNo !== null) {
    showTurnMessage("Your Turn!");
  }
  
  console.log(`Turn: Player ${playerNo} (${playerName}), GetsAnotherTurn: ${playerGetsAnotherTurn}, RolledSix: ${rolledSix}, HadCut: ${hadCut}, HadPass: ${hadPass}`);
  
  if (
    players[playerName].winArea.length == 4 ||
    (players[playerName].inArea.length == 0 &&
      players[playerName].outArea.length == 0 &&
      players[playerName].privateArea.length == 0)
  ) {
    if (rndmNo == 5) {
      rndmNo = null;
    }
    nextPlayer();
  } else if (
    players[playerName].inArea.length == 0 &&
    players[playerName].winArea.length == 0 &&
    players[playerName].outArea.length == 0 &&
    players[playerName].privateArea.length == 0
  ) {
    if (rndmNo == 5) {
      rndmNo = null;
    }
    nextPlayer();
  } else {
    // Only enable dice if it's the current player's turn
    if (isMyTurn || currentPlayerNo === null) {
      $(diceBoxId).addClass("startDiceRoll");
      $(diceBoxId).css("cursor", "pointer");
      $(diceBoxId).off("click"); // Remove any existing handlers
      $(diceBoxId).one("click", function () {
        if (isMyTurn || currentPlayerNo === null) {
          rollDice(diceBoxId);
        } else {
          alert("It's not your turn! Please wait for your turn.");
          $(diceBoxId).removeClass("startDiceRoll");
        }
      });
    } else {
      // Disable dice for other players - remove click handler and visual indicator
      $(diceBoxId).removeClass("startDiceRoll");
      $(diceBoxId).off("click");
      $(diceBoxId).css("cursor", "not-allowed");
    }
  }
}

function rollDice(idValue) {
  // Check if it's the player's turn (multiplayer mode)
  if (currentPlayerNo !== null && !isMyTurn) {
    alert("It's not your turn! Please wait for your turn.");
    $(idValue).removeClass("startDiceRoll");
    return;
  }
  
  // Disable dice immediately after clicking to prevent multiple clicks
  $(idValue).off("click");
  $(idValue).removeClass("startDiceRoll").addClass("rollDice");
  
  // Emit dice roll to other players via socket
  if (gameSocket && tableId) {
    console.log(`[BROADCAST] Dice roll: Player ${playerNo} is rolling`);
    gameSocket.emit('game_dice_roll', {
      tableId: tableId,
      playerNo: playerNo
    });
  }
  
  let pX = 0;
  let pY = 0;
  
  if (sound == true) {
    rollAudio.play();
    rollAudio.playbackRate = 3.2;
  }

  let timerId = setInterval(() => {
    (pX == 100 && ((pX = 0), (pY = pY + 25))) || (pX = pX + 20);
    $(idValue).css({
      "background-position-x": pX + "%",
      "background-position-y": pY + "%",
    });

    if (pY == 100 && pX == 100) {
      clearInterval(timerId);
      showDice(idValue);
      if (rndmNo == 5 && countSix != 3) {
        // Player rolled 6 - they get another turn after opening/moving
        console.log(`Player ${playerName} rolled 6! outArea.length=${players[playerName].outArea.length}, inArea.length=${players[playerName].inArea.length}`);
        
        if (players[playerName].outArea.length == 0 && players[playerName].inArea.length > 0) {
          // Auto-open a pawn if no pawns on board (proper ludo rule)
          // After opening, player gets another turn but must roll dice again
          console.log(`Auto-opening pawn for ${playerName} - no pawns on board`);
          openPawn();  // autoOpen - will open pawn and give another turn (player must roll again)
        } else if (players[playerName].outArea.length > 0) {
          // Has pawns on board - allow moving or opening
          console.log(`Player ${playerName} has pawns on board - allowing move or open`);
          openPawn(); // manuallyOpen - allows player to choose to open or move
          movePawnOnOutArea();
          updatePlayer();
        } else {
          // No pawns in home and no pawns on board - just give another turn
          // rndmNo is still 5, so nextPlayer() will detect it
          console.log(`Player ${playerName} has no pawns to open or move - giving another turn`);
          setTimeout(() => {
            nextPlayer();
          }, 500);
        }
        
      } else if (rndmNo < 5) {
        // Rolled 1-5 - move pawns and check if turn should pass
        movePawnOnOutArea();
        movePawnOnPrivateArea();
        updatePlayer();
      } else {
        // Three sixes in a row - turn passes
        setTimeout(function () {
          nextPlayer();
        }, 500);
      }
    }
  }, 20);
}

function showDice(idValue) {
  let pX = null;
  let pY = null;
  const pXpYarr = [
    [0, 0],
    [100, 0],
    [0, 50],
    [100, 50],
    [0, 100],
    [100, 100],
  ];
  rndmNo = Math.floor(Math.random() * 6);

  if ((preDiceBoxId == null || preDiceBoxId == idValue) && rndmNo == 5) {
    countSix++;
  } else if (rndmNo != 5) {
    // Reset countSix if not a 6 (consecutive sixes broken)
    // Only reset if it's a new roll (same dice box or first roll)
    if (preDiceBoxId == null || preDiceBoxId == idValue) {
      countSix = 0;
    }
  }

  pX = pXpYarr[rndmNo][0];
  pY = pXpYarr[rndmNo][1];
  $(idValue).removeClass("rollDice");
  $(idValue).addClass("showDice");
  $(idValue).css({
    "background-position-x": pX + "%",
    "background-position-y": pY + "%",
  });

  preDiceBoxId = idValue;
  
  // Broadcast dice result to other players
  if (gameSocket && tableId) {
    console.log(`[BROADCAST] Dice result: Player ${playerNo} rolled ${rndmNo}`);
    gameSocket.emit('game_dice_result', {
      tableId: tableId,
      playerNo: playerNo,
      diceValue: rndmNo,
      diceBoxId: idValue
    });
  }
}

// Function to show dice result on other player's screen
function showDiceOnOtherScreen(diceBoxId, diceValue) {
  let pX = null;
  let pY = null;
  const pXpYarr = [
    [0, 0],
    [100, 0],
    [0, 50],
    [100, 50],
    [0, 100],
    [100, 100],
  ];
  
  pX = pXpYarr[diceValue][0];
  pY = pXpYarr[diceValue][1];
  $(diceBoxId).removeClass("rollDice startDiceRoll");
  $(diceBoxId).addClass("showDice");
  $(diceBoxId).css({
    "background-position-x": pX + "%",
    "background-position-y": pY + "%",
  });
  $(diceBoxId).data('lastValue', diceValue);
}

/*   Open Pawn */

function openPawn() {
  // Ensure playerName is correctly set for the current player
  if (currentPlayerNo !== null) {
    // Make sure playerName matches the current player
    switchPlayerName(); // This will set playerName based on playerNo
  }
  
  // Check if players[playerName] exists
  if (!players[playerName]) {
    console.error(`Player ${playerName} not found in players object`);
    return;
  }
  
  // Verify rndmNo is 5 (rolled 6) - required to open a pawn
  if (rndmNo != 5) {
    console.log(`Cannot open pawn: rndmNo is ${rndmNo}, not 5 (six)`);
    return;
  }
  
  let inAreaLength = players[playerName].inArea.length;
  let outAreaLength = players[playerName].outArea.length;
  
  console.log(`openPawn: playerName=${playerName}, inAreaLength=${inAreaLength}, outAreaLength=${outAreaLength}, rndmNo=${rndmNo}, currentPlayerNo=${currentPlayerNo}, isMyTurn=${isMyTurn}`);
  
  if (inAreaLength == 0) {
    console.log(`No pawns in home for ${playerName}`);
    return;
  } else {
    if (outAreaLength == 0) {
      // No pawns on board - auto-open one immediately
      console.log(`Auto-opening pawn for ${playerName} - no pawns on board, rndmNo=${rndmNo}`);
      // Call autoOpen immediately without delay to ensure rndmNo is still 5
      autoOpen(inAreaLength);
    } else {
      // Has pawns on board - allow manual selection
      if (currentPlayerNo !== null && !isMyTurn) {
        // Not player's turn in multiplayer - don't allow manual selection
        console.log(`Not player's turn in multiplayer, skipping manual open`);
        return;
      }
      console.log(`Manual open for ${playerName} - pawns on board, rndmNo=${rndmNo}`);
      manuallyOpen();
    }
  }
}

function manuallyOpen() {
  // Check if it's the player's turn (multiplayer mode)
  if (currentPlayerNo !== null && !isMyTurn) {
    return;
  }
  
  // Only allow opening pawns for the current player
  if (currentPlayerColor && playerName !== (currentPlayerColor + "Player")) {
    return;
  }
  
  for (const classValue of players[playerName].inArea) {
    // Only allow clicking on own pawns
    if (currentPlayerColor && !classValue.startsWith(currentPlayerColor)) {
      continue;
    }
    
    $("." + classValue).addClass("glow");
    $("." + classValue).off("click"); // Remove any existing handlers
    $("." + classValue).one("click", function () {
      if (currentPlayerNo !== null && !isMyTurn) {
        alert("It's not your turn!");
        $("." + classValue).removeClass("glow");
        return;
      }
      reUpdateOutAreaWH(...players[playerName].outArea);
      reUpdatePrivateAreaWH(...players[playerName].privateArea);
      open(classValue, 0);
    });
  }
}

function autoOpen(inAreaLength) {
  // Ensure playerName is correctly set
  if (currentPlayerNo !== null) {
    switchPlayerName();
  }
  
  // Verify rndmNo is 5 (rolled 6) - required to open a pawn
  if (rndmNo != 5) {
    console.log(`Cannot auto-open: rndmNo is ${rndmNo}, not 5 (six)`);
    return;
  }
  
  console.log(`AutoOpen: playerName=${playerName}, currentPlayerColor=${currentPlayerColor}, inAreaLength=${inAreaLength}, rndmNo=${rndmNo}`);
  console.log(`Available pawns:`, players[playerName] ? players[playerName].inArea : 'players[playerName] is undefined');
  
  // Check if players[playerName] exists and has pawns
  if (!players[playerName] || !players[playerName].inArea || players[playerName].inArea.length === 0) {
    console.error(`Cannot auto-open: No pawns available for player ${playerName}`);
    return;
  }
  
  // Ensure we're opening a pawn for the correct player
  if (currentPlayerColor && currentPlayerNo !== null) {
    // Filter to only current player's pawns
    const currentPlayerPawns = players[playerName].inArea.filter(pawn => 
      pawn.startsWith(currentPlayerColor)
    );
    console.log(`Filtered pawns for ${currentPlayerColor}:`, currentPlayerPawns);
    if (currentPlayerPawns.length > 0) {
      const randomIndex = Math.floor(Math.random() * currentPlayerPawns.length);
      const openClassValue = currentPlayerPawns[randomIndex];
      console.log(`Auto-opening pawn: ${openClassValue} for player ${playerName}`);
      open(openClassValue);
      return;
    } else {
      console.warn(`No pawns found matching currentPlayerColor ${currentPlayerColor}, trying fallback`);
    }
  }
  
  // Fallback to original logic - open any pawn for this player
  if (players[playerName].inArea.length > 0) {
    let openClassValue =
      players[playerName].inArea[Math.floor(Math.random() * players[playerName].inArea.length)];
    console.log(`Auto-opening pawn (fallback): ${openClassValue} for player ${playerName}`);
    open(openClassValue);
  } else {
    console.error(`Cannot auto-open: No pawns available for player ${playerName}`);
  }
}

function open(openClassValue) {
  // Ensure playerName is correct for the current player
  if (currentPlayerNo !== null) {
    // Verify the pawn belongs to the current player
    const expectedColor = currentPlayerColor;
    if (expectedColor && !openClassValue.startsWith(expectedColor)) {
      console.error(`Attempted to open wrong color pawn: ${openClassValue} for player ${currentPlayerColor}`);
      return;
    }
  }
  
  // Verify rndmNo is 5 (rolled 6) - required to open a pawn
  if (rndmNo != 5) {
    console.error(`Cannot open pawn: rndmNo is ${rndmNo}, not 5 (six). openClassValue=${openClassValue}`);
    return;
  }
  
  // Verify the pawn is in the inArea before opening
  if (!players[playerName] || !players[playerName].inArea.includes(openClassValue)) {
    console.error(`Cannot open pawn: ${openClassValue} is not in inArea for ${playerName}`);
    console.log(`Current inArea:`, players[playerName] ? players[playerName].inArea : 'players[playerName] is undefined');
    return;
  }
  
  let startPoint = players[playerName].startPoint;
  let audioDuration = 500;

  console.log(`Opening pawn ${openClassValue} for ${playerName} at start point ${startPoint}, rndmNo=${rndmNo}`);

  removeAllGlow("inArea", "outArea");
  removeAllEvent("inArea", "outArea");
  removeFromArea(openClassValue, playerName, "inArea");
  addToArea(openClassValue, playerName, "outArea");
  addToOutAreaPos(getNoFromValue(startPoint), openClassValue);
  
  // Remove the pawn from home area DOM (only the one in the inArea container)
  $(`#${playerName} .${openClassValue}`).remove();
  // Also remove any with that class in the inArea containers to be safe
  $(`.in-area .${openClassValue}`).remove();

  let noInId = getNoFromValue(startPoint);

  let w = getUpdatedWHoutAreaPos(noInId)[0];
  let h = getUpdatedWHoutAreaPos(noInId)[1];
  
  console.log(`Adding pawn ${openClassValue} to ${startPoint} with dimensions ${w}% x ${h}%`);
  
  if (sound == true) {
    audioDuration = openAudio.duration * 1000;
    openAudio.play();
  }
  
  // Append the pawn to the start point
  const startPointElement = $("#" + startPoint);
  if (startPointElement.length === 0) {
    console.error(`Start point element #${startPoint} not found!`);
    return;
  }
  
  startPointElement.append(
    `<div class="${openClassValue}" style="width:${w}%; height:${h}%;"></div>`
  );
  
  console.log(`Pawn ${openClassValue} successfully opened and added to ${startPoint}`);
  
  // Broadcast pawn open to other players
  if (gameSocket && tableId) {
    console.log(`[BROADCAST] Pawn open: ${openClassValue} at ${startPoint}`);
    gameSocket.emit('game_pawn_open', {
      tableId: tableId,
      playerNo: playerNo,
      playerName: playerName,
      pawnClass: openClassValue,
      startPoint: startPoint,
      width: w,
      height: h
    });
  }
  
  // After opening a pawn with a 6, the player gets another turn
  // IMPORTANT: Don't reset rndmNo here - let nextPlayer() handle it
  // nextPlayer() will detect rndmNo == 5, give another turn, then reset rndmNo
  // This ensures player must roll dice again (proper ludo rule - can't auto-open again)
  setTimeout(function () {
    console.log(`Pawn opened successfully. Calling nextPlayer() - player will get another turn but must roll dice.`);
    // Call nextPlayer - it will see rndmNo == 5, give another turn, then reset rndmNo
    // This prevents infinite loop because rndmNo will be null after nextPlayer()
    nextPlayer();
  }, audioDuration);
}

/* move pawn  on out area*/

function movePawnOnOutArea() {
  let outAreaLength = players[playerName].outArea.length;
  if (outAreaLength == 0) {
    return;
  } else {
    if (
      outAreaLength == 1 &&
      rndmNo != 5 &&
      players[playerName].privateArea.length == 0
    ) {
      autoMoveOnOutArea();
    } else {
      manuallyMoveOnOutArea();
    }
  }
}

function manuallyMoveOnOutArea() {
  // Ensure playerName is correctly set
  if (currentPlayerNo !== null) {
    switchPlayerName();
  }
  
  // Check if it's the player's turn (multiplayer mode)
  if (currentPlayerNo !== null && !isMyTurn) {
    console.log(`Cannot move pawns: Not player's turn. currentPlayerNo=${currentPlayerNo}, playerNo=${playerNo}, isMyTurn=${isMyTurn}`);
    return;
  }
  
  // Verify players[playerName] exists
  if (!players[playerName] || !players[playerName].outArea || players[playerName].outArea.length === 0) {
    console.log(`No pawns to move for ${playerName}`);
    return;
  }
  
  console.log(`Making pawns clickable for ${playerName}, outArea:`, players[playerName].outArea);
  console.log(`rndmNo=${rndmNo}, currentPlayerColor=${currentPlayerColor}, currentPlayerNo=${currentPlayerNo}`);
  
  let idArr = [];
  for (const classValue of players[playerName].outArea) {
    // Only allow clicking on own pawns in multiplayer
    if (currentPlayerColor && !classValue.startsWith(currentPlayerColor)) {
      console.log(`Skipping pawn ${classValue} - doesn't match currentPlayerColor ${currentPlayerColor}`);
      continue;
    }
    
    // Check if pawn element exists in DOM
    const pawnElement = $("." + classValue);
    if (pawnElement.length === 0) {
      console.warn(`Pawn element .${classValue} not found in DOM`);
      continue;
    }
    
    let idValue = pawnElement.parent().attr("id");
    if (!idValue) {
      console.warn(`Parent ID not found for pawn .${classValue}`);
      continue;
    }
    
    if (idArr.includes(idValue)) {
      continue;
    } else {
      // Hide other pawns on the same position
      for (const cValue of outAreaPos[getNoFromValue(idValue)]) {
        if (cValue != classValue) {
          $("." + cValue).css("display", "none");
        }
      }
      
      // Make this pawn full size and visible
      pawnElement.css({
        width: "100%",
        height: "100%",
        display: "inline-block",
        cursor: "pointer"
      });
      
      idArr.push(idValue);
      
      // Add glow effect to indicate it's clickable
      pawnElement.addClass("glow");
      
      // Remove any existing click handlers
      pawnElement.off("click");
      
      // Add click handler
      pawnElement.one("click", function () {
        console.log(`Pawn ${classValue} clicked!`);
        
        // Double-check it's the player's turn
        if (currentPlayerNo !== null && !isMyTurn) {
          alert("It's not your turn!");
          pawnElement.removeClass("glow");
          return;
        }
        
        // Verify rndmNo is set (dice has been rolled)
        if (rndmNo === null || rndmNo === undefined) {
          console.error("Cannot move pawn: rndmNo is not set");
          alert("Please roll the dice first!");
          return;
        }
        
        console.log(`Moving pawn ${classValue} with rndmNo=${rndmNo}`);
        
        // Update area dimensions
        reUpdateOutAreaWH(...players[playerName].outArea);
        reUpdatePrivateAreaWH(...players[playerName].privateArea);
        
        // Move the pawn
        moveOnOutArea(classValue);
      });
      
      console.log(`Pawn ${classValue} is now clickable at position ${idValue}`);
    }
  }
  
  if (idArr.length === 0) {
    console.warn(`No clickable pawns found for ${playerName}`);
  } else {
    console.log(`Made ${idArr.length} pawn(s) clickable for ${playerName}`);
  }
}

function autoMoveOnOutArea() {
  if (players[playerName].outArea.length > 0) {
    moveOnOutArea(players[playerName].outArea[0]);
  }
}

function moveOnOutArea(cValue) {
  // Verify rndmNo is set
  if (rndmNo === null || rndmNo === undefined) {
    console.error(`Cannot move pawn ${cValue}: rndmNo is not set`);
    alert("Please roll the dice first!");
    return;
  }
  
  // Verify the pawn exists in outArea
  if (!players[playerName] || !players[playerName].outArea.includes(cValue)) {
    console.error(`Cannot move pawn ${cValue}: not in outArea for ${playerName}`);
    return;
  }
  
  console.log(`Moving pawn ${cValue} for ${playerName} with rndmNo=${rndmNo}`);
  
  let count = -1;
  const pawnElement = $("." + cValue);
  if (pawnElement.length === 0) {
    console.error(`Pawn element .${cValue} not found in DOM`);
    return;
  }
  
  let idValue = pawnElement.parent().attr("id");
  if (!idValue) {
    console.error(`Parent ID not found for pawn .${cValue}`);
    return;
  }
  
  let noInId = getNoFromValue(idValue);
  let newId = "out" + noInId;
  let oldId = idValue; // Capture the starting position
  const originalOldId = idValue; // Store original position for broadcasting
  let wh = [];
  let moveingClassValue = cValue;
  let color = getColorFromValue(moveingClassValue);
  let winAudioPlay = false;
  let passAudioPlay = false;

  // Remove glow and events from all pawns
  removeAllGlow("inArea", "outArea", "privateArea");
  removeAllEvent("inArea", "outArea", "privateArea");

  let timerId = setInterval(function () {
    if (checkOutAreaEnd(newId)) {
      count++;
      removeFromOutAreaPos(noInId, moveingClassValue);
      removeFromArea(moveingClassValue, playerName, "outArea");
      $("." + moveingClassValue).remove();
      wh = getUpdatedWHoutAreaPos(noInId);
      noInId = 1;
      newId = color + "-out-" + noInId;
      oldId = newId;

      addToArea(moveingClassValue, playerName, "privateArea");
      addToPrivateAreaPos(noInId, moveingClassValue, playerName);

      wh = getUpdatedWHprivateAreaPos(noInId);
      if (sound == true) {
        jumpAudio.play();
      }
      $("#" + newId).append(
        `<div class="${moveingClassValue}" style="width:${wh[0]}%; height:${wh[1]}%;"></div>`
      );
    } else if (players[playerName].privateArea.includes(moveingClassValue)) {
      count++;
      $("." + moveingClassValue).remove();
      removeFromPrivateAreaPos(noInId, moveingClassValue, playerName);
      wh = getUpdatedWHprivateAreaPos(noInId);
      if (checkprivateAreaEnd(oldId)) {
        pass = true;
        removeFromArea(moveingClassValue, playerName, "privateArea");
        addToArea(moveingClassValue, playerName, "winArea");
        sendToWinArea(moveingClassValue, playerName, color);
        if (players[playerName].winArea.length == 4) {
          if (sound == true) {
            winAudioPlay = true;
            winAudio.play();
          }
          updateWinningOrder(playerName);
          showWinningBadge();
        }
        if (sound == true && winAudioPlay == false) {
          passAudio.play();
          passAudioPlay = true;
        }
      } else {
        noInId++;
        newId = color + "-out-" + noInId;
        oldId = newId;
        addToPrivateAreaPos(noInId, moveingClassValue, playerName);
        wh = getUpdatedWHprivateAreaPos(noInId);
        if (sound == true) {
          jumpAudio.play();
        }
        $("#" + newId).append(
          `<div class="${moveingClassValue}" style="width:${wh[0]}%; height:${wh[1]}%;"></div>`
        );
      }
    } else {
      count++;
      $("." + moveingClassValue).remove();
      removeFromOutAreaPos(noInId, moveingClassValue);
      wh = getUpdatedWHoutAreaPos(noInId);
      if (check52(oldId)) {
        noInId = 1;
        newId = "out" + noInId;
        oldId = newId;
      } else {
        noInId++;
        newId = "out" + noInId;
        oldId = newId;
      }

      addToOutAreaPos(noInId, moveingClassValue);
      wh = getUpdatedWHoutAreaPos(noInId);
      if (sound == true) {
        jumpAudio.play();
      }

      $("#" + newId).append(
        `<div class="${moveingClassValue}" style="width:${wh[0]}%; height:${wh[1]}%;"></div>`
      );
    }

    if (count == rndmNo) {
      clearInterval(timerId);
      cutPawn(noInId, moveingClassValue);
      
      // Broadcast pawn movement to other players after animation completes
      if (gameSocket && tableId) {
        // Determine move type based on final position
        let moveType = 'outArea';
        if (newId.includes('-out-')) {
          moveType = 'privateArea';
        }
        
        // Use setTimeout to ensure the movement is complete before broadcasting
        setTimeout(() => {
          console.log(`[BROADCAST] Pawn move: ${moveingClassValue} from ${originalOldId} to ${newId}, type: ${moveType}`);
          gameSocket.emit('game_pawn_move', {
            tableId: tableId,
            playerNo: playerNo,
            playerName: playerName,
            pawnClass: moveingClassValue,
            newPosition: newId,
            oldPosition: originalOldId,
            moveType: moveType
          });
        }, 600); // Increased delay to ensure animation completes
      }
      
      if (sound == true && winAudioPlay == true) {
        winAudio.onended = () => {
          nextPlayer();
        };
      } else if (sound == true && passAudioPlay == true) {
        passAudio.onended = () => {
          nextPlayer();
        };
      } else {
        setTimeout(() => nextPlayer(), 500);
      }
    }
  }, 500);
}

/*  Move on Private Area */

function movePawnOnPrivateArea() {
  let privateAreaLength = players[playerName].privateArea.length;
  let outAreaLength = players[playerName].outArea.length;
  if (privateAreaLength == 0 || rndmNo == 5) {
    return;
  } else {
    let moveingClassArr = [];
    for (const cValue of players[playerName].privateArea) {
      let idValue = $("." + cValue)
        .parent()
        .attr("id");
      let noInId = getNoFromValue(idValue);
      if (rndmNo <= 5 - noInId) {
        moveingClassArr.push(cValue);
      }
    }
    if (moveingClassArr.length == 0) {
      flag = false;
      return;
    } else if (outAreaLength == 0 && moveingClassArr.length == 1) {
      flag = true;
      autoMoveOnPrivateArea(moveingClassArr);
    } else {
      flag = true;
      manuallyMoveOnPrivateArea(moveingClassArr);
    }
  }
}

function manuallyMoveOnPrivateArea(moveingClassArr) {
  // Check if it's the player's turn (multiplayer mode)
  if (currentPlayerNo !== null && !isMyTurn) {
    return;
  }
  
  // Only allow moving pawns for the current player
  if (currentPlayerColor && playerName !== (currentPlayerColor + "Player")) {
    return;
  }
  
  let idArr = [];
  for (const classValue of moveingClassArr) {
    // Only allow clicking on own pawns
    if (currentPlayerColor && !classValue.startsWith(currentPlayerColor)) {
      continue;
    }
    
    let idValue = $("." + classValue)
      .parent()
      .attr("id");
    if (idArr.includes(idValue)) {
      continue;
    } else {
      for (const cValue of players[playerName].privateAreaPos[
        getNoFromValue(idValue)
      ]) {
        if (cValue != classValue) {
          $("." + cValue).css("display", "none");
        }
      }
      $("." + classValue).css({
        width: 100 + "%",
        height: 100 + "%",
        display: "inline-block",
      });
      idArr.push(idValue);
      $("." + classValue).addClass("glow");
      $("." + classValue).off("click"); // Remove any existing handlers
      $("." + classValue).one("click", function () {
        if (currentPlayerNo !== null && !isMyTurn) {
          alert("It's not your turn!");
          $("." + classValue).removeClass("glow");
          return;
        }
        reUpdateOutAreaWH(...players[playerName].outArea);
        reUpdatePrivateAreaWH(...players[playerName].privateArea);
        moveOnPrivateArea(classValue);
      });
    }
  }
}

function autoMoveOnPrivateArea(moveingClassArr) {
  moveOnPrivateArea(moveingClassArr[0]);
}

function moveOnPrivateArea(cValue) {
  let idValue = $("." + cValue)
    .parent()
    .attr("id");
  let moveingClassValue = cValue;
  let noInId = getNoFromValue(idValue);
  let color = getColorFromValue(moveingClassValue);
  let count = -1;
  let newId = color + "-out-" + noInId;
  let oldId = idValue; // Capture the starting position
  const originalOldId = idValue; // Store original position for broadcasting
  let wh = [];
  let winAudioPlay = false;
  let passAudioPlay = false;

  removeAllGlow("inArea", "outArea", "privateArea");
  removeAllEvent("inArea", "outArea", "privateArea");

  let timerId = setInterval(function () {
    count++;
    $("." + moveingClassValue).remove();
    removeFromPrivateAreaPos(noInId, moveingClassValue, playerName);

    wh = getUpdatedWHprivateAreaPos(noInId);

    if (checkprivateAreaEnd(oldId)) {
      pass = true;
      removeFromArea(moveingClassValue, playerName, "privateArea");
      addToArea(moveingClassValue, playerName, "winArea");
      sendToWinArea(moveingClassValue, playerName, color);
      if (players[playerName].winArea.length == 4) {
        if (sound == true) {
          winAudioPlay = true;
          winAudio.play();
        }
        updateWinningOrder(playerName);
        showWinningBadge();
      }
      if (sound == true && winAudioPlay == false) {
        passAudio.play();
        passAudioPlay = true;
      }
    } else {
      noInId++;
      newId = color + "-out-" + noInId;
      oldId = newId;
      addToPrivateAreaPos(noInId, moveingClassValue, playerName);
      wh = getUpdatedWHprivateAreaPos(noInId);
      if (sound == true) {
        jumpAudio.play();
      }
      $("#" + newId).append(
        `<div class="${moveingClassValue}" style="width:${wh[0]}%; height:${wh[1]}%;"></div>`
      );
    }

    if (count == rndmNo) {
      clearInterval(timerId);
      
      // Broadcast pawn movement to other players after animation completes
      if (gameSocket && tableId) {
        setTimeout(() => {
          console.log(`[BROADCAST] Pawn move (private): ${moveingClassValue} from ${originalOldId} to ${newId}`);
          gameSocket.emit('game_pawn_move', {
            tableId: tableId,
            playerNo: playerNo,
            playerName: playerName,
            pawnClass: moveingClassValue,
            newPosition: newId,
            oldPosition: originalOldId,
            moveType: 'privateArea'
          });
        }, 600); // Increased delay to ensure animation completes
      }
      
      if (sound == true && winAudioPlay == true) {
        winAudio.onended = () => {
          nextPlayer();
        };
      } else if (sound == true && passAudioPlay == true) {
        passAudio.onended = () => {
          nextPlayer();
        };
      } else {
        setTimeout(() => nextPlayer(), 500);
      }
    }
  }, 500);
}

/* update player */
function updatePlayer() {
  // Check if player should get another turn (cut or pass happened)
  // If so, don't call nextPlayer() - let the movement completion handle it
  const shouldGetAnotherTurn = (cut == true || pass == true);
  
  if (players[playerName].inArea.length == 4 && rndmNo < 5) {
    // All pawns in home and didn't roll 6 - move to next player
    if (!shouldGetAnotherTurn) {
      setTimeout(() => nextPlayer(), 500);
    }
    return;
  }
  if (players[playerName].winArea.length < 4) {
    if (flag == true) {
      flag = false;
      return;
    } else if (
      rndmNo == 5 &&
      players[playerName].outArea.length == 0 &&
      players[playerName].inArea.length == 0
    ) {
      // Rolled 6 but no pawns to move - move to next player (unless cut/pass)
      if (!shouldGetAnotherTurn) {
        setTimeout(() => nextPlayer(), 500);
      }
      return;
    } else if (players[playerName].outArea.length > 0) {
      // Still has pawns on board - wait for move or check if should get another turn
      if (!shouldGetAnotherTurn && rndmNo != 5) {
        // No cut/pass and didn't roll 6 - move to next player
        setTimeout(() => nextPlayer(), 500);
      }
      return;
    } else if (
      players[playerName].inArea.length > 0 &&
      flag == false &&
      rndmNo < 5
    ) {
      // Has pawns in home and didn't roll 6 - move to next player (unless cut/pass)
      if (!shouldGetAnotherTurn) {
        setTimeout(() => nextPlayer(), 500);
      }
      return;
    } else if (
      players[playerName].inArea.length > 0 &&
      flag == false &&
      rndmNo == 5
    ) {
      return;
    } else {
      // Default case - move to next player (unless cut/pass)
      if (!shouldGetAnotherTurn) {
        setTimeout(() => nextPlayer(), 500);
      }
      return;
    }
  } else {
    // Player won - move to next player
    if (!shouldGetAnotherTurn) {
      setTimeout(() => nextPlayer(), 500);
    }
    return;
  }
}

/* Move to Win Area*/
function sendToWinArea(cValue, pName, color) {
  $("#" + color + "-win-pawn-box").append(`<div class="${cValue}"></div>`);
  updateWinAreaCss(pName, color);
}

function updateWinAreaCss(pName, color) {
  let x = null;
  let y = null;
  const winAreaPxPY = [
    [[380, 380]],
    [
      [380, 380],
      [305, 305],
    ],
    [
      [380, 380],
      [230, 380],
      [380, 230],
    ],
    [
      [380, 380],
      [230, 380],
      [305, 305],
      [380, 230],
    ],
  ];
  let i = 0;
  let rotateValue = getRotateValue(color);
  let winAreaLength = players[pName].winArea.length;
  for (const classValue of players[pName].winArea) {
    x = winAreaPxPY[winAreaLength - 1][i][0];
    y = winAreaPxPY[winAreaLength - 1][i][1];
    i++;
    $("." + classValue).css({
      transform: `translate(${x}%, ${y}%) rotate(${rotateValue})`,
    });
  }
}

/* Winning Badge */
function updateWinningOrder(pName) {
  if (players[pName].winArea.length == 4) {
    winningOrder.push(pName);
  }
}

function showWinningBadge() {
  if (winningOrder.length > 0) {
    let idValue = winningOrder[winningOrder.length - 1];
    let url = getBadgeImage(winningOrder.length - 1);
    $("#" + idValue).append(
      `<div class="badge-box" style="background-image: ${url};"></div>`
    );
  }
}

function getBadgeImage(winNo) {
  let imageName = null;

  (winNo == 0 && (imageName = "win1")) ||
    (winNo == 1 && (imageName = "win2")) ||
    (winNo == 2 && (imageName = "win3"));

  return `url(/images/${imageName}.png)`;
}

/* cut the pawn */

function cutPawn(noInId, moveingClassValue) {
  if (players[playerName].outArea.includes(moveingClassValue)) {
    if ([1, 48, 9, 22, 35, 14, 27, 40].includes(noInId)) {
      return;
    } else {
      let colorInClass = getColorFromValue(moveingClassValue);
      let targetClass = null;
      for (const cValve of outAreaPos[noInId]) {
        if (colorInClass != getColorFromValue(cValve)) {
          targetClass = cValve;
        }
      }
      if (targetClass != null) {
        $("." + targetClass).remove();
        if (sound == true) {
          cutAudio.play();
        }
        colorInClass = getColorFromValue(targetClass);
        let pName = colorInClass + "Player";
        removeFromArea(targetClass, pName, "outArea");
        addToArea(targetClass, pName, "inArea");
        removeFromOutAreaPos(noInId, targetClass);
        let noInClass = getNoFromValue(targetClass);
        $(`#in-${colorInClass}-${noInClass}`).append(
          `<div class='${colorInClass}-pawn${noInClass}'></div>`
        );
        cut = true;
        getUpdatedWHoutAreaPos(noInId);
      }
    }
  } else {
    return;
  }
}

/* Initialize multiplayer player assignment */
function initializePlayerAssignment(userId, playersArray) {
  if (!playersArray || playersArray.length < 2) {
    // Single player mode - no restrictions
    currentPlayerColor = null;
    currentPlayerNo = null;
    isMyTurn = true;
    return;
  }
  
  // Find current user's index in players array
  const playerIndex = playersArray.indexOf(userId);
  
  if (playerIndex === -1) {
    // User not found in players array - single player mode
    currentPlayerColor = null;
    currentPlayerNo = null;
    isMyTurn = true;
    return;
  }
  
  // For 2-player game: player 0 = red (playerNo 1), player 1 = yellow (playerNo 3)
  if (noOfPlayer === 2) {
    if (playerIndex === 0) {
      currentPlayerColor = 'r';
      currentPlayerNo = 1; // Red player
    } else if (playerIndex === 1) {
      currentPlayerColor = 'y';
      currentPlayerNo = 3; // Yellow player
    }
  }
  
  // Set initial turn - first player (red) starts
  isMyTurn = (currentPlayerNo === 1);
  
  console.log(`Player assigned: Color=${currentPlayerColor}, PlayerNo=${currentPlayerNo}, IsMyTurn=${isMyTurn}`);
}

/* Initialize socket connection for multiplayer */
function initializeSocket(socket, tableIdParam) {
  // Remove old event listeners if socket was already initialized
  if (gameSocket && gameSocket.hasListeners) {
    gameSocket.removeAllListeners('game_turn_change');
    gameSocket.removeAllListeners('game_dice_roll');
    gameSocket.removeAllListeners('game_dice_result');
    gameSocket.removeAllListeners('game_pawn_open');
    gameSocket.removeAllListeners('game_pawn_move');
  }
  
  gameSocket = socket;
  tableId = tableIdParam;
  
  if (gameSocket && tableId) {
    console.log(`Initializing socket for table ${tableId}`);
    
    // Listen for turn changes from other players
    gameSocket.on('game_turn_change', (data) => {
      console.log('Received game_turn_change:', data);
      if (data.tableId === tableId) {
        // Update turn state without changing global playerNo (which affects game logic)
        isMyTurn = (data.playerNo === currentPlayerNo);
        console.log(`Turn changed: PlayerNo=${data.playerNo}, IsMyTurn=${isMyTurn}, CurrentPlayerNo=${currentPlayerNo}`);
        
        // Get the dice box for the player whose turn it is
        const turnDiceBoxId = getDiceBoxIdForPlayer(data.playerNo);
        const myDiceBoxId = getDiceBoxIdForPlayer(currentPlayerNo);
        
        // Animate player's ludo box based on turn
        animatePlayerTurn(data.playerNo, isMyTurn);
        
        // Update dice UI based on whose turn it is
        if (isMyTurn && myDiceBoxId) {
          // It's my turn - enable my dice
          $(myDiceBoxId).addClass("startDiceRoll");
          $(myDiceBoxId).css("cursor", "pointer");
          $(myDiceBoxId).off("click");
          $(myDiceBoxId).one("click", function () {
            if (isMyTurn) {
              rollDice(myDiceBoxId);
            }
          });
          showTurnMessage("Your Turn!");
        } else if (myDiceBoxId) {
          // It's not my turn - disable my dice
          $(myDiceBoxId).removeClass("startDiceRoll");
          $(myDiceBoxId).off("click");
          $(myDiceBoxId).css("cursor", "not-allowed");
        }
        
        // Disable other player's dice visually (they can't click anyway)
        if (turnDiceBoxId && turnDiceBoxId !== myDiceBoxId) {
          $(turnDiceBoxId).removeClass("startDiceRoll");
          $(turnDiceBoxId).css("cursor", "default");
        }
      }
    });
    
    // Listen for chat messages from other players
    gameSocket.on('game_chat_message', (data) => {
      console.log('Received game_chat_message:', data);
      if (data.tableId === tableId) {
        // Check if message is from opponent
        const isOwnMessage = (data.playerNo === currentPlayerNo);
        // Add message to chat UI (own messages are already added when sent)
        if (!isOwnMessage) {
          addChatMessage(data.message, false);
        }
      }
    });
    
    // Listen for dice roll animation from other players
    gameSocket.on('game_dice_roll', (data) => {
      console.log('Received game_dice_roll:', data);
      if (data.tableId === tableId) {
        // Show dice roll animation for ANY player (both can see each other's rolls)
        const diceBoxId = getDiceBoxIdForPlayer(data.playerNo);
        if (diceBoxId) {
          $(diceBoxId).removeClass("startDiceRoll showDice").addClass("rollDice");
          // Animate dice roll
          let pX = 0;
          let pY = 0;
          const rollTimer = setInterval(() => {
            (pX == 100 && ((pX = 0), (pY = pY + 25))) || (pX = pX + 20);
            $(diceBoxId).css({
              "background-position-x": pX + "%",
              "background-position-y": pY + "%",
            });
          }, 20);
          
          // Stop animation after 1 second (will be replaced by result)
          setTimeout(() => clearInterval(rollTimer), 1000);
        }
        
        // Update turn state - if other player is rolling, disable current player's dice
        if (data.playerNo !== currentPlayerNo) {
          isMyTurn = false;
          // Disable dice for current player
          const myDiceBoxId = getDiceBoxIdForPlayer(currentPlayerNo);
          if (myDiceBoxId) {
            $(myDiceBoxId).removeClass("startDiceRoll");
            $(myDiceBoxId).off("click");
            $(myDiceBoxId).css("cursor", "not-allowed");
          }
        }
      }
    });
    
    // Listen for dice results from other players
    gameSocket.on('game_dice_result', (data) => {
      console.log('Received game_dice_result:', data);
      if (data.tableId === tableId) {
        // Show dice result on BOTH players' screens (even if it's the current player's own roll)
        const diceBoxId = getDiceBoxIdForPlayer(data.playerNo);
        if (diceBoxId) {
          // Only update if dice is not already showing this value (prevent duplicate updates)
          const currentDice = $(diceBoxId);
          if (!currentDice.hasClass('showDice') || currentDice.data('lastValue') !== data.diceValue) {
            showDiceOnOtherScreen(diceBoxId, data.diceValue);
            currentDice.data('lastValue', data.diceValue);
            console.log(`Showing dice result ${data.diceValue} for player ${data.playerNo} on dice ${diceBoxId}`);
          }
        }
        
        // Store dice result for game state tracking (both players need to know)
        window.lastDiceResult = {
          playerNo: data.playerNo,
          diceValue: data.diceValue
        };
      }
    });
    
    // Listen for pawn open from other players
    gameSocket.on('game_pawn_open', (data) => {
      console.log('Received game_pawn_open:', data);
      if (data.tableId === tableId) {
        // Temporarily switch to the other player's state to update their data
        const tempPlayerNo = playerNo;
        const tempPlayerName = playerName;
        playerNo = data.playerNo;
        switchPlayerName();
        
        // Remove pawn from inArea and add to outArea
        removeFromArea(data.pawnClass, data.playerName, "inArea");
        addToArea(data.pawnClass, data.playerName, "outArea");
        addToOutAreaPos(getNoFromValue(data.startPoint), data.pawnClass);
        
        // Remove pawn visually if it exists (from home area)
        $(`#in-${data.pawnClass.charAt(0)}-${data.pawnClass.match(/\d+/)[0]}`).find("." + data.pawnClass).remove();
        $("." + data.pawnClass).remove();
        
        // Add pawn to board at start point
        $("#" + data.startPoint).append(
          `<div class="${data.pawnClass}" style="width:${data.width}%; height:${data.height}%;"></div>`
        );
        getUpdatedWHoutAreaPos(getNoFromValue(data.startPoint));
        
        console.log(`Pawn ${data.pawnClass} opened and moved to ${data.startPoint}`);
        
        // Restore current player state
        playerNo = tempPlayerNo;
        playerName = tempPlayerName;
      }
    });
    
    // Listen for pawn movements from other players
    gameSocket.on('game_pawn_move', (data) => {
      console.log('Received game_pawn_move:', data);
      if (data.tableId === tableId) {
        // Temporarily switch to the other player's state to update their data
        const tempPlayerNo = playerNo;
        const tempPlayerName = playerName;
        playerNo = data.playerNo;
        switchPlayerName();
        
        // Remove pawn from old position visually
        $("." + data.pawnClass).remove();
        
        // Update game state arrays - remove from old position
        if (data.oldPosition) {
          if (data.oldPosition.startsWith('out') && !data.oldPosition.includes('-out-')) {
            // Was in outArea (regular board positions like out1, out2, etc.)
            const oldNoInId = getNoFromValue(data.oldPosition);
            removeFromOutAreaPos(oldNoInId, data.pawnClass);
            removeFromArea(data.pawnClass, data.playerName, "outArea");
          } else if (data.oldPosition.includes('-out-')) {
            // Was in privateArea (like r-out-1, y-out-2, etc.)
            const oldNoInId = getNoFromValue(data.oldPosition);
            removeFromPrivateAreaPos(oldNoInId, data.pawnClass, data.playerName);
            removeFromArea(data.pawnClass, data.playerName, "privateArea");
          } else if (data.oldPosition.includes('in-')) {
            // Was in inArea (home)
            removeFromArea(data.pawnClass, data.playerName, "inArea");
          }
        }
        
        // Add to new position
        const newPosId = data.newPosition;
        const noInId = getNoFromValue(newPosId);
        let wh = [];
        
        if (data.moveType === 'outArea') {
          addToArea(data.pawnClass, data.playerName, "outArea");
          addToOutAreaPos(noInId, data.pawnClass);
          wh = getUpdatedWHoutAreaPos(noInId);
        } else if (data.moveType === 'privateArea') {
          addToArea(data.pawnClass, data.playerName, "privateArea");
          addToPrivateAreaPos(noInId, data.pawnClass, data.playerName);
          wh = getUpdatedWHprivateAreaPos(noInId);
        }
        
        // Add pawn to new position visually
        if (wh && wh.length > 0 && wh[0] && wh[1]) {
          const pawnElement = $(`<div class="${data.pawnClass}" style="width:${wh[0]}%; height:${wh[1]}%;"></div>`);
          $("#" + newPosId).append(pawnElement);
          console.log(`Pawn ${data.pawnClass} moved from ${data.oldPosition} to ${newPosId}`);
        }
        
        // Restore current player state
        playerNo = tempPlayerNo;
        playerName = tempPlayerName;
      }
    });
  }
}

// Helper function to get dice box ID for a player number
function getDiceBoxIdForPlayer(playerNum) {
  switch(playerNum) {
    case 1: return "#redDice";
    case 2: return "#greenDice";
    case 3: return "#yellowDice";
    case 4: return "#blueDice";
    default: return null;
  }
}

/* start game */
function startGame() {
  // Ensure chat is initialized when game starts
  ensureChatInitialized();
  if (noOfPlayer == 2) {
    setPawn("r", "y");
  } else if (noOfPlayer == 3) {
    setPawn("r", "g", "y");
  } else {
    setPawn("r", "g", "y", "b");
  }
  $("main").css("display", "block");
  nextPlayer();
}
function setPawn(...color) {
  for (const colorName of color) {
    // Clear existing pawns first to prevent duplicates
    for (let i = 1; i <= 4; i++) {
      $(`.${colorName}-pawn${i}`).remove();
    }
    
    players[colorName + "Player"].inArea = [
      colorName + "-pawn1",
      colorName + "-pawn2",
      colorName + "-pawn3",
      colorName + "-pawn4",
    ];
    
    // Add pawns to containers
    for (let i = 1; i <= 4; i++) {
      $(`#in-${colorName}-${i}`).append(
        `<div class='${colorName}-pawn${i}'></div>`
      );
    }
  }
}
$("#twoPlayer").click(function () {
  $(".selected").removeClass("selected");
  $("#twoPlayer").addClass("selected");
  noOfPlayer = 2;
});
$("#threePlayer").click(function () {
  $(".selected").removeClass("selected");
  $("#threePlayer").addClass("selected");
  noOfPlayer = 3;
});
$("#fourPlayer").click(function () {
  $(".selected").removeClass("selected");
  $("#fourPlayer").addClass("selected");
  noOfPlayer = 4;
});

$("#startGame").click(function () {
  $("#home-container").css("display", "none");
  startGame();
});

/* restart Game */

function resetPawn(...color) {
  for (const colorName of color) {
    for (let i = 1; i <= 4; i++) {
      $(`.${colorName}-pawn${i}`).remove();
    }
  }
}

function restartGame() {
  $("#home-container").css("display", "block");
  $("main").css("display", "none");
  $("." + "badge-box").remove();
  if (noOfPlayer == 2) {
    resetPawn("r", "y");
  } else if (noOfPlayer == 3) {
    resetPawn("r", "g", "y");
  } else {
    resetPawn("r", "g", "y", "b");
  }
  $(diceBoxId).removeClass("startDiceRoll");
  $(diceBoxId).removeClass("showDice");
  $(diceBoxId).off();
  players = {
    rPlayer: new Player("out1", "out51"),
    gPlayer: new Player("out14", "out12"),
    yPlayer: new Player("out27", "out25"),
    bPlayer: new Player("out40", "out38"),
  };
  outAreaPos = new Position(52);
  playerNo = 0; // (red = 1, green = 2, yellow = 3, blue = 4)
  playerName = null; // store defult playerName
  diceBoxId = null; // store id value of dice box
  preDiceBoxId = null; // store id value of previou diceBoxId
  rndmNo = null; // generate rndmNo after dice is roll
  countSix = 0;
  cut = false;
  pass = false;
  flag = false;
  winningOrder = [];
}

$("#restart").click(function () {
  $("#alertBox").css("display", "block");
});

$("#ok").click(function () {
  restartGame();
  $("#alertBox").css("display", "none");
});

$("#cancel").click(function () {
  $("#alertBox").css("display", "none");
});

/* Sound Settings */

function soundSettings() {
  if (sound == true) {
    sound = false;
  } else {
    sound = true;
  }
}

$("#sound").click(function () {
  soundSettings();
  if (sound == true) {
    $("#sound").css("background-image", "url(/images/sound-on.svg)");
  } else {
    $("#sound").css("background-image", "url(/images/sound-off.svg)");
  }
});

/* fullsreen */

let elem = document.documentElement;
function openFullscreen() {
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if (elem.mozRequestFullScreen) { /* Firefox */
    elem.mozRequestFullScreen();
  } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
    elem.webkitRequestFullscreen();
  } else if (elem.msRequestFullscreen) { /* IE/Edge */
    elem.msRequestFullscreen();
  }
  $("#fullscreen").css("display", "none");
  $("#exitfullscreen").css("display", "inline-block");
}

function closeFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
   $("#exitfullscreen").css("display", "none");
   $("#fullscreen").css("display", "inline-block");
}

document.addEventListener("fullscreenchange", (event) => {
  // document.fullscreenElement will point to the element that
  // is in fullscreen mode if there is one. If there isn't one,
  // the value of the property is null.
  if (document.fullscreenElement) {
    $("#fullscreen").css("display", "none");
    $("#exitfullscreen").css("display", "inline-block");
  } else {
    $("#exitfullscreen").css("display", "none");
    $("#fullscreen").css("display", "inline-block");
  }
});

$("#fullscreen").click(function(){
  openFullscreen();
});

$("#exitfullscreen").click(function(){
  closeFullscreen();
});

// Refresh button - reload the page
$("#refresh-page-btn").click(function(){
  window.location.reload();
});

// Function to show turn message
function showTurnMessage(message) {
  // Remove any existing turn message
  $("#turn-message").remove();
  
  // Create turn message element
  const messageDiv = $("<div>")
    .attr("id", "turn-message")
    .css({
      position: "fixed",
      top: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      color: "white",
      padding: "15px 30px",
      borderRadius: "10px",
      fontSize: "24px",
      fontWeight: "bold",
      zIndex: 10000,
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
      animation: "pulse 1s infinite"
    })
    .text(message);
  
  $("body").append(messageDiv);
  
  // Remove message after 3 seconds
  setTimeout(() => {
    $("#turn-message").fadeOut(500, function() {
      $(this).remove();
    });
  }, 3000);
}

// Add CSS animation for pulse effect
if (!document.getElementById('turn-message-style')) {
  const style = document.createElement('style');
  style.id = 'turn-message-style';
  style.textContent = `
    @keyframes pulse {
      0%, 100% { transform: translateX(-50%) scale(1); }
      50% { transform: translateX(-50%) scale(1.05); }
    }
  `;
  document.head.appendChild(style);
}

// Function to animate player's ludo box when it's their turn
function animatePlayerTurn(playerNo, isMyTurn) {
  // Remove animation from all player zones
  $('.in-area').removeClass('player-turn');
  
  // Get the player zone ID based on player number
  let playerZoneId = null;
  if (playerNo === 1) {
    playerZoneId = '#rPlayer';
  } else if (playerNo === 2) {
    playerZoneId = '#gPlayer';
  } else if (playerNo === 3) {
    playerZoneId = '#yPlayer';
  } else if (playerNo === 4) {
    playerZoneId = '#bPlayer';
  }
  
  // Add animation to the current player's zone (only if it's the current user's turn)
  if (playerZoneId && isMyTurn) {
    $(playerZoneId).addClass('player-turn');
  }
}

// Initialize chat functionality
function initializeChat() {
  console.log('Setting up chat event handlers...');
  
  // Remove existing handlers to prevent duplicates
  $('#chat-toggle').off('click.chat');
  $('.chat-quick-btn').off('click.chat');
  
  // Chat toggle
  $('#chat-toggle').on('click.chat', function() {
    console.log('Chat toggle clicked');
    $('#chat-panel').toggleClass('active');
  });
  
  // Chat close button - use event delegation to ensure it works
  $(document).off('click.chat', '#chat-close').on('click.chat', '#chat-close', function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('Chat close clicked');
    $('#chat-panel').removeClass('active');
  });
  
  // Also attach directly if element exists
  if ($('#chat-close').length > 0) {
    $('#chat-close').off('click.chatDirect').on('click.chatDirect', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Chat close clicked (direct)');
      $('#chat-panel').removeClass('active');
    });
  }
  
  // Quick message buttons
  $('.chat-quick-btn').on('click.chat', function() {
    const message = $(this).data('message');
    console.log('Chat button clicked:', message);
    if (message) {
      if (gameSocket && tableId && currentPlayerNo !== null) {
        // Send chat message via socket
        console.log('Sending chat message:', message);
        gameSocket.emit('game_chat_message', {
          tableId: tableId,
          playerNo: currentPlayerNo,
          message: message
        });
        
        // Add message to chat UI immediately
        addChatMessage(message, true);
      } else {
        console.warn('Cannot send chat: socket or tableId not ready', {
          hasSocket: !!gameSocket,
          tableId: tableId,
          currentPlayerNo: currentPlayerNo
        });
      }
    }
  });
  
  console.log('Chat event handlers set up');
}

// Add chat message to UI
function addChatMessage(message, isOwn) {
  const chatMessages = $('#chat-messages');
  const messageDiv = $('<div>')
    .addClass('chat-message')
    .addClass(isOwn ? 'own' : 'opponent')
    .text(message);
  
  chatMessages.append(messageDiv);
  chatMessages.scrollTop(chatMessages[0].scrollHeight);
  
  // Auto-remove after 10 seconds for opponent messages
  if (!isOwn) {
    setTimeout(() => {
      messageDiv.fadeOut(300, function() {
        $(this).remove();
      });
    }, 10000);
  }
}

// Initialize chat when DOM is ready or when game starts
$(document).ready(function() {
  // Try to initialize chat immediately
  if ($('#chat-toggle').length > 0) {
    initializeChat();
  } else {
    // If chat elements not ready yet, try again after a short delay
    setTimeout(function() {
      if ($('#chat-toggle').length > 0) {
        initializeChat();
      }
    }, 500);
  }
});

// Also initialize chat when game starts (in case DOM ready already fired)
function ensureChatInitialized() {
  console.log('ensureChatInitialized called');
  console.log('jQuery available:', typeof $ !== 'undefined');
  console.log('Chat toggle exists:', $('#chat-toggle').length > 0);
  
  // Remove any existing event handlers first to prevent duplicates
  $('#chat-toggle').off('click.chat');
  $('#chat-close').off('click.chat');
  $('.chat-quick-btn').off('click.chat');
  
  if ($('#chat-toggle').length > 0) {
    console.log('Initializing chat component...');
    // Force visibility
    $('#chat-container').css({
      'display': 'block',
      'visibility': 'visible',
      'opacity': '1',
      'z-index': '10000'
    });
    $('#chat-toggle').css({
      'display': 'block',
      'visibility': 'visible',
      'opacity': '1'
    });
    
    initializeChat();
    $('#chat-toggle').data('initialized', true);
    console.log('Chat component initialized successfully');
  } else {
    console.warn('Chat toggle button not found! Retrying...');
    console.log('Available elements with id:', $('[id*="chat"]').map(function() { return this.id; }).get());
    // Retry after a delay
    setTimeout(function() {
      if ($('#chat-toggle').length > 0) {
        $('#chat-container').css({
          'display': 'block',
          'visibility': 'visible',
          'opacity': '1'
        });
        initializeChat();
        $('#chat-toggle').data('initialized', true);
        console.log('Chat component initialized on retry');
      } else {
        console.error('Chat toggle still not found after retry!');
      }
    }, 1000);
  }
}

// Expose functions to window for React component access
window.initializePlayerAssignment = initializePlayerAssignment;
window.initializeSocket = initializeSocket;
window.showDiceOnOtherScreen = showDiceOnOtherScreen;
window.ensureChatInitialized = ensureChatInitialized;
