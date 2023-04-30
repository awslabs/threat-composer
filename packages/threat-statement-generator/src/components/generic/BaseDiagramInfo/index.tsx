import React, { FC, useCallback, useState } from 'react';
import SpaceBetween from '@cloudscape-design/components/space-between';
import ImageEdit from '../ImageEdit';

const BaseDiagramInfo: FC = () => {
  const [image, SetImage] = useState<string>("");
  const handleImageEditConfirm = useCallback(async (_image: string) => {
    SetImage(_image);
  }, [SetImage]);
  return <SpaceBetween direction='vertical' size='s'>
    <ImageEdit onConfirm={handleImageEditConfirm} />
    {image && <img width={1024} src={image} alt='Architecture Diagram' />}
  </SpaceBetween>
}

export default BaseDiagramInfo;