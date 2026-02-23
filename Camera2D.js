class Camera2D {
  constructor(viewW, viewH) {
    this.viewW = viewW;
    this.viewH = viewH;
    this.x = 0;
    this.y = 0;

    // Emotional lag state
    this._prevTargetX = null;   // previous frame's target
    this._movingFrames = 0;     // how many frames the player has been moving
    this._idleTime = 0;         // seconds the player has been still
    this._idlePhase = 0;        // sinusoidal phase for idle drift
  }

  followSideScrollerX(targetX, lerpAmt) {
    const desired = targetX - this.viewW / 2;
    const dt = 1 / 60; // assume 60fps for time tracking

    // Detect whether the player is moving
    if (this._prevTargetX === null) this._prevTargetX = targetX;
    const moved = abs(targetX - this._prevTargetX) > 0.1;
    this._prevTargetX = targetX;

    if (moved) {
      this._movingFrames++;
      this._idleTime = 0;
      this._idlePhase = 0;
    } else {
      this._movingFrames = 0;
      this._idleTime += dt;
    }

    // --- Emotional lerp factor ---
    // Ease-in: when the player just started moving, the camera is sluggish
    // and slowly ramps up to the full lerp over ~30 frames.
    // Linger: when the player stops, use a much smaller lerp so the camera
    // drifts to a halt instead of snapping.
    let effectiveLerp;
    if (moved) {
      // Ramp from 20% of base lerp up to full over ~30 frames
      const ramp = constrain(this._movingFrames / 30, 0, 1);
      const eased = ramp * ramp; // quadratic ease-in
      effectiveLerp = lerp(lerpAmt * 0.2, lerpAmt, eased);
    } else {
      // Linger: use a soft lerp that decays as idle time grows,
      // bottoming out at 15% of base lerp
      const lingerFade = constrain(this._idleTime / 0.8, 0, 1);
      effectiveLerp = lerp(lerpAmt * 0.6, lerpAmt * 0.15, lingerFade);
    }

    this.x = lerp(this.x, desired, effectiveLerp);

    // --- Idle drift ---
    // After 1 second of stillness, add a gentle sinusoidal float
    if (this._idleTime > 1.0) {
      // Fade the drift in over the first 0.5s after the 1s threshold
      const driftStrength = constrain((this._idleTime - 1.0) / 0.5, 0, 1);
      this._idlePhase += dt * 1.2; // slow oscillation (~1.2 rad/s)
      this.x += sin(this._idlePhase) * 2.5 * driftStrength;
    }
  }

  clampToWorld(worldW, worldH) {
    const maxX = max(0, worldW - this.viewW);
    const maxY = max(0, worldH - this.viewH);
    this.x = constrain(this.x, 0, maxX);
    this.y = constrain(this.y, 0, maxY);
  }

  begin() {
    push();
    translate(-this.x, -this.y);
  }
  end() {
    pop();
  }
}
