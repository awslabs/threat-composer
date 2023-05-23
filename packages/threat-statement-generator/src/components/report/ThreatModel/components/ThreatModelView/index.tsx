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
import { SpaceBetween } from '@cloudscape-design/components';
import Button from '@cloudscape-design/components/button';
import Header from '@cloudscape-design/components/header';
import Popover from '@cloudscape-design/components/popover';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import { FC, useMemo, useCallback } from 'react';
import { DataExchangeFormat } from '../../../../../customTypes';
import MarkdownViewer from '../../../../generic/MarkdownViewer';
import { getApplicationInfoContent } from '../../utils/getApplicationInfo';
import { getApplicationName } from '../../utils/getApplicationName';
import { getArchitectureContent } from '../../utils/getArchitecture';
import { getAssumptionsContent } from '../../utils/getAssumptions';
import { getDataflowContent } from '../../utils/getDataFlow';
import { getMitigationsContent } from '../../utils/getMitigations';
import { getThreatsContent } from '../../utils/getThreats';

import './index.css';

export interface ThreatModelViewProps {
  composerMode: string;
  data: DataExchangeFormat;
  onPrintButtonClick?: () => void;
}

const ThreatModelView: FC<ThreatModelViewProps> = ({
  data,
  composerMode,
  onPrintButtonClick,
}) => {
  const content = useMemo(() => {
    return (composerMode === 'Full' ? [
      getApplicationName(data),
      getApplicationInfoContent(data),
      getArchitectureContent(data),
      getDataflowContent(data),
      getAssumptionsContent(data),
      getThreatsContent(data),
      getMitigationsContent(data),
    ] : [getThreatsContent(data, true)]).filter(x => !!x).join('\n');
  }, [data, composerMode]);

  const handleCopyMarkdown = useCallback(async () => {
    await navigator.clipboard.writeText(content);
  }, [content]);

  return (<div className='threat-statement-generator-threat-model-view'>
    <SpaceBetween direction='vertical' size='s'>
      <div className='hidden-print'><Header
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Popover
              dismissButton={false}
              position="top"
              size="small"
              triggerType="custom"
              content={
                <StatusIndicator type="success">
                  Content copied
                </StatusIndicator>
              }
            >
              <Button
                onClick={handleCopyMarkdown}>
                Copy as Markdown
              </Button>
            </Popover>
            <Button variant="primary" onClick={onPrintButtonClick || (() => window.print())}>Print</Button>
          </SpaceBetween>
        }
      >
      </Header></div>
      <MarkdownViewer>{content}</MarkdownViewer>
    </SpaceBetween>
  </div>);
};

export default ThreatModelView;