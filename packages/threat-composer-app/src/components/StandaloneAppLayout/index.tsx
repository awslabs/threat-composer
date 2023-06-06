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
import { FC, PropsWithChildren, useMemo } from 'react';
import { useMobileMediaQuery } from 'threat-composer';
import NavHeader from '../NavHeader';

export interface StandaloneAppLayoutProps {
  href: string;
  title: string;
}

const baseStyles = {
  maxWidth: '1419px',
};

const StandaloneAppLayout: FC<PropsWithChildren<StandaloneAppLayoutProps>> = ({
  title,
  children,
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
      <div style={{
        display: 'flex',
        width: '100%',
        justifyContent: 'center',
      }}>
        <div style={isMobileView ? {
          ...baseStyles,
          paddingTop: '40px',
        } : {
          ...baseStyles,
          paddingTop: '56px',
        }}>
          <Box padding='l'>
            {children}
          </Box>
        </div>
      </div>
    </main>

  </div>);
};

export default StandaloneAppLayout;