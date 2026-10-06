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
import { MitreAttackTechnique, TemplateThreatStatement } from '../../customTypes';

export const MITRE_ATTACK_ENTERPRISE_MATRIX_URL = 'https://attack.mitre.org/matrices/enterprise/';

const TECHNIQUE_ID_PATTERN = /T\d{4}(?:\.\d{3})?/gi;
const TECHNIQUE_ID_EXACT_PATTERN = /^T\d{4}(?:\.\d{3})?$/i;

/**
 * Metadata keys that are read for explicitly recorded technique ids. Matched
 * case insensitively against the part of the key after the `custom:` prefix.
 */
const METADATA_KEY_HINTS = ['mitre', 'attack', 'att&ck', 'ttp', 'technique'];

/**
 * Names of the techniques this tool can label. Ids outside this table are still
 * linked, just without a name.
 */
const TECHNIQUE_NAMES: { [id: string]: string } = {
  'T1040': 'Network Sniffing',
  'T1068': 'Exploitation for Privilege Escalation',
  'T1078': 'Valid Accounts',
  'T1098': 'Account Manipulation',
  'T1110': 'Brute Force',
  'T1110.003': 'Password Spraying',
  'T1110.004': 'Credential Stuffing',
  'T1190': 'Exploit Public-Facing Application',
  'T1195': 'Supply Chain Compromise',
  'T1486': 'Data Encrypted for Impact',
  'T1498': 'Network Denial of Service',
  'T1499': 'Endpoint Denial of Service',
  'T1530': 'Data from Cloud Storage',
  'T1552': 'Unsecured Credentials',
  'T1552.001': 'Credentials In Files',
  'T1557': 'Adversary-in-the-Middle',
  'T1562.008': 'Disable or Modify Cloud Logs',
  'T1566': 'Phishing',
  'T1580': 'Cloud Infrastructure Discovery',
  'T1621': 'Multi-Factor Authentication Request Generation',
};

/**
 * Keyword to technique hints used only when a threat records no technique id of
 * its own. These are deliberately conservative and are always reported with
 * source 'suggested' so that a human confirms them before they are relied on.
 */
const KEYWORD_HINTS: { keywords: string[]; id: string }[] = [
  { keywords: ['phishing', 'phish'], id: 'T1566' },
  { keywords: ['password spray'], id: 'T1110.003' },
  { keywords: ['credential stuffing'], id: 'T1110.004' },
  { keywords: ['brute force', 'brute-force'], id: 'T1110' },
  { keywords: ['mfa fatigue', 'mfa bombing', 'push notification spam'], id: 'T1621' },
  {
    keywords: ["another user's token", 'stolen credential', 'stolen token', 'valid credential', 'compromised credential'],
    id: 'T1078',
  },
  { keywords: ['hardcoded credential', 'unsecured credential', 'credential in a file', 'plaintext credential'], id: 'T1552' },
  { keywords: ['sql injection', 'command injection', 'remote code execution', 'exploit the public api'], id: 'T1190' },
  { keywords: ['man-in-the-middle', 'man in the middle', 'mitm', 'adversary-in-the-middle', 'intercept traffic'], id: 'T1557' },
  { keywords: ['sniff network', 'network sniffing', 'packet capture'], id: 'T1040' },
  { keywords: ['elevate privilege', 'privilege escalation', 'escalate privilege'], id: 'T1068' },
  { keywords: ['add a user to a group', 'account manipulation', 'modify iam permission'], id: 'T1098' },
  { keywords: ['network denial of service', 'volumetric', 'ddos'], id: 'T1498' },
  { keywords: ['denial of service', 'exhaust', 'resource exhaustion', 'throttl'], id: 'T1499' },
  { keywords: ['ransom', 'encrypt data for impact'], id: 'T1486' },
  { keywords: ['supply chain'], id: 'T1195' },
  { keywords: ['disable logging', 'delete the audit log', 'tamper with audit log', 'disable cloudtrail'], id: 'T1562.008' },
  { keywords: ['read from the s3 bucket', 'data from cloud storage', 'access the bucket'], id: 'T1530' },
  { keywords: ['enumerate cloud', 'cloud infrastructure discovery'], id: 'T1580' },
];

/**
 * Builds the attack.mitre.org deep link for a technique id. Sub-technique ids are
 * expressed as a nested path, for example T1078.003 becomes /techniques/T1078/003/.
 */
export const getMitreAttackTechniqueUrl = (id: string) => {
  const [technique, subTechnique] = id.toUpperCase().split('.');

  return subTechnique
    ? `https://attack.mitre.org/techniques/${technique}/${subTechnique}/`
    : `https://attack.mitre.org/techniques/${technique}/`;
};

const normalizeId = (id: string) => {
  const [technique, subTechnique] = id.toUpperCase().split('.');
  return subTechnique ? `${technique}.${subTechnique}` : technique;
};

const toTechnique = (id: string, source: MitreAttackTechnique['source']): MitreAttackTechnique => {
  const normalized = normalizeId(id);

  return {
    id: normalized,
    name: TECHNIQUE_NAMES[normalized],
    url: getMitreAttackTechniqueUrl(normalized),
    source,
  };
};

const getExplicitIds = (threat: TemplateThreatStatement): string[] => {
  const ids: string[] = [];

  threat.tags?.forEach((tag) => {
    const trimmed = tag.trim();
    if (TECHNIQUE_ID_EXACT_PATTERN.test(trimmed)) {
      ids.push(trimmed);
    }
  });

  threat.metadata?.forEach((entry) => {
    const key = entry.key.toLowerCase();
    if (!METADATA_KEY_HINTS.some((hint) => key.includes(hint))) {
      return;
    }

    const values = Array.isArray(entry.value) ? entry.value : [entry.value];
    values.forEach((value) => {
      if (typeof value !== 'string') {
        return;
      }
      ids.push(...(value.match(TECHNIQUE_ID_PATTERN) || []));
    });
  });

  return ids;
};

const getSuggestedIds = (threat: TemplateThreatStatement): string[] => {
  const haystack = [
    threat.statement,
    threat.threatSource,
    threat.prerequisites,
    threat.threatAction,
    threat.threatImpact,
  ]
    .filter((v): v is string => !!v)
    .join('\n')
    .toLowerCase();

  if (!haystack) {
    return [];
  }

  return KEYWORD_HINTS.filter((hint) => hint.keywords.some((keyword) => haystack.includes(keyword))).map(
    (hint) => hint.id,
  );
};

/**
 * Resolves the MITRE ATT&CK enterprise techniques associated with a threat.
 *
 * Explicitly recorded ids are preferred: a tag such as `T1078`, or any metadata
 * key mentioning mitre, att&ck, ttp or technique whose value contains ids. When a
 * threat records none, a conservative keyword table is consulted and the results
 * are returned with source 'suggested' so callers can present them as unverified.
 *
 * Browse the full matrix at https://attack.mitre.org/matrices/enterprise/.
 */
const getMitreAttackTechniques = (threat: TemplateThreatStatement): MitreAttackTechnique[] => {
  const explicit = getExplicitIds(threat);
  const ids = explicit.length > 0 ? explicit : getSuggestedIds(threat);
  const source: MitreAttackTechnique['source'] = explicit.length > 0 ? 'explicit' : 'suggested';

  const seen = new Set<string>();

  return ids
    .map((id) => toTechnique(id, source))
    .filter((technique) => {
      if (seen.has(technique.id)) {
        return false;
      }
      seen.add(technique.id);
      return true;
    })
    .sort((a, b) => a.id.localeCompare(b.id));
};

export default getMitreAttackTechniques;
