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
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import { FC } from 'react';
import { MitigationPack } from '../../../../../customTypes';

export interface GeneralInfoProps {
  mitigationPack: MitigationPack;
}

const GeneralInfo: FC<GeneralInfoProps> = ({
  mitigationPack,
}) => {
  return (<Container
    header={
      <Header
        variant="h2"
      >
        Mitigation Pack - {mitigationPack.name}
      </Header>
    }
  >
    {mitigationPack.description}
  </Container>);
};

export default GeneralInfo;