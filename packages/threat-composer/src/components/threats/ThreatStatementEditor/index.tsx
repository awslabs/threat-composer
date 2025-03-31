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
/** @jsxImportSource @emotion/react */
import { Mitigation } from '@aws/threat-composer-core';
import ContentLayoutComponent from '@cloudscape-design/components/content-layout';
import Grid from '@cloudscape-design/components/grid';
import SpaceBetween from '@cloudscape-design/components/space-between';
import TextContent from '@cloudscape-design/components/text-content';
import * as awsui from '@cloudscape-design/design-tokens';
import { css } from '@emotion/react';
import React, { FC, useCallback, useMemo, useState, useRef, useEffect, ReactNode, PropsWithChildren } from 'react';
import { EditorProps } from './types';
import { METADATA_KEY_SOURCE, METADATA_KEY_SOURCE_THREAT_PACK, METADATA_KEY_SOURCE_THREAT_PACK_MITIGATION_CANDIDATE, METADATA_KEY_SOURCE_THREAT_PACK_THREAT } from '../../../configs';
import { DEFAULT_NEW_ENTITY_ID, DEFAULT_WORKSPACE_LABEL } from '../../../configs/constants';
import { useAssumptionLinksContext } from '../../../contexts/AssumptionLinksContext/context';
import { useAssumptionsContext } from '../../../contexts/AssumptionsContext/context';
import { GlobalSetupContextApi, useGlobalSetupContext } from '../../../contexts/GlobalSetupContext/context';
import { useMitigationLinksContext } from '../../../contexts/MitigationLinksContext/context';
import { useMitigationsContext } from '../../../contexts/MitigationsContext/context';
import { useThreatsContext } from '../../../contexts/ThreatsContext/context';
import { useWorkspacesContext } from '../../../contexts/WorkspacesContext/context';
import { TemplateThreatStatement, ViewNavigationEvent } from '../../../customTypes';
import { ThreatFieldTypes } from '../../../customTypes/threatFieldTypes';
import threatFieldData from '../../../data/threatFieldData';
import threatStatementExamples from '../../../data/threatStatementExamples.json';
import threatStatementFormat from '../../../data/threatStatementFormat';
import useEditMetadata from '../../../hooks/useEditMetadata';
import getMetadata from '../../../utils/getMetadata';
import getNewMitigation from '../../../utils/getNewMitigation';
import getNewThreatStatement from '../../../utils/getNewThreatStatement';
import getRecommendedEditor from '../../../utils/getRecommandedEditor';
import matchThreatPackMitigationCandidate from '../../../utils/matchThreatPackMitigationCandidate';
import renderThreatStatement from '../../../utils/renderThreatStatement';
import scrollToTop from '../../../utils/scrollToTop';
import AssumptionLinkComponent from '../../assumptions/AssumptionLinkView';
import Tooltip from '../../generic/Tooltip';
import MitigationLinkComponent from '../../mitigations/MitigationLinkView';
import CustomTemplate from '../CustomTemplate';
import EditorImpactedAssets from '../EditorImpactedAssets';
import EditorImpactedGoal from '../EditorImpactedGoal';
import EditorPrerequisites from '../EditorPrerequisites';
import EditorThreatAction from '../EditorThreatAction';
import EditorThreatImpact from '../EditorThreatImpact';
import EditorThreatSource from '../EditorThreatSource';
import FieldSelector from '../FieldSelector';
import FinalStatement from '../FinalStatement';
import FullExamples from '../FullExamples';
import Header from '../Header';
import MetadataEditor from '../MetadataEditor';
import Metrics from '../Metrics';
import MitigationCandidates from '../MitigationCandidates';

const styles = {
  finalStatementSection: css({
    '&:hover': {
      backgroundColor: awsui.colorBackgroundDropdownItemHover,
    },
  }),
  metadataContainer: css({
    'h3>span>span': {
      fontSize: '20px',
    },
  }),
};

const defaultThreatStatementFormat = threatStatementFormat[63];

export interface ThreatStatementEditorProps {
  onThreatListView?: ViewNavigationEvent['onThreatListView'];
  threatPackId?: string;
  threatPackThreatId?: string;
}

const editorMapping: { [key in ThreatFieldTypes]: React.ComponentType<EditorProps & { ref?: React.ForwardedRef<any> }> } = {
  threat_source: EditorThreatSource,
  prerequisites: EditorPrerequisites,
  threat_action: EditorThreatAction,
  threat_impact: EditorThreatImpact,
  impacted_goal: EditorImpactedGoal,
  impacted_assets: EditorImpactedAssets,
};

const ContentLayout: FC<PropsWithChildren<{
  composerMode: GlobalSetupContextApi['composerMode'];
  editingStatement: TemplateThreatStatement;
  saveButtonText: string;
  onCancel: () => void;
  onStartOver?: () => void;
  onComplete: () => void;
}>> = ({
  children,
  editingStatement,
  composerMode,
  onCancel,
  onStartOver,
  onComplete,
  saveButtonText,
}) => {
  if (composerMode !== 'Full') {
    return (<>{children}</>);
  }

  return (<ContentLayoutComponent
    disableOverlap
    header={<Header
      composerMode={composerMode}
      statement={editingStatement}
      saveButtonText={saveButtonText}
      onCancel={onCancel}
      onStartOver={onStartOver}
      onComplete={onComplete} />
    }>
    {children}
  </ContentLayoutComponent>);
};

export const ThreatStatementEditorInner: FC<ThreatStatementEditorProps & { editingStatement: TemplateThreatStatement }> = ({
  editingStatement,
  onThreatListView,
  ...props
}) => {
  const { setEditingStatement, saveStatement, addStatement } = useThreatsContext();
  const inputRef = useRef<{ focus(): void }>();
  const fullExamplesRef = useRef<{ collapse(): void }>();
  const { currentWorkspace, workspaceList } = useWorkspacesContext();
  const [editor, setEditor] = useState<ThreatFieldTypes | undefined>(getRecommendedEditor(editingStatement));
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [displayStatement, setDisplayStatement] = useState<ReactNode[] | undefined>([]);
  const [customTemplateEditorVisible, setCustomTemplateEditorVisible] = useState(false);

  const { addAssumptionLinks, getLinkedAssumptionLinks, removeAssumptionLinks } = useAssumptionLinksContext();
  const { addMitigationLinks, getLinkedMitigationLinks, removeMitigationLinks } = useMitigationLinksContext();

  const prevLinkedAssumptionIds = useMemo(() => {
    return getLinkedAssumptionLinks(editingStatement.id).map(la => la.assumptionId);
  }, [getLinkedAssumptionLinks, editingStatement]);

  const prevLinkedMitigationIds = useMemo(() => {
    return getLinkedMitigationLinks(editingStatement.id).map(lm => lm.mitigationId);
  }, [getLinkedMitigationLinks, editingStatement]);

  const [linkedAssumptionIds, setLinkedAssumptionIds] = useState<string[]>(editingStatement
    && editingStatement?.numericId === -1 ? [] : prevLinkedAssumptionIds);
  const [linkedMitigationIds, setLinkedMitigationIds] = useState<string[]>(editingStatement
    && editingStatement?.numericId === -1 ? [] : prevLinkedMitigationIds);

  const { composerMode } = useGlobalSetupContext();

  const { assumptionList, saveAssumption } = useAssumptionsContext();
  const { mitigationList, saveMitigation } = useMitigationsContext();

  const Component = useMemo(() => {
    return editor && editorMapping[editor];
  }, [editor]);

  const handleCancel = useCallback(() => {
    setEditingStatement(null);
    onThreatListView?.();
  }, [setEditingStatement, onThreatListView]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [editor]);

  useEffect(() => {
    if (editingStatement) {
      const { statement, suggestions: currentSuggestions, displayedStatement } = renderThreatStatement(editingStatement);
      if (statement !== editingStatement.statement) {
        setEditingStatement(prev => prev && ({
          ...prev,
          statement,
          displayedStatement,
        }));
      }
      const displayedHtml = displayedStatement?.map((s, index) => typeof s === 'string' ?
        s : s.type === 'b' ?
          <Tooltip tooltip={s.tooltip} key={index} anchor={composerMode === 'EditorOnly' ? 'bottom' : 'top'}><b css={styles.finalStatementSection}>{s.content}</b></Tooltip> :
          s.type === 'span' ?
            <Tooltip tooltip={s.tooltip} key={index} anchor={composerMode === 'EditorOnly' ? 'bottom' : 'top'}><span css={styles.finalStatementSection}>{s.content}</span></Tooltip> :
            <>{s.content}</>);

      setDisplayStatement(displayedHtml);
      setSuggestions(currentSuggestions);
    } else {
      setSuggestions([]);
      setDisplayStatement([]);
    }
  }, [editingStatement, composerMode]);

  const handleStartOver = useCallback(() => {
    setEditingStatement(getNewThreatStatement());
    setEditor(undefined);
    fullExamplesRef.current?.collapse();
  }, [addStatement]);

  const handleComplete = useCallback(() => {
    if (editingStatement) {
      saveStatement(editingStatement);
      const id = editingStatement.id;
      if (editingStatement.numericId === -1) {
        linkedAssumptionIds && linkedAssumptionIds.length > 0 && addAssumptionLinks(linkedAssumptionIds.map(la => ({
          assumptionId: la,
          linkedId: id,
          type: 'Threat',
        })));
        linkedMitigationIds && linkedMitigationIds.length > 0 && addMitigationLinks(linkedMitigationIds.map(lm => ({
          mitigationId: lm,
          linkedId: id,
        })));
      } else {
        const toAddlinkedAssumptionIds = linkedAssumptionIds.filter(x =>
          !prevLinkedAssumptionIds.includes(x));
        const toRemovelinkedAssumptionIds = prevLinkedAssumptionIds.filter(x =>
          !linkedAssumptionIds.includes(x));
        toAddlinkedAssumptionIds && toAddlinkedAssumptionIds.length > 0 && addAssumptionLinks(toAddlinkedAssumptionIds.map(la => ({
          assumptionId: la,
          linkedId: id,
          type: 'Threat',
        })));
        toRemovelinkedAssumptionIds && toRemovelinkedAssumptionIds.length > 0 && removeAssumptionLinks(toRemovelinkedAssumptionIds.map(la => ({
          assumptionId: la,
          linkedId: id,
          type: 'Threat',
        })));
        const toAddlinkedMitigationIds = linkedMitigationIds.filter(x =>
          !prevLinkedMitigationIds.includes(x));
        const toRemovelinkedMitigationIds = prevLinkedMitigationIds.filter(x =>
          !linkedMitigationIds.includes(x));
        toAddlinkedMitigationIds && toAddlinkedMitigationIds.length > 0 && addMitigationLinks(toAddlinkedMitigationIds.map(lm => ({
          mitigationId: lm,
          linkedId: id,
        })));
        toRemovelinkedMitigationIds && toRemovelinkedMitigationIds.length > 0 && removeMitigationLinks(toRemovelinkedMitigationIds.map(lm => ({
          mitigationId: lm,
          linkedId: id,
        })));
      }
    }

    setEditingStatement(null);
    onThreatListView?.();
  }, [saveStatement,
    editingStatement,
    linkedAssumptionIds,
    linkedMitigationIds,
    prevLinkedAssumptionIds,
    prevLinkedMitigationIds,
    onThreatListView]);

  const handleExampleClicked = useCallback((statement: TemplateThreatStatement) => {
    setEditingStatement({
      ...statement,
      ...getNewThreatStatement(),
      tags: [],
      metadata: [],
    });
    const recommendedEditor = getRecommendedEditor(statement);
    recommendedEditor && setEditor(recommendedEditor);
    fullExamplesRef.current?.collapse();
  }, []);

  const handleGiveExampleClicked = useCallback(() => {
    const len = threatStatementExamples.length;
    const randomNumber = Math.floor(Math.random() * len);
    const example = threatStatementExamples[randomNumber] as TemplateThreatStatement;
    const statement = {
      ...example,
      ...getNewThreatStatement(),
      tags: [],
      metadata: [],
    };

    setEditingStatement(statement);
    const recommendedEditor = getRecommendedEditor(statement);
    recommendedEditor && setEditor(recommendedEditor);
    scrollToTop();
  }, []);

  const saveButtonText = useMemo(() => {
    if (!currentWorkspace && workspaceList.length === 0) {
      // For most of use cases, if there is only the default workspace, use list to reduce cognitive load.
      return editingStatement?.numericId === -1 ? 'Add to list' : 'Save';
    }

    const workspace = currentWorkspace?.name || DEFAULT_WORKSPACE_LABEL;
    return editingStatement?.numericId === -1 ? `Add to workspace ${workspace}` : `Save to workspace ${workspace}`;

  }, [currentWorkspace, workspaceList, editingStatement]);

  const handleCustomTemplateConfirm = useCallback((template: string) => {
    setCustomTemplateEditorVisible(false);
    if (template !== defaultThreatStatementFormat.template) {
      setEditingStatement({
        ...editingStatement,
        customTemplate: template,
      } as TemplateThreatStatement);
    } else {
      setEditingStatement({
        ...editingStatement,
        customTemplate: undefined,
      } as TemplateThreatStatement);
    }
  }, [editingStatement]);

  const handleAddAssumptionLink = useCallback((assumptionIdOrNewAssumption: string) => {
    if (assumptionList.find(a => a.id === assumptionIdOrNewAssumption)) {
      setLinkedAssumptionIds(prev => [...prev, assumptionIdOrNewAssumption]);
    } else {
      const newAssumption = saveAssumption({
        id: DEFAULT_NEW_ENTITY_ID,
        numericId: -1,
        content: assumptionIdOrNewAssumption,
      });
      setLinkedAssumptionIds(prev => [...prev, newAssumption.id]);
    }

  }, [setLinkedAssumptionIds, assumptionList, saveAssumption]);

  const handleAddMitigationLink = useCallback((mitigationIdOrNewMitigation: string) => {
    if (mitigationList.find(a => a.id === mitigationIdOrNewMitigation)) {
      setLinkedMitigationIds(prev => [...prev, mitigationIdOrNewMitigation]);
    } else {
      const newMitigation = saveMitigation(getNewMitigation(mitigationIdOrNewMitigation));
      setLinkedMitigationIds(prev => [...prev, newMitigation.id]);
    }

  }, [setLinkedMitigationIds, mitigationList, saveMitigation]);

  const handleAddMitigationsFromMitigationCandidates = useCallback((mitigationCandidates: Mitigation[], threatPackId: string) => {
    mitigationCandidates.forEach(mitigationCandidate => {
      const matchMitigation = mitigationList.find(x => matchThreatPackMitigationCandidate(x, threatPackId, mitigationCandidate.id));
      if (matchMitigation) {
        setLinkedMitigationIds(prev => [...prev, matchMitigation.id]);
      } else {
        const data = {
          ...mitigationCandidate,
          ...getNewMitigation(mitigationCandidate.content),
          metadata: [
            ...mitigationCandidate.metadata || [],
            { key: METADATA_KEY_SOURCE, value: METADATA_KEY_SOURCE_THREAT_PACK },
            { key: METADATA_KEY_SOURCE_THREAT_PACK, value: threatPackId },
            { key: METADATA_KEY_SOURCE_THREAT_PACK_MITIGATION_CANDIDATE, value: mitigationCandidate.id },
          ],
        };
        const newMitigation = saveMitigation(data);
        setLinkedMitigationIds(prev => [...prev, newMitigation.id]);
      }
    });
  }, [setLinkedMitigationIds, mitigationList, saveMitigation]);

  const handleEditMetadata = useEditMetadata(setEditingStatement);

  const [threatPackId, threatPackThreatId] = useMemo(() => {
    if (props.threatPackId && props.threatPackThreatId) {
      return [props.threatPackId, props.threatPackThreatId];
    }

    const metadata = getMetadata(editingStatement.metadata);

    const tpId = metadata[METADATA_KEY_SOURCE_THREAT_PACK] as string;
    const tptId = metadata[METADATA_KEY_SOURCE_THREAT_PACK_THREAT] as string;

    return [tpId, tptId];
  }, [editingStatement, props]);

  const isExampleVisible = useMemo(() => {
    return editingStatement?.numericId === -1 && !threatPackId;
  }, [editingStatement.numericId, threatPackId]);

  if (!editingStatement) {
    return <TextContent>Not threat statement editing in place</TextContent>;
  }

  return (
    <ContentLayout
      composerMode={composerMode}
      saveButtonText={saveButtonText}
      editingStatement={editingStatement}
      onCancel={handleCancel}
      onStartOver={isExampleVisible ? handleStartOver : undefined}
      onComplete={handleComplete}
    >
      <SpaceBetween direction='vertical' size='l'>
        {composerMode === 'ThreatsOnly' && <Header
          composerMode={composerMode}
          statement={editingStatement}
          saveButtonText={saveButtonText}
          onCancel={handleCancel}
          onStartOver={handleStartOver}
          onComplete={handleComplete} />}
        <FinalStatement statement={editingStatement} displayStatement={displayStatement} />
        <FieldSelector
          composerMode={composerMode}
          onStartOver={handleStartOver}
          setEditor={setEditor}
          statement={editingStatement}
          currentEditor={editor}
          suggestions={suggestions}
          onGiveExampleClick={isExampleVisible ? handleGiveExampleClicked : undefined}
          setCustomTemplateEditorVisible={setCustomTemplateEditorVisible}
        />
        {Component && editor &&
          <Grid
            gridDefinition={[{ colspan: { default: 12, xs: 9 } }, { colspan: { default: 12, xs: 3 } }]}
          >
            <div>
              <Component
                ref={inputRef}
                statement={editingStatement}
                setStatement={setEditingStatement}
                fieldData={threatFieldData[editor]}
              />
            </div>
            <Metrics statement={editingStatement} onClick={(token) => setEditor(token as ThreatFieldTypes)} />
          </Grid>}
        {composerMode === 'Full' && <div css={styles.metadataContainer}>
          <MitigationLinkComponent
            variant='container'
            linkedMitigationIds={linkedMitigationIds}
            mitigationList={mitigationList}
            onAddMitigationLink={handleAddMitigationLink}
            onRemoveMitigationLink={(id) => setLinkedMitigationIds(prev => prev.filter(p => p !== id))}
          >
            <MitigationCandidates
              threatPackId={threatPackId}
              threatPackThreatId={threatPackThreatId}
              linkedMitigationIds={linkedMitigationIds}
              mitigationList={mitigationList}
              onAddMitigationsFromMitigationCandidates={handleAddMitigationsFromMitigationCandidates}
            />
          </MitigationLinkComponent>
        </div>}
        {composerMode === 'Full' && <div css={styles.metadataContainer}>
          <AssumptionLinkComponent
            variant='container'
            linkedAssumptionIds={linkedAssumptionIds}
            assumptionList={assumptionList}
            onAddAssumptionLink={handleAddAssumptionLink}
            onRemoveAssumptionLink={(id) => setLinkedAssumptionIds(prev => prev.filter(p => p !== id))}
          />
        </div>}
        {composerMode === 'Full' && <div css={styles.metadataContainer}>
          <MetadataEditor
            variant='container'
            editingStatement={editingStatement}
            onEditStatementStatus={(_statement, status) => setEditingStatement((prev => ({
              ...prev,
              status,
            } as TemplateThreatStatement)))}
            onEditMetadata={handleEditMetadata}
          />
        </div>}
        {isExampleVisible && <FullExamples ref={fullExamplesRef} onClick={handleExampleClicked} />}
      </SpaceBetween>
      {customTemplateEditorVisible && <CustomTemplate
        statement={editingStatement}
        visible={customTemplateEditorVisible}
        setVisible={setCustomTemplateEditorVisible}
        onConfirm={handleCustomTemplateConfirm}
        defaultTemplate={defaultThreatStatementFormat.template}
      />}
    </ContentLayout>);
};

const ThreatStatementEditor: FC<ThreatStatementEditorProps> = (props) => {
  const { editingStatement } = useThreatsContext();

  return editingStatement ? <ThreatStatementEditorInner editingStatement={editingStatement} {...props} /> : null;
};

export default ThreatStatementEditor;