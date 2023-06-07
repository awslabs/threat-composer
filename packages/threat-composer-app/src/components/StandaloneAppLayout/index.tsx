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
import Box from '@cloudscape-design/components/box';
import { FC, PropsWithChildren, useMemo, ReactNode } from 'react';
import { useMobileMediaQuery } from 'threat-composer';
import NavHeader from '../NavHeader';

export interface StandaloneAppLayoutProps {
  href: string;
  title: string;
  notifications?: ReactNode;
}

const baseStyles = {
  width: '100%',
};

const StandaloneAppLayout: FC<PropsWithChildren<StandaloneAppLayoutProps>> = ({
  title,
  children,
  notifications,
  ...props
}) => {
  const isMobileView = useMobileMediaQuery();
  const headerHref = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const href = props.href || '/';
    return mode ? `${href}/?mode=${mode}` : href;
  }, [props]);

  return (<div>
    <NavHeader
      title={title}
      href={headerHref}
    />
    <main>
      <div style={isMobileView ? {
        ...baseStyles,
        paddingTop: '40px',
      } : {
        ...baseStyles,
        paddingTop: '56px',
      }}>
        {notifications && <div>{notifications}</div>}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
        }}>
          <div style={{
            maxWidth: '1419px',
          }}>
            <Box padding='l'>
              {children}
            </Box>
          </div>
        </div>
      </div>
    </main>

  </div>);
};

export default StandaloneAppLayout;