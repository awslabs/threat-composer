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
import { DataExchangeFormat } from '@aws/threat-composer';
import { Paragraph, HeadingLevel, TextRun } from 'docx';
import { i18n } from 'i18next';
import convertMarkdown from './convertMarkdown';
import getImage from './getImage';

const getDataflow = async (
  data: DataExchangeFormat,
  defaultDir: boolean = false,
  t?: i18n['t'],
) => {
  const children: any[] = [];
  const translate = ((s: string): string => t ? t(s) : s);

  children.push(new Paragraph({
    bidirectional: defaultDir,
    heading: HeadingLevel.HEADING_1,
    children: [
      new TextRun(translate('Dataflow')),
    ],
  }));

  if (data.dataflow) {
    if (data.dataflow.description) {
      children.push(new Paragraph({
        bidirectional: defaultDir,
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun(translate('Introduction')),
        ],
      }));

      const sections = await convertMarkdown(data.dataflow.description, defaultDir);
      children.push(...sections);
    }

    if (data.dataflow.image) {
      children.push(new Paragraph({
        bidirectional: defaultDir,
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun(translate('Dataflow Diagram')),
        ],
      }));

      const image = await getImage(data.dataflow.image, defaultDir);
      children.push(image);
    }
  }

  return children;
};

export default getDataflow;
