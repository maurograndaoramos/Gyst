import { useState, useEffect, useCallback } from 'react';
import type { FileData } from '@/types/file';

interface TabState {
  id: string;
  file: FileData;
  isModified: boolean;
}

interface UseTabsOptions {
  maxTabs?: number;
  onTabLimitReached?: () => void;
}

export function useTabs({ maxTabs = 10, onTabLimitReached }: UseTabsOptions = {}) {
  const [tabs, setTabs] = useState<TabState[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [key, setKey] = useState<number>(0);  // Add key for forcing re-renders

  // Load tabs from local storage on mount
  useEffect(() => {
    const savedTabs = localStorage.getItem('openTabs');
    const savedActiveTab = localStorage.getItem('activeTabId');
    
    if (savedTabs) {
      try {
        const parsedTabs = JSON.parse(savedTabs);
        setTabs(parsedTabs);
        if (savedActiveTab) {
          setActiveTabId(savedActiveTab);
        } else if (parsedTabs.length > 0) {
          setActiveTabId(parsedTabs[0].id);
        }
      } catch (error) {
        console.error('Error loading saved tabs:', error);
      }
    }
  }, []);

  // Save tabs to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('openTabs', JSON.stringify(tabs));
    if (activeTabId) {
      localStorage.setItem('activeTabId', activeTabId);
    }
  }, [tabs, activeTabId]);

  // Add a new tab
  const addTab = useCallback((file: FileData) => {
    if (tabs.length >= maxTabs) {
      onTabLimitReached?.();
      return false;
    }

    // Check if file is already open
    const existingTab = tabs.find(tab => tab.file.id === file.id);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return false;
    }

    const newTab: TabState = {
      id: file.id,
      file,
      isModified: false
    };

    setTabs(prev => {
      const newTabs = [...prev, newTab];
      localStorage.setItem('openTabs', JSON.stringify(newTabs));
      return newTabs;
    });
    setActiveTabId(newTab.id);
    setKey(k => k + 1); // Force re-render
    return true;
  }, [tabs, maxTabs, onTabLimitReached]);

  // Close a tab
  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const index = prev.findIndex(tab => tab.id === tabId);
      if (index === -1) return prev;

      const newTabs = [...prev];
      newTabs.splice(index, 1);

      // If we're closing the active tab, activate the next available tab
      if (activeTabId === tabId) {
        const nextTab = newTabs[index] || newTabs[index - 1];
        setActiveTabId(nextTab ? nextTab.id : null);
      }

      // Save immediately to localStorage to prevent stale state
      localStorage.setItem('openTabs', JSON.stringify(newTabs));
      if (newTabs.length === 0) {
        localStorage.removeItem('activeTabId');
      }

      setKey(k => k + 1); // Force re-render
      return newTabs;
    });
  }, [activeTabId]);

  // Set tab as modified
  const setTabModified = useCallback((tabId: string, isModified: boolean) => {
    setTabs(prev =>
      prev.map(tab =>
        tab.id === tabId
          ? { ...tab, isModified }
          : tab
      )
    );
  }, []);

  // Reorder tabs
  const reorderTabs = useCallback((newTabs: TabState[]) => {
    setTabs(newTabs);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Tab to switch tabs
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        if (tabs.length <= 1) return;

        setTabs(prev => {
          const currentIndex = prev.findIndex(tab => tab.id === activeTabId);
          const nextIndex = e.shiftKey
            ? (currentIndex - 1 + prev.length) % prev.length
            : (currentIndex + 1) % prev.length;
          
          setActiveTabId(prev[nextIndex].id);
          return prev;
        });
      }
      
      // Ctrl+W to close current tab
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) {
          closeTab(activeTabId);
        }
      }
      
      // Ctrl+1-9 to switch to specific tab
      if (e.ctrlKey && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (tabs[index]) {
          setActiveTabId(tabs[index].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId, closeTab]);

  return {
    tabs,
    activeTabId,
    activeTab: tabs.find(tab => tab.id === activeTabId),
    addTab,
    closeTab,
    setTabModified,
    reorderTabs,
    key // Export key for parent components
  };
}
