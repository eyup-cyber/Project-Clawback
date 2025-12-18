/**
 * Central Animation Frame Loop Manager
 *
 * Provides a unified requestAnimationFrame loop to prevent multiple
 * independent RAF calls from competing for browser resources.
 *
 * Usage:
 *   frameLoop.register('particles', (deltaTime, timestamp) => {
 *     updateParticles(deltaTime);
 *     renderParticles();
 *   });
 *
 *   // Later:
 *   frameLoop.unregister('particles');
 */

type FrameCallback = (deltaTime: number, timestamp: number) => void;

class FrameLoop {
  private callbacks = new Map<string, FrameCallback>();
  private rafId = 0;
  private lastTime = 0;
  private isRunning = false;

  /**
   * Register a callback to be called on each animation frame.
   * @param id Unique identifier for this callback
   * @param callback Function to call with (deltaTime, timestamp)
   */
  register(id: string, callback: FrameCallback): void {
    this.callbacks.set(id, callback);
    if (!this.isRunning) this.start();
  }

  /**
   * Unregister a callback by its identifier.
   * @param id The identifier used when registering
   */
  unregister(id: string): void {
    this.callbacks.delete(id);
    if (this.callbacks.size === 0) this.stop();
  }

  /**
   * Check if a callback is registered.
   * @param id The identifier to check
   */
  has(id: string): boolean {
    return this.callbacks.has(id);
  }

  /**
   * Get the number of registered callbacks.
   */
  get count(): number {
    return this.callbacks.size;
  }

  private tick = (timestamp: number): void => {
    // Calculate delta time normalized to 60fps (16.67ms)
    // deltaTime of 1 = 60fps, 2 = 30fps, 0.5 = 120fps
    const deltaTime = this.lastTime ? (timestamp - this.lastTime) / 16.67 : 1;
    this.lastTime = timestamp;

    // Call all registered callbacks
    for (const callback of this.callbacks.values()) {
      callback(deltaTime, timestamp);
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  private start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  private stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.lastTime = 0;
  }

  /**
   * Force stop all animations and clear all callbacks.
   */
  destroy(): void {
    this.stop();
    this.callbacks.clear();
  }
}

// Singleton instance
export const frameLoop = new FrameLoop();
