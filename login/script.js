/* ═══════════════════════════════════════════════════════════════
   WeStud Login — script.js
   GSAP: Entrada · Respiração · Eye Tracking · Foco na Senha
   ═══════════════════════════════════════════════════════════════ */

/* ── Referências ─────────────────────────────────────────────── */
const loginContainer = document.getElementById('loginContainer');

const shapePurple = document.getElementById('shapePurple');
const shapeBlack  = document.getElementById('shapeBlack');
const shapeYellow = document.getElementById('shapeYellow');
const shapeOrange = document.getElementById('shapeOrange');

const purpleEyeLeft  = document.getElementById('purpleEyeLeft');
const purpleEyeRight = document.getElementById('purpleEyeRight');
const blackEyeLeft   = document.getElementById('blackEyeLeft');
const blackEyeRight  = document.getElementById('blackEyeRight');
const yellowEye      = document.getElementById('yellowEye');
const yellowMouth    = document.getElementById('yellowMouth');
const orangeEyeLeft  = document.getElementById('orangeEyeLeft');
const orangeEyeRight = document.getElementById('orangeEyeRight');
const orangeMouth    = document.getElementById('orangeMouth');

const passwordInput  = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
const btnLogin       = document.getElementById('btnLogin');

const allEyes   = [purpleEyeLeft, purpleEyeRight, blackEyeLeft, blackEyeRight,
                   yellowEye, orangeEyeLeft, orangeEyeRight];
const allPupils = allEyes.map(eye => eye.querySelector('.pupil'));

/* ═══════════════════════════════════════════════════════════════
   ENTRADA
   Os bonecos surgem de baixo para cima (y: 200 → 0), como se
   estivessem atrás/abaixo do laranja. Elastic dá o sobressalto
   ao parar — sem rotação, sem queda do topo.
   ═══════════════════════════════════════════════════════════════ */

gsap.to(loginContainer, {
    opacity: 1,
    y: 0,
    duration: 0.65,
    ease: 'power3.out',
    clearProps: 'will-change',
});

gsap.timeline({ delay: 0.2, onComplete: startBreathing })
    .fromTo(
        [shapePurple, shapeBlack, shapeYellow, shapeOrange],
        { y: 200, opacity: 0 },
        {
            y:        0,
            opacity:  1,
            duration: 1.1,
            stagger:  0.1,
            ease:     'elastic.out(1, 0.5)',
        }
    );

/* ═══════════════════════════════════════════════════════════════
   RESPIRAÇÃO (IDLE)
   Flutuação assíncrona com rotação suave. Durações distintas
   garantem que os shapes nunca sincronizem.
   ═══════════════════════════════════════════════════════════════ */

function startBreathing() {
    const configs = [
        { el: shapePurple, duration: 2.1, yVal: -12, rotVal: -1.2, delay: 0    },
        { el: shapeBlack,  duration: 2.7, yVal:  -9, rotVal:  0.9, delay: 0.35 },
        { el: shapeYellow, duration: 3.4, yVal: -14, rotVal: -0.7, delay: 0.7  },
        { el: shapeOrange, duration: 1.9, yVal: -10, rotVal:  1.1, delay: 1.05 },
    ];

    configs.forEach(({ el, duration, yVal, rotVal, delay }) => {
        gsap.to(el, {
            y:        yVal,
            rotation: rotVal,
            duration,
            delay,
            repeat:   -1,
            yoyo:     true,
            ease:     'sine.inOut',
        });
    });
}

/* ═══════════════════════════════════════════════════════════════
   EYE TRACKING
   quickTo: setters reutilizáveis por pupila (zero overhead no
   mousemove). duration 0.6 + power2.out simulam inércia/massa.
   Suspenso durante o foco na senha.
   ═══════════════════════════════════════════════════════════════ */

let trackingActive = true;

const trackers = allPupils.map(pupil => ({
    eye:  pupil.parentElement,
    xTo:  gsap.quickTo(pupil, 'x', { duration: 0.6, ease: 'power2.out' }),
    yTo:  gsap.quickTo(pupil, 'y', { duration: 0.6, ease: 'power2.out' }),
}));

document.addEventListener('mousemove', (e) => {
    if (!trackingActive) return;
    trackers.forEach(({ eye, xTo, yTo }) => {
        const rect  = eye.getBoundingClientRect();
        const cx    = rect.left + rect.width  * 0.5;
        const cy    = rect.top  + rect.height * 0.5;
        const dx    = e.clientX - cx;
        const dy    = e.clientY - cy;
        const dist  = Math.hypot(dx, dy) || 1;
        const shift = Math.min(dist * 0.038, 3);
        xTo((dx / dist) * shift);
        yTo((dy / dist) * shift);
    });
});

/* ═══════════════════════════════════════════════════════════════
   FOCO NA SENHA — ESTADO TENSÃO
   · Roxo: curva dramaticamente para a direita (rotation + skewX
     + borderTopRightRadius) pivotando em bottom-left (CSS).
   · Laranja: boca inverte → triste.
   · Amarelo: olho e boca descem → tensão/decepção.
   · Todos os bonecos: pupilas olham para o input de senha
     (ligeiramente para a direita e para baixo).
   ═══════════════════════════════════════════════════════════════ */

function applyTension() {
    trackingActive = false;

    /* Roxo: curva + derrete o canto superior direito */
    gsap.to(shapePurple, {
        rotation:           22,
        skewX:              -25,
        scaleY:             0.95,
        borderTopRightRadius: '100px',
        duration:           0.55,
        ease:               'elastic.out(1.2, 0.4)',
    });

    /* Laranja: boca triste — scaleY:-1 inverte o arco do sorriso */
    gsap.to(orangeMouth, {
        scaleY:   -1,
        y:         3,
        duration: 0.4,
        ease:     'back.out(2)',
    });

    /* Amarelo: rosto desce internamente — tensão/decepção */
    gsap.to([yellowEye, yellowMouth], {
        y:        12,
        duration: 0.4,
        ease:     'power2.out',
    });

    /* Todas as pupilas olham para o input (direita + levemente baixo) */
    allPupils.forEach(pupil => {
        gsap.to(pupil, { x: 2, y: 1, duration: 0.35, ease: 'power2.out' });
    });
}

/* ═══════════════════════════════════════════════════════════════
   FOCO NA SENHA — ESTADO ALÍVIO (reveal password)
   Cancela todas as animações de tensão. Os bonecos relaxam.
   ═══════════════════════════════════════════════════════════════ */

function applyRelief() {
    trackingActive = true;

    /* Roxo desemtorta com spring */
    gsap.to(shapePurple, {
        rotation:           0,
        skewX:              0,
        scaleY:             1,
        borderTopRightRadius: '0px',
        duration:           0.65,
        ease:               'elastic.out(1, 0.45)',
    });

    /* Laranja sorri novamente */
    gsap.to(orangeMouth, {
        scaleY:   1,
        y:        0,
        duration: 0.45,
        ease:     'back.out(2)',
    });

    /* Amarelo: rosto sobe — alívio */
    gsap.to([yellowEye, yellowMouth], {
        y:        0,
        duration: 0.45,
        ease:     'elastic.out(1, 0.5)',
    });

    /* Pupilas voltam ao centro */
    allPupils.forEach(pupil => {
        gsap.to(pupil, { x: 0, y: 0, duration: 0.4, ease: 'power2.out' });
    });
}

/* ═══════════════════════════════════════════════════════════════
   NEUTRAL — ao sair do campo (blur sem toggle)
   Igual ao alívio: tudo volta ao estado de repouso.
   ═══════════════════════════════════════════════════════════════ */

function applyNeutral() {
    applyRelief(); /* os alvos e valores são idênticos */
}

/* ═══════════════════════════════════════════════════════════════
   EVENTOS DO CAMPO DE SENHA
   suppressBlurReset evita conflito quando o blur é causado por
   um clique no toggle (blur dispara ANTES do click).
   ═══════════════════════════════════════════════════════════════ */

let suppressBlurReset = false;

passwordInput.addEventListener('focus', () => {
    suppressBlurReset = false;
    /* Só aplica tensão se a senha estiver oculta */
    if (passwordInput.getAttribute('type') === 'password') {
        applyTension();
    }
});

passwordInput.addEventListener('blur', () => {
    if (suppressBlurReset) {
        suppressBlurReset = false;
        return; /* toggle vai gerenciar o estado */
    }
    applyNeutral();
});

/* ── Toggle Olho ────────────────────────────────────────────── */
togglePassword.addEventListener('mousedown', () => {
    /* Marca que o blur seguinte foi causado pelo toggle */
    suppressBlurReset = true;
});

togglePassword.addEventListener('click', function () {
    const revealing = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', revealing ? 'text' : 'password');
    this.textContent = revealing ? '🙈' : '👁️';

    /* Micro-animação no ícone */
    gsap.fromTo(this,
        { scale: 0.65, rotation: -20 },
        { scale: 1, rotation: 0, duration: 0.45, ease: 'elastic.out(1.2, 0.4)' }
    );

    if (revealing) {
        /* Senha revelada → alívio */
        applyRelief();
    } else {
        /* Senha ocultada → tensão (campo implicitamente ativo) */
        applyTension();
    }
});

/* ═══════════════════════════════════════════════════════════════
   BOTÃO LOG IN
   ═══════════════════════════════════════════════════════════════ */

btnLogin.addEventListener('mouseenter', () => {
    gsap.to(btnLogin, { scale: 1.03, duration: 0.22, ease: 'power2.out' });
});
btnLogin.addEventListener('mouseleave', () => {
    gsap.to(btnLogin, { scale: 1, duration: 0.4, ease: 'elastic.out(1.1, 0.5)' });
});
btnLogin.addEventListener('mousedown', () => {
    gsap.to(btnLogin, { scale: 0.95, duration: 0.1, ease: 'power3.in' });
});
btnLogin.addEventListener('mouseup', () => {
    gsap.to(btnLogin, { scale: 1.03, duration: 0.18, ease: 'power2.out' });
});

/* ═══════════════════════════════════════════════════════════════
   EXIT SEQUENCE — clique no Log In
   Coreografia:
     0 ms  → estado neutro + pupilas olham para o botão
   400 ms  → shapes caem para baixo em stagger
   + 600ms → form-panel some deslizando
   + 400ms → container encolhe e desaparece
   ═══════════════════════════════════════════════════════════════ */

btnLogin.addEventListener('click', (e) => {
    e.preventDefault();

    /* Congela tracking e sinaliza o botão */
    /* Garante que nenhum boneco está em estado de tensão.
       CORREÇÃO (08/10/2026): applyNeutral() religa o trackingActive, então
       precisa vir ANTES de congelar — senão os olhos voltavam a seguir o mouse. */
    applyNeutral();
    trackingActive = false;
    btnLogin.textContent = 'Logging in...';

    /* Pupilas olham para o botão de login */
    allPupils.forEach(pupil => {
        gsap.to(pupil, { x: 10, y: 15, duration: 0.4, ease: 'power2.out' });
    });

    /* Timeline da saída, inicia após as pupilas se posicionarem */
    const exitTl = gsap.timeline({ delay: 0.4 });

    /* 1 — Shapes caem para baixo (surgindo o efeito inverso da entrada) */
    exitTl.to(
        [shapePurple, shapeBlack, shapeYellow, shapeOrange],
        {
            y:        300,
            opacity:  0,
            duration: 0.6,
            stagger:  0.1,
            ease:     'back.in(1.2)',
        }
    );

    /* 2 — Form-panel desliza e some */
    exitTl.to(
        '.form-panel',
        {
            opacity:  0,
            x:        40,
            duration: 0.4,
            ease:     'power2.in',
        }
    );

    /* 3 — Container encolhe e desaparece */
    exitTl.to(
        loginContainer,
        {
            scale:    0.85,
            opacity:  0,
            duration: 0.5,
            ease:     'power3.inOut',
        }
    );
});
