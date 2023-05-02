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
import SpaceBetween from '@cloudscape-design/components/space-between';
import { FC, useState, useCallback } from 'react';
import { useAssumptionsContext } from '../../../contexts/AssumptionsContext/context';
import { useThreatsContext } from '../../../contexts/ThreatsContext/context';
import { Mitigation } from '../../../customTypes';
import AssumptionLinkView from '../../assumptions/AssumptionLinkView';
import GenericEntityCreationCard, { DEFAULT_ENTITY } from '../../generic/GenericEntityCreationCard';
import ThreatLinkView from '../../threats/ThreatLinkView';

export interface MitigationCreationCardProps {
  onSave?: (entity: Mitigation, linkedAssumptionIds: string[], linkedThreatIds: string[]) => void;
}

const MitigationCreationCard: FC<MitigationCreationCardProps> = ({ onSave }) => {
  const [editingEntity, setEditingEntity] = useState<Mitigation>(DEFAULT_ENTITY);
  const [linkedAssumptionIds, setLinkedAssumptionIds] = useState<string[]>([]);
  const [linkedThreatIds, setLinkedThreatIds] = useState<string[]>([]);

  const { assumptionList } = useAssumptionsContext();
  const { statementList } = useThreatsContext();

  const handleSave = useCallback(() => {
    onSave?.(editingEntity, linkedAssumptionIds, linkedThreatIds);
    setEditingEntity(DEFAULT_ENTITY);
    setLinkedAssumptionIds([]);
    setLinkedThreatIds([]);
  }, [editingEntity, linkedAssumptionIds, linkedThreatIds]);

  const handleReset = useCallback(() => {
    setEditingEntity(DEFAULT_ENTITY);
    setLinkedAssumptionIds([]);
    setLinkedThreatIds([]);
  }, []);

  return (<GenericEntityCreationCard
    editingEntity={editingEntity}
    setEditingEntity={setEditingEntity}
    header='Add new mitigation'
    onSave={handleSave}
    onReset={handleReset}
    customEditors={<SpaceBetween direction='vertical' size='s'>
      <AssumptionLinkView
        linkedAssumptionIds={linkedAssumptionIds}
        assumptionList={assumptionList}
        onAddAssumptionLink={(id) => setLinkedAssumptionIds(prev => [...prev, id])}
        onRemoveAssumptionLink={(id) => setLinkedAssumptionIds(prev => prev.filter(p => p !== id))}
      />
      <ThreatLinkView
        linkedThreatIds={linkedThreatIds}
        threatList={statementList}
        onAddThreatLink={(id) => setLinkedThreatIds(prev => [...prev, id])}
        onRemoveThreatLink={(id) => setLinkedThreatIds(prev => prev.filter(p => p !== id))}
      />
    </SpaceBetween>}
  />);
};

export default MitigationCreationCard;