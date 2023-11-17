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
import { MitigationPackComponent } from '@aws/threat-composer';
import { FC } from 'react';
import { useParams } from 'react-router-dom';

const MitigationPack: FC = () => {
  const { mitigationPackId } = useParams();

  if (!mitigationPackId) {
    return null;
  }

  return (<MitigationPackComponent mitigationPackId={mitigationPackId}/>);
};

export default MitigationPack;