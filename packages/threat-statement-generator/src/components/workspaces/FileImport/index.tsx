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
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Modal from '@cloudscape-design/components/modal';
import ProgressBar from '@cloudscape-design/components/progress-bar';
import SpaceBetween from '@cloudscape-design/components/space-between';
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { TemplateThreatStatement } from '../../../customTypes';

import FileUpload from '../../generic/FileUpload';

export interface FileImportProps {
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onImport: (threatStatementList: TemplateThreatStatement[]) => void;
}

const FileImport: FC<FileImportProps> = ({
  visible,
  setVisible,
  onImport,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [statementList, setStatementList] = useState<TemplateThreatStatement[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPercentage, setLoadingPercentage] = useState(0);

  const handleImport = useCallback((files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      setLoading(true);

      reader.addEventListener('load', (event) => {
        const result = event.target?.result;
        setStatementList(JSON.parse(result as string));
        setLoading(false);
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
    onImport(statementList);
    setSelectedFiles([]);
    setVisible(false);
  }, [onImport, statementList]);

  useEffect(() => {
    selectedFiles && selectedFiles.length > 0 && handleImport(selectedFiles);
  }, [selectedFiles]);

  const footer = useMemo(() => {
    return (<Box float="right">
      <SpaceBetween direction="horizontal" size="xs">
        <Button variant="link" onClick={() => setVisible(false)}>Cancel</Button>
        <Button variant="primary" disabled={statementList.length === 0} onClick={() => handleConfirmImport()}>Import</Button>
      </SpaceBetween>
    </Box>);
  }, [setVisible, handleConfirmImport]);

  return <Modal
    visible={visible}
    footer={footer}
    onDismiss={() => setVisible(false)}
  >
    <SpaceBetween direction="vertical" size="m">
      <Alert statusIconAriaLabel="Warning" type="warning" key="warning">
        Importing a new threat list will override the current threat list in editing.
        Use <b>Export</b> funtion to export and save current editing threat list,
        Or create a new <b>workspace</b>.
      </Alert>
      <FileUpload accept='application/json' files={selectedFiles} onChange={setSelectedFiles} />
      {loading && <ProgressBar
        value={loadingPercentage}
        label="Loading file"
      />}
      {selectedFiles.length > 0 && statementList.length > 0 && <Alert statusIconAriaLabel="Info" type="info" key="info">
        {statementList.length} threat statement loaded
      </Alert>}
    </SpaceBetween>
  </Modal>;
};

export default FileImport;