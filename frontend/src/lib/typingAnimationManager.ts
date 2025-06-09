// Animation state manager to persist typing animations across component lifecycles
class TypingAnimationManager {
  private animations = new Map<string, {
    text: string;
    currentIndex: number;
    displayedText: string;
    completed: boolean;
    lastUpdateTime: number;
    animationId: number | null;
    onComplete?: () => void;
  }>();

  // Create or resume an animation
  startAnimation(
    id: string, 
    text: string, 
    onComplete: () => void,
    speed: { min: number; max: number } = { min: 30, max: 70 }
  ) {
    const existing = this.animations.get(id);
    
    // If animation exists and text is the same, resume it
    if (existing && existing.text === text && !existing.completed) {
      existing.onComplete = onComplete;
      if (!existing.animationId) {
        this.resumeAnimation(id, speed);
      }
      return {
        displayedText: existing.displayedText,
        currentIndex: existing.currentIndex,
        isAnimating: !existing.completed
      };
    }
    
    // Create new animation
    const animation = {
      text,
      currentIndex: 0,
      displayedText: '',
      completed: false,
      lastUpdateTime: 0,
      animationId: null as number | null,
      onComplete
    };
    
    this.animations.set(id, animation);
    this.resumeAnimation(id, speed);
    
    return {
      displayedText: '',
      currentIndex: 0,
      isAnimating: true
    };
  }

  private resumeAnimation(id: string, speed: { min: number; max: number }) {
    const animation = this.animations.get(id);
    if (!animation || animation.completed) return;

    const animate = (currentTime: number) => {
      const anim = this.animations.get(id);
      if (!anim || anim.completed) return;

      const timeSinceLastUpdate = currentTime - anim.lastUpdateTime;
      const delay = speed.min + Math.random() * (speed.max - speed.min);

      if (timeSinceLastUpdate >= delay) {
        anim.currentIndex++;
        anim.displayedText = anim.text.slice(0, anim.currentIndex);
        anim.lastUpdateTime = currentTime;

        // Notify subscribers about the update
        this.notifyUpdate(id);

        if (anim.currentIndex >= anim.text.length) {
          anim.completed = true;
          anim.animationId = null;
          if (anim.onComplete) {
            anim.onComplete();
          }
          return;
        }
      }

      anim.animationId = requestAnimationFrame(animate);
    };

    animation.animationId = requestAnimationFrame(animate);
  }

  // Stop an animation
  stopAnimation(id: string) {
    const animation = this.animations.get(id);
    if (animation?.animationId) {
      cancelAnimationFrame(animation.animationId);
      animation.animationId = null;
    }
  }

  // Get current animation state
  getAnimationState(id: string) {
    const animation = this.animations.get(id);
    if (!animation) return null;
    
    return {
      displayedText: animation.displayedText,
      currentIndex: animation.currentIndex,
      isAnimating: !animation.completed && animation.animationId !== null,
      progress: animation.text.length > 0 ? (animation.currentIndex / animation.text.length) * 100 : 0,
      completed: animation.completed
    };
  }

  // Clean up completed or unused animations
  cleanup(id: string) {
    const animation = this.animations.get(id);
    if (animation?.animationId) {
      cancelAnimationFrame(animation.animationId);
    }
    this.animations.delete(id);
  }

  // Event system for updates
  private subscribers = new Map<string, Set<() => void>>();

  subscribe(id: string, callback: () => void) {
    if (!this.subscribers.has(id)) {
      this.subscribers.set(id, new Set());
    }
    this.subscribers.get(id)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(id)?.delete(callback);
      if (this.subscribers.get(id)?.size === 0) {
        this.subscribers.delete(id);
      }
    };
  }

  private notifyUpdate(id: string) {
    this.subscribers.get(id)?.forEach(callback => callback());
  }
}

// Global singleton instance
export const typingAnimationManager = new TypingAnimationManager();
