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
import { DataExchangeFormat } from '@aws/threat-composer-core';
import { FC } from 'react';
import ThreatStatementEditor from '../../components/threats/ThreatStatementEditor';
import ThreatStatementList from '../../components/threats/ThreatStatementList';
import ContextAggregator from '../../contexts/ContextAggregator';
import { useGlobalSetupContext } from '../../contexts/GlobalSetupContext/context';
import { useThreatsContext } from '../../contexts/ThreatsContext/context';
import { ComposerMode } from '../../customTypes';

const ThreatStatementGeneratorInner: FC = () => {
  const { view } = useThreatsContext();
  const { composerMode } = useGlobalSetupContext();
  return view === 'list' && composerMode !== 'EditorOnly' ? <ThreatStatementList /> : <ThreatStatementEditor />;
};

export interface ThreatStatementGeneratorInnerProps {
  composerMode?: ComposerMode;
  onPreview?: (content: DataExchangeFormat) => void;
  onPreviewClose?: () => void;
  onImported?: () => void;
}

/**
 * Main component for Threat Statement Generator.
 * This component can be imported and used in other react app.
 */
const ThreatStatementGenerator: FC<ThreatStatementGeneratorInnerProps> = ({
  composerMode,
  onPreview,
  onPreviewClose,
  onImported,
}) => {
  return (
    <ContextAggregator
      onPreview={onPreview}
      onPreviewClose={onPreviewClose}
      onImported={onImported}
      composerMode={composerMode} >
      <ThreatStatementGeneratorInner />
    </ContextAggregator>
  );
};

export default ThreatStatementGenerator;