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
import { useMemo } from 'react';
import { EntityBase, MetadataCommentSchema } from '../../../customTypes';
import MarkdownEditor from '../MarkdownEditor';

export interface CommentsEditProps<T> {
  entity: T;
  onEditEntity: (entity: T, key: string, value: string | string[] | undefined) => void;
}

const CommentsEdit = <T extends EntityBase>({
  entity,
  onEditEntity,
}: CommentsEditProps<T>) => {
  const comments = useMemo(() => {
    return (entity.metadata?.find(m => m.key === 'Comments')?.value as string) || '';
  }, [entity.metadata]);

  return (<MarkdownEditor
    label='Comments'
    value={comments}
    onChange={(value) => onEditEntity(entity, 'Comments', value)}
    rows={3}
    validateData={MetadataCommentSchema.safeParse}
  />);
};

export default CommentsEdit;