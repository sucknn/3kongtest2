document.addEventListener("DOMContentLoaded", () => {
    if (typeof io !== "function") {
        alert("❌ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการตั้งค่า");
        return;
    }

    const socket = io();

    // ✅ กดปุ่ม "เข้าร่วมเกม"
    document.getElementById("joinGame").addEventListener("click", () => {
        const playerName = document.getElementById("playerName").value.trim();
        if (!playerName) return alert("กรุณากรอกชื่อของคุณ!");

        socket.emit("joinGame", { playerName });
        document.getElementById("loginSection").style.display = "none";
        document.getElementById("gameBoard").style.display = "block";
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
            cardElement.addEventListener("touchstart", handleTouchStart);
            cardElement.addEventListener("touchmove", handleTouchMove);
            cardElement.addEventListener("touchend", handleTouchEnd);
            handContainer.appendChild(cardElement);
        });
    });

    function handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.dataset.card);
    }

    let selectedCard = null;
    function handleTouchStart(e) {
        selectedCard = e.target;
        selectedCard.style.zIndex = "1000";
        selectedCard.style.transform = "scale(1.1)";
    }

    function handleTouchMove(e) {
        if (!selectedCard) return;
        let touch = e.touches[0];
        selectedCard.style.transform = `translate(${touch.clientX}px, ${touch.clientY}px) scale(1.1)`;
        e.preventDefault();
    }

    function handleTouchEnd(e) {
        if (!selectedCard) return;
        selectedCard.style.transform = "scale(1)";
        selectedCard = null;
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

        pile.addEventListener("touchend", event => {
            if (!selectedCard) return;
            event.target.appendChild(selectedCard);
            selectedCard.style.position = "static";
            selectedCard = null;
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

        document.getElementById("restartGame").style.display = "block"; // ✅ แสดงปุ่มเริ่มเกมใหม่
    });

    // ✅ แสดงไพ่ของผู้เล่นทั้งหมดหลังจบเกม
    socket.on("showFinalHands", finalHands => {
        let finalHandsContainer = document.getElementById("finalHands");
        let handsContainer = document.getElementById("handsContainer");
        handsContainer.innerHTML = "";

        Object.values(finalHands).forEach(playerData => {
            let playerDiv = document.createElement("div");
            playerDiv.innerHTML = `<strong>ผู้เล่น ${playerData.playerName}:</strong> <br>
                กองบน: ${playerData.hand.topPile.join(", ")}<br>
                กองกลาง: ${playerData.hand.middlePile.join(", ")}<br>
                กองล่าง: ${playerData.hand.bottomPile.join(", ")}`;
            handsContainer.appendChild(playerDiv);
        });

        finalHandsContainer.style.display = "block";
    });

    // ✅ กดปุ่ม "เริ่มเกมใหม่"
    document.getElementById("restartGame").addEventListener("click", () => {
        socket.emit("restartGame");
    });

    // ✅ รีเซ็ตเกม
    socket.on("gameReset", () => {
        document.getElementById("player-hand").innerHTML = "";
        document.getElementById("scoreboard").innerHTML = "";
        document.getElementById("finalHands").style.display = "none";
        document.getElementById("submitHand").disabled = false;
        document.getElementById("restartGame").style.display = "none";

        document.getElementById("topPile").innerHTML = "กองบน (3 ใบ)";
        document.getElementById("middlePile").innerHTML = "กองกลาง (5 ใบ)";
        document.getElementById("bottomPile").innerHTML = "กองล่าง (5 ใบ)";
    });

    // ✅ ตรวจสอบการเชื่อมต่อเซิร์ฟเวอร์
    socket.on("connect", () => {
        console.log("✅ เชื่อมต่อเซิร์ฟเวอร์สำเร็จ");
    });

    socket.on("disconnect", () => {
        console.log("❌ การเชื่อมต่อกับเซิร์ฟเวอร์ขาดหาย");
    });
});
