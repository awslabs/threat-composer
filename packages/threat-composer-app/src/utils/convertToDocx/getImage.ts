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
import { ExternalHyperlink, IImageOptions, ImageRun, Paragraph } from 'docx';
import { FALLBACK_IMAGE } from './fallbackImage';
import fetchImage from './fetchImage';

export const getImageRun = (image: IImageOptions['data'], type: IImageOptions['type'], width: number, height: number) => {
  if (type !== 'svg') {
    return new ImageRun({
      data: image,
      transformation: {
        width,
        height,
      },
      type,
    });
  }

  return new ImageRun({
    data: image,
    transformation: {
      width,
      height,
    },
    type: 'svg',
    fallback: {
      type: 'png',
      data: Buffer.from(FALLBACK_IMAGE, 'base64'),
    },
  });
};

const getImage = async (imageUrl: string) => {
  const image = await fetchImage(imageUrl);

  const imageRun = getImageRun(image.image, image.type, image.width, image.height);

  if (imageUrl.startsWith('https://') || imageUrl.startsWith('http://')) {
    return new Paragraph({
      children: [
        new ExternalHyperlink({
          link: imageUrl,
          children: [
            imageRun,
          ],
        }),
      ],
    });
  }

  return new Paragraph({
    children: [
      imageRun,
    ],
  });
};

export default getImage;