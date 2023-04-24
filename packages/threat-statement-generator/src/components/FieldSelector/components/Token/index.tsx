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
import { FC, PropsWithChildren } from 'react';
export interface TokenProps {
  onClick: () => void;
  highlighted?: boolean;
  filled?: boolean;
}

const Token: FC<PropsWithChildren<TokenProps>> = ({
  children,
  onClick,
  highlighted,
  filled,
}) => {
  return (<>
    <button style={{
      backgroundColor: highlighted ? '#b5d6f4' : (filled ? '#f2f8fd' : undefined),
    }} onClick={onClick}>
      {children}
    </button>
  </>
  );
};

export default Token;