document.addEventListener("DOMContentLoaded", () => {
    if (typeof io !== "function") {
        alert("❌ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการตั้งค่า");
        return;
    }

    const socket = io();
    let readyPlayers = new Set();

    // ✅ กดปุ่ม "เข้าร่วมเกม"
    document.getElementById("joinGame").addEventListener("click", () => {
        const playerName = document.getElementById("playerName").value.trim();
        if (!playerName) return alert("กรุณากรอกชื่อของคุณ!");

        socket.emit("joinGame", { playerName });
        document.getElementById("loginSection").style.display = "none";
        document.getElementById("gameBoard").style.display = "block";
    });

    // ✅ อัปเดตข้อมูลผู้เล่น & แสดงปุ่มเริ่มเกม
    socket.on("updatePlayers", data => {
        const playerCount = data.players.length;
        document.getElementById("playerInfo").textContent = `ผู้เล่นในเกม: ${playerCount}/4`;

        // ถ้ามีครบ 4 คนให้แสดงปุ่ม "เริ่มเกม"
        document.getElementById("startGame").style.display = (playerCount === 4) ? "inline-block" : "none";
    });

    // ✅ กดปุ่ม "เริ่มเกม"
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

        if (readyPlayers.size === 4) {
            document.getElementById("startGame").style.display = "none";
        }
    }

    socket.on("startGame", () => {
        document.getElementById("startGame").style.display = "none";
        document.getElementById("readyStatus").innerHTML = "🎲 เกมเริ่มแล้ว!";
    });

    // ✅ แสดงไพ่ที่แจกให้ผู้เล่น
    socket.on("dealCards", cards => {
        const handContainer = document.getElementById("player-hand");
        handContainer.innerHTML = '';

        cards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = "card";
            cardElement.draggable = true;
            cardElement.dataset.card = card;
            cardElement.textContent = card;
            cardElement.addEventListener('dragstart', handleDragStart);
            handContainer.appendChild(cardElement);
        });

        console.log("✅ ไพ่ถูกแจกแล้ว!");
    });

    function handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.dataset.card);
    }

    // ✅ รองรับการลากไพ่เข้า-ออกจากกอง
    document.querySelectorAll(".pile").forEach(pile => {
        pile.addEventListener("dragover", event => event.preventDefault());

        pile.addEventListener("drop", event => {
            event.preventDefault();
            const cardValue = event.dataTransfer.getData("text/plain");
            if (!cardValue) return;

            const draggedCard = document.querySelector(`[data-card='${cardValue}']`);
            if (draggedCard) {
                event.target.appendChild(draggedCard);
                draggedCard.draggable = true;
                draggedCard.addEventListener("dragstart", handleDragStart);
            }
        });
    });

    // ✅ กดปุ่ม "ส่งไพ่"
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

    // ✅ แสดงผลคะแนน
    socket.on("showScores", scores => {
        let scoreboard = document.getElementById("scoreboard");
        scoreboard.innerHTML = "<h3>คะแนนผู้เล่น</h3>";

        Object.entries(scores).forEach(([player, score]) => {
            let scoreElement = document.createElement("p");
            scoreElement.textContent = `${player}: ${score} คะแนน`;
            scoreboard.appendChild(scoreElement);
        });

        document.getElementById("restartGame").style.display = "block";
    });

    // ✅ กดปุ่ม "เริ่มเกมใหม่"
    document.getElementById("restartGame").addEventListener("click", () => {
        socket.emit("restartGame");
    });

    // ✅ รีเซ็ตเกม
    socket.on("gameReset", () => {
        document.getElementById("player-hand").innerHTML = "";
        document.getElementById("scoreboard").innerHTML = "";
        document.getElementById("readyStatus").innerHTML = "";
        document.getElementById("submitHand").disabled = false;
        document.getElementById("restartGame").style.display = "none";

        document.getElementById("topPile").innerHTML = "กองบน (3 ใบ)";
        document.getElementById("middlePile").innerHTML = "กองกลาง (5 ใบ)";
        document.getElementById("bottomPile").innerHTML = "กองล่าง (5 ใบ)";
    });
});
