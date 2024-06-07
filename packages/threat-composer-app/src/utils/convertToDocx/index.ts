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
import { Document, Packer } from 'docx';
import { ORDERED_LIST_REF, DEFAULT_NUMBERINGS } from './config';
import getApplicationInfo from './getApplicationInfo';
import { getApplicationName } from './getApplicationName';
import getArchitecture from './getArchitecture';
import getAssets from './getAssets';
import getAssumptions from './getAssumptions';
import getDataflow from './getDataflow';
import getMitigations from './getMitigations';
import getThreats from './getThreats';

/**
 * Convert threat model data into Docx format
 * @param data
 */
const convertToDocx = async (data: DataExchangeFormat) => {
  const applicatonName = await getApplicationName(data);
  const applicationInfo = await getApplicationInfo(data);
  const architecture = await getArchitecture(data);
  const dataflow = await getDataflow(data);

  const assumptions = await getAssumptions(data);
  const threats = await getThreats(data);
  const mitigations = await getMitigations(data);
  const assets = await getAssets(data);

  const docx = new Document({
    title: data.applicationInfo?.name,
    creator: 'threat-composer',
    numbering: {
      config: [
        {
          reference: ORDERED_LIST_REF,
          levels: DEFAULT_NUMBERINGS,
        },
      ],
    },
    sections: [
      {
        properties: {
        },
        children: [
          ...applicatonName,
          ...applicationInfo,
          ...architecture,
          ...dataflow,
        ],
      },
      {
        properties: {
          page: {
            size: {
              orientation: 'landscape',
            },
          },
        },
        children: [
          ...assumptions,
        ],
      },
      {
        properties: {
          page: {
            size: {
              orientation: 'landscape',
            },
          },
        },
        children: [
          ...threats,
        ],
      },
      {
        properties: {
          page: {
            size: {
              orientation: 'landscape',
            },
          },
        },
        children: [
          ...mitigations,
        ],
      },
      {
        properties: {
          page: {
            size: {
              orientation: 'landscape',
            },
          },
        },
        children: [
          ...assets,
        ],
      },
    ],
  });

  const blob = Packer.toBlob(docx);

  return blob;
};

export default convertToDocx;