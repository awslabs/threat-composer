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
/** @jsxImportSource @emotion/react */
import { SpaceBetween } from '@cloudscape-design/components';
import Button from '@cloudscape-design/components/button';
import Header from '@cloudscape-design/components/header';
import Popover from '@cloudscape-design/components/popover';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import * as ui from '@cloudscape-design/design-tokens';
import { css } from '@emotion/react';
import { FC, useMemo, useCallback } from 'react';
import { DataExchangeFormat } from '../../../../../customTypes';
import sanitizeHtml from '../../../../../utils/sanitizeHtml';
import MarkdownViewer from '../../../../generic/MarkdownViewer';
import { getApplicationInfoContent } from '../../utils/getApplicationInfo';
import { getApplicationName } from '../../utils/getApplicationName';
import { getArchitectureContent } from '../../utils/getArchitecture';
import { getAssetsContent } from '../../utils/getAssets';
import { getAssumptionsContent } from '../../utils/getAssumptions';
import { getDataflowContent } from '../../utils/getDataFlow';
import { getMitigationsContent } from '../../utils/getMitigations';
import { getThreatsContent } from '../../utils/getThreats';

const styles = css({
  '& h1': {
    marginTop: ui.spaceScaledS,
    marginBottom: ui.spaceScaledS,
  },

  '& h2': {
    marginTop: ui.spaceScaledL,
    marginBottom: ui.spaceScaledS,
  },

  '& h3': {
    marginTop: ui.spaceScaledS,
    marginBottom: ui.spaceScaledS,
  },

  '& h4': {
    marginTop: ui.spaceScaledS,
    marginBottom: ui.spaceScaledS,
  },
});

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
    const sanitizedData = sanitizeHtml(data);
    return (composerMode === 'Full' ? [
      getApplicationName(sanitizedData),
      getApplicationInfoContent(sanitizedData),
      getArchitectureContent(sanitizedData),
      getDataflowContent(sanitizedData),
      getAssumptionsContent(sanitizedData),
      getThreatsContent(sanitizedData),
      getMitigationsContent(sanitizedData),
      getAssetsContent(sanitizedData),
    ] : [getThreatsContent(sanitizedData, true)]).filter(x => !!x).join('\n');
  }, [data, composerMode]);

  const handleCopyMarkdown = useCallback(async () => {
    await navigator.clipboard.writeText(content);
  }, [content]);

  return (<div css={styles}>
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
      <MarkdownViewer allowHtml>{content}</MarkdownViewer>
    </SpaceBetween>
  </div>);
};

export default ThreatModelView;