

class AnimationEngine {
  constructor() {
    this.confettiCanvas = null;
    this.confettiCtx = null;
    this.confettiParticles = [];
    this.isConfettiActive = false;
    this.confettiAnimationId = null;

    this.bgCanvas = null;
    this.bgCtx = null;
    this.bgParticles = [];
    this.isBgActive = false;
    this.bgAnimationId = null;
  }

  initConfetti(canvas) {
    this.confettiCanvas = canvas;
    this.confettiCtx = canvas.getContext('2d');
    this.resizeCanvas(this.confettiCanvas);
    window.addEventListener('resize', () => this.resizeCanvas(this.confettiCanvas));
  }

  initBgParticles(canvas) {
    this.bgCanvas = canvas;
    this.bgCtx = canvas.getContext('2d');
    this.resizeCanvas(this.bgCanvas);
    window.addEventListener('resize', () => this.resizeCanvas(this.bgCanvas));
    this.createBgParticles();
  }

  resizeCanvas(canvas) {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  startConfetti() {
    if (this.isConfettiActive) return;
    this.isConfettiActive = true;
    this.confettiParticles = [];
    this.resizeCanvas(this.confettiCanvas);

    const colors = ['#ff3e6c', '#00f0ff', '#ffb800', '#3b82f6', '#10b981', '#8b5cf6'];
    for (let i = 0; i < 160; i++) {
      this.confettiParticles.push({
        x: Math.random() * this.confettiCanvas.width,
        y: Math.random() * this.confettiCanvas.height - this.confettiCanvas.height,
        r: Math.random() * 6 + 4,
        d: Math.random() * this.confettiCanvas.height,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngleIncremental: Math.random() * 0.07 + 0.02,
        tiltAngle: 0,
        speed: Math.random() * 3 + 2
      });
    }

    this.animateConfetti();
  }

  stopConfetti() {
    this.isConfettiActive = false;
    if (this.confettiCtx && this.confettiCanvas) {
      this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
    }
    cancelAnimationFrame(this.confettiAnimationId);
  }

  animateConfetti() {
    if (!this.isConfettiActive || !this.confettiCtx) return;

    this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);

    let remaining = 0;
    this.confettiParticles.forEach((p) => {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += p.speed;
      p.x += Math.sin(p.tiltAngle) * 0.5;
      p.tilt = Math.sin(p.tiltAngle - p.r / 2) * 8;

      this.confettiCtx.beginPath();
      this.confettiCtx.lineWidth = p.r;
      this.confettiCtx.strokeStyle = p.color;
      this.confettiCtx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      this.confettiCtx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      this.confettiCtx.stroke();

      if (p.y < this.confettiCanvas.height) {
        remaining++;
      } else {
        p.x = Math.random() * this.confettiCanvas.width;
        p.y = -20;
        p.tilt = Math.random() * 10 - 5;
        p.speed = Math.random() * 3 + 2;
        remaining++;
      }
    });

    if (remaining > 0) {
      this.confettiAnimationId = requestAnimationFrame(() => this.animateConfetti());
    }
  }

  createBgParticles() {
    this.bgParticles = [];
    const count = 45;
    for (let i = 0; i < count; i++) {
      this.bgParticles.push({
        x: Math.random() * this.bgCanvas.width,
        y: Math.random() * this.bgCanvas.height,
        r: Math.random() * 3 + 1,
        speed: Math.random() * 0.5 + 0.1,
        opacity: Math.random() * 0.4 + 0.1,
        angle: Math.random() * Math.PI * 2
      });
    }
  }

  startBgParticles() {
    if (this.isBgActive) return;
    this.isBgActive = true;
    this.resizeCanvas(this.bgCanvas);
    this.createBgParticles();
    this.animateBgParticles();
  }

  stopBgParticles() {
    this.isBgActive = false;
    cancelAnimationFrame(this.bgAnimationId);
  }

  animateBgParticles() {
    if (!this.isBgActive || !this.bgCtx) return;

    this.bgCtx.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);

    const isLightMode = document.body.classList.contains('light-mode');
    const colorHex = isLightMode ? '0, 0, 0' : '255, 255, 255';

    this.bgParticles.forEach((p) => {
      p.y -= p.speed;
      p.x += Math.sin(p.angle) * 0.2;

      if (p.y < -10) {
        p.y = this.bgCanvas.height + 10;
        p.x = Math.random() * this.bgCanvas.width;
      }

      this.bgCtx.beginPath();
      this.bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      this.bgCtx.fillStyle = `rgba(${colorHex}, ${p.opacity})`;
      this.bgCtx.fill();
    });

    this.bgAnimationId = requestAnimationFrame(() => this.animateBgParticles());
  }

  triggerCameraShake(container) {
    if (!container) return;
    container.classList.add('camera-shake');
    setTimeout(() => {
      container.classList.remove('camera-shake');
    }, 500); 
  }
}

export const anim = new AnimationEngine();
