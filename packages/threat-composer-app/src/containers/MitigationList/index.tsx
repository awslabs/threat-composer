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
import { MitigationList as MitigationListComponent } from '@aws/threat-composer';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * How long to keep looking for the requested card before giving up. The list
 * renders asynchronously, so the element is usually absent on the first frame.
 */
const SCROLL_TO_ENTITY_TIMEOUT_MS = 2000;

const MitigationList = () => {
  const { state } = useLocation();

  // Deep link support: other views, such as the attack trees, navigate here
  // asking for one mitigation to be brought into view.
  useEffect(() => {
    const entityId = state?.scrollToEntityId;

    if (!entityId) {
      return;
    }

    let frame = 0;
    const deadline = Date.now() + SCROLL_TO_ENTITY_TIMEOUT_MS;

    // Retried per frame rather than after a fixed delay, so this neither races a
    // slow render nor waits longer than it has to on a fast one.
    const findAndScroll = () => {
      const element = document.getElementById(`entity-${entityId}`);

      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      if (Date.now() < deadline) {
        frame = requestAnimationFrame(findAndScroll);
      }
    };

    frame = requestAnimationFrame(findAndScroll);

    return () => cancelAnimationFrame(frame);
  }, [state?.scrollToEntityId]);

  return <MitigationListComponent
    initialFilter={state?.filter}
  />;
};

export default MitigationList;