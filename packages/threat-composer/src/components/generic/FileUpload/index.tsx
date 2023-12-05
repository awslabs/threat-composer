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
import Button from '@cloudscape-design/components/button';
import FormField, { FormFieldProps } from '@cloudscape-design/components/form-field';
import SpaceBetween from '@cloudscape-design/components/space-between';
import React, { FC, useCallback, useRef, useMemo, useState, useEffect } from 'react';
import FileTokenLabel from './components/FileTokenLabel';
import getDisplaySize from './utils/getDisplaySize';

export interface FileUploadProps extends FormFieldProps {
  accept?: string;
  sizeLimit?: number;
  buttonText?: string;
  name?: string;
  onChange?: (files: File[]) => void;
  files?: File[];
}

const FileUpload: FC<FileUploadProps> = ({
  controlId,
  label,
  description,
  constraintText,
  secondaryControl,
  info,
  buttonText = 'Choose file',
  name,
  accept,
  files,
  sizeLimit,
  onChange,
  ...props
}) => {
  const inputElement = useRef<HTMLInputElement | null>(null);
  const [errorText, setErrorText] = useState<React.ReactNode>(props.errorText);

  useEffect(() => {
    setErrorText(props.errorText);
  }, [props.errorText]);

  const footer = useMemo(() => {
    if (!files || files.length === 0) {
      return null;
    }
    return (
      <FileTokenLabel
        name={files[0].name}
        lastModified={files[0].lastModified}
        size={files[0].size}
      />
    );
  }, [files]);

  const handleFileSelectionButtonClick = useCallback(() => {
    inputElement.current?.click();
  }, []);

  const handleFileSelectionChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const newFiles: File[] = [];
      setErrorText(undefined);

      if (event.target.files) {
        const targetFiles = event.target.files;
        const len = targetFiles.length;
        for (let i = 0; i < len; i++) {
          const file = targetFiles.item(i);
          if (file) {
            if (sizeLimit && file.size > sizeLimit) {
              setErrorText(`File ${file.name} exceeds maximum file size limit: ${getDisplaySize(sizeLimit)}`);
              break;
            }

            newFiles.push(file);
          }
        }
      }

      onChange?.(newFiles);
    },
    [files, onChange],
  );

  return (
    <SpaceBetween direction="vertical" size="m">
      <FormField
        {...props}
        label={label}
        info={info}
        description={description}
        constraintText={constraintText}
        secondaryControl={secondaryControl}
        errorText={errorText}
      >
        <input
          ref={inputElement}
          name={name}
          style={{ display: 'none' }}
          type="file"
          accept={accept}
          onChange={handleFileSelectionChange}
        />
        <Button iconName="upload" onClick={handleFileSelectionButtonClick}>
          {buttonText}
        </Button>
      </FormField>
      {footer}
    </SpaceBetween>
  );
};

export default FileUpload;
