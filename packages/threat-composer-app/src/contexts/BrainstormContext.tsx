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
import BrainstormContextProvider, { BrainstormData, BrainstormItem } from '@aws/threat-composer/lib/contexts/BrainstormContext';
import { BrainstormContext, useBrainstormContext, BrainstormContextApi } from '@aws/threat-composer/lib/contexts/BrainstormContext/context';

// Re-export everything from the core package
export { BrainstormContext, BrainstormContextProvider, useBrainstormContext };
export type { BrainstormContextApi, BrainstormData, BrainstormItem };

export default BrainstormContextProvider;
