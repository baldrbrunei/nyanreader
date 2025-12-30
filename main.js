// ----------------- STATE -----------------
const State = {
    bionic: true,
    bwMode: false,
    paused: false,
    gameStarted: false,
    words: [],
    bilingveWords: [],
    currentWordIndex: 0,
    scoreWords: 0,
    scoreHits: 0,
    speed: 2,
    currentBook: null,
    readingMode: "normal",
    books: [],
    bilingveBooks: [],
    bookLabelScale: 1
};

// ----------------- CANVAS -----------------
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let W = canvas.width = window.innerWidth;
let H = canvas.height = window.innerHeight;

const startScreen = document.getElementById("startScreen");
const startCatCanvas = document.getElementById("startCatCanvas");
const startCtx = startCatCanvas.getContext("2d");
startCatCanvas.width = W;
startCatCanvas.height = H;

const jumpMenu = document.getElementById("jumpMenu");

// ----------------- HUD -----------------
const pauseOverlay = document.getElementById("pauseOverlay");
const toggleBW = document.getElementById("toggleBW");
const toggleBionic = document.getElementById("toggleBionic");
const speedSlider = document.getElementById("speedSlider");
const exitToMenu = document.getElementById("exitToMenu");
const volumeSlider = document.getElementById("volumeSlider");
const resumeBtn = document.getElementById("resumeButton");
const pauseButton = document.getElementById("pauseButton");

function playMenuMusic(){
    runnerMusic.pause();
    runnerMusic.currentTime = 0;
    menuMusic.volume = volumeSlider.value;
    menuMusic.play().catch(()=>{});
}

function playRunnerMusic(){
    menuMusic.pause();
    menuMusic.currentTime = 0;
    runnerMusic.volume = volumeSlider.value;
    runnerMusic.play().catch(()=>{});
}


// ----------------- AUDIO -----------------
const menuMusic = document.getElementById("menuMusic");
const runnerMusic = document.getElementById("runnerMusic");
menuMusic.volume = 0.5;
runnerMusic.volume = 0.5;

function playMenuMusic(){
    runnerMusic.pause();
    runnerMusic.currentTime = 0;

    menuMusic.volume = volumeSlider.value;
    menuMusic.loop = true;
    menuMusic.play();
}

function playRunnerMusic(){
    menuMusic.pause();
    menuMusic.currentTime = 0;

    runnerMusic.volume = volumeSlider.value;
    runnerMusic.loop = true;
    runnerMusic.play();
}

// ----------------- IMAGES -----------------
const catImage = new Image();
catImage.src = "assets/nyansheet.png";
const bgImage = new Image();
bgImage.src = "assets/background.jpg";

// ----------------- CAT -----------------
const CAT = {
    x: W*0.3,
    y: H/2,
    targetY: H/2,
    width: 100,
    height: 60,
    frame: 0,
    frameTimer: 0,
    frameSpeed: 6
};

const widths = [64,66,66,66,66,64];
const paddings = [2,5,7,7,5];
const catFrames = [];
let posX = 0;
for(let i=0;i<widths.length;i++){
    catFrames.push({x:posX, width:widths[i], height:39});
    posX += widths[i]+(paddings[i]||0);
}

// ----------------- CURRENT BOOK LABEL -----------------
State.bookLabel = { scale: 1.5, direction: -0.01 };

// ----------------- LIBRARY -----------------
const booksBlock = document.getElementById("booksBlock");
const bilingveBlock = document.getElementById("bilingveBlock");
const booksLibrary = document.getElementById("booksLibrary");
const bilingveLibrary = document.getElementById("bilingveLibrary");
const closeBooksLibrary = document.getElementById("closeBooksLibrary");
const closeBilingveLibrary = document.getElementById("closeBilingveLibrary");
const booksList = document.getElementById("booksList");
const bilingveList = document.getElementById("bilingveList");
const importBookBtn = document.getElementById("importBook");
const importBilingveBtn = document.getElementById("importBilingve");
const currentBookTitle = document.getElementById("currentBookTitle");

// ----------------- GAME ELEMENTS -----------------
const wordObjects = [];
const WORD_HEIGHT = 32;
const WORD_PADDING = 2;
const pipes = [];
const PIPE_WIDTH = 72;
const PIPE_GAP = 200;
const PIPE_BLOCK = 8;
const PIPE_CAP = 16;
const PIPE_INTERVAL = 360;
const rainbowColors = ["#ff004d","#ffa300","#fff024","#00e756","#29adff","#83769c"];
const RAINBOW_BLOCK = 8;
let rainbowTail = [];
let rainbowTick = 0;
let frameCount = 0;

// ----------------- START CAT ANIMATION -----------------
let startCatFrame = 0;
let startCatFrameTimer = 0;
const START_CAT_FRAME_SPEED = 12;

function drawStartCat(){
    if(State.gameStarted) return;
    startCtx.clearRect(0,0,startCatCanvas.width,startCatCanvas.height);
    if(bgImage.complete) startCtx.drawImage(bgImage,0,0,startCatCanvas.width,startCatCanvas.height);

    const f = catFrames[startCatFrame];
    const catW = 200, catH = 120;
    const catX = (startCatCanvas.width-catW)/2;
    const catY = (startCatCanvas.height-catH)/2;
    startCtx.drawImage(catImage,f.x,0,f.width,f.height,catX,catY,catW,catH);

    if(State.currentBook){
        drawStartBookLabel();
    }

    startCatFrameTimer++;
    if(startCatFrameTimer>=START_CAT_FRAME_SPEED){
        startCatFrame=(startCatFrame+1)%catFrames.length;
        startCatFrameTimer=0;
    }
    requestAnimationFrame(drawStartCat);
}

bgImage.onload = drawStartCat;
catImage.onload = drawStartCat;

// ----------------- PAUSE ICON -----------------
const PAUSE_WIDTH = 10;
const PAUSE_HEIGHT = 40;
const PAUSE_GAP = 8;
const PAUSE_X = () => W/2 - (PAUSE_WIDTH*2 + PAUSE_GAP)/2;
const PAUSE_Y = 20;

function drawPauseIcon(){
    const x = PAUSE_X();
    const y = PAUSE_Y;
    ctx.fillStyle = "white";
    ctx.fillRect(x, y, PAUSE_WIDTH, PAUSE_HEIGHT);
    ctx.fillRect(x + PAUSE_WIDTH + PAUSE_GAP, y, PAUSE_WIDTH, PAUSE_HEIGHT);
}

// ----------------- INPUT & POINTER -----------------
function setTargetY(y){
    if(State.paused) return;
    CAT.targetY = Math.max(0, Math.min(H-CAT.height, y));
}

function handlePointerMove(clientY, event){
    if(State.paused) return;
    if(event.target.closest("#pauseOverlay, #booksLibrary, #bilingveLibrary, #jumpMenu")) return;
    setTargetY(clientY);
}

canvas.addEventListener("mousedown", e => handlePointerMove(e.clientY, e));
canvas.addEventListener("mousemove", e => { if(e.buttons) handlePointerMove(e.clientY, e); });
canvas.addEventListener("touchstart", e => handlePointerMove(e.touches[0].clientY, e));
canvas.addEventListener("touchmove", e => handlePointerMove(e.touches[0].clientY, e));

// ----------------- LIBRARY HANDLERS -----------------
booksBlock.onclick = () => { booksLibrary.style.display = "flex"; };
bilingveBlock.onclick = () => { bilingveLibrary.style.display = "flex"; };
closeBooksLibrary.onclick = () => { booksLibrary.style.display = "none"; };
closeBilingveLibrary.onclick = () => { bilingveLibrary.style.display = "none"; };

function importBook(mode){
    const input = document.createElement("input");
    input.type="file";
    input.accept=".txt";
    input.onchange = e => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const content = reader.result.trim();
            const words = content.split(/\s+/);
            const book = { name: file.name, content, words, progress: 0 };
            if(mode === "normal") State.books.push(book);
            else State.bilingveBooks.push(book);
            updateLibraryList(mode);
        };
        reader.readAsText(file, "UTF-8");
    };
    input.click();
}

importBookBtn.onclick = ()=>importBook("normal");
importBilingveBtn.onclick = ()=>importBook("bilingve");

function updateLibraryList(mode){
    const list = mode==="normal" ? booksList : bilingveList;
    list.innerHTML="";
    const arr = mode==="normal" ? State.books : State.bilingveBooks;
    arr.forEach((book,i)=>{
        const div = document.createElement("div");
        div.className="bookItem";
        div.textContent = `${book.name} (${book.progress || 0}%)`;
        div.onclick = ()=> selectBook(mode,i);
        list.appendChild(div);
    });
}

function selectBook(mode,index){
    const arr = mode==="normal" ? State.books : State.bilingveBooks;
    State.currentBook = arr[index];
    State.readingMode = mode;
    State.words = State.currentBook.words || [];
    State.currentWordIndex = State.currentBook.progress || 0;
    currentBookTitle.textContent = State.currentBook.name;
    booksLibrary.style.display="none";
    bilingveLibrary.style.display="none";
    if(mode==="bilingve" && State.currentBook.bilingveContent){
        State.bilingveWords = State.currentBook.bilingveContent.split(/\s+/);
    } else { State.bilingveWords = []; }

    updateWordsCounter();
}


// ----------------- BOOK PROGRESS -----------------
function updateBookProgress(){
    if(State.currentBook && State.words.length>0){
        State.currentBook.progress = Math.floor(State.currentWordIndex/State.words.length*100);
    }
}

// ----------------- UPDATE -----------------
function update(){
    if(!State.gameStarted || State.paused) return;

    // CAT
    CAT.y += (CAT.targetY - CAT.y) * 0.12;
    CAT.frameTimer++;
    if(CAT.frameTimer>=CAT.frameSpeed){ CAT.frame=(CAT.frame+1)%catFrames.length; CAT.frameTimer=0; }

    // PIPES
    if(frameCount % PIPE_INTERVAL===0){
        const topHeight = 60 + Math.random()*(H-PIPE_GAP-120);
        pipes.push({x:W, topHeight, bottomHeight:H-topHeight-PIPE_GAP});
    }
    pipes.forEach(p=>p.x -= State.speed);
    while(pipes.length && pipes[0].x+PIPE_WIDTH<0) pipes.shift();

    // RAINBOW
    rainbowTick++;
    if(rainbowTick%4===0){
        const startX = CAT.x - RAINBOW_BLOCK*2 + 15;
        rainbowColors.forEach((c,i)=> rainbowTail.push({x:startX, y:CAT.y+i*RAINBOW_BLOCK, color:c}));
    }
    rainbowTail.forEach(r=>r.x-=State.speed);
    rainbowTail = rainbowTail.filter(r=>r.x+RAINBOW_BLOCK>0);

    // WORDS SPAWN
    let currentWords = State.readingMode==="normal" ? State.words : State.bilingveWords;
    if(State.currentWordIndex<currentWords.length){
        let lastWord = wordObjects[wordObjects.length-1];
        let canSpawn = !lastWord || lastWord.x + lastWord.w <= CAT.x - RAINBOW_BLOCK*2;
        if(canSpawn){
            const text = currentWords[State.currentWordIndex];
            ctx.font = "bold 28px monospace";
            const w = ctx.measureText(text).width + WORD_PADDING*2;
            wordObjects.push({text, x:!lastWord ? CAT.x - RAINBOW_BLOCK*2 - w : lastWord.x + lastWord.w + 1, y:CAT.y + CAT.height/2, w});
            State.currentWordIndex++;
        }
    }

    // WORDS MOVE
    wordObjects.forEach(w => w.x -= State.speed);
    for(let i = wordObjects.length-1; i>=0; i--){
        if(wordObjects[i].x + wordObjects[i].w < 0){
            wordObjects.splice(i,1);

        }
    }

    // COLLISIONS
    let hitThisFrame = false;
    pipes.forEach(pipe=>{
        const catTop = CAT.y, catBottom=CAT.y+CAT.height, catLeft=CAT.x, catRight=CAT.x+CAT.width;
        const pipeTopBottom = pipe.topHeight, pipeBottomTop = H-pipe.bottomHeight, pipeLeft = pipe.x, pipeRight = pipe.x+PIPE_WIDTH;
        if(catRight>pipeLeft && catLeft<pipeRight && (catTop<pipeTopBottom || catBottom>pipeBottomTop)){
            hitThisFrame = true;
        }
    });
    frameCount++;
}

// ----------------- DRAW -----------------
function draw(){
    ctx.clearRect(0,0,W,H);
    // BACKGROUND
    ctx.drawImage(bgImage,0,0,W,H);
    // RAINBOW
    rainbowTail.forEach(r=>{ ctx.fillStyle=r.color; ctx.fillRect(r.x,r.y,RAINBOW_BLOCK*2,RAINBOW_BLOCK); });
    // WORDS
    ctx.font="bold 28px monospace";
    wordObjects.forEach(w=>{
        ctx.fillStyle="black";
        ctx.fillRect(w.x,w.y-WORD_HEIGHT/2,w.w,WORD_HEIGHT);
        ctx.fillStyle="white";
        ctx.fillText(w.text,w.x+WORD_PADDING,w.y+8);
    });
    // CAT
    const f = catFrames[CAT.frame];
    const offsetX = (Math.max(...widths)-f.width)/2;
    ctx.drawImage(catImage,f.x,0,f.width,f.height,CAT.x+offsetX,CAT.y,CAT.width,CAT.height);
    // PIPES
    pipes.forEach(p=>{ drawPipeTop(p.x,p.topHeight); drawPipeBottom(p.x,H-p.bottomHeight); });
    
    drawPauseIcon();
}

// ----------------- PIPE HELPERS -----------------
function drawPipeTop(x,h){
    for(let y=0;y<h-PIPE_CAP;y+=PIPE_BLOCK){
        ctx.fillStyle="#2ecc71"; ctx.fillRect(x,y,PIPE_WIDTH,PIPE_BLOCK);
        ctx.strokeStyle="#145a32"; ctx.strokeRect(x,y,PIPE_WIDTH,PIPE_BLOCK);
    }
    ctx.fillStyle="#27ae60"; ctx.fillRect(x-4,h-PIPE_CAP,PIPE_WIDTH+8,PIPE_CAP);
}
function drawPipeBottom(x,startY){
    ctx.fillStyle="#27ae60"; ctx.fillRect(x-4,startY,PIPE_WIDTH+8,PIPE_CAP);
    for(let y=startY+PIPE_CAP;y<H;y+=PIPE_BLOCK){
        ctx.fillStyle="#2ecc71"; ctx.fillRect(x,y,PIPE_WIDTH,PIPE_BLOCK);
        ctx.strokeStyle="#145a32"; ctx.strokeRect(x,y,PIPE_WIDTH,PIPE_BLOCK);
    }
}

// ----------------- LOOP -----------------
function loop(){ update(); draw(); if(State.gameStarted) requestAnimationFrame(loop); }

// ----------------- EVENT LISTENERS -----------------
startCatCanvas.addEventListener("click", e => {
    if(!State.currentBook) return;
    startCatCanvas.addEventListener("click", e => {
    if(!State.currentBook) return;

    State.gameStarted = true;
    State.paused = false;

    playRunnerMusic();

    pauseOverlay.style.display = "none";
    startScreen.style.display = "none";
    loop();
});

});

resumeBtn.onclick = () => { State.paused = false; pauseOverlay.style.display = "none"; };
pauseButton?.addEventListener("click", () => { if (!State.gameStarted) return; State.paused = !State.paused; pauseOverlay.style.display = State.paused ? "flex" : "none"; });

toggleBW.onclick = () => { document.body.classList.toggle("bw"); State.bwMode = document.body.classList.contains("bw"); };
toggleBionic.onclick = () => { State.bionic = !State.bionic; };
speedSlider.oninput = e => State.speed = parseFloat(e.target.value);
volumeSlider.oninput = e => {
    menuMusic.volume = e.target.value;
    runnerMusic.volume = e.target.value;
};
exitToMenu.onclick = () => { State.gameStarted = false; 
    startScreen.style.display = "flex"; 
    pauseOverlay.style.display = "none"; drawStartCat(); 
    playMenuMusic();
};

window.addEventListener("keydown", e => { if(e.key==="Escape" && State.gameStarted){ State.paused = !State.paused; pauseOverlay.style.display = State.paused ? "flex" : "none"; } });
window.addEventListener("resize",()=>{ W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; startCatCanvas.width = W; startCatCanvas.height = H; });

// ----------------- AUTO LOAD EXAMPLE -----------------
window.addEventListener("load", ()=>{
    fetch("assets/example.txt").then(r=>r.text()).then(txt=>{
        const book = { name: "example.txt", content: txt, words: txt.split(/\s+/), progress: 0 };
        State.books.push(book);
        selectBook("normal", 0);
    }).catch(e=>console.warn("Не удалось загрузить example.txt",e));
});

// ----------------- EXTEND LOOP -----------------
const oldLoop = loop;
loop = function(){ updateBookLabel(); oldLoop(); }
setInterval(updateBookProgress,1000);

// ----------------- BOOK LABEL -----------------
function updateBookLabel(){
    if(!State.currentBook) return;
    const t = Date.now()/500;
    State.bookLabelScale = 1 + 0.05*Math.sin(t);
}

function drawBookLabel(ctx){
    if(!State.currentBook) return;
    const text = State.currentBook.name;
    ctx.save();
    const scale = State.bookLabelScale || 1;
    ctx.translate(CAT.x + CAT.width + 20, CAT.y - 10);
    ctx.rotate(-0.1);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffea00";
    ctx.font = "bold 24px monospace";
    ctx.fillText(text, 0, 0);
    ctx.restore();
}

// ----------------- START SCREEN BOOK LABEL -----------------
function drawStartBookLabel(){
    if(!State.currentBook) return;
    const label = State.bookLabel;
    label.scale += label.direction;
    if(label.scale <= 1 || label.scale >= 2) label.direction *= -1;

    const catX = (startCatCanvas.width-200)/2;
    const catY = (startCatCanvas.height-120)/2;

    startCtx.save();
    startCtx.translate(catX + 100, catY - 30);
    startCtx.scale(label.scale, label.scale);
    startCtx.textAlign = "center";
    startCtx.font = "bold 32px monospace";
    startCtx.fillStyle = "yellow";
    startCtx.fillText(`${State.currentBook.name} (${State.currentBook.progress || 0}%)`, 0, 0);
    startCtx.restore();
}

// ----------------- INFO OVERLAY -----------------
const infoButton = document.getElementById("infoButton");
const infoOverlay = document.getElementById("infoOverlay");
const closeInfo = document.getElementById("closeInfo");

infoButton.onclick = () => { infoOverlay.style.display = "flex"; };
closeInfo.onclick = () => { infoOverlay.style.display = "none"; };
infoOverlay.addEventListener("click", e => { if(e.target === infoOverlay) infoOverlay.style.display = "none"; });

// ----------------- WORDS COUNTER & JUMP -----------------
const wordsCounter = document.getElementById("wordsCounter");
const jumpOverlay = document.getElementById("jumpOverlay");
const jumpWordInput = document.getElementById("jumpWordInput");
const jumpConfirm = document.getElementById("jumpConfirm");
const jumpCancel = document.getElementById("jumpCancel");

// Обновление счётчика прогресса
function updateWordsCounter(){
    if(!State.gameStarted){
        wordsCounter.style.display = "none";
        return;
    } else {
        wordsCounter.style.display = "block";
    }
    const total = State.readingMode==="normal"?State.words.length:State.bilingveWords.length;
    const current = State.currentWordIndex;
    const percent = total>0 ? Math.floor(current/total*100) : 0;
    wordsCounter.textContent = `${current}/${total} (${percent}%)`;
}
setInterval(updateWordsCounter, 200);

// Клик — открываем Jump-to-word overlay и ставим игру на паузу
wordsCounter.onclick = () => {
    if(!State.gameStarted) return;
    State.paused = true;
    jumpOverlay.style.display = "flex";
    jumpWordInput.value = State.currentWordIndex;
    jumpWordInput.focus();
};

// Подтверждение выбора слова
jumpConfirm.onclick = () => {
    const val = parseInt(jumpWordInput.value);
    const max = (State.readingMode==="normal"?State.words.length:State.bilingveWords.length)-1;
    if(!isNaN(val) && val>=0 && val<=max){
        State.currentWordIndex = val;
        wordObjects.length = 0; // очищаем текущие слова на экране
    }
    jumpOverlay.style.display = "none";
    State.paused = false;
};

// Отмена выбора
jumpCancel.onclick = () => {
    jumpOverlay.style.display = "none";
    State.paused = false;
};

// Закрытие по клику на фон
jumpOverlay.addEventListener("click", e => {
    if(e.target === jumpOverlay){
        jumpOverlay.style.display = "none";
        State.paused = false;
    }
});

// ENTER в поле ввода
jumpWordInput.addEventListener("keydown", e => { if(e.key === "Enter") jumpConfirm.onclick(); });


