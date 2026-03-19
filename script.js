// ========== إعدادات اللعبة ==========
const CONFIG = {
    gravity: 0.6,
    groundY: 250,
    playerSpeed: 4,
    jumpForce: -12,
    hitRange: 45,
    baseDamage: 12,
    attackCooldown: 350,
    attackDuration: 150,
    invincibilityDuration: 500,
    roundTime: 60,
    blockReduction: 0.5,
    maxPower: 100,
    powerChargeRate: 0.8,
    comboWindow: 800
};

// ========== نظام الإحصائيات ==========
const Stats = {
    wins: parseInt(localStorage.getItem('v2_wins')) || 0,
    losses: parseInt(localStorage.getItem('v2_losses')) || 0,
    
    addWin() { 
        this.wins++; 
        this.save(); 
    },
    
    addLoss() { 
        this.losses++; 
        this.save(); 
    },
    
    save() {
        localStorage.setItem('v2_wins', this.wins);
        localStorage.setItem('v2_losses', this.losses);
    },
    
    getWinRate() {
        const total = this.wins + this.losses;
        return total === 0 ? 0 : Math.round((this.wins / total) * 100);
    }
};

// ========== ألوان الشخصيات ==========
const COLORS = {
    red: '#e74c3c',
    blue: '#3498db',
    green: '#2ecc71',
    yellow: '#f1c40f',
    white: '#ecf0f1',
    black: '#2c3e50'
};

// ========== حالة اللعبة ==========
const GameState = {
    active: false,
    p1Color: 'red',
    p2Color: 'blue',
    timeLeft: CONFIG.roundTime,
    timerInterval: null,
    powerCharge: 0,
    mouseDown: false,
    readyTimeout: null,
    fightTimeout: null
};

// ========== نظام الصوت المتكامل ==========
const AudioManager = {
    audioContext: null,
    muted: false,
    sounds: {},
    
    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createSounds();
            this.setupAutoResume();
        } catch(e) {
            console.log("المتصفح لا يدعم الصوت");
        }
    },
    
    createSounds() {
        if (!this.audioContext) return;
        
        // إنشاء أصوات اللعبة
        this.sounds = {
            punch: this.createPunchSound(),
            hit: this.createHitSound(),
            jump: this.createJumpSound(),
            block: this.createBlockSound(),
            win: this.createWinSound(),
            lose: this.createLoseSound(),
            fight: this.createFightSound()
        };
    },
    
    createPunchSound() {
        const ctx = this.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.value = 200;
        gainNode.gain.value = 0.15;
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.1);
        
        return { oscillator, gainNode };
    },
    
    createHitSound() {
        const ctx = this.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = 'triangle';
        oscillator.frequency.value = 150;
        gainNode.gain.value = 0.2;
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.15);
        
        return { oscillator, gainNode };
    },
    
    createJumpSound() {
        const ctx = this.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 300;
        gainNode.gain.value = 0.1;
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.12);
        
        return { oscillator, gainNode };
    },
    
    createBlockSound() {
        const ctx = this.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.value = 100;
        gainNode.gain.value = 0.1;
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.08);
        
        return { oscillator, gainNode };
    },
    
    createWinSound() {
        const ctx = this.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 400;
        gainNode.gain.value = 0.2;
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.5);
        
        return { oscillator, gainNode };
    },
    
    createLoseSound() {
        const ctx = this.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.value = 100;
        gainNode.gain.value = 0.2;
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.5);
        
        return { oscillator, gainNode };
    },
    
    createFightSound() {
        const ctx = this.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 500;
        gainNode.gain.value = 0.2;
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.2);
        
        return { oscillator, gainNode };
    },
    
    play(type) {
        if (this.muted || !this.audioContext) return;
        
        try {
            // إظهار رسالة تنبيه الصوت وإخفائها
            const warning = document.getElementById('audioWarning');
            if (warning) warning.classList.remove('show');
            
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    this.playSound(type);
                });
            } else {
                this.playSound(type);
            }
        } catch(e) {
            console.log("خطأ في تشغيل الصوت");
        }
    },
    
    playSound(type) {
        switch(type) {
            case 'punch':
                this.sounds.punch.oscillator = this.createPunchSound().oscillator;
                break;
            case 'hit':
                this.sounds.hit.oscillator = this.createHitSound().oscillator;
                break;
            case 'jump':
                this.sounds.jump.oscillator = this.createJumpSound().oscillator;
                break;
            case 'block':
                this.sounds.block.oscillator = this.createBlockSound().oscillator;
                break;
            case 'win':
                this.sounds.win.oscillator = this.createWinSound().oscillator;
                break;
            case 'lose':
                this.sounds.lose.oscillator = this.createLoseSound().oscillator;
                break;
            case 'fight':
                this.sounds.fight.oscillator = this.createFightSound().oscillator;
                break;
        }
    },
    
    toggle() {
        this.muted = !this.muted;
        const btn = document.getElementById('muteBtn');
        if (btn) {
            btn.innerHTML = this.muted ? '🔇 كتم الصوت' : '🔊 تشغيل الصوت';
        }
        
        // إظهار رسالة تنبيه عند كتم الصوت
        const warning = document.getElementById('audioWarning');
        if (warning) {
            if (this.muted) {
                warning.innerHTML = '🔇 الصوت مكتوم';
                warning.classList.add('show');
                setTimeout(() => warning.classList.remove('show'), 2000);
            }
        }
        
        if (!this.muted && this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    },
    
    setupAutoResume() {
        // تفعيل الصوت عند أي تفاعل
        const resumeAudio = () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            // إخفاء رسالة التنبيه
            const warning = document.getElementById('audioWarning');
            if (warning) warning.classList.remove('show');
        };
        
        document.addEventListener('click', resumeAudio);
        document.addEventListener('touchstart', resumeAudio);
        document.addEventListener('keydown', resumeAudio);
    }
};

// تهيئة الصوت
AudioManager.init();

// ========== فئة المقاتل ==========
class Fighter {
    constructor(x, color, isPlayer) {
        this.x = x;
        this.y = CONFIG.groundY;
        this.vx = 0;
        this.vy = 0;
        this.color = color;
        this.health = 100;
        this.isGrounded = true;
        this.facing = isPlayer ? 1 : -1;
        this.isAttacking = false;
        this.isBlocking = false;
        this.lastAttackTime = 0;
        this.stunned = 0;
        this.invincible = false;
        this.invincibleEnd = 0;
        this.isPlayer = isPlayer;
        this.blockStamina = 100;
        this.combo = 0;
        this.lastHitTime = 0;
    }

    update() {
        if (this.stunned > 0) {
            this.stunned--;
            return;
        }
        
        if (this.invincible && Date.now() > this.invincibleEnd) {
            this.invincible = false;
        }
        
        if (!this.isBlocking && this.blockStamina < 100) {
            this.blockStamina = Math.min(100, this.blockStamina + 0.5);
        }
        
        this.y += this.vy;
        this.vy += CONFIG.gravity;

        if (this.y >= CONFIG.groundY) {
            this.y = CONFIG.groundY;
            this.vy = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }

        this.x += this.vx;
        
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            const minX = 40;
            const maxX = canvas.width - 40;
            this.x = Math.max(minX, Math.min(maxX, this.x));
        }
    }

    takeDamage(amount, attacker) {
        if (this.invincible || this.health <= 0) return false;
        
        let finalDamage = amount;
        let knockback = 5;
        
        if (this.isBlocking && this.blockStamina > 0) {
            finalDamage = Math.floor(amount * CONFIG.blockReduction);
            this.blockStamina -= amount * 2;
            knockback = 2;
        }
        
        this.health = Math.max(0, this.health - finalDamage);
        
        const direction = attacker.x < this.x ? 1 : -1;
        this.vx = direction * knockback;
        this.vy = -3;
        
        this.invincible = true;
        this.invincibleEnd = Date.now() + CONFIG.invincibilityDuration;
        
        if (attacker && attacker.isPlayer) {
            const now = Date.now();
            if (now - attacker.lastHitTime < CONFIG.comboWindow) {
                attacker.combo++;
            } else {
                attacker.combo = 1;
            }
            attacker.lastHitTime = now;
        }
        
        return true;
    }

    draw(ctx) {
        ctx.save();
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.strokeStyle = this.color;
        
        if (this.invincible && Math.floor(Date.now()/100)%2) {
            ctx.strokeStyle = 'white';
        }
        
        ctx.beginPath();
        ctx.arc(this.x, this.y - 50, 10, 0, Math.PI*2);
        ctx.stroke();
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x + (this.facing * 3), this.y - 52, 2, 0, Math.PI*2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 40);
        ctx.lineTo(this.x, this.y - 15);
        ctx.stroke();

        if (this.isAttacking) {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - 35);
            ctx.lineTo(this.x + (this.facing * 30), this.y - 30);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - 35);
            ctx.lineTo(this.x - (this.facing * 10), this.y - 25);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - 35);
            ctx.lineTo(this.x - 15, this.y - 30);
            ctx.moveTo(this.x, this.y - 35);
            ctx.lineTo(this.x + 15, this.y - 30);
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 15);
        ctx.lineTo(this.x - 10, this.y);
        ctx.moveTo(this.x, this.y - 15);
        ctx.lineTo(this.x + 10, this.y);
        ctx.stroke();

        if (this.isBlocking && this.blockStamina > 0) {
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x + (15 * this.facing), this.y - 35, 15, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

// ========== متغيرات اللعبة ==========
let p1, p2;
let keys = { left: false, right: false };
let animationFrame = null;
let canvas, ctx;

// ========== تهيئة اللعبة ==========
function initGame() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    
    ctx = canvas.getContext('2d');
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    CONFIG.groundY = canvas.height - 60;
    
    p1 = new Fighter(100, COLORS[GameState.p1Color], true);
    p2 = new Fighter(canvas.width - 100, COLORS[GameState.p2Color], false);
    
    GameState.active = false;
    GameState.timeLeft = CONFIG.roundTime;
    GameState.powerCharge = 0;
    p1.combo = 0;
    
    updateUI();
}

function updateUI() {
    if (p1) {
        document.getElementById('p1HealthBar').style.width = p1.health + '%';
        document.getElementById('comboDisplay').innerHTML = `<span>⚡</span> ${p1.combo}`;
    }
    if (p2) {
        document.getElementById('p2HealthBar').style.width = p2.health + '%';
    }
    document.getElementById('powerMeter').style.width = GameState.powerCharge + '%';
}

function checkAttacks() {
    const distance = Math.abs(p1.x - p2.x);
    
    if (p1.isAttacking && distance < CONFIG.hitRange && !p2.invincible) {
        const damage = CONFIG.baseDamage + (GameState.powerCharge * 0.2);
        if (p2.takeDamage(damage, p1)) {
            GameState.powerCharge = 0;
            AudioManager.play('hit');
            
            if (p2.health <= 0) {
                endGame(true);
            }
        }
        p1.isAttacking = false;
    }
    
    if (p2.isAttacking && distance < CONFIG.hitRange && !p1.invincible) {
        if (p1.takeDamage(CONFIG.baseDamage, p2)) {
            p1.combo = 0;
            AudioManager.play('hit');
            
            if (p1.health <= 0) {
                endGame(false);
            }
        }
        p2.isAttacking = false;
    }
}

function updateAI() {
    if (!p2 || !p1 || p2.stunned > 0 || !GameState.active) return;
    
    const distance = Math.abs(p1.x - p2.x);
    const dx = p1.x - p2.x;
    
    p2.facing = dx > 0 ? 1 : -1;
    
    if (p1.isAttacking && distance < 60 && Math.random() < 0.7) {
        p2.isBlocking = true;
        AudioManager.play('block');
    } else {
        p2.isBlocking = false;
    }
    
    if (distance > 50) {
        p2.vx = (dx > 0 ? 1 : -1) * CONFIG.playerSpeed * 0.6;
    } else if (distance < 30) {
        p2.vx = (dx > 0 ? -1 : 1) * CONFIG.playerSpeed * 0.3;
    } else {
        p2.vx = 0;
    }
    
    if (distance < 50 && Math.random() < 0.02 && Date.now() - p2.lastAttackTime > CONFIG.attackCooldown) {
        p2.isAttacking = true;
        p2.lastAttackTime = Date.now();
        AudioManager.play('punch');
        
        setTimeout(() => {
            if (p2) p2.isAttacking = false;
        }, CONFIG.attackDuration);
    }
    
    if (p2.isGrounded && Math.random() < 0.005 && distance > 40) {
        p2.vy = CONFIG.jumpForce;
        AudioManager.play('jump');
    }
}

function gameLoop() {
    if (!GameState.active || !p1 || !p2) {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
        return;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#2a3440';
    ctx.fillRect(0, CONFIG.groundY, canvas.width, canvas.height - CONFIG.groundY);
    
    if (p1.stunned <= 0) {
        if (keys.left) {
            p1.vx = -CONFIG.playerSpeed;
            p1.facing = -1;
        } else if (keys.right) {
            p1.vx = CONFIG.playerSpeed;
            p1.facing = 1;
        } else {
            p1.vx = 0;
        }
    }
    
    if (GameState.mouseDown && !p1.isAttacking) {
        GameState.powerCharge = Math.min(CONFIG.maxPower, GameState.powerCharge + CONFIG.powerChargeRate);
    } else {
        GameState.powerCharge = Math.max(0, GameState.powerCharge - 0.5);
    }
    
    p1.update();
    updateAI();
    p2.update();
    
    checkAttacks();
    
    p1.draw(ctx);
    p2.draw(ctx);
    
    updateUI();
    
    animationFrame = requestAnimationFrame(gameLoop);
}

function startTimer() {
    if (GameState.timerInterval) clearInterval(GameState.timerInterval);
    
    GameState.timerInterval = setInterval(() => {
        if (!GameState.active) return;
        
        GameState.timeLeft--;
        const percent = (GameState.timeLeft / CONFIG.roundTime) * 100;
        document.getElementById('timerBar').style.width = percent + '%';
        
        if (GameState.timeLeft <= 0) {
            endGame(p1.health > p2.health);
        }
    }, 1000);
}

function endGame(playerWon) {
    if (!GameState.active) return;
    
    GameState.active = false;
    clearInterval(GameState.timerInterval);
    
    if (playerWon) {
        Stats.addWin();
        document.getElementById('gameMessage').innerHTML = '🏆 انتصرت في المعركة!';
        AudioManager.play('win');
    } else {
        Stats.addLoss();
        document.getElementById('gameMessage').innerHTML = '💀 سقطت في القتال..';
        AudioManager.play('lose');
    }
}

function startNewGame() {
    // إظهار رسالة تنبيه الصوت
    const warning = document.getElementById('audioWarning');
    if (warning) {
        warning.innerHTML = '⚡ اضغط على الشاشة لتفعيل الصوت';
        warning.classList.add('show');
    }
    
    if (GameState.timerInterval) clearInterval(GameState.timerInterval);
    if (GameState.readyTimeout) clearTimeout(GameState.readyTimeout);
    if (GameState.fightTimeout) clearTimeout(GameState.fightTimeout);
    
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('characterSelect').style.display = 'none';
    document.getElementById('statsScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    
    initGame();
    
    const colorKeys = Object.keys(COLORS);
    const randomColor = colorKeys[Math.floor(Math.random() * colorKeys.length)];
    GameState.p2Color = randomColor;
    
    const readyScreen = document.getElementById('readyScreen');
    readyScreen.style.display = 'flex';
    readyScreen.innerHTML = 'READY?';
    AudioManager.play('fight');
    
    GameState.readyTimeout = setTimeout(() => {
        readyScreen.innerHTML = 'FIGHT!';
        
        GameState.fightTimeout = setTimeout(() => {
            readyScreen.style.display = 'none';
            GameState.active = true;
            startTimer();
            
            if (animationFrame) cancelAnimationFrame(animationFrame);
            animationFrame = requestAnimationFrame(gameLoop);
        }, 800);
    }, 1000);
}

function rematch() {
    GameState.active = false;
    clearInterval(GameState.timerInterval);
    
    if (GameState.readyTimeout) clearTimeout(GameState.readyTimeout);
    if (GameState.fightTimeout) clearTimeout(GameState.fightTimeout);
    
    keys = { left: false, right: false };
    startNewGame();
}

function selectColor(color) {
    GameState.p1Color = color;
    
    document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
    
    const selectedEl = document.getElementById(`color${color.charAt(0).toUpperCase() + color.slice(1)}`);
    if (selectedEl) selectedEl.classList.add('selected');
    
    setTimeout(backToMain, 300);
}

function showCharacterSelect() {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('characterSelect').style.display = 'flex';
    
    document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
    const currentColor = document.getElementById(`color${GameState.p1Color.charAt(0).toUpperCase() + GameState.p1Color.slice(1)}`);
    if (currentColor) currentColor.classList.add('selected');
}

function showStats() {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('statsScreen').style.display = 'flex';
    
    const winRate = Stats.getWinRate();
    document.getElementById('statsDisplay').innerHTML = `
        <div style="margin:20px 0;">🏆 الفوز: ${Stats.wins}</div>
        <div style="margin:20px 0;">💔 الخسارة: ${Stats.losses}</div>
        <div style="margin:20px 0;">📈 نسبة الفوز: ${winRate}%</div>
    `;
}

function backToMain() {
    document.getElementById('characterSelect').style.display = 'none';
    document.getElementById('statsScreen').style.display = 'none';
    document.getElementById('mainMenu').style.display = 'flex';
}

function backToMainFromGame() {
    GameState.active = false;
    clearInterval(GameState.timerInterval);
    
    if (GameState.readyTimeout) clearTimeout(GameState.readyTimeout);
    if (GameState.fightTimeout) clearTimeout(GameState.fightTimeout);
    
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
    
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('mainMenu').style.display = 'flex';
}

function setupControls() {
    const bind = (id, startCallback, endCallback) => {
        const el = document.getElementById(id);
        if (!el) return;
        
        const start = (e) => {
            e.preventDefault();
            startCallback();
            
            // تفعيل الصوت عند أول تفاعل
            if (AudioManager.audioContext && AudioManager.audioContext.state === 'suspended') {
                AudioManager.audioContext.resume();
            }
        };
        
        const end = (e) => {
            e.preventDefault();
            if (endCallback) endCallback();
        };
        
        el.addEventListener('touchstart', start, { passive: false });
        el.addEventListener('touchend', end, { passive: false });
        el.addEventListener('touchcancel', end, { passive: false });
        el.addEventListener('mousedown', start);
        el.addEventListener('mouseup', end);
        el.addEventListener('mouseleave', end);
    };

    bind('btnLeft', () => keys.left = true, () => keys.left = false);
    bind('btnRight', () => keys.right = true, () => keys.right = false);
    
    bind('btnJump', () => {
        if (p1 && p1.isGrounded && GameState.active) {
            p1.vy = CONFIG.jumpForce;
            AudioManager.play('jump');
        }
    });
    
    bind('btnAttack', () => {
        if (!p1 || !GameState.active || p1.stunned > 0) return;
        
        const now = Date.now();
        if (now - p1.lastAttackTime > CONFIG.attackCooldown) {
            p1.isAttacking = true;
            p1.lastAttackTime = now;
            GameState.mouseDown = true;
            AudioManager.play('punch');
            
            setTimeout(() => {
                if (p1) p1.isAttacking = false;
                GameState.mouseDown = false;
            }, CONFIG.attackDuration);
        }
    }, () => {
        GameState.mouseDown = false;
    });
    
    bind('btnBlock', () => {
        if (p1 && GameState.active && p1.blockStamina > 0) {
            p1.isBlocking = true;
        }
    }, () => {
        if (p1) p1.isBlocking = false;
    });
}

window.onload = () => {
    setupControls();
    
    document.getElementById('muteBtn').addEventListener('click', () => AudioManager.toggle());
    document.getElementById('rematchBtn').addEventListener('click', rematch);
    
    document.body.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
};