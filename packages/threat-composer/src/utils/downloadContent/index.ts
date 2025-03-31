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
import { DataExchangeFormat } from '@aws/threat-composer-core';

export const downloadObjectURL = (ObjectURL: any, exportName: string, fileExtension: string) => {
  var downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute('href', ObjectURL);
  downloadAnchorNode.setAttribute('download', exportName + fileExtension);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};

export const downloadContent = (content: any, mime: string, exportName: string, fileExtension: string) => {
  var dataStr = `data:${mime};charset=utf-8,` + encodeURIComponent(content);
  return downloadObjectURL(dataStr, exportName, fileExtension);
};

export const downloadObjectAsJson = (exportObj: DataExchangeFormat, exportName: string) => {
  const content = JSON.stringify(exportObj, null, 2);
  downloadContent(content, 'text/json', exportName, '.tc.json');
};

export const downloadContentAsMarkdown = (content: string, exportName: string) => {
  downloadContent(content, 'text/markdown', exportName, '.md');
};

export const downloadContentAsWordDocx = (blob: Blob, exportName: string) => {
  downloadObjectURL(window.URL.createObjectURL(blob), exportName, '.docx');
};

export const downloadContentAsYaml = (content: string, exportName: string) => {
  downloadContent(content, 'text/yaml', exportName, '.yml');
};


