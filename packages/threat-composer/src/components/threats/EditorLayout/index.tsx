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
/** @jsxImportSource @emotion/react */
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import React, { FC, PropsWithChildren } from 'react';
import styles from './styles';

export interface EditorLayoutProps {
  title: string;
  description: string;
  secondaryControl?: React.ReactNode;
}

const EditorLayout: FC<PropsWithChildren<EditorLayoutProps>> = ({
  title,
  description,
  children,
  secondaryControl,
}) => {
  return (<Container
    header={<Header description={description}>{title}</Header>}
    footer={secondaryControl}
  >
    <div css={styles.container}>
      <SpaceBetween direction='vertical' size='m'>
        {children}
      </SpaceBetween>
    </div>
  </Container>);
};

export default EditorLayout;
