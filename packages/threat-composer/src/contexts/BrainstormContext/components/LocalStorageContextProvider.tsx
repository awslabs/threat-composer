/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License").
  You may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
 ******************************************************************************************************************** */
import { FC, PropsWithChildren, useCallback, useEffect, useState, useRef } from 'react';
import { LOCAL_STORAGE_KEY_BRAINSTORM_DATA } from '../../../configs/localStorageKeys';
import removeLocalStorageKey from '../../../utils/removeLocalStorageKey';
import { BrainstormContext } from '../context';
import { BrainstormContextProviderProps, BrainstormData, BrainstormItem, BrainstormContextData } from '../types';

// Custom event name for brainstorm data changes
export const BRAINSTORM_DATA_CHANGE_EVENT = 'brainstorm-data-change';

// Custom event interface
interface BrainstormDataChangeEvent extends Event {
  detail: {
    workspaceId: string | null;
  };
}

export const getLocalStorageKey = (workspaceId: string | null) => {
  if (workspaceId) {
    // Use the workspace GUID directly for the storage key
    return `${LOCAL_STORAGE_KEY_BRAINSTORM_DATA}_${workspaceId}`;
  }

  return LOCAL_STORAGE_KEY_BRAINSTORM_DATA;
};

const initialState: BrainstormContextData = {
  assumptions: [],
  threatSources: [],
  threatPrerequisites: [],
  threatActions: [],
  threatImpacts: [],
  assets: [],
  mitigations: [],
};

// Helper function to convert external BrainstormData to internal BrainstormContextData
const convertToContextData = (data: BrainstormData | undefined): BrainstormContextData => {
  if (!data) return initialState;

  return {
    assumptions: data.assumptions || [],
    threatSources: data.threatSources || [],
    threatPrerequisites: data.threatPrerequisites || [],
    threatActions: data.threatActions || [],
    threatImpacts: data.threatImpacts || [],
    assets: data.assets || [],
    mitigations: data.mitigations || [],
  };
};

const BrainstormLocalStorageContextProvider: FC<PropsWithChildren<BrainstormContextProviderProps>> = ({
  children,
  workspaceId: currentWorkspaceId,
}) => {
  const [brainstormData, setBrainstormDataInternal] = useState<BrainstormContextData>(initialState);
  // Reference to track if the update is coming from this instance
  const isUpdatingRef = useRef(false);

  // Function to load data from localStorage
  const loadDataFromLocalStorage = useCallback(() => {
    const storageKey = getLocalStorageKey(currentWorkspaceId || null);
    const storedData = window.localStorage.getItem(storageKey);
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData) as BrainstormData;
        setBrainstormDataInternal(convertToContextData(parsedData));
      } catch (error) {
        console.error('Failed to parse brainstorm data from localStorage', error);
      }
    }
  }, [currentWorkspaceId]);

  // Load data from localStorage on component mount
  useEffect(() => {
    loadDataFromLocalStorage();
  }, [loadDataFromLocalStorage]);

  // Listen for storage events to update data when it changes in another window/tab
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      const storageKey = getLocalStorageKey(currentWorkspaceId || null);
      if (event.key === storageKey) {
        loadDataFromLocalStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentWorkspaceId, loadDataFromLocalStorage]);

  // Listen for custom events to update data when it changes in the same window/tab
  useEffect(() => {
    const handleCustomEvent = (event: Event) => {
      // Skip if this instance is the one that triggered the event
      if (isUpdatingRef.current) {
        return;
      }

      const customEvent = event as BrainstormDataChangeEvent;
      const eventWorkspaceId = customEvent.detail?.workspaceId;

      // Only update if the event is for the current workspace
      if (eventWorkspaceId === currentWorkspaceId) {
        loadDataFromLocalStorage();
      }
    };

    window.addEventListener(BRAINSTORM_DATA_CHANGE_EVENT, handleCustomEvent);
    return () => {
      window.removeEventListener(BRAINSTORM_DATA_CHANGE_EVENT, handleCustomEvent);
    };
  }, [currentWorkspaceId, loadDataFromLocalStorage]);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    const storageKey = getLocalStorageKey(currentWorkspaceId || null);

    // Set the flag to indicate this instance is updating
    isUpdatingRef.current = true;

    // Update localStorage
    window.localStorage.setItem(storageKey, JSON.stringify(brainstormData));

    // Dispatch a custom event to notify other components in the same window
    const event = new CustomEvent(BRAINSTORM_DATA_CHANGE_EVENT, {
      detail: {
        workspaceId: currentWorkspaceId || null,
      },
    });
    window.dispatchEvent(event);

    // Reset the flag after a short delay
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);
  }, [brainstormData, currentWorkspaceId]);

  const addItem = useCallback((type: keyof BrainstormContextData, content: string) => {
    setBrainstormDataInternal((prevData: BrainstormContextData) => ({
      ...prevData,
      [type]: [
        ...prevData[type],
        {
          id: crypto.randomUUID(),
          content,
          createdAt: new Date().toISOString(),
          createdBy: undefined, // Will be set by the application when known
        },
      ],
    }));
  }, []);

  const updateItem = useCallback((type: keyof BrainstormContextData, id: string, content: string) => {
    setBrainstormDataInternal((prevData: BrainstormContextData) => ({
      ...prevData,
      [type]: prevData[type].map((item: BrainstormItem) =>
        item.id === id ? { ...item, content } : item,
      ),
    }));
  }, []);

  const handleRemoveItem = useCallback((type: keyof BrainstormContextData, id: string) => {
    setBrainstormDataInternal((prevData: BrainstormContextData) => ({
      ...prevData,
      [type]: prevData[type].filter((item: BrainstormItem) => item.id !== id),
    }));
  }, []);

  const setBrainstormData = useCallback((data: BrainstormData) => {
    setBrainstormDataInternal(convertToContextData(data));
  }, []);

  const handleDeleteWorkspace = useCallback(async (workspaceId: string) => {
    window.setTimeout(() => {
      // to delete after the workspace is switched. Otherwise the default value is set again.
      // Always use the workspace GUID for consistency
      removeLocalStorageKey(`${LOCAL_STORAGE_KEY_BRAINSTORM_DATA}_${workspaceId}`);
    }, 1000);
  }, []);

  return (
    <BrainstormContext.Provider
      value={{
        brainstormData,
        addItem,
        updateItem,
        removeItem: handleRemoveItem,
        setBrainstormData,
        onDeleteWorkspace: handleDeleteWorkspace,
      }}
    >
      {children}
    </BrainstormContext.Provider>
  );
};

export default BrainstormLocalStorageContextProvider;
