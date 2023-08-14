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
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Header from '@cloudscape-design/components/header';
import Popover from '@cloudscape-design/components/popover';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Spinner from '@cloudscape-design/components/spinner';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import * as awsui from '@cloudscape-design/design-tokens';
import { css } from '@emotion/react';
import { FC, useEffect, useCallback, useState, ReactNode } from 'react';
import { DataExchangeFormat, HasContentDetails, ViewNavigationEvent } from '../../../../../customTypes';
import printStyles from '../../../../../styles/print';
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

const styles = {
  text: css({
    display: 'flex',
    alignItems: 'center',
    height: '100%',
  }),
  nextStepsContainer: css({
    borderTop: `2px solid ${awsui.colorBorderDividerDefault}`,
    paddingTop: awsui.spaceScaledS,
  }),
  noData: css({
    textAlign: 'center',
    width: '100%',
  }),
};

export interface ThreatModelViewProps extends ViewNavigationEvent {
  composerMode: string;
  data: DataExchangeFormat;
  onPrintButtonClick?: () => void;
  hasContentDetails?: HasContentDetails;
}

const ThreatModelView: FC<ThreatModelViewProps> = ({
  data,
  composerMode,
  onPrintButtonClick,
  hasContentDetails,
  ...props
}) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateContent = async () => {
      setLoading(true);
      const sanitizedData = sanitizeHtml(data);
      const processedContent = (composerMode === 'Full' ? [
        hasContentDetails?.applicationName && await getApplicationName(sanitizedData),
        hasContentDetails?.applicationInfo && await getApplicationInfoContent(sanitizedData),
        hasContentDetails?.architecture && await getArchitectureContent(sanitizedData),
        hasContentDetails?.dataflow && await getDataflowContent(sanitizedData),
        hasContentDetails?.assumptions && await getAssumptionsContent(sanitizedData),
        hasContentDetails?.threats && await getThreatsContent(sanitizedData),
        hasContentDetails?.mitigations && await getMitigationsContent(sanitizedData),
        hasContentDetails?.threats && await getAssetsContent(sanitizedData),
      ] : [await getThreatsContent(sanitizedData, true)]).filter(x => !!x).join('\n');

      setContent(processedContent);
      setLoading(false);
    };

    updateContent().catch(err => console.log('Error', err));
  }, [data, composerMode, hasContentDetails]);

  const handleCopyMarkdown = useCallback(async () => {
    await navigator.clipboard.writeText(content);
  }, [content]);

  const getNextStepButtons = useCallback(() => {
    const buttons: ReactNode[] = [];
    if (!hasContentDetails?.applicationInfo) {
      buttons.push(<Button onClick={props.onApplicationInfoView}>Add Application Info</Button>);
    }
    if (!hasContentDetails?.architecture) {
      buttons.push(<Button onClick={props.onArchitectureView}>Add Architecture</Button>);
    }
    if (!hasContentDetails?.dataflow) {
      buttons.push(<Button onClick={props.onDataflowView}>Add Dataflow</Button>);
    }
    if (!hasContentDetails?.assumptions) {
      buttons.push(<Button onClick={props.onAssumptionListView}>Add Assumptions</Button>);
    }
    if (!hasContentDetails?.threats) {
      buttons.push(<Button onClick={() => props.onThreatListView?.()}>Add Threats</Button>);
    }
    if (!hasContentDetails?.threats) {
      buttons.push(<Button onClick={props.onMitigationListView}>Add Mitigations</Button>);
    }
    const len = buttons.length;
    return buttons.flatMap((b, index) => index === len - 1 ? <Box>{b}</Box> : [b, <Box fontWeight="bold" css={styles.text}>or</Box>]);
  }, [hasContentDetails, props]);

  return (<div>
    <SpaceBetween direction='vertical' size='s'>
      <div css={printStyles.hiddenPrint}><Header
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
      {content ?
        (<MarkdownViewer allowHtml>{content}</MarkdownViewer>) :
        (<Box fontSize='body-m' margin='xxl' fontWeight="bold" css={styles.noData}>{loading ? <Spinner /> : 'No data available'}</Box>)
      }
      {composerMode === 'Full' && hasContentDetails && Object.values(hasContentDetails).some(x => !x) && <div css={printStyles.hiddenPrint}>
        <Box css={styles.nextStepsContainer}>
          <SpaceBetween direction="horizontal" size="xs">
            <Box fontWeight="bold" css={styles.text}>Suggested next steps: </Box>
            {getNextStepButtons()}
          </SpaceBetween>
        </Box>
      </div>}
    </SpaceBetween>
  </div>);
};

export default ThreatModelView;