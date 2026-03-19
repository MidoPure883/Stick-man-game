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

// ========== نظام الصوت ==========
const AudioManager = {
    muted: false,
    
    play(name) {
        if (this.muted) return;
        // صوت بسيط
    },
    
    toggle() {
        this.muted = !this.muted;
        document.getElementById('muteBtn').innerHTML = this.muted ? '🔇 كتم الصوت' : '🔊 تشغيل الصوت';
    }
};

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
        // تحديث الصعق
        if (this.stunned > 0) {
            this.stunned--;
            return;
        }
        
        // تحديث المناعة
        if (this.invincible && Date.now() > this.invincibleEnd) {
            this.invincible = false;
        }
        
        // تحديث طاقة التصدي
        if (!this.isBlocking && this.blockStamina < 100) {
            this.blockStamina = Math.min(100, this.blockStamina + 0.5);
        }
        
        // الفيزياء
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
        
        // حدود الحلبة
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            const minX = 40;
            const maxX = canvas.width - 40;
            this.x = Math.max(minX, Math.min(maxX, this.x));
        }
    }

    takeDamage(amount, attacker) {
        if (this.invincible || this.health <= 0) return false;
        
        // حساب الضرر مع التصدي
        let finalDamage = amount;
        let knockback = 5;
        
        if (this.isBlocking && this.blockStamina > 0) {
            finalDamage = Math.floor(amount * CONFIG.blockReduction);
            this.blockStamina -= amount * 2;
            knockback = 2;
        }
        
        this.health = Math.max(0, this.health - finalDamage);
        
        // ارتداد
        const direction = attacker.x < this.x ? 1 : -1;
        this.vx = direction * knockback;
        this.vy = -3;
        
        // تفعيل المناعة
        this.invincible = true;
        this.invincibleEnd = Date.now() + CONFIG.invincibilityDuration;
        
        // تحديث الكومبو للاعب
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
        
        // تأثير الوميض أثناء المناعة
        if (this.invincible && Math.floor(Date.now()/100)%2) {
            ctx.strokeStyle = 'white';
        }
        
        // الرأس
        ctx.beginPath();
        ctx.arc(this.x, this.y - 50, 10, 0, Math.PI*2);
        ctx.stroke();
        
        // العين
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x + (this.facing * 3), this.y - 52, 2, 0, Math.PI*2);
        ctx.fill();

        // الجسم
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 40);
        ctx.lineTo(this.x, this.y - 15);
        ctx.stroke();

        // الذراعين
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

        // الأرجل
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 15);
        ctx.lineTo(this.x - 10, this.y);
        ctx.moveTo(this.x, this.y - 15);
        ctx.lineTo(this.x + 10, this.y);
        ctx.stroke();

        // درع التصدي
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
    
    // ضبط حجم الكانفاس
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // تحديث مستوى الأرض
    CONFIG.groundY = canvas.height - 60;
    
    // إنشاء المقاتلين
    p1 = new Fighter(100, COLORS[GameState.p1Color], true);
    p2 = new Fighter(canvas.width - 100, COLORS[GameState.p2Color], false);
    
    // إعادة تعيين المتغيرات
    GameState.active = false;
    GameState.timeLeft = CONFIG.roundTime;
    GameState.powerCharge = 0;
    p1.combo = 0;
    
    // تحديث واجهة المستخدم
    updateUI();
}

// ========== تحديث واجهة المستخدم ==========
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

// ========== التحقق من الضربات ==========
function checkAttacks() {
    const distance = Math.abs(p1.x - p2.x);
    
    // هجوم اللاعب
    if (p1.isAttacking && distance < CONFIG.hitRange && !p2.invincible) {
        const damage = CONFIG.baseDamage + (GameState.powerCharge * 0.2);
        if (p2.takeDamage(damage, p1)) {
            GameState.powerCharge = 0;
            
            if (p2.health <= 0) {
                endGame(true);
            }
        }
        p1.isAttacking = false;
    }
    
    // هجوم AI
    if (p2.isAttacking && distance < CONFIG.hitRange && !p1.invincible) {
        if (p1.takeDamage(CONFIG.baseDamage, p2)) {
            p1.combo = 0;
            
            if (p1.health <= 0) {
                endGame(false);
            }
        }
        p2.isAttacking = false;
    }
}

// ========== ذكاء AI ==========
function updateAI() {
    if (!p2 || !p1 || p2.stunned > 0 || !GameState.active) return;
    
    const distance = Math.abs(p1.x - p2.x);
    const dx = p1.x - p2.x;
    
    // تحديث الاتجاه
    p2.facing = dx > 0 ? 1 : -1;
    
    // التصدي الذكي
    if (p1.isAttacking && distance < 60 && Math.random() < 0.7) {
        p2.isBlocking = true;
    } else {
        p2.isBlocking = false;
    }
    
    // الحركة
    if (distance > 50) {
        p2.vx = (dx > 0 ? 1 : -1) * CONFIG.playerSpeed * 0.6;
    } else if (distance < 30) {
        p2.vx = (dx > 0 ? -1 : 1) * CONFIG.playerSpeed * 0.3;
    } else {
        p2.vx = 0;
    }
    
    // الهجوم
    if (distance < 50 && Math.random() < 0.02 && Date.now() - p2.lastAttackTime > CONFIG.attackCooldown) {
        p2.isAttacking = true;
        p2.lastAttackTime = Date.now();
        
        setTimeout(() => {
            if (p2) p2.isAttacking = false;
        }, CONFIG.attackDuration);
    }
    
    // القفز
    if (p2.isGrounded && Math.random() < 0.005 && distance > 40) {
        p2.vy = CONFIG.jumpForce;
    }
}

// ========== حلقة اللعبة ==========
function gameLoop() {
    if (!GameState.active || !p1 || !p2) {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
        return;
    }
    
    // مسح الشاشة
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // رسم الأرض
    ctx.fillStyle = '#2a3440';
    ctx.fillRect(0, CONFIG.groundY, canvas.width, canvas.height - CONFIG.groundY);
    
    // تحكم اللاعب
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
    
    // تحديث شحن القوة
    if (GameState.mouseDown && !p1.isAttacking) {
        GameState.powerCharge = Math.min(CONFIG.maxPower, GameState.powerCharge + CONFIG.powerChargeRate);
    } else {
        GameState.powerCharge = Math.max(0, GameState.powerCharge - 0.5);
    }
    
    // تحديث المقاتلين
    p1.update();
    updateAI();
    p2.update();
    
    // التحقق من الضربات
    checkAttacks();
    
    // رسم المقاتلين
    p1.draw(ctx);
    p2.draw(ctx);
    
    // تحديث واجهة المستخدم
    updateUI();
    
    animationFrame = requestAnimationFrame(gameLoop);
}

// ========== نظام الوقت ==========
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

// ========== إنهاء المعركة ==========
function endGame(playerWon) {
    if (!GameState.active) return;
    
    GameState.active = false;
    clearInterval(GameState.timerInterval);
    
    if (playerWon) {
        Stats.addWin();
        document.getElementById('gameMessage').innerHTML = '🏆 انتصرت في المعركة!';
    } else {
        Stats.addLoss();
        document.getElementById('gameMessage').innerHTML = '💀 سقطت في القتال..';
    }
}

// ========== بدء لعبة جديدة ==========
function startNewGame() {
    // إلغاء أي توقيتات سابقة
    if (GameState.timerInterval) clearInterval(GameState.timerInterval);
    if (GameState.readyTimeout) clearTimeout(GameState.readyTimeout);
    if (GameState.fightTimeout) clearTimeout(GameState.fightTimeout);
    
    // إخفاء القوائم
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('characterSelect').style.display = 'none';
    document.getElementById('statsScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    
    // تهيئة اللعبة
    initGame();
    
    // اختيار لون عشوائي للـ AI
    const colorKeys = Object.keys(COLORS);
    const randomColor = colorKeys[Math.floor(Math.random() * colorKeys.length)];
    GameState.p2Color = randomColor;
    
    // شاشة الاستعداد
    const readyScreen = document.getElementById('readyScreen');
    readyScreen.style.display = 'flex';
    readyScreen.innerHTML = 'READY?';
    
    GameState.readyTimeout = setTimeout(() => {
        readyScreen.innerHTML = 'FIGHT!';
        
        GameState.fightTimeout = setTimeout(() => {
            readyScreen.style.display = 'none';
            GameState.active = true;
            startTimer();
            
            // بدء حلقة اللعبة
            if (animationFrame) cancelAnimationFrame(animationFrame);
            animationFrame = requestAnimationFrame(gameLoop);
        }, 800);
    }, 1000);
}

// ========== إعادة المباراة ==========
function rematch() {
    GameState.active = false;
    clearInterval(GameState.timerInterval);
    
    if (GameState.readyTimeout) clearTimeout(GameState.readyTimeout);
    if (GameState.fightTimeout) clearTimeout(GameState.fightTimeout);
    
    keys = { left: false, right: false };
    startNewGame();
}

// ========== وظائف القوائم ==========
function selectColor(color) {
    GameState.p1Color = color;
    
    // إزالة التحديد السابق
    document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
    
    // إضافة التحديد الجديد
    const selectedEl = document.getElementById(`color${color.charAt(0).toUpperCase() + color.slice(1)}`);
    if (selectedEl) selectedEl.classList.add('selected');
    
    setTimeout(backToMain, 300);
}

function showCharacterSelect() {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('characterSelect').style.display = 'flex';
    
    // تحديد اللون الحالي
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

// ========== إعدادات التحكم ==========
function setupControls() {
    const bind = (id, startCallback, endCallback) => {
        const el = document.getElementById(id);
        if (!el) return;
        
        const start = (e) => {
            e.preventDefault();
            startCallback();
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

    // أزرار الحركة
    bind('btnLeft', () => keys.left = true, () => keys.left = false);
    bind('btnRight', () => keys.right = true, () => keys.right = false);
    
    // زر القفز
    bind('btnJump', () => {
        if (p1 && p1.isGrounded && GameState.active) {
            p1.vy = CONFIG.jumpForce;
        }
    });
    
    // زر الهجوم
    bind('btnAttack', () => {
        if (!p1 || !GameState.active || p1.stunned > 0) return;
        
        const now = Date.now();
        if (now - p1.lastAttackTime > CONFIG.attackCooldown) {
            p1.isAttacking = true;
            p1.lastAttackTime = now;
            GameState.mouseDown = true;
            
            setTimeout(() => {
                if (p1) p1.isAttacking = false;
                GameState.mouseDown = false;
            }, CONFIG.attackDuration);
        }
    }, () => {
        GameState.mouseDown = false;
    });
    
    // زر التصدي
    bind('btnBlock', () => {
        if (p1 && GameState.active && p1.blockStamina > 0) {
            p1.isBlocking = true;
        }
    }, () => {
        if (p1) p1.isBlocking = false;
    });
}

// ========== التهيئة عند التحميل ==========
window.onload = () => {
    setupControls();
    
    // أحداث الصوت والمباراة
    document.getElementById('muteBtn').addEventListener('click', () => AudioManager.toggle());
    document.getElementById('rematchBtn').addEventListener('click', rematch);
    
    // منع التمرير عند اللمس
    document.body.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
};