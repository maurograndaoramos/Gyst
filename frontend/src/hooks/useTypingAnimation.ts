import { useState, useEffect, useRef, useMemo } from 'react';
import { typingAnimationManager } from '@/lib/typingAnimationManager';

interface UseTypingAnimationProps {
  text: string;
  onComplete: () => void;
  speed?: {
    min: number;
    max: number;
  };
  id?: string; // Optional custom ID, will generate one if not provided
}

interface UseTypingAnimationReturn {
  displayedText: string;
  isAnimating: boolean;
  progress: number;
}

export const useTypingAnimation = ({
  text,
  onComplete,
  speed = { min: 15, max: 35 }, // Much faster default speed
  id
}: UseTypingAnimationProps): UseTypingAnimationReturn => {
  // Generate stable ID for this animation instance
  const animationId = useMemo(() => {
    return id || `typing-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
  }, [id]);

  const [displayedText, setDisplayedText] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Initialize or resume animation when text changes
  useEffect(() => {
    const initialState = typingAnimationManager.startAnimation(
      animationId,
      text,
      () => onCompleteRef.current(),
      speed
    );

    setDisplayedText(initialState.displayedText);
    setIsAnimating(initialState.isAnimating);
    
    // Subscribe to animation updates
    const unsubscribe = typingAnimationManager.subscribe(animationId, () => {
      const state = typingAnimationManager.getAnimationState(animationId);
      if (state) {
        setDisplayedText(state.displayedText);
        setIsAnimating(state.isAnimating);
        setProgress(state.progress);
      }
    });

    return unsubscribe;
  }, [animationId, text, speed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      typingAnimationManager.cleanup(animationId);
    };
  }, [animationId]);

  return {
    displayedText,
    isAnimating,
    progress
  };
};
