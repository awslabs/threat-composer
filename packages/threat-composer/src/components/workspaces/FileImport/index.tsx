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
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Modal from '@cloudscape-design/components/modal';
import ProgressBar from '@cloudscape-design/components/progress-bar';
import SpaceBetween from '@cloudscape-design/components/space-between';
import TextContent from '@cloudscape-design/components/text-content';
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import useImportExport from '../../../hooks/useExportImport';

import FileUpload from '../../generic/FileUpload';

export interface FileImportProps {
  composerMode: string;
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onImport: (data: DataExchangeFormat) => void;
  onExport: () => void;
  onPreview?: (data: DataExchangeFormat) => void;
  onPreviewClose?: () => void;
}

const FileImport: FC<FileImportProps> = ({
  composerMode,
  visible,
  setVisible,
  onImport,
  onExport,
  onPreview,
  onPreviewClose,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [data, setData] = useState<DataExchangeFormat>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const { parseImportedData } = useImportExport();

  const handleImport = useCallback((files: File[]) => {
    setError('');
    setData(undefined);
    setLoading(true);

    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();

      reader.addEventListener('load', (event) => {
        const result = event.target?.result;
        setError('');
        try {
          const importedData = parseImportedData(JSON.parse(result as string));
          setData(importedData);
        } catch (e: any) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      });

      reader.addEventListener('progress', (event) => {
        if (event.loaded && event.total) {
          const percent = (event.loaded / event.total) * 100;
          setLoadingPercentage(percent);
        }
      });

      reader.readAsText(file);
    }
  }, []);

  const handleConfirmImport = useCallback(() => {
    data && onImport(data);
    setSelectedFiles([]);
    setVisible(false);
    onPreviewClose?.();
  }, [onImport, data, onPreviewClose]);

  useEffect(() => {
    selectedFiles && selectedFiles.length > 0 && handleImport(selectedFiles);
  }, [selectedFiles]);

  const handlePreview = useCallback(() => {
    data && onPreview?.(data);
  }, [data]);

  const footer = useMemo(() => {
    return (<Box float="right">
      <SpaceBetween direction="horizontal" size="xs">
        <Button variant="link" onClick={() => {
          setVisible(false);
          onPreviewClose?.();
        }}>Cancel</Button>
        {onPreview && <Button onClick={handlePreview} disabled={!data}>
          Preview
        </Button>}
        <Button variant="primary" disabled={!data} onClick={() => handleConfirmImport()}>Import</Button>
      </SpaceBetween>
    </Box>);
  }, [setVisible, handleConfirmImport, onPreview, onPreviewClose]);

  return <Modal
    visible={visible}
    footer={footer}
    onDismiss={() => {
      setVisible(false);
      onPreviewClose?.();
    }}
  >
    <SpaceBetween direction="vertical" size="m">
      <Alert
        action={
          <Button
            onClick={() => onExport()}
          >
            Export data
          </Button>
        }
        statusIconAriaLabel="Warning"
        type="warning"
        key="override-warning">
        <TextContent>Importing data will override all the data in current workspace. This action cannot be undone.<br />
          You can export the data to a json file as backup or create a new <b>workspace</b>.
        </TextContent>
      </Alert>
      <Alert
        statusIconAriaLabel="Warning"
        type="warning"
        key="content-warning">
        <TextContent>Only import content from trusted sources.</TextContent>
      </Alert>
      <FileUpload key='fileUpload' accept='application/json' files={selectedFiles} onChange={setSelectedFiles} />
      {loading && <ProgressBar
        key='progress-bar'
        value={loadingPercentage}
        label="Loading file"
      />}
      {error && <Alert key="error" statusIconAriaLabel="Error" type="error" >
        {error}
      </Alert>}
      {!onPreview && composerMode !== 'Full' && data && data.threats && data.threats.length > 0 && <Alert key="info" statusIconAriaLabel="Info" type="info" >
        {data.threats.length} threat statement loaded
      </Alert>}
    </SpaceBetween>
  </Modal>;
};

export default FileImport;