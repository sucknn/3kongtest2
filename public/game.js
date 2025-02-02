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

    document.getElementById("startGame").style.display = (playerCount === 4) ? "inline-block" : "none";
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

    enableDragAndDrop(); // ให้แน่ใจว่าไพ่สามารถลากได้
    document.getElementById("submitHand").style.display = "inline-block";
});

// ฟังก์ชัน Drag & Drop (PC และมือถือ)
function enableDragAndDrop() {
    const cards = document.querySelectorAll('.card');
    const piles = document.querySelectorAll('.pile');

    cards.forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('touchstart', handleTouchStart);
        card.addEventListener('touchmove', handleTouchMove);
        card.addEventListener('touchend', handleTouchEnd);
    });

    piles.forEach(pile => {
        pile.addEventListener('dragover', handleDragOver);
        pile.addEventListener('drop', handleDrop);
    });
}

let draggedCard = null;

function handleDragStart(e) {
    draggedCard = e.target;
    e.dataTransfer.setData('text/plain', e.target.dataset.card);
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    if (draggedCard) {
        e.target.appendChild(draggedCard);
        draggedCard = null;
    }
}

// รองรับมือถือ (Touch Event)
function handleTouchStart(e) {
    draggedCard = e.target;
    e.target.style.opacity = "0.5";
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    draggedCard.style.position = "absolute";
    draggedCard.style.left = `${touch.clientX - 30}px`;
    draggedCard.style.top = `${touch.clientY - 40}px`;
}

function handleTouchEnd(e) {
    draggedCard.style.opacity = "1";
    draggedCard.style.position = "static";

    const piles = document.querySelectorAll('.pile');
    piles.forEach(pile => {
        const rect = pile.getBoundingClientRect();
        if (e.changedTouches[0].clientX >= rect.left &&
            e.changedTouches[0].clientX <= rect.right &&
            e.changedTouches[0].clientY >= rect.top &&
            e.changedTouches[0].clientY <= rect.bottom) {
            pile.appendChild(draggedCard);
        }
    });

    draggedCard = null;
}

// ฟังก์ชันส่งไพ่ไปยังเซิร์ฟเวอร์
document.getElementById("submitHand").addEventListener("click", () => {
    const topPile = getPileCards("topPile");
    const middlePile = getPileCards("middlePile");
    const bottomPile = getPileCards("bottomPile");

    if (topPile.length !== 3 || middlePile.length !== 5 || bottomPile.length !== 5) {
        alert("❌ กรุณาจัดไพ่ให้ครบ 3-5-5 ก่อนส่ง!");
        return;
    }

    socket.emit("submitHand", {
        playerId: socket.id,
        hand: {
            topPile,
            middlePile,
            bottomPile
        }
    });

    document.getElementById("submitHand").disabled = true; // ป้องกันการกดซ้ำ
});

function getPileCards(pileId) {
    return [...document.querySelectorAll(`#${pileId} .card`)].map(c => c.dataset.card);
}

// แสดงผลคะแนน
socket.on("showScores", scores => {
    let scoreBoard = document.getElementById("scoreboard");
    scoreBoard.innerHTML = "<h2>คะแนนรวม</h2>";

    for (let player in scores) {
        let color = scores[player] > 0 ? "green" : scores[player] < 0 ? "red" : "black";
        scoreBoard.innerHTML += `<p style="color: ${color}">${player}: ${scores[player]} คะแนน</p>`;
    }

    document.getElementById("restartGame").style.display = "inline-block";
});

// ปุ่มเริ่มเกมใหม่
document.getElementById("restartGame").addEventListener("click", () => {
    socket.emit("restartGame");
    document.getElementById("restartGame").style.display = "none";
});
