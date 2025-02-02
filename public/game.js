const socket = io();
let playerName = localStorage.getItem("playerName") || "";
let readyPlayers = new Set();

document.getElementById("joinGame").addEventListener("click", () => {
    playerName = document.getElementById("playerName").value.trim();
    if (!playerName) return alert("กรุณากรอกชื่อของคุณ");

    localStorage.setItem("playerName", playerName);
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("playerInfo").style.display = "block";
    document.getElementById("gameBoard").style.display = "block";

    socket.emit("joinGame", { playerName });
});

socket.on("updatePlayers", data => {
    const player = data.players.find(p => p.id === socket.id);
    const playerCount = data.players.length;
    
    if (player) {
        document.getElementById("playerInfo").textContent = `ชื่อคุณ: ${player.playerName} (รอผู้เล่น ${playerCount}/4)`;
    }
    
    document.getElementById("startGame").style.display = 
        playerCount === 4 ? "inline-block" : "none";
});

document.getElementById("startGame").addEventListener("click", () => {
    socket.emit("playerReady");
    document.getElementById("startGame").disabled = true;
});

socket.on("playerReady", data => {
    readyPlayers.add(data.playerName);
    updateReadyStatus();
});

function updateReadyStatus() {
    document.getElementById("readyStatus").innerHTML = 
        `🟢 ผู้เล่นที่กดเริ่มเกม: ${Array.from(readyPlayers).join(", ")}`;
}

socket.on("startGame", () => {
    document.getElementById("startGame").style.display = "none";
    document.getElementById("readyStatus").innerHTML = "";
});

socket.on("dealCards", cards => {
    const handContainer = document.getElementById('player-hand');
    handContainer.innerHTML = '';

    cards.forEach(card => {
        const suit = card.slice(-1);
        const isRed = suit === "♦" || suit === "♥";
        const cardElement = document.createElement('div');

        cardElement.className = `card ${isRed ? 'red' : 'black'}`;
        cardElement.draggable = true;
        cardElement.dataset.card = card;
        cardElement.textContent = card;
        cardElement.addEventListener('dragstart', handleDragStart);
        handContainer.appendChild(cardElement);
    });

    document.getElementById("submitHand").style.display = "inline-block";
});

function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.card);
}

document.getElementById("submitHand").addEventListener("click", () => {
    const hand = {
        topPile: getCardsFromPile("topPile"),
        middlePile: getCardsFromPile("middlePile"),
        bottomPile: getCardsFromPile("bottomPile")
    };

    if (hand.topPile.length !== 3 || hand.middlePile.length !== 5 || hand.bottomPile.length !== 5) {
        alert("กรุณาจัดไพ่ให้ครบ 3 กอง (3/5/5 ใบ)");
        return;
    }

    socket.emit("submitHand", { playerId: socket.id, hand });
    document.getElementById("submitHand").disabled = true;
});

function getCardsFromPile(pileId) {
    return Array.from(document.getElementById(pileId).children)
                .map(card => card.dataset.card);
}

socket.on("showScores", scores => {
    let scoreboard = document.getElementById("scoreboard");
    scoreboard.innerHTML = "<h3>คะแนนผู้เล่น</h3>";
    
    Object.entries(scores).forEach(([player, score]) => {
        let scoreElement = document.createElement("p");
        scoreElement.textContent = `${player}: ${score} คะแนน`;
        scoreboard.appendChild(scoreElement);
    });
});

socket.on("showFinalHands", finalHands => {
    let finalHandsContainer = document.getElementById("finalHands");
    let handsContainer = document.getElementById("handsContainer");
    handsContainer.innerHTML = "";

    Object.entries(finalHands).forEach(([playerId, hand]) => {
        let playerDiv = document.createElement("div");
        playerDiv.innerHTML = `<strong>ผู้เล่น ${playerId}:</strong> <br>
            กองบน: ${hand.topPile.join(", ")}<br>
            กองกลาง: ${hand.middlePile.join(", ")}<br>
            กองล่าง: ${hand.bottomPile.join(", ")}`;
        handsContainer.appendChild(playerDiv);
    });

    finalHandsContainer.style.display = "block";
});

document.getElementById("restartGame").addEventListener("click", () => {
    socket.emit("restartGame");
});

socket.on("gameReset", () => {
    document.getElementById("player-hand").innerHTML = "";
    document.getElementById("scoreboard").innerHTML = "";
    document.getElementById("finalHands").style.display = "none";
    document.getElementById("submitHand").disabled = false;
    document.getElementById("restartGame").style.display = "none";
});
