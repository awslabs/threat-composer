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
import { Loading } from '@aws/threat-composer';
import { FC, Suspense, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { routerOpts, createRouter, routes } from '../../../../routes';

const Full: FC = () => {
  const [router] = useState(() => {
    //Initialize here to ensure the default index loader only call when Full is mount without affecting Standalone mode
    return createRouter(routes, routerOpts);
  });

  return (
    <Suspense fallback={<Loading />}>
      <RouterProvider router={router} />
    </Suspense>
  );
};

export default Full;
