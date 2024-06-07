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
import Flashbar, {
  FlashbarProps,
} from '@cloudscape-design/components/flashbar';
import Link from '@cloudscape-design/components/link';
import * as awsui from '@cloudscape-design/design-tokens';
import { FC, useEffect, useState } from 'react';

export interface NotificationsProps {
  addPadding?: boolean;
}

const NOTIFICATIONS_VERSION = 1;

const LOCAL_STORAGE_KEY = 'ThreatComposer.GithubNotificationsVersion';

const Notifications: FC<NotificationsProps> = ({ addPadding }) => {
  const [items, setItems] = useState<FlashbarProps.MessageDefinition[]>([]);

  useEffect(() => {
    const key = window.sessionStorage.getItem(LOCAL_STORAGE_KEY);
    if (key !== NOTIFICATIONS_VERSION.toString()) {
      setItems([
        {
          type: 'success',
          dismissible: true,
          dismissLabel: 'Dismiss message',
          onDismiss: () =>
            setItems((prevItems) =>
              prevItems.filter((x) => x.id !== 'message_1'),
            ),
          content: (
            <>
              You can now create, view and edit Threat Composer files directly
              within Visual Studio Code using the{' '}
              <Link
                color="inverted"
                href="https://marketplace.visualstudio.com/items?itemName=AmazonWebServices.aws-toolkit-vscode"
                external={true}
              >
                AWS Toolkit extension
              </Link>
              . See{' '}
              <Link
                color="inverted"
                href="https://docs.aws.amazon.com/toolkit-for-vscode/latest/userguide/threatcomposer-overview.html"
                external={true}
              >
                user guide
              </Link>
            </>
          ),
          id: 'message_1',
        },
        {
          type: 'info',
          dismissible: true,
          dismissLabel: 'Dismiss message',
          onDismiss: () =>
            setItems((prevItems) =>
              prevItems.filter((x) => x.id !== 'message_2'),
            ),
          content: (
            <>
              This GitHub Page is provided for demonstration purposes only.
              Refer to{' '}
              <Link
                color="inverted"
                href="https://github.com/awslabs/threat-composer"
                external={true}
              >
                threat-composer GitHub Repo
              </Link>{' '}
              for self-hosting deployment instructions.
            </>
          ),
          id: 'message_2',
        },
      ]);
    }

    window.sessionStorage.setItem(
      LOCAL_STORAGE_KEY,
      NOTIFICATIONS_VERSION.toString(),
    );
  }, []);

  return items && items.length > 0 ? (
    <div
      style={
        addPadding
          ? {
            padding: awsui.spaceScaledL,
            backgroundColor: awsui.colorBackgroundHomeHeader,
          }
          : undefined
      }
    >
      <Flashbar items={items} />
    </div>
  ) : (
    <></>
  );
};

export default Notifications;
