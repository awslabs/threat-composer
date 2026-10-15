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
import Badge from '@cloudscape-design/components/badge';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import ButtonDropdown from '@cloudscape-design/components/button-dropdown';
import Container from '@cloudscape-design/components/container';
import ExpandableSection from '@cloudscape-design/components/expandable-section';
import FormField from '@cloudscape-design/components/form-field';
import Grid from '@cloudscape-design/components/grid';
import Input from '@cloudscape-design/components/input';
import Link from '@cloudscape-design/components/link';
import Multiselect, { MultiselectProps } from '@cloudscape-design/components/multiselect';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import TextFilter from '@cloudscape-design/components/text-filter';
import Toggle from '@cloudscape-design/components/toggle';
import { FC, useCallback, useMemo, useState } from 'react';
import {
  useAssumptionLinksContext,
  useAssumptionsContext,
  useMitigationLinksContext,
  useMitigationsContext,
  useThreatsContext,
  useWorkspacesContext,
} from '../../../contexts';
import { AttackTreeNode, AttackTreeRiskLevel, AttackTreeRootDimension } from '../../../customTypes';
import { attackTreesToMermaidMarkdown } from '../../../utils/attackTreeToMermaid';
import buildAttackTrees, {
  DEFAULT_ATTACK_TREE_ROOT_DIMENSION,
  getAttackTreeTagRootOptions,
  TAG_PATH_SEPARATOR,
} from '../../../utils/buildAttackTrees';
import { downloadContentAsMarkdown } from '../../../utils/downloadContent';
import { MITRE_ATTACK_ENTERPRISE_MATRIX_URL } from '../../../utils/getMitreAttackTechniques';
import parseNumericIdFilter from '../../../utils/parseNumericIdFilter';
import ContentLayout from '../../generic/ContentLayout';
import TagSelector from '../../generic/TagSelector';
import AttackTreeDiagram from '../AttackTreeDiagram';

const RISK_LEVEL_BADGE_COLOR: { [key in AttackTreeRiskLevel]: 'red' | 'blue' | 'green' | 'grey' } = {
  'High': 'red',
  'Medium': 'blue',
  'Low': 'green',
  'Not set': 'grey',
};

const EXPORT_ALL_ITEM_ID = 'export-all';
const EXPORT_TREE_ITEM_ID_PREFIX = 'export-tree-';

interface RootDimensionOption {
  label: string;
  value: AttackTreeRootDimension;
  description: string;
}

const ROOT_DIMENSION_OPTIONS: RootDimensionOption[] = [
  {
    label: 'Impacted asset',
    value: 'impactedAsset',
    description: 'One tree per asset an attacker seeks to compromise',
  },
  {
    label: 'Impacted security objective',
    value: 'impactedGoal',
    description: 'One tree per security objective an attacker seeks to reduce',
  },
  {
    label: 'Threat source',
    value: 'threatSource',
    description: 'One tree per actor taking the action',
  },
  {
    label: 'STRIDE category',
    value: 'stride',
    description: 'One tree per STRIDE category',
  },
  {
    label: 'Tag',
    value: 'tag',
    description: 'One tree per tag you choose, across threats, mitigations and assumptions',
  },
];

/**
 * Indents a nested tag option so a tag reads beneath its parent in the picker.
 * Non-breaking spaces survive the option label rendering.
 */
const toTagOptionLabel = (value: string, depth: number) => {
  if (depth <= 1) {
    return value;
  }
  const lastSegment = value.split(TAG_PATH_SEPARATOR).pop() || value;
  return `${'\u00a0\u00a0\u00a0'.repeat(depth - 1)}↳ ${lastSegment}`;
};

/**
 * Turns a tree label into a file name fragment, so that "Compromise: customer
 * database" downloads as compromise-customer-database.
 */
const toFileName = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'attack-tree';

export interface AttackTreesProps {
  /**
   * Invoked when a node backed by a threat or mitigation is clicked, allowing the
   * host application to navigate to the underlying entity.
   */
  onNodeSelect?: (node: AttackTreeNode) => void;
  /**
   * Controls the tree root dimension. When omitted the component keeps it in local
   * state. Pass it with onRootDimensionChange to keep it in, for example, the URL.
   */
  rootDimension?: AttackTreeRootDimension;
  onRootDimensionChange?: (rootDimension: AttackTreeRootDimension) => void;
  /**
   * Controls the tags trees are rooted at when the root dimension is tag.
   */
  rootTags?: string[];
  onRootTagsChange?: (rootTags: string[]) => void;
  /**
   * Controls whether the Untagged tree is shown when the root dimension is tag.
   */
  includeUntagged?: boolean;
  onIncludeUntaggedChange?: (includeUntagged: boolean) => void;
}

/**
 * Keeps a value in local state unless the host passes it in, in which case the
 * host owns it and is told about changes.
 */
function useControllableState<T>(value: T | undefined, onChange: ((value: T) => void) | undefined, initial: T) {
  const [localValue, setLocalValue] = useState<T>(initial);
  const isControlled = value !== undefined;

  const setValue = useCallback(
    (next: T) => {
      if (!isControlled) {
        setLocalValue(next);
      }
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  return [isControlled ? value : localValue, setValue] as const;
}

/**
 * Renders filterable attack trees derived from the threats and mitigations of
 * the current workspace. The trees are recomputed from the threat grammar on
 * every render, so nothing here is persisted.
 */
const AttackTrees: FC<AttackTreesProps> = ({
  onNodeSelect,
  rootDimension: rootDimensionProp,
  onRootDimensionChange,
  rootTags: rootTagsProp,
  onRootTagsChange,
  includeUntagged: includeUntaggedProp,
  onIncludeUntaggedChange,
}) => {
  const { statementList } = useThreatsContext();
  const { mitigationList } = useMitigationsContext();
  const { mitigationLinkList } = useMitigationLinksContext();
  const { assumptionList } = useAssumptionsContext();
  const { assumptionLinkList } = useAssumptionLinksContext();
  const { currentWorkspace } = useWorkspacesContext();

  const [filteringText, setFilteringText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [threatNumbersText, setThreatNumbersText] = useState('');
  const [mitigationNumbersText, setMitigationNumbersText] = useState('');
  const [includeMitigations, setIncludeMitigations] = useState(true);
  const [includeAssumptions, setIncludeAssumptions] = useState(true);
  const [rootDimension, setRootDimension] = useControllableState<AttackTreeRootDimension>(
    rootDimensionProp,
    onRootDimensionChange,
    DEFAULT_ATTACK_TREE_ROOT_DIMENSION,
  );
  const [rootTags, setRootTags] = useControllableState<string[]>(rootTagsProp, onRootTagsChange, []);
  const [includeUntagged, setIncludeUntagged] = useControllableState<boolean>(
    includeUntaggedProp,
    onIncludeUntaggedChange,
    false,
  );
  const isTagDimension = rootDimension === 'tag';

  const threatNumbers = useMemo(() => parseNumericIdFilter(threatNumbersText), [threatNumbersText]);
  const mitigationNumbers = useMemo(() => parseNumericIdFilter(mitigationNumbersText), [mitigationNumbersText]);

  const allTags = useMemo(() => {
    const tags = [
      ...statementList.flatMap((t) => t.tags || []),
      ...mitigationList.flatMap((m) => m.tags || []),
      ...assumptionList.flatMap((a) => a.tags || []),
    ];

    return Array.from(new Set(tags));
  }, [statementList, mitigationList, assumptionList]);

  const tagRootOptions = useMemo(
    () =>
      getAttackTreeTagRootOptions({
        threats: statementList,
        mitigations: mitigationList,
        assumptions: assumptionList,
      }),
    [statementList, mitigationList, assumptionList],
  );

  const tagRootSelectOptions: MultiselectProps.Option[] = useMemo(
    () =>
      tagRootOptions.map((option) => ({
        label: toTagOptionLabel(option.value, option.depth),
        value: option.value,
        labelTag: String(option.entityCount),
        // Matched by the filter, so typing a parent finds its nested tags too.
        filteringTags: [option.value],
      })),
    [tagRootOptions],
  );

  const selectedTagRootOptions: MultiselectProps.Option[] = useMemo(
    () => rootTags.map((tag) => ({ label: tag, value: tag })),
    [rootTags],
  );

  const trees = useMemo(
    () =>
      buildAttackTrees({
        threats: statementList,
        mitigations: mitigationList,
        mitigationLinks: mitigationLinkList,
        assumptions: assumptionList,
        assumptionLinks: assumptionLinkList,
        filter: {
          searchText: filteringText,
          tags: selectedTags,
          threatNumbers,
          mitigationNumbers,
          includeMitigations,
          includeAssumptions,
          rootDimension,
          rootTags,
          includeUntagged,
        },
      }),
    [
      statementList,
      mitigationList,
      mitigationLinkList,
      assumptionList,
      assumptionLinkList,
      filteringText,
      selectedTags,
      threatNumbers,
      mitigationNumbers,
      includeMitigations,
      includeAssumptions,
      rootDimension,
      rootTags,
      includeUntagged,
    ],
  );

  const hasNoFilter = useMemo(
    () =>
      filteringText === '' &&
      selectedTags.length === 0 &&
      threatNumbersText === '' &&
      mitigationNumbersText === '' &&
      includeMitigations &&
      includeAssumptions &&
      rootDimension === DEFAULT_ATTACK_TREE_ROOT_DIMENSION &&
      rootTags.length === 0 &&
      !includeUntagged,
    [
      filteringText,
      selectedTags,
      threatNumbersText,
      mitigationNumbersText,
      includeMitigations,
      includeAssumptions,
      rootDimension,
      rootTags,
      includeUntagged,
    ],
  );

  const handleClearFilter = useCallback(() => {
    setFilteringText('');
    setSelectedTags([]);
    setThreatNumbersText('');
    setMitigationNumbersText('');
    setIncludeMitigations(true);
    setIncludeAssumptions(true);
    setRootDimension(DEFAULT_ATTACK_TREE_ROOT_DIMENSION);
    setRootTags([]);
    setIncludeUntagged(false);
  }, [setRootDimension, setRootTags, setIncludeUntagged]);

  const selectedRootDimensionOption = useMemo(
    () => ROOT_DIMENSION_OPTIONS.find((o) => o.value === rootDimension) || ROOT_DIMENSION_OPTIONS[0],
    [rootDimension],
  );

  const exportBaseName = useMemo(
    () => `${toFileName(currentWorkspace?.name || 'threat-composer')}-attack-trees`,
    [currentWorkspace],
  );

  const allTreesMermaid = useMemo(
    () => attackTreesToMermaidMarkdown(trees, `Attack trees by ${selectedRootDimensionOption.label.toLowerCase()}`),
    [trees, selectedRootDimensionOption],
  );

  const exportItems = useMemo(
    () => [
      {
        id: EXPORT_ALL_ITEM_ID,
        text: `Download all ${trees.length} trees (.md)`,
        iconName: 'download' as const,
      },
      {
        id: 'individual-trees',
        text: 'Download a single tree',
        items: trees.map((tree, index) => ({
          id: `${EXPORT_TREE_ITEM_ID_PREFIX}${index}`,
          text: tree.label,
        })),
        disabled: trees.length === 0,
      },
    ],
    [trees],
  );

  const handleExportTree = useCallback(
    (index: number) => {
      const tree = trees[index];

      if (!tree) {
        return;
      }

      downloadContentAsMarkdown(
        attackTreesToMermaidMarkdown([tree], tree.label),
        `${exportBaseName}-${toFileName(tree.label)}`,
      );
    },
    [exportBaseName, trees],
  );

  const handleExportItemClick = useCallback(
    (itemId: string) => {
      if (itemId === EXPORT_ALL_ITEM_ID) {
        downloadContentAsMarkdown(allTreesMermaid, exportBaseName);
        return;
      }

      if (itemId.startsWith(EXPORT_TREE_ITEM_ID_PREFIX)) {
        handleExportTree(Number(itemId.slice(EXPORT_TREE_ITEM_ID_PREFIX.length)));
      }
    },
    [allTreesMermaid, exportBaseName, handleExportTree],
  );

  return (
    <ContentLayout
      title="Attack trees"
      counter={`(${trees.length})`}
      description="Attack trees derived from your threats and mitigations. Each tree decomposes an attacker goal into the impacts that achieve it, the threats that cause those impacts, and the prerequisites and mitigations of each threat."
    >
      <SpaceBetween direction="vertical" size="s">
        <SpaceBetween direction="horizontal" size="xs" alignItems="center">
          <ButtonDropdown
            variant="primary"
            items={exportItems}
            disabled={trees.length === 0}
            onItemClick={({ detail }) => handleExportItemClick(detail.id)}
          >
            Export to Mermaid
          </ButtonDropdown>
          <Box variant="small" color="text-body-secondary">
            Mermaid renders in wikis, pull requests and Markdown viewers. Each tree can also be exported on its own from
            its header.
          </Box>
        </SpaceBetween>
        <Container>
          <SpaceBetween direction="vertical" size="s">
            <TextFilter
              filteringText={filteringText}
              filteringPlaceholder="Find threats and mitigations"
              filteringAriaLabel="Filter attack trees"
              onChange={({ detail }) => setFilteringText(detail.filteringText)}
            />
            <Grid
              gridDefinition={[
                { colspan: { default: 12, xs: 6, m: 3 } },
                { colspan: { default: 12, xs: 6, m: 3 } },
                { colspan: { default: 12, xs: 6, m: 3 } },
                { colspan: { default: 12, xs: 6, m: 3 } },
              ]}
            >
              {/*
                The four fields carry their hints as constraintText rather than
                description, which renders the hint below the control instead of
                between the label and the control, so all four controls line up.
              */}
              <FormField label="Tree root">
                <Select
                  selectedOption={{
                    label: selectedRootDimensionOption.label,
                    value: selectedRootDimensionOption.value,
                    description: selectedRootDimensionOption.description,
                  }}
                  options={ROOT_DIMENSION_OPTIONS.map((o) => ({
                    label: o.label,
                    value: o.value,
                    description: o.description,
                  }))}
                  onChange={({ detail }) =>
                    setRootDimension(
                      (detail.selectedOption.value as AttackTreeRootDimension) || DEFAULT_ATTACK_TREE_ROOT_DIMENSION,
                    )
                  }
                />
              </FormField>
              <FormField label="Tags">
                <TagSelector allTags={allTags} selectedTags={selectedTags} setSelectedTags={setSelectedTags} />
              </FormField>
              <FormField label="Threat numbers" constraintText="For example T-0001, 4, 7..9">
                <Input
                  value={threatNumbersText}
                  placeholder="All threats"
                  onChange={({ detail }) => setThreatNumbersText(detail.value)}
                />
              </FormField>
              <FormField label="Mitigation numbers" constraintText="For example M-0002, 5-8">
                <Input
                  value={mitigationNumbersText}
                  placeholder="All mitigations"
                  onChange={({ detail }) => setMitigationNumbersText(detail.value)}
                />
              </FormField>
            </Grid>
            {isTagDimension && (
              <FormField
                label="Root tags"
                description="One tree per tag. Type to search. Nest a tag with a slash, such as exfiltrate-pii/via-api, to add a sub-goal beneath its parent. The number is how many threats, mitigations and assumptions carry the tag or a tag nested beneath it."
                stretch
              >
                <Multiselect
                  selectedOptions={selectedTagRootOptions}
                  options={tagRootSelectOptions}
                  onChange={({ detail }) =>
                    setRootTags(detail.selectedOptions.map((o) => o.value || '').filter((v) => v.length > 0))
                  }
                  filteringType="auto"
                  filteringPlaceholder="Search tags"
                  virtualScroll
                  tokenLimit={5}
                  keepOpen
                  placeholder={
                    tagRootOptions.length === 0
                      ? 'No tags in this workspace'
                      : `Choose from ${tagRootOptions.length} tags`
                  }
                  disabled={tagRootOptions.length === 0}
                  empty="No tags in this workspace"
                  noMatch="No tags match"
                  deselectAriaLabel={(option) => `Remove ${option.label}`}
                  i18nStrings={{ tokenLimitShowMore: 'Show more', tokenLimitShowFewer: 'Show fewer' }}
                />
              </FormField>
            )}
            <SpaceBetween direction="horizontal" size="l" alignItems="center">
              {isTagDimension && (
                <Toggle checked={includeUntagged} onChange={({ detail }) => setIncludeUntagged(detail.checked)}>
                  Show untagged threats
                </Toggle>
              )}
              <Toggle checked={includeMitigations} onChange={({ detail }) => setIncludeMitigations(detail.checked)}>
                Show mitigations
              </Toggle>
              <Toggle checked={includeAssumptions} onChange={({ detail }) => setIncludeAssumptions(detail.checked)}>
                Show assumptions
              </Toggle>
              <Button onClick={handleClearFilter} disabled={hasNoFilter}>
                Clear filters
              </Button>
            </SpaceBetween>
            <Box variant="small" color="text-body-secondary">
              A threat box shows its STRIDE categories as lettered badges in the bottom right, in canonical STRIDE
              order, its MITRE ATT&amp;CK technique ids in the bottom left, and a coloured bar down the left edge for
              its risk level. Click a T- or M- identifier to open that threat or mitigation. Technique ids in italics
              are suggested from keywords and need confirming; record them on a threat as a tag such as T1078 or in
              metadata to make them authoritative. Browse the{' '}
              <Link external href={MITRE_ATTACK_ENTERPRISE_MATRIX_URL} variant="primary">
                ATT&amp;CK enterprise matrix
              </Link>
              .
            </Box>
          </SpaceBetween>
        </Container>
        {trees.length === 0 ? (
          <Container>
            <Box textAlign="center" padding="l" color="text-body-secondary">
              {statementList.length === 0
                ? 'Add threats to your workspace to generate attack trees.'
                : isTagDimension && rootTags.length === 0 && !includeUntagged
                  ? 'Choose one or more root tags to build trees.'
                  : 'No threats match the current filters.'}
            </Box>
          </Container>
        ) : (
          trees.map((tree, index) => (
            <ExpandableSection
              key={tree.id}
              variant="container"
              defaultExpanded={index === 0}
              headerText={tree.label}
              headerCounter={`(${tree.metrics?.threats ?? 0} threats, ${tree.metrics?.mitigations ?? 0} mitigations)`}
              headerActions={
                <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                  <Button
                    iconName="download"
                    ariaLabel={`Export ${tree.label} to Mermaid`}
                    onClick={() => handleExportTree(index)}
                  >
                    Export to Mermaid
                  </Button>
                  <Badge color={RISK_LEVEL_BADGE_COLOR[tree.riskLevel || 'Not set']}>
                    {`Risk: ${tree.riskLevel || 'Not set'}`}
                  </Badge>
                </SpaceBetween>
              }
            >
              <AttackTreeDiagram tree={tree} onNodeSelect={onNodeSelect} />
            </ExpandableSection>
          ))
        )}
      </SpaceBetween>
    </ContentLayout>
  );
};

export default AttackTrees;
