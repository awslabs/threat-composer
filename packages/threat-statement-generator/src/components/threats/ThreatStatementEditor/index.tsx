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
import Grid from '@cloudscape-design/components/grid';
import SpaceBetween from '@cloudscape-design/components/space-between';
import TextContent from '@cloudscape-design/components/text-content';
import React, { FC, useCallback, useMemo, useState, useRef, useEffect, ReactNode } from 'react';
import { v4 as uuidV4 } from 'uuid';
import { EditorProps } from './types';
import { useThreatsContext } from '../../../contexts/ThreatsContext/context';
import { useWorkspacesContext } from '../../../contexts/WorkspacesContext/context';
import { TemplateThreatStatement } from '../../../customTypes';
import { ThreatFieldTypes } from '../../../customTypes/threatFieldTypes';
import threatFieldData from '../../../data/threatFieldData';
import threatStatementExamples from '../../../data/threatStatementExamples.json';
import threatStatementFormat from '../../../data/threatStatementFormat';
import getRecommendedEditor from '../../../utils/getRecommandedEditor';
import renderThreatStatement from '../../../utils/renderThreatStatement';
import scrollToTop from '../../../utils/scrollToTop';
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
import Metrics from '../Metrics';

const defaultThreatStatementFormat = threatStatementFormat[63];

const editorMapping: { [key in ThreatFieldTypes]: React.ComponentType<EditorProps & { ref?: React.ForwardedRef<any> }> } = {
  threat_source: EditorThreatSource,
  prerequisites: EditorPrerequisites,
  threat_action: EditorThreatAction,
  threat_impact: EditorThreatImpact,
  impacted_goal: EditorImpactedGoal,
  impacted_assets: EditorImpactedAssets,
};

const ThreatStatementEditor: FC = () => {
  const inputRef = useRef<{ focus(): void }>();
  const fullExamplesRef = useRef<{ collapse(): void }>();
  const { editingStatement, setEditingStatement, saveStatement, addStatement } = useThreatsContext();
  const { currentWorkspace, workspaceList } = useWorkspacesContext();
  const [editor, setEditor] = useState<ThreatFieldTypes | undefined>(getRecommendedEditor(editingStatement));
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [displayStatement, setDisplayStatement] = useState<ReactNode[] | undefined>([]);
  const [customTemplateEditorVisible, setCustomTemplateEditorVisible] = useState(false);

  const Component = useMemo(() => {
    return editor && editorMapping[editor];
  }, [editor]);

  const handleCancel = useCallback(() => {
    setEditingStatement(null);
  }, [setEditingStatement]);

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
        }));
      }
      const displayedHtml = displayedStatement?.map(s => typeof s === 'string' ? s : s.type === 'b' ? <b>{s.content}</b> : s.content);

      setDisplayStatement(displayedHtml);
      setSuggestions(currentSuggestions);
    } else {
      setSuggestions([]);
      setDisplayStatement([]);
    }
  }, [editingStatement]);

  const handleStartOver = useCallback(() => {
    addStatement();
    setEditor(undefined);
    fullExamplesRef.current?.collapse();
  }, [addStatement]);

  const handleComplete = useCallback(() => {
    editingStatement && saveStatement(editingStatement);
    setEditingStatement(null);
  }, [saveStatement, editingStatement]);

  const handleExampleClicked = useCallback((statement: TemplateThreatStatement) => {
    setEditingStatement({
      ...statement,
      numericId: -1,
      id: uuidV4(),
    });
    const recommendedEditor = getRecommendedEditor(statement);
    recommendedEditor && setEditor(recommendedEditor);
    fullExamplesRef.current?.collapse();
  }, []);

  const handleGiveExampleClicked = useCallback(() => {
    const len = threatStatementExamples.length;
    const randomNumber = Math.floor(Math.random() * len);
    const statement = threatStatementExamples[randomNumber] as TemplateThreatStatement;
    setEditingStatement({
      ...statement,
      numericId: -1,
      id: uuidV4(),
    });
    const recommendedEditor = getRecommendedEditor(statement);
    recommendedEditor && setEditor(recommendedEditor);
    scrollToTop();
  }, []);

  const saveButtonText = useMemo(() => {
    if (!currentWorkspace && workspaceList.length === 0) {
      // For most of use cases, if there is only the default workspace, use list to reduce cognitive load.
      return editingStatement?.numericId === -1 ? 'Add to list' : 'Save';
    }

    const workspace = currentWorkspace?.name || 'default';
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

  if (!editingStatement) {
    return <TextContent>Not threat statement editing in place</TextContent>;
  }

  return (
    <>
      <SpaceBetween direction='vertical' size='l'>
        <Header statement={editingStatement}
          saveButtonText={saveButtonText}
          onCancel={handleCancel}
          onStartOver={handleStartOver}
          onComplete={handleComplete} />
        <FinalStatement statement={editingStatement} displayStatement={displayStatement} />
        <FieldSelector setEditor={setEditor}
          statement={editingStatement}
          currentEditor={editor}
          suggestions={suggestions}
          onGiveExampleClick={handleGiveExampleClicked}
          setCustomTemplateEditorVisible={setCustomTemplateEditorVisible}
        />
        {Component && editor && <Grid
          gridDefinition={[{ colspan: { default: 12, xs: 9 } }, { colspan: { default: 12, xs: 3 } }]}
        >
          <div className='threat-statement-editor-editor-container'>
            <Component
              ref={inputRef}
              statement={editingStatement}
              setStatement={setEditingStatement}
              fieldData={threatFieldData[editor]}
            />
          </div>
          <Metrics statement={editingStatement} onClick={(token) => setEditor(token as ThreatFieldTypes)} />
        </Grid>}
        <FullExamples ref={fullExamplesRef} onClick={handleExampleClicked} />
      </SpaceBetween>
      {customTemplateEditorVisible && <CustomTemplate
        statement={editingStatement}
        visible={customTemplateEditorVisible}
        setVisible={setCustomTemplateEditorVisible}
        onConfirm={handleCustomTemplateConfirm}
        defaultTemplate={defaultThreatStatementFormat.template}
      />}
    </>
  );
};

export default ThreatStatementEditor;