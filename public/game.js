document.addEventListener("DOMContentLoaded", () => {
    if (typeof io !== "function") {
        alert("❌ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการตั้งค่า");
        return;
    }

    const socket = io();
    let readyPlayers = new Set();

    document.getElementById("joinGame").addEventListener("click", () => {
        const playerName = document.getElementById("playerName").value.trim();
        if (!playerName) return alert("กรุณากรอกชื่อของคุณ!");

        socket.emit("joinGame", { playerName });
        document.getElementById("loginSection").style.display = "none";
        document.getElementById("gameBoard").style.display = "block";
    });

    socket.on("updatePlayers", data => {
        const playerCount = data.players.length;
        const playerInfo = document.getElementById("playerInfo");
        if (playerInfo) {
            playerInfo.textContent = `ผู้เล่นในเกม: ${playerCount}/4`;
        }

        const startGameButton = document.getElementById("startGame");
        if (startGameButton) {
            startGameButton.style.display = (playerCount === 4) ? "inline-block" : "none";
        }
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
        const readyStatus = document.getElementById("readyStatus");
        if (readyStatus) {
            readyStatus.innerHTML = `🟢 ผู้เล่นที่กดเริ่มเกม: ${Array.from(readyPlayers).join(", ")}`;
        }
    }

    socket.on("startGame", () => {
        const startGameButton = document.getElementById("startGame");
        if (startGameButton) {
            startGameButton.style.display = "none";
        }

        const readyStatus = document.getElementById("readyStatus");
        if (readyStatus) {
            readyStatus.innerHTML = "🎲 เกมเริ่มแล้ว!";
        }
    });

    socket.on("dealCards", cards => {
        const handContainer = document.getElementById("player-hand");
        if (handContainer) {
            handContainer.innerHTML = '';

            cards.forEach(card => {
                const cardElement = document.createElement('div');
                cardElement.className = "card";
                cardElement.draggable = true;
                cardElement.dataset.card = card;
                cardElement.textContent = card;

                if (card.includes("♦") || card.includes("♥")) {
                    cardElement.classList.add("red-card");
                } else {
                    cardElement.classList.add("black-card");
                }

                cardElement.addEventListener('dragstart', handleDragStart);
                handContainer.appendChild(cardElement);
            });

            console.log("✅ ไพ่ถูกแจกแล้ว!");
        }
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
        document.getElementById("submitHand").style.backgroundColor = "#ccc";
    });

    function getCardsFromPile(pileId) {
        return Array.from(document.getElementById(pileId).children)
                    .map(card => card.dataset.card);
    }

    socket.on("showScores", scores => {
        const scoreboard = document.getElementById("scoreboard");
        if (scoreboard) {
            scoreboard.innerHTML = "<h3>คะแนนผู้เล่น</h3>";

            Object.entries(scores).forEach(([player, score]) => {
                let scoreElement = document.createElement("p");
                scoreElement.textContent = `${player}: ${score} คะแนน`;
                scoreboard.appendChild(scoreElement);
            });

            const restartGameButton = document.getElementById("restartGame");
            if (restartGameButton) {
                restartGameButton.style.display = "block";
            }
        }
    });

    socket.on("gameReset", () => {
        document.getElementById("player-hand").innerHTML = "";
        document.getElementById("scoreboard").innerHTML = "";
        document.getElementById("readyStatus").innerHTML = "";
        
        const submitHandButton = document.getElementById("submitHand");
        if (submitHandButton) {
            submitHandButton.disabled = false;
            submitHandButton.style.backgroundColor = "#28a745";
        }

        const restartGameButton = document.getElementById("restartGame");
        if (restartGameButton) {
            restartGameButton.style.display = "none";
        }

        document.getElementById("topPile").innerHTML = "กองบน (3 ใบ)";
        document.getElementById("middlePile").innerHTML = "กองกลาง (5 ใบ)";
        document.getElementById("bottomPile").innerHTML = "กองล่าง (5 ใบ)";
    });
});
