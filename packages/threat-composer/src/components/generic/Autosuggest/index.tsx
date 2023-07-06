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
import CloudscapeAutosuggest, { AutosuggestProps as CloudscapeAutosuggestProps } from '@cloudscape-design/components/autosuggest';
import FormField, { FormFieldProps } from '@cloudscape-design/components/form-field';
import { BaseKeyDetail, CancelableEventHandler } from '@cloudscape-design/components/internal/events';
import React, { FC, useCallback, useState } from 'react';
import { z } from 'zod';
import useContentValidation from '../../../hooks/useContentValidation';

export interface AutosuggestProps extends FormFieldProps, Omit<CloudscapeAutosuggestProps, 'errorText'> {
  ref?: React.ForwardedRef<any>;
  validateData?: (newValue: string) => z.SafeParseReturnType<string | undefined, string | undefined>;
}

const Autosuggest: FC<AutosuggestProps> = React.forwardRef<CloudscapeAutosuggestProps.Ref, AutosuggestProps>(({
  onChange,
  value,
  validateData,
  errorText: _errorText,
  ...props
},
ref) => {
  const [resetErrorText, setResetErrorText] = useState<boolean>();
  const { tempValue, errorText, handleChange } = useContentValidation(value, onChange, validateData);

  const handleKeyDown: CancelableEventHandler<BaseKeyDetail> = useCallback((event) => {
    if (event.detail.keyCode === 8 && !value && errorText) {
      // When the value is empty, press backspace to reset the errorText.
      setResetErrorText(true);
    } else {
      setResetErrorText(false);
    }

    props.onKeyDown?.(event);
  },
  [props.onKeyDown, errorText, value]);

  return (
    <FormField
      {...props}
      errorText={resetErrorText ? undefined : errorText}
    >
      <CloudscapeAutosuggest
        {...props}
        ref={ref}
        value={errorText ? value : tempValue}
        onChange={event =>
          handleChange(event)
        }
        onKeyDown={handleKeyDown}
      />
    </FormField>);
});

export default Autosuggest;