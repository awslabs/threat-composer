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
import { useMitigationsContext } from '../../../contexts/MitigationsContext/context';
import { useThreatsContext } from '../../../contexts/ThreatsContext/context';
import { Assumption } from '../../../customTypes';
import GenericEntityCreationCard, { DEFAULT_ENTITY } from '../../generic/GenericEntityCreationCard';
import MitigationLinkView from '../../mitigations/MitigationLinkView';
import ThreatLinkView from '../../threats/ThreatLinkView';

export interface AssumptionCreationCardProps {
  onSave?: (entity: Assumption, linkedMitigationIds: string[], linkedThreatIds: string[]) => void;
}

const AssumptionCreationCard: FC<AssumptionCreationCardProps> = ({ onSave }) => {
  const [editingEntity, setEditingEntity] = useState<Assumption>(DEFAULT_ENTITY);
  const [linkedMitigationIds, setLinkedMitigationIds] = useState<string[]>([]);
  const [linkedThreatIds, setLinkedThreatIds] = useState<string[]>([]);

  const { mitigationList } = useMitigationsContext();
  const { statementList } = useThreatsContext();

  const handleSave = useCallback(() => {
    onSave?.(editingEntity, linkedMitigationIds, linkedThreatIds);
    setEditingEntity(DEFAULT_ENTITY);
    setLinkedMitigationIds([]);
    setLinkedThreatIds([]);
  }, [editingEntity, linkedMitigationIds, linkedThreatIds]);

  const handleReset = useCallback(() => {
    setEditingEntity(DEFAULT_ENTITY);
    setLinkedMitigationIds([]);
    setLinkedThreatIds([]);
  }, []);

  return (<GenericEntityCreationCard
    editingEntity={editingEntity}
    setEditingEntity={setEditingEntity}
    header='Add new assumption'
    onSave={handleSave}
    onReset={handleReset}
    customEditors={<SpaceBetween direction='vertical' size='s'>
      <MitigationLinkView
        linkedMitigationIds={linkedMitigationIds}
        mitigationList={mitigationList}
        onAddMitigationLink={(id) => setLinkedMitigationIds(prev => [...prev, id])}
        onRemoveMitigationLink={(id) => setLinkedMitigationIds(prev => prev.filter(p => p !== id))}
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

export default AssumptionCreationCard;