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
import { useEffect, FC, PropsWithChildren } from 'react';
import { useNavigate } from 'react-router-dom';

const requiredRewriteUrl = (search: string) => {
  return search && (search.startsWith('?/') || search.startsWith('?%2F'));
};

const ROUTE_BASE_PATH = process.env.REACT_APP_ROUTE_BASE_PATH || '';

const GithubPagesNavigationHelper: FC<PropsWithChildren<{}>> = ({
  children,
}) => {
  const navigate = useNavigate();
  useEffect(() => {
    const l = window.location;
    if (requiredRewriteUrl(l.search)) {
      let search = decodeURIComponent(l.search);
      if (search.indexOf('=') === search.length - 1) {
        search = search.slice(0, search.length - 1);
      }
      var decoded = search.slice(1).split('&').map(function (s) {
        return s.replace(/~and~/g, '&');
      }).join('?');

      navigate(ROUTE_BASE_PATH + '/' + decoded + l.hash);
    }
  }, [window.location.search]);

  return requiredRewriteUrl(window.location.search) ? <></> : <>{children}</>;
};

export default GithubPagesNavigationHelper;