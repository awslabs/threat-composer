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
import Spacebetween from '@cloudscape-design/components/space-between';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import TextContent from '@cloudscape-design/components/text-content';
import { FC } from 'react';
import getDisplayLastModified from '../../utils/getDisplayLastModified';
import getDisplaySize from '../../utils/getDisplaySize';

export interface FileTokenLabelProps {
  name?: string;
  size?: number;
  lastModified?: number;
}

const FileTokenLabel: FC<FileTokenLabelProps> = ({ name, size, lastModified }) => {
  return (
    <Spacebetween direction="horizontal" size="xs">
      <StatusIndicator type="success" />
      <TextContent>
        <Spacebetween direction="vertical" size="xxxs">
          <span key='name'><b>{name}</b></span>
          <span key='size'>{getDisplaySize(size)}</span>
          {lastModified && <span key='lastModified'>{getDisplayLastModified(lastModified)}</span>}
        </Spacebetween>
      </TextContent>
    </Spacebetween>
  );
};

export default FileTokenLabel;
