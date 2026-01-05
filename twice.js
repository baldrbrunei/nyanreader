// ================= TWICE.JS =================
// режим разделения экрана ТОЛЬКО для мобильного раннера

(function(){

// ---------- GUARDS ----------
if (typeof State === "undefined") return;
if (typeof canvas === "undefined") return;
if (typeof ctx === "undefined") return;

// ---------- STATE ----------
const Twice = {
    enabled: false,
    words: [],
    lines: [],
    lineHeight: 36,
    padding: 10,
    lastWordIndex: 0
};

// ---------- MOBILE CHECK ----------
function isMobilePortrait(){
    return (
        window.innerWidth <= 768 &&
        window.innerHeight > window.innerWidth
    );
}

// ---------- SHOULD RUN ----------
function shouldRun(){
    return (
        State.gameStarted &&
        !State.paused &&
        State.currentBook &&
        State.words &&
        State.words.length > 0 &&
        isMobilePortrait()
    );
}

// ---------- INIT ----------
function initTwice(){
    Twice.enabled = true;
    Twice.words = State.words;
    Twice.lastWordIndex = State.currentWordIndex;
    Twice.lines = [];
}

// ---------- BUILD LINE ----------
function buildLine(maxWidth){
    let line = "";
    let startIndex = State.currentWordIndex;

    while(State.currentWordIndex < Twice.words.length){
        let test = line + Twice.words[State.currentWordIndex] + " ";
        ctx.font = "bold 26px monospace";
        if(ctx.measureText(test).width > maxWidth && line !== "") break;
        line = test;
        State.currentWordIndex++;
    }

    if(State.currentWordIndex === startIndex) return null;
    return line.trim();
}

// ---------- SPAWN ----------
function spawnLines(){
    const maxWidth = canvas.width - Twice.padding * 2;

    while(Twice.lines.length < 5){
        const line = buildLine(maxWidth);
        if(!line) break;

        Twice.lines.push({
            text: line,
            y: canvas.height * 0.5 - Twice.lineHeight
        });
    }
}

// ---------- UPDATE ----------
function updateLines(){
    const speed = State.speed || 1.5;
    for(let l of Twice.lines){
        l.y -= speed;
    }

    Twice.lines = Twice.lines.filter(
        l => l.y + Twice.lineHeight > 0
    );
}

// ---------- DRAW READING ----------
function drawReading(){
    const h = canvas.height * 0.5;

    // фон
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, h);

    // линии
    ctx.font = "bold 26px monospace";
    for(let l of Twice.lines){
        let x = Twice.padding;
        let y = l.y + Twice.lineHeight;

        if(State.bionic){
            let split = Math.ceil(l.text.length * 0.4);
            let a = l.text.slice(0, split);
            let b = l.text.slice(split);

            ctx.fillStyle = State.bionicColor || "#ffff00";
            ctx.fillText(a, x, y);
            ctx.fillStyle = "#ffffff";
            ctx.fillText(b, x + ctx.measureText(a).width, y);
        } else {
            ctx.fillStyle = "#ffffff";
            ctx.fillText(l.text, x, y);
        }
    }
}

// ---------- DRAW RUNNER ----------
function drawRunner(){
    const h = canvas.height * 0.5;
    ctx.save();
    ctx.translate(0, h);
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, h);
    ctx.clip();
    draw(); // ТВОЙ draw() ИЗ main.js
    ctx.restore();
}

// ---------- LOOP ----------
function loop(){
    if(shouldRun()){
        if(!Twice.enabled) initTwice();
        spawnLines();
        updateLines();

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawReading();
        drawRunner();
    } else {
        Twice.enabled = false;
    }

    requestAnimationFrame(loop);
}

loop();

// ---------- RESIZE ----------
window.addEventListener("resize", ()=>{
    Twice.enabled = false;
});

})();
