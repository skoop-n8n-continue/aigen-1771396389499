// CONFIGURATION
const PRODUCTS_PER_CYCLE = 1; // Solo focus
const CYCLE_DURATION = 8000; // ms

let PRODUCTS = [];
let currentBatchIndex = 0;

// --- UTILS ---
function splitTextToSpans(element) {
  const text = element.textContent;
  element.innerHTML = "";
  const chars = text.split("").map(char => {
    const span = document.createElement("span");
    span.textContent = char === " " ? "\\u00A0" : char;
    span.style.display = "inline-block";
    span.style.opacity = "0";
    element.appendChild(span);
    return span;
  });
  return chars;
}

// --- FOG EFFECT ---
const canvas = document.getElementById("fog-canvas");
const ctx = canvas.getContext("2d");
let particles = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

class Particle {
  constructor() {
    this.reset();
  }
  
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = (Math.random() - 0.5) * 0.2;
    this.size = Math.random() * 200 + 50;
    this.alpha = Math.random() * 0.05;
    this.life = Math.random() * 1000;
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
    
    if (this.life <= 0 || this.x < -200 || this.x > canvas.width + 200) {
      this.reset();
    }
  }
  
  draw() {
    ctx.beginPath();
    // Simulate puff
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
    gradient.addColorStop(0, \`rgba(200, 210, 230, \${this.alpha})\`);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function initFog() {
  resizeCanvas();
  for(let i=0; i<30; i++) {
    particles.push(new Particle());
  }
  animateFog();
}

function animateFog() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    p.update();
    p.draw();
  });
  requestAnimationFrame(animateFog);
}

// --- PRODUCT LOGIC ---

async function loadProducts() {
  try {
    const response = await fetch("./products.json");
    const data = await response.json();
    PRODUCTS = data.products || [];
    initFog(); // Start fog
    startCycle();
  } catch (error) {
    console.error("Failed to load products:", error);
  }
}

function renderProduct(product) {
  const anchor = document.getElementById("product-anchor");
  anchor.innerHTML = ""; // Clear previous

  const card = document.createElement("div");
  card.className = "product-card";
  
  const img = document.createElement("img");
  img.src = product.image_url;
  img.className = "product-image";
  img.alt = product.name;
  
  card.appendChild(img);
  anchor.appendChild(card);

  // Update Text Elements (but hide them for animation)
  const nameEl = document.getElementById("product-name");
  const priceEl = document.getElementById("product-price");
  const specsEl = document.getElementById("product-specs");
  
  nameEl.textContent = product.name;
  priceEl.textContent = product.price;
  specsEl.textContent = product.meta;
}

function animateCycle(batchIndex) {
  const index = batchIndex % PRODUCTS.length;
  const product = PRODUCTS[index];
  
  renderProduct(product);
  
  // Elements
  const card = document.querySelector(".product-card");
  const img = document.querySelector(".product-image");
  const spotlight = document.getElementById("spotlight");
  const bg = document.getElementById("background");
  
  // Text Elements
  const nameEl = document.getElementById("product-name");
  const chars = splitTextToSpans(nameEl);
  const line = document.getElementById("product-meta-line");
  const details = document.getElementById("product-details");

  const tl = gsap.timeline({
    onComplete: () => {
        // Simple buffer before next
        gsap.delayedCall(0.5, () => animateCycle(batchIndex + 1));
    }
  });

  // INITIAL STATE
  gsap.set(card, { opacity: 0, scale: 0.8, z: -200, y: 50 });
  gsap.set(img, { filter: "brightness(0) blur(10px)" }); // Silhouette start
  gsap.set(spotlight, { opacity: 0, scale: 0.5 });
  gsap.set(line, { width: "0%" });
  gsap.set(details, { opacity: 0, y: 20 });
  // Text chars are already hidden by splitTextToSpans opacity:0

  // 1. REVEAL SEQUENCE
  
  // Background drifting
  tl.fromTo(bg, { scale: 1.1, x: -20 }, { scale: 1.15, x: 0, duration: 8, ease: "sine.inOut" }, 0);

  // Spotlight on
  tl.to(spotlight, { opacity: 0.8, scale: 1.2, duration: 2, ease: "power2.out" }, 0);

  // Car "Drives" In (Zoom + Opacity)
  tl.to(card, { opacity: 1, scale: 1, z: 0, y: 0, duration: 1.5, ease: "power3.out" }, 0.2);
  
  // Lights On Effect (Brightness + Blur removal)
  tl.to(img, { filter: "brightness(1) blur(0px)", duration: 1.2, ease: "power2.inOut" }, 0.4);

  // Text Reveal (Cinematic Stagger)
  tl.to(chars, { opacity: 1, stagger: 0.05, ease: "power2.out" }, 0.8);
  tl.to(line, { width: "100px", duration: 0.8, ease: "power2.out" }, 1.0);
  tl.to(details, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, 1.2);

  // 2. IDLE PHASE (Floating)
  tl.to(card, { y: -10, duration: 4, ease: "sine.inOut", yoyo: true, repeat: 1 }, 1.7);
  // Spotlight breathing
  tl.to(spotlight, { opacity: 0.6, scale: 1.1, duration: 3, yoyo: true, repeat: 1, ease: "sine.inOut" }, 2);

  // 3. EXIT SEQUENCE
  // Zoom INTO the car (transition to black or next)
  const exitStart = 6.5;
  
  // Text Fades out first
  tl.to([nameEl, line, details], { opacity: 0, x: -50, duration: 0.5, ease: "power2.in" }, exitStart);
  
  // Car accelerates past camera
  tl.to(card, { z: 500, opacity: 0, duration: 0.8, ease: "power2.in" }, exitStart + 0.1);
  tl.to(img, { filter: "blur(20px)", duration: 0.5 }, exitStart + 0.1);
  
  // Spotlight off
  tl.to(spotlight, { opacity: 0, duration: 0.5 }, exitStart + 0.3);

}

function startCycle() {
  animateCycle(0);
}

// Initial setup
window.addEventListener("DOMContentLoaded", loadProducts);
window.addEventListener("resize", resizeCanvas);

