cconst socket = io();

document.getElementById("joinGame").addEventListener("click", () => {
    const playerName = document.getElementById("playerName").value.trim();
    if (!playerName) return alert("กรุณากรอกชื่อของคุณ!");

    socket.emit("joinGame", { playerName });
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("gameBoard").style.display = "block";
});

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

socket.on("gameReset", () => {
    document.getElementById("player-hand").innerHTML = "";
    document.getElementById("scoreboard").innerHTML = "";
    document.getElementById("finalHands").style.display = "none";
    document.getElementById("submitHand").disabled = false;
    document.getElementById("restartGame").style.display = "block";

    document.getElementById("topPile").innerHTML = "กองบน (3 ใบ)";
    document.getElementById("middlePile").innerHTML = "กองกลาง (5 ใบ)";
    document.getElementById("bottomPile").innerHTML = "กองล่าง (5 ใบ)";
});
