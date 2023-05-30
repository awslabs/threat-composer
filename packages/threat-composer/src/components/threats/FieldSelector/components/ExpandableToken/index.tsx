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
import Button from '@cloudscape-design/components/button';
import { FC, ReactNode } from 'react';
import Tooltip from '../../../../generic/Tooltip';
import './index.css';

export interface ExpandableTokenProps {
  onClick?: () => void;
  expanded: boolean;
  tooltip: ReactNode;
}

const ExpandableToken: FC<ExpandableTokenProps> = ({
  expanded,
  onClick,
  tooltip,
}) => {
  return (<Tooltip tooltip={tooltip}>
    <Button iconName={expanded ? 'treeview-collapse' : 'treeview-expand'} variant="icon" onClick={onClick}/>
  </Tooltip>);
};

export default ExpandableToken;