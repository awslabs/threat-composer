import React, { FC, useCallback, useState } from 'react';
import FormField from '@cloudscape-design/components/form-field';
import Input from "@cloudscape-design/components/input";
import SpaceBetween from '@cloudscape-design/components/space-between';
import Button from '@cloudscape-design/components/button';
import imageCompression from 'browser-image-compression';
import FileUpload from '../FileUpload';
import getBase64 from '../../../utils/getBase64';

export interface ImageUploadProps {
  onConfirm: (image: string) => Promise<void>;
  onCancel?: () => void;
}

const ImageUpload: FC<ImageUploadProps> = ({
  onConfirm,
  onCancel,
 }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [inputValue, setInputValue] = React.useState("");

  const handleImageUpload = useCallback(async () => {
    if(selectedFiles.length > 0 ) {
      const imageFile = selectedFiles[0];
      console.log('originalFile instanceof Blob', imageFile instanceof Blob); // true
      console.log(`originalFile size ${imageFile.size / 1024 / 1024} MB`);
    
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      }

      try {
        const compressedFile = await imageCompression(imageFile, options);
        console.log('compressedFile instanceof Blob', compressedFile instanceof Blob); // true
        console.log(`compressedFile size ${compressedFile.size / 1024 / 1024} MB`); // smaller than maxSizeMB
    
        const base64String = await getBase64(compressedFile);

        return base64String;
      } catch (error) {
        console.log(error);
      }
    }
  }, [selectedFiles]);

  const handleReset = useCallback(() => {
    setSelectedFiles([]);
    setInputValue('');
  }, []);

  const handleConfirm = useCallback(async () => {
    if(selectedFiles.length > 0) {
      const image = await handleImageUpload();
      image && await onConfirm(image);
    }else {
      onConfirm(inputValue);
    }

    handleReset();
  }, [selectedFiles, inputValue]);

  const handleCancel = useCallback(() => {
    handleReset();
    onCancel?.();
  }, [handleReset, onCancel]);
  
  return <SpaceBetween direction='vertical' size='s'>
    <FileUpload 
      label='You can upload an image'
      accept='image/png, image/gif, image/jpeg' 
      files={selectedFiles} 
      onChange={setSelectedFiles}/>
    <FormField
      label="Or you can specify the image url"
    >
      <Input
        value={inputValue}
        onChange={event =>
          setInputValue(event.detail.value)
        }
      />
    </FormField>
    <SpaceBetween direction='horizontal' size='s'>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button variant='primary' onClick={handleConfirm}>Confirm</Button>
    </SpaceBetween>
  </SpaceBetween>
}

export default ImageUpload;