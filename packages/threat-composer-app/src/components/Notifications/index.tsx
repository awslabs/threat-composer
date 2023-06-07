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
import Flashbar, { FlashbarProps } from '@cloudscape-design/components/flashbar';
import Link from '@cloudscape-design/components/link';
import * as awsui from '@cloudscape-design/design-tokens';
import { FC, useState } from 'react';

export interface NotificationsProps {
  addPadding?: boolean;
}

const Notifications: FC<NotificationsProps> = ({ addPadding }) => {
  const [items, setItems] = useState<FlashbarProps.MessageDefinition[]>([
    {
      type: 'info',
      dismissible: true,
      dismissLabel: 'Dismiss message',
      onDismiss: () => setItems([]),
      content: (
        <>
          This GitHub Page is provided for demonstration purposes only. Refer to {' '}
          <Link color="inverted" href="https://github.com/awslabs/threat-composer" external={true}>
            threat-composer GitHub Repo
          </Link> for self-hosting deployment instructions.
        </>
      ),
      id: 'message_1',
    },
  ]);
  return items && items.length > 0 ? (<div style={addPadding ? {
    padding: awsui.spaceScaledL,
    backgroundColor: awsui.colorBackgroundHomeHeader,
  } : undefined}><Flashbar items={items} /></div>) : <></>;
};

export default Notifications;