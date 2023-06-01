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
import { BaseChangeDetail } from '@cloudscape-design/components/input/interfaces';
import { NonCancelableEventHandler } from '@cloudscape-design/components/internal/events';
import { useCallback, useEffect, useState } from 'react';
import { REGEX_CONTENT_NOT_HTML_TAG } from '../../configs';

const useContentValidation = (
  value: string,
  onChange?: NonCancelableEventHandler<BaseChangeDetail>,
) => {
  const [tempValue, setTempValue] = useState(value);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  const handleChange: NonCancelableEventHandler<BaseChangeDetail> = useCallback((event) => {
    const newValue = event.detail.value;
    setTempValue(newValue);
    if (REGEX_CONTENT_NOT_HTML_TAG.test(newValue)) {
      setErrorText('Html tags not supported');
    } else {
      setErrorText('');
      onChange?.(event);
    }
  }, [setTempValue, setErrorText, onChange]);

  return {
    tempValue,
    handleChange,
    errorText,
  };
};

export default useContentValidation;