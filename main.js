// ----------------- STATE -----------------
const State = {
    animationId: null,
    bionic: true,
    bionicColor: "#FFFF00", // начальный жёлтый
    nightMode: false,// Night Mode
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

// utilities
function rectsIntersect(a, b) {
    return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
}

function getWordHitbox(word) {
    return {
        x: word.x,
        y: word.y - WORD_HEIGHT / 2,
        w: word.w,
        h: WORD_HEIGHT
    };
}

function getWordDamage(word) {
    return word.text.length * 2;
}


// ----------------- COSMOS / BIOMES -----------------
const cosmosSettings = {
    color: "#001040", // базовый цвет космоса, можно менять для биомов
    starCount: 60
};

const stars = [];
for(let i=0;i<cosmosSettings.starCount;i++){
    stars.push({
        x: Math.random()*W,
        y: Math.random()*H,
        size: Math.random()*3 + 2,
        alpha: Math.random()*0.5 + 0.5,
        delta: Math.random()*0.05 + 0.02,
        spread: Math.random()*3 + 1
    });
};

function drawCosmosBackground(){
    // базовый цвет космоса
    let bgColor = cosmosSettings.color;

    if(State.nightMode){
        bgColor = "#1a0f0d"; // мягкий кофейный черный/коричневый
    }

    ctx.fillStyle = bgColor;
    ctx.fillRect(0,0,W,H);

    stars.forEach(s => {
        if(State.gameStarted && !State.paused){
            s.alpha += s.delta;
            if(s.alpha > 1 || s.alpha < 0.2) s.delta *= -1;
            s.x -= 0.1;
            if(s.x < 0) s.x = W;
        }

        // цвет звезд под Night Mode
        let starColor = `rgba(255,255,255,${s.alpha})`;
        if(State.nightMode){
            starColor = `rgba(180,200,255,${s.alpha})`; // нежно-голубые мягкие
        }

        ctx.fillStyle = starColor;

        ctx.fillRect(Math.floor(s.x)-s.size, Math.floor(s.y), s.size*3, s.size);
        ctx.fillRect(Math.floor(s.x), Math.floor(s.y)-s.size, s.size, s.size*3);

        for(let i=0;i<2;i++){
            const offsetX = (Math.random()-0.5)*s.spread;
            const offsetY = (Math.random()-0.5)*s.spread;
            ctx.fillRect(Math.floor(s.x+offsetX), Math.floor(s.y+offsetY), 1, 1);
        }
    });
}


// ----------------- HUD -----------------
const pauseOverlay = document.getElementById("pauseOverlay");
const toggleBW = document.getElementById("toggleBW");
const toggleNight = document.getElementById("toggleNight");
const toggleBionic = document.getElementById("toggleBionic");
const speedSlider = document.getElementById("speedSlider");
const exitToMenu = document.getElementById("exitToMenu");
const volumeSlider = document.getElementById("volumeSlider");
const resumeBtn = document.getElementById("resumeButton");
const pauseButton = document.getElementById("pauseButton");
const musicButton = document.getElementById("musicButton");

// ----------------- AUDIO -----------------
const menuMusic = document.getElementById("menuMusic");
const runnerMusic = document.getElementById("runnerMusic");

const clickSound = new Audio("assets/audio/click.wav");
clickSound.volume = 0.3;
const hitSound = new Audio("assets/audio/hit.mp3");
hitSound.volume = 0.5;

function playHitSound(){
    hitSound.currentTime = 0;
    hitSound.play().catch(()=>{});
}

const MusicManager = {
    menuMusic,
    runnerMusic,
    current: null,
    volume: 0.5,

    playMenu() {
        this.stopAll();
        this.menuMusic.volume = this.volume;
        this.menuMusic.loop = true;
        this.menuMusic.play().catch(()=>{});
        this.current = this.menuMusic;
        this.isUserMusic = false;
    },

    playRunner() {
        this.stopAll();
        this.runnerMusic.volume = this.volume;
        this.runnerMusic.loop = true;
        this.runnerMusic.play().catch(()=>{});
        this.current = this.runnerMusic;
        this.isUserMusic = false;
    },

    stopAll() {
        this.menuMusic.pause();
        this.runnerMusic.pause();
    },

    setVolume(vol) {
        this.volume = vol;
        if(this.current) this.current.volume = vol;
    },

    toggleMute() {
        if(this.current) this.current.muted = !this.current.muted;
    }

};

let isMuted = false;

addPointerListener(musicButton, () => {
    isMuted = !isMuted;

    menuMusic.muted = isMuted;
    runnerMusic.muted = isMuted;
    clickSound.muted = isMuted;
    hitSound.muted = isMuted;

    musicButton.classList.toggle("muted", isMuted);
});

// ----------------- POINTER LISTENER -----------------
function addPointerListener(el, callback){
    el.addEventListener("click", e => {
        clickSound.currentTime = 0; // сброс для быстрого повторного клика
        clickSound.play().catch(()=>{});
        callback(e);
    });
    el.addEventListener("touchstart", e => { 
        e.preventDefault(); 
        clickSound.currentTime = 0;
        clickSound.play().catch(()=>{});
        callback(e); 
    });
}

// ----------------- IMAGES -----------------
const catImage = new Image();
catImage.src = "assets/nyansheet.png";
const hitImage = new Image();
hitImage.src = "assets/hit.png";

// ----------------- CAT -----------------
const CAT = {
    x: W*0.3,
baseX: W*0.3,
vx: 0,
    y: H/2,
        vy: 0, // вертикальный импульс
    targetY: H/2,
    width: 100,
    height: 60,
    frame: 0,
    frameTimer: 0,
    frameSpeed: 6,
    hit: false,
    invincible: false,
    hitTime: 0,
    visible: true,
        hitFrame: 0,
    hitFrameTimer: 0,
};

const widths = [64,66,66,66,66,64];
const paddings = [2,5,7,7,5];
const catFrames = [];
let posX = 0;
for(let i=0;i<widths.length;i++){
    catFrames.push({x:posX, width:widths[i], height:39});
    posX += widths[i]+(paddings[i]||0);
}

//boss
const Boss = {
    x: W - 220,
    y: H / 2 - 80,
    w: 160,
    h: 160,
    hp: 300,
    alive: true
};

function getBossHitbox() {
    return {
        x: Boss.x,
        y: Boss.y,
        w: Boss.w,
        h: Boss.h
    };
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
const PIPE_INTERVAL = 280;
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
    startCtx.clearRect(0,0,startCatCanvas.width,startCatCanvas.height);

    drawCosmosBackgroundStart();

    const f = catFrames[startCatFrame];
    const catW = 200, catH = 120;
    const catX = (startCatCanvas.width - catW)/2;
    const catY = (startCatCanvas.height - catH)/2;
    startCtx.drawImage(catImage, f.x, 0, f.width, f.height, catX, catY, catW, catH);

    if(State.currentBook){
        drawStartBookLabel();
    }

    startCatFrameTimer++;
    if(startCatFrameTimer >= START_CAT_FRAME_SPEED){
        startCatFrame = (startCatFrame + 1) % catFrames.length;
        startCatFrameTimer = 0;
    }

    State.startAnimationId = requestAnimationFrame(drawStartCat);
}

// ----------------- HIT FRAMES (CUSTOM SPRITESHEET) -----------------
const HIT_FRAME_HEIGHT = 51;
const HIT_FRAME_SPEED = 4;

const hitFrames = [];
let hitX = 0;

// widths + gaps (как ты описал)
const hitData = [
    { w: 61, gap: 1 },
    { w: 60, gap: 1 },
    { w: 60, gap: 1 },
    { w: 61, gap: 3 },
    { w: 63, gap: 5 },
    { w: 59, gap: 8 },
    { w: 57, gap: 5 },
    { w: 59, gap: 0 } // последний, без отступа
];

hitData.forEach(f => {
    hitFrames.push({
        x: hitX,
        y: 0,
        w: f.w,
        h: HIT_FRAME_HEIGHT
    });
    hitX += f.w + f.gap;
});

// отдельная функция для стартового canvas
function drawCosmosBackgroundStart(){
    startCtx.fillStyle = cosmosSettings.color;
    startCtx.fillRect(0,0,W,H);

    stars.forEach(s => {
        startCtx.fillStyle = `rgba(255,255,255,${s.alpha})`;

        startCtx.fillRect(Math.floor(s.x)-s.size, Math.floor(s.y), s.size*3, s.size);
        startCtx.fillRect(Math.floor(s.x), Math.floor(s.y)-s.size, s.size, s.size*3);

        for(let i=0;i<2;i++){
            const offsetX = (Math.random()-0.5)*s.spread;
            const offsetY = (Math.random()-0.5)*s.spread;
            startCtx.fillRect(Math.floor(s.x+offsetX), Math.floor(s.y+offsetY), 1, 1);
        }
    });
}

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
addPointerListener(booksBlock, ()=>{ booksLibrary.style.display = "flex"; });
addPointerListener(bilingveBlock, ()=>{ bilingveLibrary.style.display = "flex"; });
addPointerListener(closeBooksLibrary, ()=>{ booksLibrary.style.display = "none"; });
addPointerListener(closeBilingveLibrary, ()=>{ bilingveLibrary.style.display = "none"; });

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

addPointerListener(importBookBtn, ()=>importBook("normal"));
addPointerListener(importBilingveBtn, ()=>importBook("bilingve"));

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

    // ---------------- CAT движение ----------------
// обычное движение к цели
CAT.y += (CAT.targetY - CAT.y) * 0.12;

// движение с импульсом после столкновения
CAT.x += CAT.vx;
CAT.y += CAT.vy;

// сопротивление, плавное затухание
CAT.vx *= 0.8;
CAT.vy *= 0.7;

// почти остановка
if(Math.abs(CAT.vx) < 0.5) CAT.vx = 0;
if(Math.abs(CAT.vy) < 0.5) CAT.vy = 0;

// возврат на исходную X после толчка
if(CAT.vx === 0) {
    CAT.x += (CAT.baseX - CAT.x) * 0.2;  // плавно возвращаемся к baseX
}

    // HIT animation update
if (CAT.hit) {
    CAT.hitFrameTimer++;
    if (CAT.hitFrameTimer >= HIT_FRAME_SPEED) {
        CAT.hitFrame++;
        CAT.hitFrameTimer = 0;

        if (CAT.hitFrame >= hitFrames.length) {
            CAT.hitFrame = hitFrames.length - 1;
        }
    }
}

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
            wordObjects.push({text, x:!lastWord ? CAT.x - RAINBOW_BLOCK*2 - w : 
                lastWord.x + lastWord.w + 1, y:CAT.y + CAT.height/2, w, type: "word" });
            State.currentWordIndex++;}
    }

    // WORDS MOVE
    wordObjects.forEach(w => w.x -= State.speed);
    for(let i = wordObjects.length-1; i>=0; i--){
        if(wordObjects[i].x + wordObjects[i].w < 0){
            wordObjects.splice(i,1);

        }
    }

    // ----------------- CAT ↔ PIPE COLLISION -----------------
pipes.forEach(pipe => {
    const catTop = CAT.y;
    const catBottom = CAT.y + CAT.height;
    const catLeft = CAT.x;
    const catRight = CAT.x + CAT.width;

    const pipeTopBottom = pipe.topHeight;
    const pipeBottomTop = H - pipe.bottomHeight;
    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + PIPE_WIDTH;

    if (
        catRight > pipeLeft &&
        catLeft < pipeRight &&
        (catTop < pipeTopBottom || catBottom > pipeBottomTop)
    ) {
        if (!CAT.invincible) {
            CAT.hit = true;
            CAT.invincible = true;
            CAT.hitTime = Date.now();
            CAT.hitFrame = 0;
            CAT.hitFrameTimer = 0;

            // мягкий толчок назад
            CAT.vx = -10;

            // вертикальный толчок
            CAT.vy = catTop < pipeTopBottom ? 15 : -15;

            playHitSound();

            // ----------------- Откат слова -----------------
            if(State.currentWordIndex > 0){
                State.currentWordIndex--;

                // ищем слово на экране и красим
                const word = wordObjects.find(w => w.text === 
                    (State.readingMode==="normal"?State.words:State.bilingveWords)[State.currentWordIndex]);
                if(word) word.hit = true;

                // теперь новый цикл spawn не увеличивает currentWordIndex, пока слово красное
            }
        }
    }
});

// ----------------- INVINCIBILITY TIMER -----------------
if (CAT.invincible) {
    const elapsed = Date.now() - CAT.hitTime;

    if (elapsed > 2000) {
        CAT.invincible = false;
        CAT.hit = false;
        CAT.visible = true;

    } else {
        // мигание кота во время инвинки
        CAT.visible = Math.floor(elapsed / 200) % 2 === 0;
    }
} else {
    CAT.visible = true;

};

// ----------------- INVINCIBILITY TIMER -----------------
if (CAT.invincible) {
    const elapsed = Date.now() - CAT.hitTime;

    if (elapsed > 2000) {
        CAT.invincible = false;
        CAT.hit = false;
        CAT.visible = true;
    } else {
        CAT.visible = Math.floor(elapsed / 200) % 2 === 0;
    }
} else {
    CAT.visible = true;
}

    frameCount++;
}

// ----------------- DRAW -----------------
function draw(){
    ctx.clearRect(0,0,W,H);
    // BACKGROUND
    drawCosmosBackground();
    // RAINBOW
    rainbowTail.forEach(r=>{ ctx.fillStyle=r.color; ctx.fillRect(r.x,r.y,RAINBOW_BLOCK*2,RAINBOW_BLOCK); });
    // WORDS
ctx.font="bold 28px monospace";
wordObjects.forEach(w => {
    // фон под слово
    ctx.fillStyle = "black";
    ctx.fillRect(w.x, w.y - WORD_HEIGHT/2, w.w, WORD_HEIGHT);

    // проверяем удар (красное)
    if(w.hit){
        ctx.fillStyle = "red";
        ctx.fillText(w.text, w.x + WORD_PADDING, w.y + 8);
        return; // красим красным и пропускаем бионик
    }

    // BIIONIC
    if(State.bionic){
        const word = w.text;
        const splitIndex = Math.ceil(word.length*0.4);
        const firstPart = word.slice(0, splitIndex);
        const restPart = word.slice(splitIndex);

        ctx.fillStyle = State.nightMode ? "#b89b1bff" : State.bionicColor;
        ctx.fillText(firstPart, w.x + WORD_PADDING, w.y + 8);

        ctx.fillStyle = State.nightMode ? "#e6dcc8" : "white";
        ctx.fillText(restPart, w.x + WORD_PADDING + ctx.measureText(firstPart).width, w.y + 8);
    } else {
        ctx.fillStyle = "white";
        ctx.fillText(w.text, w.x + WORD_PADDING, w.y + 8);
    }
});

const bionicColorPicker = document.getElementById("bionicColorPicker");
bionicColorPicker.addEventListener("input", e => {
    State.bionicColor = e.target.value;
});

    if (CAT.visible)
    if (CAT.hit) {
    const sx = hitFrames[CAT.hitFrame].x; // или HIT_FRAME_WIDTH * CAT.hitFrame
    const sw = hitFrames[CAT.hitFrame].w; // ширина кадра
    const sh = hitFrames[CAT.hitFrame].h; // высота кадра

    ctx.drawImage(
        hitImage,
        sx, 0,
        sw, sh,
        CAT.x - 10,      // смещаем чуть назад/влево
        CAT.y - 10,      // смещаем чуть вверх
        CAT.width * 1, // растягиваем ширину
        CAT.height * 1.3 // растягиваем высоту
    );
} else {
    const f = catFrames[CAT.frame];
    const offsetX = (Math.max(...widths) - f.width) / 2;

    ctx.drawImage(
        catImage,
        f.x, 0,
        f.width, f.height,
        CAT.x + offsetX, CAT.y,
        CAT.width, CAT.height
    );
}

    // PIPES
    pipes.forEach(p=>{ drawPipeTop(p.x,p.topHeight); drawPipeBottom(p.x,H-p.bottomHeight); });
    
    if(State.gameStarted){
    drawPauseIcon();
}

    if (State.nightMode) {
    ctx.save();

    // 1) тёплая gameboy-сепия
    ctx.fillStyle = "rgba(34, 42, 20, 0.35)";
    ctx.fillRect(0, 0, W, H);

    // 2) понижение насыщенности (LCD эффект)
    ctx.globalCompositeOperation = "saturation";
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, W, H);

    // 3) мягкое затемнение без потери формы
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgba(20, 20, 16, 0.25)";
    ctx.fillRect(0, 0, W, H);

    ctx.restore();
}

if (State.nightMode) {
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    for (let i = 0; i < 200; i++) {
        ctx.fillRect(
            Math.random() * W,
            Math.random() * H,
            1,
            1
        );
    }
}

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

function getPipeHitboxes(pipe) {
    return [
        { x: pipe.x, y: 0, w: PIPE_WIDTH, h: pipe.topHeight },
        { x: pipe.x, y: H - pipe.bottomHeight, w: PIPE_WIDTH, h: pipe.bottomHeight }
    ];
}

//loop
function loop(){
    update();
    draw();

    if(State.gameStarted){
        State.animationId = requestAnimationFrame(loop);
    }
}


// ----------------- EVENT LISTENERS -----------------
startCatCanvas.addEventListener("click", e => {
    if(!State.currentBook) return;

    // Останавливаем стартовую анимацию
    if(State.startAnimationId){
        cancelAnimationFrame(State.startAnimationId);
        State.startAnimationId = null;
    }

    State.gameStarted = true;
    State.paused = false;
    document.getElementById("pauseButton").style.display = "flex";

    MusicManager.playRunner();
    pauseOverlay.style.display = "none";
    startScreen.style.display = "none";

    loop(); // запускаем игровой RAF
});

addPointerListener(resumeBtn, ()=>{ State.paused = false; pauseOverlay.style.display = "none"; });
addPointerListener(pauseButton, ()=>{ 
    if (!State.gameStarted) return; 
    State.paused = !State.paused; 
    pauseOverlay.style.display = State.paused ? "flex" : "none"; 
});

addPointerListener(toggleBW, () => { 
    document.body.classList.toggle("bw"); 
    State.bwMode = document.body.classList.contains("bw"); 
});

addPointerListener(toggleNight, () => { 
    State.nightMode = !State.nightMode; 
});

addPointerListener(toggleBionic, () => { 
    State.bionic = !State.bionic; 
});

speedSlider.oninput = e => State.speed = parseFloat(e.target.value);

volumeSlider.oninput = e => {
    MusicManager.setVolume(parseFloat(e.target.value));
};

addPointerListener(exitToMenu, () => {
    State.gameStarted = false;
    State.paused = false;
    document.getElementById("pauseButton").style.display = "none";

    if (State.animationId) { 
        cancelAnimationFrame(State.animationId); 
        State.animationId = null; 
    }

    startScreen.style.display = "flex";
    pauseOverlay.style.display = "none";
    drawStartCat();
    MusicManager.playMenu();

});


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

addPointerListener(infoButton, ()=>{ infoOverlay.style.display = "flex"; });
addPointerListener(closeInfo, ()=>{ infoOverlay.style.display = "none"; });
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


