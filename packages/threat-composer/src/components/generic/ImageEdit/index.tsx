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
import { IMAGE_BASE64_MAX_LENGTH } from '@aws/threat-composer-core';
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import RadioGroup from '@cloudscape-design/components/radio-group';
import SpaceBetween from '@cloudscape-design/components/space-between';
import imageCompression from 'browser-image-compression';
import { FC, useCallback, useEffect, useState } from 'react';
import { ImageUrlSchema } from '../../../customTypes';
import imageStyles from '../../../styles/image';
import getBase64 from '../../../utils/getBase64';
import Input from '../../generic/Input';
import FileUpload from '../FileUpload';

export interface ImageUploadProps {
  value: string;
  onChange: (value: string) => void;
}

const IMAGE_COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1024,
  useWebWorker: true,
};

const IMAGE_COMPRESSION_TYPES = [
  'image/png',
  'image/gif',
  'image/jpeg',
];

const ImageEdit: FC<ImageUploadProps> = ({
  value,
  onChange,
}) => {
  const isValueBase64String = value && value.startsWith('data:');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [inputValue, setInputValue] = useState(isValueBase64String ? '' : value);
  const [imageSource, setImageSource] = useState<string>(!value ? 'no' : isValueBase64String ? 'file' : 'url');
  const [image, setImage] = useState<string>(isValueBase64String ? value : '');
  const [errorText, setErrorText] = useState<string>();

  useEffect(() => {
    if (imageSource === 'no') {
      onChange('');
    } else if (imageSource === 'file') {
      onChange(image);
    } else if (imageSource === 'url') {
      onChange(inputValue);
    }
  }, [onChange, imageSource, image, inputValue]);

  const handleImageUpload = useCallback(async (imageFile: File) => {
    try {
      // Compress the image if it is supported by browser-image-compression
      if (IMAGE_COMPRESSION_TYPES.includes(imageFile.type)) {
        const compressedFile = await imageCompression(imageFile, IMAGE_COMPRESSION_OPTIONS);
        const base64String = await getBase64(compressedFile);
        return base64String;
      }

      return await getBase64(imageFile);
    } catch (error) {
      console.log(error);
      return '';
    }
  }, []);

  const handleChange = useCallback(async (_selectedFiles: File[]) => {
    setSelectedFiles(_selectedFiles);
    setErrorText(undefined);
    if (_selectedFiles.length > 0) {
      const _image = await handleImageUpload(_selectedFiles[0]);
      if (_image.length > IMAGE_BASE64_MAX_LENGTH) {
        setErrorText('Image size limit exceeded');
      } else {
        setImage(_image || '');
      }
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
          { value: 'url', label: 'From url' },
          { value: 'no', label: 'No Image' },
        ]}
      />
    </FormField>
    {imageSource === 'file' && <SpaceBetween
      direction='vertical'
      size='s'>
      {image && <Header key='header' variant='h3'>Preview</Header>}
      {image && <img key='image' css={imageStyles} src={image} alt='Preview Diagram' />}
      <FileUpload
        key='fileUpload'
        label='Image Upload'
        accept='image/*'
        errorText={errorText}
        files={selectedFiles}
        onChange={handleChange} />
    </SpaceBetween>
    }
    {imageSource === 'url' && <FormField
      label="Image Url"
      key="imageUrl"
    >
      {inputValue && <Header key='header' variant='h3'>Preview</Header>}
      {inputValue && <img css={imageStyles} src={inputValue} alt='Preview Diagram' />}
      <Input
        value={inputValue}
        onChange={event =>
          setInputValue(event.detail.value)
        }
        validateData={ImageUrlSchema.safeParse}
      />
    </FormField>}
  </SpaceBetween>;
};

export default ImageEdit;
