const socket = io();
let playerName = localStorage.getItem("playerName") || "";

document.getElementById("joinGame").addEventListener("click", () => {
    playerName = document.getElementById("playerName").value.trim();
    if (!playerName) return alert("กรุณากรอกชื่อของคุณ");

    localStorage.setItem("playerName", playerName);
    socket.emit("joinGame", { playerName });
});

socket.on("updatePlayers", data => {
    document.getElementById("playerInfo").textContent = `รอผู้เล่น ${data.players.length}/4`;
});

document.getElementById("startGame").addEventListener("click", () => {
    socket.emit("playerReady");
    document.getElementById("startGame").disabled = true;
});

socket.on("dealCards", cards => {
    console.log("ไพ่ของคุณ:", cards);
});

socket.on("showFinalHands", finalHands => {
    let finalHandsContainer = document.getElementById("finalHands");
    finalHandsContainer.innerHTML = "<h3>ไพ่ของผู้เล่นทั้งหมด</h3>";

    Object.entries(finalHands).forEach(([playerId, hand]) => {
        let player = document.createElement("div");
        player.innerHTML = `<strong>${playerId}</strong>: ${JSON.stringify(hand)}`;
        finalHandsContainer.appendChild(player);
    });

    finalHandsContainer.style.display = "block";
});

