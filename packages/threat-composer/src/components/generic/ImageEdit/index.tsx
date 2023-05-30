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
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import Input from '@cloudscape-design/components/input';
import RadioGroup from '@cloudscape-design/components/radio-group';
import SpaceBetween from '@cloudscape-design/components/space-between';
import imageCompression from 'browser-image-compression';
import { FC, useCallback, useEffect, useState } from 'react';
import getBase64 from '../../../utils/getBase64';
import FileUpload from '../FileUpload';

export interface ImageUploadProps {
  value: string;
  onChange: (value: string) => void;
}

const ImageEdit: FC<ImageUploadProps> = ({
  value,
  onChange,
}) => {
  const isValueBase64String = value && value.startsWith('data:');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [inputValue, setInputValue] = useState(isValueBase64String ? '' : value);
  const [imageSource, setImageSource] = useState<string>(!value || isValueBase64String ? 'file' : 'url');
  const [image, setImage] = useState<string>(isValueBase64String ? value : '');

  useEffect(() => {
    if (imageSource === 'file') {
      onChange(image);
    } else if (imageSource === 'url') {
      onChange(inputValue);
    }
  }, [onChange, imageSource, image, inputValue]);

  const handleImageUpload = useCallback(async (imageFile: File) => {
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    };

    try {
      const compressedFile = await imageCompression(imageFile, options);
      const base64String = await getBase64(compressedFile);
      return base64String;
    } catch (error) {
      console.log(error);
      return '';
    }
  }, []);

  const handleChange = useCallback(async (_selectedFiles: File[]) => {
    setSelectedFiles(_selectedFiles);
    if (_selectedFiles.length > 0) {
      const _image = await handleImageUpload(_selectedFiles[0]);
      setImage(_image || '');
    }
  }, []);

  return <SpaceBetween direction='vertical' size='s'>
    <FormField
      label="Image source"
      key="imageSource"
    >
      <RadioGroup
        onChange={({ detail }) => setImageSource(detail.value)}
        value={imageSource}
        items={[
          { value: 'file', label: 'From file upload' },
          { value: 'url', label: 'Form url' },
        ]}
      />
    </FormField>
    {imageSource === 'file' && <SpaceBetween
      direction='vertical'
      size='s'>
      {image && <Header variant='h3'>Preview</Header>}
      {image && <img width={1024} src={image} alt='Preview Diagram' />}
      <FileUpload
        label='Image Upload'
        accept='image/png, image/gif, image/jpeg'
        files={selectedFiles}
        onChange={handleChange} />
    </SpaceBetween>
    }
    {imageSource === 'url' && <FormField
      label="Image Url"
      key="imageUrl"
    >
      {inputValue && <Header variant='h3'>Preview</Header>}
      {inputValue && <img width={1024} src={inputValue} alt='Preview Diagram' />}
      <Input
        value={inputValue}
        onChange={event =>
          setInputValue(event.detail.value)
        }
      />
    </FormField>}
  </SpaceBetween>;
};

export default ImageEdit;