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
export const THREAT_STATUS_IDENTIFIED = 'threatIdentified';
export const THREAT_STATUS_RESOLVED = 'threatResolved';
export const THREAT_STATUS_NOT_USEFUL = 'threatResolvedNotUseful';
export const DEFAULT_THREAT_STATUS = THREAT_STATUS_IDENTIFIED;

export const MITIGATION_STATUS_IDENTIFIED = 'mitigationIdentified';
export const MITIGATION_STATUS_IN_PROGRESS = 'mitigationInProgress';
export const MITIGATION_STATUS_RESOLVED = 'mitigationResolved';
export const MITIGATION_STATUS_RESOLVED_ABANDONED = 'mitigationResolvedAbandoned';
export const DEFAULT_MITIGATION_STATUS = MITIGATION_STATUS_IDENTIFIED;

export const STATUS_NOT_SET = 'NoSet';

export const MITIGATION_STATUS_COLOR_MAPPING: any = {
  mitigationIdentified: 'grey',
  mitigationInProgress: 'blue',
  mitigationResolved: 'green',
  mitigationResolvedAbandoned: 'red',
  NotSet: 'grey',
};

export const THREAT_STATUS_COLOR_MAPPING: any = {
  threatIdentified: 'grey',
  threatResolvedNotUseful: 'blue',
  threatResolved: 'green',
  NotSet: 'grey',
};

