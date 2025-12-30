/**
 * Spring Physics Library
 * Advanced spring configurations and physics-based animation utilities
 */

// ============================================
// SPRING PRESETS
// ============================================

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass?: number;
  velocity?: number;
}

/**
 * Carefully tuned spring presets for different use cases
 * Based on physics principles for natural motion
 */
export const SPRING_PRESETS: Record<string, SpringConfig> = {
  // UI Interactions - Snappy and responsive
  button: { stiffness: 400, damping: 30 },
  toggle: { stiffness: 500, damping: 35 },
  menu: { stiffness: 350, damping: 28 },

  // Cards and Panels - Smooth but weighted
  card: { stiffness: 300, damping: 25 },
  panel: { stiffness: 250, damping: 30 },
  drawer: { stiffness: 350, damping: 35 },
  modal: { stiffness: 400, damping: 32 },

  // Text and Typography - Quick and precise
  text: { stiffness: 450, damping: 38 },
  letter: { stiffness: 500, damping: 25 },
  word: { stiffness: 400, damping: 30 },

  // Playful Elements - Bouncy
  bounce: { stiffness: 300, damping: 15 },
  playful: { stiffness: 350, damping: 18 },
  elastic: { stiffness: 500, damping: 20, mass: 0.5 },

  // Heavy Elements - Weighted and slow
  heavy: { stiffness: 150, damping: 35, mass: 1.5 },
  sluggish: { stiffness: 100, damping: 30, mass: 2 },

  // Gentle Elements - Soft and subtle
  gentle: { stiffness: 100, damping: 20 },
  soft: { stiffness: 150, damping: 25 },
  float: { stiffness: 50, damping: 15 },

  // Fast/Quick Elements
  snap: { stiffness: 600, damping: 40 },
  quick: { stiffness: 500, damping: 35 },
  instant: { stiffness: 800, damping: 50 },

  // Magnetic/Pull Effects
  magnetic: { stiffness: 200, damping: 20 },
  attract: { stiffness: 150, damping: 18 },
  repel: { stiffness: 250, damping: 22 },

  // Drag and Drop
  drag: { stiffness: 300, damping: 30 },
  release: { stiffness: 400, damping: 25 },
  throwable: { stiffness: 200, damping: 15, mass: 0.8 },

  // Page Transitions
  pageEnter: { stiffness: 300, damping: 28 },
  pageExit: { stiffness: 400, damping: 35 },

  // Parallax/Scroll
  parallax: { stiffness: 100, damping: 30 },
  scroll: { stiffness: 150, damping: 25 },

  // Notification/Alert
  notification: { stiffness: 350, damping: 22 },
  alert: { stiffness: 400, damping: 18 },
};

// ============================================
// FRAMER MOTION SPRING CONFIGS
// ============================================

/**
 * Pre-configured spring objects for Framer Motion
 */
export const framerSprings = {
  button: { type: 'spring' as const, ...SPRING_PRESETS.button },
  toggle: { type: 'spring' as const, ...SPRING_PRESETS.toggle },
  menu: { type: 'spring' as const, ...SPRING_PRESETS.menu },
  card: { type: 'spring' as const, ...SPRING_PRESETS.card },
  panel: { type: 'spring' as const, ...SPRING_PRESETS.panel },
  drawer: { type: 'spring' as const, ...SPRING_PRESETS.drawer },
  modal: { type: 'spring' as const, ...SPRING_PRESETS.modal },
  text: { type: 'spring' as const, ...SPRING_PRESETS.text },
  letter: { type: 'spring' as const, ...SPRING_PRESETS.letter },
  word: { type: 'spring' as const, ...SPRING_PRESETS.word },
  bounce: { type: 'spring' as const, ...SPRING_PRESETS.bounce },
  playful: { type: 'spring' as const, ...SPRING_PRESETS.playful },
  elastic: { type: 'spring' as const, ...SPRING_PRESETS.elastic },
  heavy: { type: 'spring' as const, ...SPRING_PRESETS.heavy },
  gentle: { type: 'spring' as const, ...SPRING_PRESETS.gentle },
  soft: { type: 'spring' as const, ...SPRING_PRESETS.soft },
  float: { type: 'spring' as const, ...SPRING_PRESETS.float },
  snap: { type: 'spring' as const, ...SPRING_PRESETS.snap },
  quick: { type: 'spring' as const, ...SPRING_PRESETS.quick },
  magnetic: { type: 'spring' as const, ...SPRING_PRESETS.magnetic },
  drag: { type: 'spring' as const, ...SPRING_PRESETS.drag },
  notification: { type: 'spring' as const, ...SPRING_PRESETS.notification },
};

// ============================================
// SPRING SIMULATION
// ============================================

/**
 * Simple spring simulation for custom animations
 * Returns position over time based on spring physics
 */
export class SpringSimulation {
  private position: number;
  private velocity: number;
  private target: number;
  private stiffness: number;
  private damping: number;
  private mass: number;
  private precision: number;

  constructor(initialPosition: number = 0, config: SpringConfig = SPRING_PRESETS.button) {
    this.position = initialPosition;
    this.velocity = config.velocity ?? 0;
    this.target = initialPosition;
    this.stiffness = config.stiffness;
    this.damping = config.damping;
    this.mass = config.mass ?? 1;
    this.precision = 0.001;
  }

  /**
   * Set new target position
   */
  setTarget(target: number): void {
    this.target = target;
  }

  /**
   * Update spring position based on delta time
   * @param dt Delta time in seconds
   */
  update(dt: number): number {
    // Spring force: F = -k * x
    const springForce = -this.stiffness * (this.position - this.target);

    // Damping force: F = -c * v
    const dampingForce = -this.damping * this.velocity;

    // Total force
    const force = springForce + dampingForce;

    // Acceleration: a = F / m
    const acceleration = force / this.mass;

    // Update velocity and position
    this.velocity += acceleration * dt;
    this.position += this.velocity * dt;

    return this.position;
  }

  /**
   * Check if spring has settled (reached equilibrium)
   */
  isSettled(): boolean {
    return (
      Math.abs(this.position - this.target) < this.precision &&
      Math.abs(this.velocity) < this.precision
    );
  }

  /**
   * Get current position
   */
  getPosition(): number {
    return this.position;
  }

  /**
   * Get current velocity
   */
  getVelocity(): number {
    return this.velocity;
  }

  /**
   * Reset spring to initial state
   */
  reset(position: number = 0): void {
    this.position = position;
    this.velocity = 0;
    this.target = position;
  }

  /**
   * Set velocity (useful for gesture-based interactions)
   */
  setVelocity(velocity: number): void {
    this.velocity = velocity;
  }
}

// ============================================
// MULTI-DIMENSIONAL SPRING
// ============================================

export interface Vector2D {
  x: number;
  y: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * 2D Spring simulation for cursor/position tracking
 */
export class Spring2D {
  private springX: SpringSimulation;
  private springY: SpringSimulation;

  constructor(initial: Vector2D = { x: 0, y: 0 }, config: SpringConfig = SPRING_PRESETS.magnetic) {
    this.springX = new SpringSimulation(initial.x, config);
    this.springY = new SpringSimulation(initial.y, config);
  }

  setTarget(target: Vector2D): void {
    this.springX.setTarget(target.x);
    this.springY.setTarget(target.y);
  }

  update(dt: number): Vector2D {
    return {
      x: this.springX.update(dt),
      y: this.springY.update(dt),
    };
  }

  getPosition(): Vector2D {
    return {
      x: this.springX.getPosition(),
      y: this.springY.getPosition(),
    };
  }

  isSettled(): boolean {
    return this.springX.isSettled() && this.springY.isSettled();
  }

  setVelocity(velocity: Vector2D): void {
    this.springX.setVelocity(velocity.x);
    this.springY.setVelocity(velocity.y);
  }

  reset(position: Vector2D = { x: 0, y: 0 }): void {
    this.springX.reset(position.x);
    this.springY.reset(position.y);
  }
}

/**
 * 3D Spring simulation for Three.js integrations
 */
export class Spring3D {
  private springX: SpringSimulation;
  private springY: SpringSimulation;
  private springZ: SpringSimulation;

  constructor(
    initial: Vector3D = { x: 0, y: 0, z: 0 },
    config: SpringConfig = SPRING_PRESETS.gentle
  ) {
    this.springX = new SpringSimulation(initial.x, config);
    this.springY = new SpringSimulation(initial.y, config);
    this.springZ = new SpringSimulation(initial.z, config);
  }

  setTarget(target: Vector3D): void {
    this.springX.setTarget(target.x);
    this.springY.setTarget(target.y);
    this.springZ.setTarget(target.z);
  }

  update(dt: number): Vector3D {
    return {
      x: this.springX.update(dt),
      y: this.springY.update(dt),
      z: this.springZ.update(dt),
    };
  }

  getPosition(): Vector3D {
    return {
      x: this.springX.getPosition(),
      y: this.springY.getPosition(),
      z: this.springZ.getPosition(),
    };
  }

  isSettled(): boolean {
    return this.springX.isSettled() && this.springY.isSettled() && this.springZ.isSettled();
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate the natural frequency of a spring
 * ω₀ = √(k/m)
 */
export const getNaturalFrequency = (config: SpringConfig): number => {
  const mass = config.mass ?? 1;
  return Math.sqrt(config.stiffness / mass);
};

/**
 * Calculate the damping ratio
 * ζ = c / (2 * √(k * m))
 */
export const getDampingRatio = (config: SpringConfig): number => {
  const mass = config.mass ?? 1;
  return config.damping / (2 * Math.sqrt(config.stiffness * mass));
};

/**
 * Determine if the spring is underdamped, critically damped, or overdamped
 */
export const getSpringType = (
  config: SpringConfig
): 'underdamped' | 'critically-damped' | 'overdamped' => {
  const ratio = getDampingRatio(config);
  if (ratio < 1) return 'underdamped';
  if (ratio === 1) return 'critically-damped';
  return 'overdamped';
};

/**
 * Estimate the settling time (time to reach ~98% of target)
 * For underdamped systems: t ≈ 4 / (ζ * ω₀)
 */
export const estimateSettlingTime = (config: SpringConfig): number => {
  const omega = getNaturalFrequency(config);
  const zeta = getDampingRatio(config);

  if (zeta >= 1) {
    // Critically damped or overdamped
    return 4 / omega;
  }

  // Underdamped
  return 4 / (zeta * omega);
};

/**
 * Create a spring config that settles in approximately the given duration
 */
export const createSpringForDuration = (
  durationSeconds: number,
  bounce: number = 0.2 // 0 = no bounce, 1 = very bouncy
): SpringConfig => {
  // Target damping ratio based on bounce
  const zeta = 1 - bounce * 0.8; // Map 0-1 bounce to 0.2-1 damping ratio

  // Calculate natural frequency from settling time
  // t_s ≈ 4 / (ζ * ω₀) => ω₀ ≈ 4 / (ζ * t_s)
  const omega = 4 / (zeta * durationSeconds);

  // Calculate stiffness: k = m * ω₀²
  const mass = 1;
  const stiffness = mass * omega * omega;

  // Calculate damping: c = 2 * ζ * √(k * m)
  const damping = 2 * zeta * Math.sqrt(stiffness * mass);

  return { stiffness, damping, mass };
};

/**
 * Interpolate between two spring configs
 */
export const interpolateSpring = (
  from: SpringConfig,
  to: SpringConfig,
  progress: number
): SpringConfig => {
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  return {
    stiffness: lerp(from.stiffness, to.stiffness, progress),
    damping: lerp(from.damping, to.damping, progress),
    mass: lerp(from.mass ?? 1, to.mass ?? 1, progress),
  };
};

/**
 * Creates a spring config optimized for gesture velocity
 * Higher velocity = less damping for more natural throw
 */
export const createVelocitySpring = (
  velocity: number,
  baseConfig: SpringConfig = SPRING_PRESETS.throwable
): SpringConfig => {
  const velocityFactor = Math.min(Math.abs(velocity) / 1000, 1);
  const dampingReduction = velocityFactor * 0.3; // Reduce damping up to 30%

  return {
    ...baseConfig,
    damping: baseConfig.damping * (1 - dampingReduction),
    velocity,
  };
};

// ============================================
// REACT HOOK HELPERS
// ============================================

/**
 * Get spring config for Framer Motion based on preset name
 */
export const getFramerSpring = (preset: keyof typeof SPRING_PRESETS) => ({
  type: 'spring' as const,
  ...SPRING_PRESETS[preset],
});

/**
 * Create Framer Motion transition with spring
 */
export const createFramerTransition = (preset: keyof typeof SPRING_PRESETS, delay?: number) => ({
  type: 'spring' as const,
  ...SPRING_PRESETS[preset],
  ...(delay !== undefined && { delay }),
});
