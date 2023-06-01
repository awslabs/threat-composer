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
import InputComponent, { InputProps as InputComponentProps } from '@cloudscape-design/components/input';
import React, { FC } from 'react';
import useContentValidation from '../../../hooks/useContentValidation';

export interface InputProps extends FormFieldProps, InputComponentProps {
  ref?: React.ForwardedRef<any>;
}

const Input: FC<InputProps> = React.forwardRef<InputComponentProps.Ref, InputProps>(({
  value,
  onChange,
  ...props
}, ref) => {
  const { tempValue, errorText, handleChange } = useContentValidation(value, onChange);
  return (
    <FormField
      {...props}
      errorText={errorText}
    >
      <InputComponent
        {...props}
        ref={ref}
        value={tempValue}
        onChange={event =>
          handleChange(event)
        }
      />
    </FormField>);
});

export default Input;