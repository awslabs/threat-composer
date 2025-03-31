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
import { LOCAL_STORAGE_KEY_CURRENT_WORKSPACE } from '@aws/threat-composer';
import { Workspace } from '@aws/threat-composer-core';
import { generatePath, redirect } from 'react-router-dom';
import { ROUTE_WORKSPACE_DEFAULT, ROUTE_WORKSPACE_PATH } from '../config/routes';

const isGithubPages = process.env.REACT_APP_GITHUB_PAGES === 'true';

const requiredRewriteUrl = (search: string) => {
  return search && (search.startsWith('?/') || search.startsWith('?%2F'));
};

const initialWorkspaceLoader = async () => {
  const l = window.location;

  // For github page, the direct navigation to workspace pages (e.g., https://awslabs.github.io/threat-composer/workspaces/default/dashboard) results in 404.
  // In 404.html, the url is rewrited to https://awslabs.github.io/threat-composer?/workspaces/default/dashboard so that the index.html can be loaded.
  // And here is to reconstruct the original url and navigate to the right page.
  if (isGithubPages && requiredRewriteUrl(l.search)) {
    let search = decodeURIComponent(l.search);
    if (search.indexOf('=') === search.length - 1) {
      search = search.slice(0, search.length - 1);
    }
    var decoded = search.slice(1).split('&').map(function (s) {
      return s.replace(/~and~/g, '&');
    }).join('?');

    return redirect(decoded + l.hash);
  }

  const currentWorkspaceValue = window.localStorage.getItem(LOCAL_STORAGE_KEY_CURRENT_WORKSPACE);

  if (currentWorkspaceValue) {
    try {
      const currentWorkspace = JSON.parse(currentWorkspaceValue) as Workspace | null | undefined;
      if (currentWorkspace) {
        const redirectUrl = generatePath(ROUTE_WORKSPACE_PATH, {
          workspaceId: currentWorkspace.name,
        });
        return redirect(redirectUrl);
      }

    } catch (e) {
      console.log('Error in retrieving current workspace', currentWorkspaceValue);
    }
  }

  return redirect(ROUTE_WORKSPACE_DEFAULT);
};

export default initialWorkspaceLoader;