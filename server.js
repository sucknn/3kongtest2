const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

let players = [];
let readyPlayers = new Set();
let gameStarted = false;
let submittedHands = {};

io.on("connection", (socket) => {
    console.log(`✅ ผู้เล่นใหม่เชื่อมต่อ: ${socket.id}`);

    socket.on("joinGame", ({ playerName }) => {
        if (players.length >= 4) {
            socket.emit("gameFull", "❌ ผู้เล่นเต็มแล้ว!");
            return;
        }

        const player = { id: socket.id, playerName };
        players.push(player);

        io.emit("updatePlayers", { players });
        console.log(`✅ ${playerName} เข้าร่วมเกม (ผู้เล่น: ${players.length}/4)`);
    });

    socket.on("playerReady", () => {
        const player = players.find(p => p.id === socket.id);
        if (!player) return;

        readyPlayers.add(socket.id);
        io.emit("playerReady", { playerName: player.playerName });

        console.log(`✅ ${player.playerName} กดเริ่มเกมแล้ว! (${readyPlayers.size}/4)`);

        if (readyPlayers.size === 4 && players.length === 4 && !gameStarted) {
            gameStarted = true;
            io.emit("startGame");
            startGame();
        }
    });

    socket.on("submitHand", data => {
        const player = players.find(p => p.id === data.playerId);
        if (!player) return;

        submittedHands[data.playerId] = {
            playerName: player.playerName,
            hand: data.hand
        };

        console.log(`✅ ${player.playerName} ส่งไพ่แล้ว (${Object.keys(submittedHands).length}/4)`);

        if (Object.keys(submittedHands).length === 4) {
            let scores = calculateScore(submittedHands);
            io.emit("showScores", scores);
            io.emit("showFinalHands", submittedHands);
            submittedHands = {};
        }
    });

    socket.on("restartGame", () => {
        console.log("🔄 เริ่มเกมใหม่!");

        readyPlayers.clear();
        gameStarted = false;
        submittedHands = {};

        io.emit("gameReset");
        io.emit("updatePlayers", { players });

        startGame();
    });

    socket.on("disconnect", () => {
        players = players.filter(p => p.id !== socket.id);
        readyPlayers.delete(socket.id);
        delete submittedHands[socket.id];

        io.emit("updatePlayers", { players });
        io.emit("playerLeft", "❌ มีผู้เล่นออกจากเกม!");

        console.log(`❌ ผู้เล่น ${socket.id} ออกจากเกม (เหลือ ${players.length}/4)`);
    });
});

// ✅ เริ่มเกมและแจกไพ่
function startGame() {
    if (players.length !== 4) {
        console.log("❌ ผู้เล่นยังไม่ครบ 4 คน, รอให้ครบก่อนเริ่มเกม...");
        return;
    }

    const deck = createDeck();
    shuffleDeck(deck);

    players.forEach(player => {
        const playerHand = deck.splice(0, 13);
        io.to(player.id).emit("dealCards", playerHand);
    });

    console.log("✅ แจกไพ่ให้ผู้เล่นทุกคนแล้ว!");
}

// ✅ สร้างสำรับไพ่
function createDeck() {
    const suits = ["♠", "♥", "♦", "♣"];
    const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    return suits.flatMap(suit => ranks.map(rank => rank + suit));
}

// ✅ สับไพ่
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// ✅ คำนวณคะแนน (แก้ไขให้เปรียบเทียบทุกมือ)
function calculateScore(hands) {
    let scores = {};
    players.forEach(player => scores[player.playerName] = 0);

    for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
            let player1 = players[i];
            let player2 = players[j];

            let hand1 = hands[player1.id];
            let hand2 = hands[player2.id];

            if (!hand1 || !hand2) continue;

            let scoreChange = compareHands(hand1, hand2);
            
            console.log(`🎯 เปรียบเทียบ ${player1.playerName} กับ ${player2.playerName}: ${scoreChange}`);

            scores[player1.playerName] += scoreChange[0];
            scores[player2.playerName] += scoreChange[1];
        }
    }

    console.log("✅ คะแนนที่คำนวณได้:", scores);
    return scores;
}

// ✅ เปรียบเทียบไพ่
function compareHands(hand1, hand2) {
    let result = [0, 0];
    let handTypes = ["topPile", "middlePile", "bottomPile"];
    let totalWin1 = 0, totalWin2 = 0;

    handTypes.forEach(type => {
        if (!hand1[type] || !hand2[type]) return;

        let score1 = evaluateHand(hand1[type]);
        let score2 = evaluateHand(hand2[type]);

        console.log(`📊 เปรียบเทียบกอง ${type} → P1: ${score1} | P2: ${score2}`);

        if (score1 > score2) { result[0] += 1; result[1] -= 1; totalWin1++; }
        else if (score1 < score2) { result[0] -= 1; result[1] += 1; totalWin2++; }
    });

    if (totalWin1 === 3) result[0] += 3;
    if (totalWin2 === 3) result[1] += 3;

    return result;
}

// ✅ คำนวณคะแนนของไพ่แต่ละกอง
function evaluateHand(cards) {
    if (!cards || cards.length === 0) return 0; // ถ้าไม่มีไพ่ให้คะแนนเป็น 0

    const rankOrder = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    let rankCounts = {}, suits = new Set(), values = [];

    cards.forEach(card => {
        let rank = card.slice(0, -1);
        let suit = card.slice(-1);
        values.push(rankOrder.indexOf(rank));
        suits.add(suit);
        rankCounts[rank] = (rankCounts[rank] || 0) + 1;
    });

    values.sort((a, b) => a - b);
    let isFlush = suits.size === 1;
    let isStraight = values.every((val, i, arr) => i === 0 || val === arr[i - 1] + 1);
    let counts = Object.values(rankCounts);

    let score = 0;
    if (isFlush && isStraight) score = 8;
    else if (counts.includes(3) && counts.includes(2)) score = 7;
    else if (isFlush) score = 6;
    else if (isStraight) score = 5;
    else if (counts.includes(3)) score = 4;
    else if (counts.filter(c => c === 2).length === 2) score = 3;
    else if (counts.includes(2)) score = 2;
    else score = Math.max(...values) / 100;

    console.log(`🃏 คำนวณไพ่: ${cards} → คะแนน: ${score}`);
    return score;
}
