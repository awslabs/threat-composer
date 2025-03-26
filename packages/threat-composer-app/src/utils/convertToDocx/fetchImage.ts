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
import { FALLBACK_IMAGE } from './fallbackImage';


const WORD_DOCX_WIDTH = 600;

const IMAGETYPE_MAPS: {
  [type: string]: 'jpg' | 'png' | 'gif' | 'bmp' | 'svg';
} = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/svg+xml': 'svg',
};

const fetchImage = async (
  url: string,
  fetchOriginalFailed?: boolean,
): Promise<{ image: ArrayBuffer; width: number; height: number; type: 'jpg' | 'png' | 'gif' | 'bmp' | 'svg'; fetchOriginalFailed: boolean }> => {
  const image = new Image();
  try {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/png';
    return await new Promise((resolve, reject) => {
      image.onload = () => {
        const width = image.naturalWidth < WORD_DOCX_WIDTH ? image.naturalWidth : WORD_DOCX_WIDTH;
        const height = width === image.naturalWidth ? image.naturalHeight : image.naturalHeight * (
          width / image.naturalWidth
        );
        const imageType = IMAGETYPE_MAPS[contentType] || 'png';
        resolve({
          image: buf,
          width,
          height,
          fetchOriginalFailed: fetchOriginalFailed || false,
          type: imageType,
        });
      };
      image.onerror = reject;
      image.src = URL.createObjectURL(new Blob([buf]));
    });
  } catch (e) {
    console.log('Failed to fetch image and returns placeholder image', e);
    return fetchImage(FALLBACK_IMAGE, true);
  }
};

export default fetchImage;