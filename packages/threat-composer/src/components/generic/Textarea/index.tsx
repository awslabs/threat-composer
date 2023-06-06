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
import FormField, { FormFieldProps } from '@cloudscape-design/components/form-field';
import TextareaComponent, { TextareaProps as TextareaComponetProps } from '@cloudscape-design/components/textarea';
import React, { FC } from 'react';
import { z } from 'zod';
import useContentValidation from '../../../hooks/useContentValidation';

export interface TextAreaProps extends FormFieldProps, TextareaComponetProps {
  ref?: React.ForwardedRef<any>;
  validateData?: (newValue: string) => z.SafeParseReturnType<string | undefined, string | undefined>;
}

const Textarea: FC<TextAreaProps> = React.forwardRef<TextareaComponetProps.Ref, TextAreaProps>(({
  value,
  onChange,
  validateData,
  ...props
}, ref) => {
  const { tempValue, errorText, handleChange } = useContentValidation(value, onChange, validateData);

  return (
    <FormField
      {...props}
      errorText={errorText}
    >
      <TextareaComponent
        {...props}
        ref={ref}
        value={tempValue}
        onChange={event =>
          handleChange(event)
        }
      />
    </FormField>);
});

export default Textarea;