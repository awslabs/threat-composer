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
import ButtonDropdown, { ButtonDropdownProps } from '@cloudscape-design/components/button-dropdown';
import ContentLayoutComponent from '@cloudscape-design/components/content-layout';
import Header, { HeaderProps } from '@cloudscape-design/components/header';
import { CancelableEventHandler } from '@cloudscape-design/components/internal/events';
import Popover from '@cloudscape-design/components/popover';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Spinner from '@cloudscape-design/components/spinner';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import * as awsui from '@cloudscape-design/design-tokens';
import { css } from '@emotion/react';
import { i18n } from 'i18next';
import { FC, useEffect, useCallback, useState, ReactNode, PropsWithChildren, useMemo } from 'react';
import { DataExchangeFormat, HasContentDetails, ViewNavigationEvent } from '../../../../../customTypes';
import { useReloadedTranslation } from '../../../../../i18next';
import printStyles from '../../../../../styles/print';
import convertToMarkdown from '../../../../../utils/convertToMarkdown';
import convertToYaml from '../../../../../utils/convertToYaml';
import {
  downloadContentAsMarkdown,
  downloadContentAsWordDocx,
  downloadContentAsYaml,
  downloadObjectAsJson,
} from '../../../../../utils/downloadContent';
import MarkdownViewer from '../../../../generic/MarkdownViewer';


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

const ContentLayout: FC<PropsWithChildren<HeaderProps & {
  isPreview?: boolean;
}>> = ({
  isPreview,
  children,
  ...props
}) => {
  if (isPreview) {
    return <>{children}</>;
  }

  return (<ContentLayoutComponent
    disableOverlap
    header={
      <Header {...props} />
    }
  >
    {children}
  </ContentLayoutComponent>);
};

export interface ThreatModelViewProps extends ViewNavigationEvent {
  isPreview?: boolean;
  showPrintDownloadButtons?: boolean;
  composerMode: string;
  data: DataExchangeFormat;
  downloadFileName?: string;
  onPrintButtonClick?: () => void;
  hasContentDetails?: HasContentDetails;
  convertToDocx?: (data: DataExchangeFormat, t?: i18n['t'], deafultDir?: boolean) => Promise<Blob>;
}

const ThreatModelView: FC<ThreatModelViewProps> = ({
  data,
  isPreview = false,
  showPrintDownloadButtons = true,
  composerMode,
  downloadFileName,
  onPrintButtonClick,
  hasContentDetails,
  convertToDocx,
  ...props
}) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const { t, i18n: i18next } = useReloadedTranslation();
  useEffect(() => {
    const updateContent = async () => {
      setLoading(true);
      const processedContent = await convertToMarkdown(data, composerMode, t, i18next.dir(i18next.language));
      setContent(processedContent);
      setLoading(false);
    };

    updateContent().catch(err => console.log('Error', err));
  }, [t, i18next, i18next.language, data, composerMode, hasContentDetails]);

  const handleCopyMarkdown = useCallback(async () => {
    await navigator.clipboard.writeText(content);
  }, [content]);

  const handleDownloadMarkdown = useCallback(() => {
    downloadFileName && downloadContentAsMarkdown(content, downloadFileName);
  }, [content, downloadFileName]);

  const handleDownloadWorddocx = useCallback(async () => {
    const docxBlob = await convertToDocx?.(data, t, i18next.dir(i18next.language) === 'rtl');
    if (docxBlob) {
      downloadFileName && downloadContentAsWordDocx(docxBlob, downloadFileName);
    }
  }, [t, i18next, i18next.language, data, downloadFileName, convertToDocx]);

  const handleDownloadJson = useCallback(() => {
    downloadFileName && downloadObjectAsJson(data, downloadFileName);
  }, [data, downloadFileName]);

  const handleDownloadYaml = useCallback(() => {
    const yamlContent = convertToYaml(data);
    downloadFileName && downloadContentAsYaml(yamlContent, downloadFileName);
  }, [data, downloadFileName]);

  const handleDownloadClick: CancelableEventHandler<ButtonDropdownProps.ItemClickDetails> = useCallback(async ({ detail }) => {
    switch (detail.id) {
      case 'docx':
        await handleDownloadWorddocx();
        break;
      case 'markdown':
        handleDownloadMarkdown();
        break;
      case 'json':
        handleDownloadJson();
        break;
      case 'yaml':
        handleDownloadYaml();
        break;
      default:
        console.log('Unknown command', detail);
    }
  }, [handleDownloadMarkdown, handleDownloadWorddocx, handleDownloadJson, handleDownloadYaml]);

  const getNextStepButtons = useCallback(() => {
    const buttons: ReactNode[] = [];
    if (!hasContentDetails?.applicationInfo) {
      buttons.push(<Button key='addApplicationInfo' onClick={props.onApplicationInfoView}>Add Application Info</Button>);
    }
    if (!hasContentDetails?.architecture) {
      buttons.push(<Button key='addArchitecture' onClick={props.onArchitectureView}>Add Architecture</Button>);
    }
    if (!hasContentDetails?.dataflow) {
      buttons.push(<Button key='addDataflow' onClick={props.onDataflowView}>Add Dataflow</Button>);
    }
    if (!hasContentDetails?.assumptions) {
      buttons.push(<Button key='addAssumptions' onClick={props.onAssumptionListView}>Add Assumptions</Button>);
    }
    if (!hasContentDetails?.threats) {
      buttons.push(<Button key='addThreats' onClick={() => props.onThreatListView?.()}>Add Threats</Button>);
    }
    if (!hasContentDetails?.mitigations) {
      buttons.push(<Button key='addMitigations' onClick={() => props.onMitigationListView?.()}>Add Mitigations</Button>);
    }
    const len = buttons.length;
    return buttons.flatMap((b, index) => index === len - 1 ? <Box>{b}</Box> : [b, <Box fontWeight="bold" css={styles.text}>or</Box>]);
  }, [hasContentDetails, props]);

  const actions = useMemo(() => <SpaceBetween direction="horizontal" size="xs">
    <Popover
      dismissButton={false}
      position="top"
      size="small"
      triggerType="custom"
      content={
        <StatusIndicator type="success">
          {t('Content copied')}
        </StatusIndicator>
      }
    >
      <Button
        onClick={handleCopyMarkdown}>
        {t('Copy as Markdown')}
      </Button>
    </Popover>
    {downloadFileName && showPrintDownloadButtons && <ButtonDropdown
      items={[
        { text: t('Download as Markdown File'), id: 'markdown' },
        ...(convertToDocx ? [{ text: t('Download as Word - Docx File'), id: 'docx' }] : []),
        { text: t('Download as JSON File'), id: 'json' },
      ]}
      onItemClick={handleDownloadClick}
    >
      {t('Download')}
    </ButtonDropdown>}
    {showPrintDownloadButtons && <Button variant="primary" onClick={onPrintButtonClick || (() => window.print())}>{t('Print')}</Button>}
  </SpaceBetween>
  , [t, i18next.language, handleCopyMarkdown, downloadFileName, showPrintDownloadButtons, convertToDocx, handleDownloadClick, onPrintButtonClick]);

  return (<ContentLayout
    isPreview={isPreview}
    actions={actions}>
    <SpaceBetween direction='vertical' size='s'>
      {isPreview && <div css={printStyles.hiddenPrint}>
        <Header
          actions={actions}
        >
        </Header>
      </div>}
      {content ?
        (<MarkdownViewer allowHtml>{content}</MarkdownViewer>) :
        (<Box fontSize='body-m' margin='xxl' fontWeight="bold" css={styles.noData}>{loading ? <Spinner /> : 'No data available'}</Box>)
      }
      {!isPreview && composerMode === 'Full' && hasContentDetails && Object.values(hasContentDetails).some(x => !x) && <div css={printStyles.hiddenPrint}>
        <Box css={styles.nextStepsContainer}>
          <SpaceBetween direction="horizontal" size="xs">
            <Box fontWeight="bold" css={styles.text}>{t('Suggested next steps')}: </Box>
            {getNextStepButtons()}
          </SpaceBetween>
        </Box>
      </div>}
    </SpaceBetween>
  </ContentLayout>);
};

export default ThreatModelView;