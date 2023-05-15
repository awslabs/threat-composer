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
import Badge from '@cloudscape-design/components/badge';
import { FC } from 'react';

export interface PriorityBadgeProps {
  priority?: string;
}

const PRIORITY_COLOR_MAPPING: any = {
  High: 'red',
  Medium: 'blue',
  Low: 'green',
};

const PriorityBadge: FC<PriorityBadgeProps> = ({
  priority,
}) => {
  return priority ? (<div style={{
    display: 'inline-block',
  }}>
    <Badge color={PRIORITY_COLOR_MAPPING[priority] || 'grey'}>{priority}</Badge>
  </div>) : null;
};

export default PriorityBadge;