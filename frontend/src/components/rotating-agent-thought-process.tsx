'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertCircle, Loader2, Brain, FileText, Sparkles } from 'lucide-react';
import { AgentStep } from '@/types/chat';

interface RotatingAgentThoughtProcessProps {
  agentSteps: AgentStep[];
  isProcessing?: boolean;
  rotationInterval?: number; // milliseconds
}

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'processing':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const getAgentIcon = (agentName: string) => {
  const name = agentName.toLowerCase();
  if (name.includes('document') || name.includes('context') || name.includes('analyst')) {
    return <FileText className="h-5 w-5 text-blue-600" />;
  } else if (name.includes('assistant') || name.includes('ai')) {
    return <Sparkles className="h-5 w-5 text-purple-600" />;
  } else {
    return <Brain className="h-5 w-5 text-indigo-600" />;
  }
};

const getCardColor = (agentName: string, status: string) => {
  const name = agentName.toLowerCase();
  const isCompleted = status.toLowerCase() === 'completed';
  
  if (name.includes('document') || name.includes('context') || name.includes('analyst')) {
    return isCompleted 
      ? 'bg-blue-50 border-blue-200 shadow-blue-100' 
      : 'bg-blue-25 border-blue-100';
  } else if (name.includes('assistant') || name.includes('ai')) {
    return isCompleted 
      ? 'bg-purple-50 border-purple-200 shadow-purple-100' 
      : 'bg-purple-25 border-purple-100';
  } else {
    return isCompleted 
      ? 'bg-indigo-50 border-indigo-200 shadow-indigo-100' 
      : 'bg-indigo-25 border-indigo-100';
  }
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export default function RotatingAgentThoughtProcess({ 
  agentSteps, 
  isProcessing = false,
  rotationInterval = 3000 // 3 seconds
}: RotatingAgentThoughtProcessProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Create hardcoded agent steps when processing and no real steps available
  const hardcodedSteps = [
    {
      agent_name: "Document Context Specialist",
      agent_role: "Document Analyst",
      thought_process: "Processing and analyzing documents for relevant information, extracting key insights, and scoring relevance...",
      status: isProcessing ? "processing" : "completed",
      timestamp: new Date().toISOString()
    },
    {
      agent_name: "AI Assistant", 
      agent_role: "Response Generator",
      thought_process: "Crafting comprehensive response based on document insights and user requirements...",
      status: isProcessing ? "processing" : "completed", 
      timestamp: new Date().toISOString()
    }
  ];

  // Rotate through steps
  useEffect(() => {
    const stepsToRotate = (!agentSteps || agentSteps.length === 0) && isProcessing 
      ? hardcodedSteps 
      : agentSteps;
      
    if (!stepsToRotate || stepsToRotate.length <= 1) return;

    const timer = setInterval(() => {
      setIsAnimating(true);
      
      // After animation starts, change the step
      setTimeout(() => {
        setCurrentStepIndex((prev) => (prev + 1) % stepsToRotate.length);
        setIsAnimating(false);
      }, 150); // Half of transition duration
      
    }, rotationInterval);

    return () => clearInterval(timer);
  }, [agentSteps, isProcessing, rotationInterval, hardcodedSteps]);

  // Use hardcoded steps when processing and no real steps available
  const stepsToUse = (!agentSteps || agentSteps.length === 0) && isProcessing 
    ? hardcodedSteps 
    : agentSteps;

  // If no steps and not processing, return null
  if (!stepsToUse || stepsToUse.length === 0) {
    return null;
  }

  const currentStep = stepsToUse[currentStepIndex];
  const totalSteps = stepsToUse.length;
  
  // Check if all steps are completed (independent of current rotation)
  const allStepsCompleted = stepsToUse.every(step => 
    step.status.toLowerCase() === 'completed'
  );

  return (
    <div className="w-full space-y-3">
      {/* Header with step indicator */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Brain className="h-4 w-4 text-indigo-600" />
          AI Agent Thought Process
        </h3>
        
        {totalSteps > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {currentStepIndex + 1} of {totalSteps}
            </span>
            <div className="flex gap-1">
              {stepsToUse.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                    index === currentStepIndex 
                      ? 'bg-indigo-500' 
                      : allStepsCompleted || stepsToUse[index].status.toLowerCase() === 'completed'
                        ? 'bg-green-400' 
                        : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rotating card */}
      <Card 
        className={`
          w-full transition-all duration-300 shadow-sm
          ${getCardColor(currentStep.agent_name, currentStep.status)}
          ${isAnimating ? 'scale-95 opacity-80' : 'scale-100 opacity-100'}
        `}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getAgentIcon(currentStep.agent_name)}
              <div>
                <CardTitle className="text-base font-medium">
                  {currentStep.agent_name}
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  {currentStep.agent_role}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className="text-xs"
              >
                {getStatusIcon(currentStep.status)}
                <span className="ml-1">{currentStep.status}</span>
              </Badge>
              <span className="text-xs text-gray-500">
                {formatTimestamp(currentStep.timestamp)}
              </span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <p className="text-sm text-gray-700 leading-relaxed">
            {currentStep.thought_process}
          </p>
        </CardContent>
      </Card>

      {/* Progress indicator */}
      {totalSteps > 1 && (
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div 
            className="bg-indigo-500 h-1 rounded-full transition-all duration-300"
            style={{ 
              width: allStepsCompleted ? '100%' : `${(currentStepIndex / (totalSteps - 1)) * 100}%` 
            }}
          />
        </div>
      )}

      {/* Final completion status - now persistent once all steps are completed */}
      {!isProcessing && allStepsCompleted && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg">
          <CheckCircle className="h-4 w-4" />
          <span>Analysis completed successfully</span>
        </div>
      )}
    </div>
  );
}
