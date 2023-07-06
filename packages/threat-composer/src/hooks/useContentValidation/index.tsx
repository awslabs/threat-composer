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
import { z } from 'zod';
import sanitizeHtml from '../../utils/sanitizeHtml';

const useContentValidation = (
  value: string,
  onChange?: NonCancelableEventHandler<BaseChangeDetail>,
  validateData?: (newValue: string) => z.SafeParseReturnType<string | undefined, string | undefined>,
) => {
  const [tempValue, setTempValue] = useState(value);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    setTempValue(value);
    if (!value) {
      setErrorText('');
    }
  }, [value]);

  const handleChange: NonCancelableEventHandler<BaseChangeDetail> = useCallback((event) => {
    const newValue = event.detail.value;
    console.log(newValue);
    setTempValue(newValue);
    const cleanValue = sanitizeHtml(newValue);
    if (cleanValue !== newValue) {
      setErrorText('Html tags not supported');
      return;
    }

    if (validateData) {
      const validation = validateData(newValue);
      if (!validation.success) {
        setErrorText(validation.error.issues.map(i => i.message).join('; '));
        return ;
      }
    }

    setErrorText('');
    onChange?.(event);
  }, [setTempValue, setErrorText, onChange, validateData]);

  return {
    tempValue,
    handleChange,
    errorText,
  };
};

export default useContentValidation;