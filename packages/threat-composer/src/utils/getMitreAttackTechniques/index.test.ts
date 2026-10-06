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
import getMitreAttackTechniques, { getMitreAttackTechniqueUrl } from '.';
import { TemplateThreatStatement } from '../../customTypes';

const threat = (overrides: Partial<TemplateThreatStatement> = {}): TemplateThreatStatement => ({
  id: 'threat-1',
  numericId: 1,
  ...overrides,
});

describe('getMitreAttackTechniqueUrl', () => {
  test('builds a technique url', () => {
    expect(getMitreAttackTechniqueUrl('T1078')).toBe('https://attack.mitre.org/techniques/T1078/');
  });

  test('nests sub-technique ids', () => {
    expect(getMitreAttackTechniqueUrl('T1110.003')).toBe('https://attack.mitre.org/techniques/T1110/003/');
  });

  test('upper cases the id', () => {
    expect(getMitreAttackTechniqueUrl('t1078')).toBe('https://attack.mitre.org/techniques/T1078/');
  });
});

describe('getMitreAttackTechniques', () => {
  test('reads technique ids from tags', () => {
    const result = getMitreAttackTechniques(threat({ tags: ['insider', 'T1078'] }));

    expect(result).toEqual([
      {
        id: 'T1078',
        name: 'Valid Accounts',
        url: 'https://attack.mitre.org/techniques/T1078/',
        source: 'explicit',
      },
    ]);
  });

  test('reads technique ids from metadata keys mentioning mitre, ttp or technique', () => {
    const result = getMitreAttackTechniques(
      threat({
        metadata: [
          { key: 'custom:mitreAttack', value: 'T1110.004' },
          { key: 'custom:ttp', value: ['T1190', 'T1557'] },
          { key: 'custom:unrelated', value: 'T1486' },
        ],
      }),
    );

    expect(result.map((t) => t.id)).toEqual(['T1110.004', 'T1190', 'T1557']);
    expect(result.every((t) => t.source === 'explicit')).toBe(true);
  });

  test('extracts ids embedded in free text metadata', () => {
    const result = getMitreAttackTechniques(
      threat({ metadata: [{ key: 'custom:attack', value: 'Maps to T1566 and T1078 per review' }] }),
    );

    expect(result.map((t) => t.id)).toEqual(['T1078', 'T1566']);
  });

  test('de-duplicates ids recorded more than once', () => {
    const result = getMitreAttackTechniques(
      threat({ tags: ['T1078'], metadata: [{ key: 'custom:mitre', value: 't1078' }] }),
    );

    expect(result.map((t) => t.id)).toEqual(['T1078']);
  });

  test('leaves the name undefined for ids it does not know', () => {
    const [technique] = getMitreAttackTechniques(threat({ tags: ['T9999'] }));

    expect(technique.id).toBe('T9999');
    expect(technique.name).toBeUndefined();
    expect(technique.url).toBe('https://attack.mitre.org/techniques/T9999/');
  });

  test('ignores tags that only look like technique ids', () => {
    expect(getMitreAttackTechniques(threat({ tags: ['T12', 'TA0001', 'threat'] }))).toEqual([]);
  });

  test('suggests techniques from statement keywords when none are recorded', () => {
    const result = getMitreAttackTechniques(
      threat({
        statement: 'An internet based actor can brute force the login endpoint',
        threatAction: 'brute force the login endpoint',
      }),
    );

    expect(result.map((t) => t.id)).toEqual(['T1110']);
    expect(result[0].source).toBe('suggested');
  });

  test('prefers recorded ids over keyword suggestions', () => {
    const result = getMitreAttackTechniques(
      threat({
        tags: ['T1190'],
        threatAction: 'brute force the login endpoint',
      }),
    );

    expect(result.map((t) => t.id)).toEqual(['T1190']);
    expect(result[0].source).toBe('explicit');
  });

  test('returns nothing for a threat with no ids and no matching keywords', () => {
    expect(getMitreAttackTechniques(threat({ threatAction: 'do something unremarkable' }))).toEqual([]);
  });

  test('returns nothing for an empty threat', () => {
    expect(getMitreAttackTechniques(threat())).toEqual([]);
  });
});
