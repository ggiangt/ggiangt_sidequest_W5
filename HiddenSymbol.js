class HiddenSymbol {
  constructor(x, y, label) {
    this.x = x;
    this.y = y;
    this.label = label;
    this.discovered = false;

    // Animation state
    this.bloom = 0;            // 0 → barely visible, 1 → fully revealed
    this.rotation = random(TWO_PI);
    this.pulsePhase = random(TWO_PI);
    this.labelTimer = 0;       // seconds remaining for label display
  }

  update(camX, camY, viewW, viewH) {
    // Distance from the symbol to the nearest point on the viewport rect.
    // 0 when on-screen; grows as it moves off-screen.
    const nearX = constrain(this.x, camX, camX + viewW);
    const nearY = constrain(this.y, camY, camY + viewH);
    const dx = this.x - nearX;
    const dy = this.y - nearY;
    const d = sqrt(dx * dx + dy * dy);

    // Target bloom: full when on-screen, fades across a 200px proximity ring
    const target = d < 200 ? 1 - d / 200 : 0;

    // Ease toward target — slow bloom in, slightly faster fade out
    const rate = target > this.bloom ? 0.025 : 0.045;
    this.bloom = lerp(this.bloom, target, rate);

    // Ambient animation
    this.rotation += 0.008;
    this.pulsePhase += 0.04;

    // Label countdown
    if (this.labelTimer > 0) {
      this.labelTimer = max(0, this.labelTimer - 1 / 60);
    }
  }

  draw() {
    // Always draw a faint ghost so it can catch the eye
    const b = max(this.bloom, 0.04);

    push();
    translate(this.x, this.y);

    // Scale: tiny whisper → full presence
    const s = lerp(0.35, 1.0, b);
    scale(s);

    // Pulsing alpha
    const pulse = sin(this.pulsePhase) * 0.12 + 0.88;
    const a = b * pulse;

    noStroke();

    // Outer glow rings
    fill(255, 245, 210, a * 25);
    ellipse(0, 0, 36, 36);
    fill(255, 245, 210, a * 50);
    ellipse(0, 0, 22, 22);
    fill(255, 250, 230, a * 85);
    ellipse(0, 0, 12, 12);

    // Diamond core (slowly rotating)
    push();
    rotate(this.rotation);
    fill(255, 252, 240, a * 210);
    beginShape();
    vertex(0, -6);
    vertex(4, 0);
    vertex(0, 6);
    vertex(-4, 0);
    endShape(CLOSE);
    pop();

    // Discovered marker — soft ring
    if (this.discovered) {
      noFill();
      stroke(255, 250, 230, a * 90);
      strokeWeight(0.6);
      ellipse(0, 0, 20, 20);
    }

    // Label (shown briefly after clicking)
    if (this.labelTimer > 0) {
      // Fade in 0.5s → hold → fade out 1.0s
      let la;
      if (this.labelTimer > 2.5) {
        la = (3.0 - this.labelTimer) / 0.5;
      } else if (this.labelTimer > 1.0) {
        la = 1.0;
      } else {
        la = this.labelTimer / 1.0;
      }

      noStroke();
      fill(255, 252, 240, la * 230);
      textAlign(CENTER, BOTTOM);
      textSize(11);
      textStyle(ITALIC);
      text(this.label, 0, -22);
    }

    pop();
  }

  tryClick(worldX, worldY) {
    if (this.discovered) return false;
    if (this.bloom < 0.3) return false; // must be reasonably visible to click
    const dx = worldX - this.x;
    const dy = worldY - this.y;
    if (dx * dx + dy * dy < 24 * 24) {
      this.discovered = true;
      this.labelTimer = 3.0;
      return true;
    }
    return false;
  }
}
