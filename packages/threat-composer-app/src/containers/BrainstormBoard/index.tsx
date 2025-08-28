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
import {
  BrainstormBoard,
  NavigateToThreatHandler,
} from '@aws/threat-composer';
import { FC, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';


/**
 * Container component that wraps the BrainstormBoard from @aws/threat-composer
 * and provides navigation functionality for threat creation.
 */
const BrainstormBoardContainer: FC = () => {
  const navigate = useNavigate();

  /**
   * Handler for navigating to threat creation with pre-filled field values
   */
  const handleNavigateToThreat: NavigateToThreatHandler = useCallback((workspaceName, itemId, fieldKey, fieldValue) => {
    const params = `fieldKey=${fieldKey}&fieldValue=${encodeURIComponent(fieldValue)}`;
    navigate(`/workspaces/${workspaceName}/threats/${itemId}?${params}`);
  }, [navigate]);

  return (
    <BrainstormBoard onNavigateToThreat={handleNavigateToThreat} />
  );
};

export default BrainstormBoardContainer;
