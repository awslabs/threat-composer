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

// Field length constants
export const SINGLE_FIELD_INPUT_TAG_MAX_LENGTH = 30;
export const SINGLE_FIELD_INPUT_SMALL_MAX_LENGTH = 50;
export const SINGLE_FIELD_INPUT_MAX_LENGTH = 200;
export const FREE_TEXT_INPUT_SMALL_MAX_LENGTH = 1000;
export const FREE_TEXT_INPUT_MAX_LENGTH = 100000;
export const IMAGE_BASE64_MAX_LENGTH = 1000000;
export const IMAGE_URL_MAX_LENGTH = 2048;

// Storage constants - needed for WorkspaceSchema which is used by DataExchangeFormatSchema
export const STORAGE_LOCAL_STORAGE = 'LocalStorage';
export const STORAGE_LOCAL_STATE = 'LocalState';

// Level constants
export const ALL_LEVELS = 'All';
export const LEVEL_NOT_SET = '-';
export const LEVEL_HIGH = 'High';
export const LEVEL_MEDIUM = 'Medium';
export const LEVEL_LOW = 'Low';

// Status constants
export const STATUS_NOT_SET = 'NoSet';

// Mitigation status constants
export const MITIGATION_STATUS_IDENTIFIED = 'mitigationIdentified';
export const MITIGATION_STATUS_IN_PROGRESS = 'mitigationInProgress';
export const MITIGATION_STATUS_RESOLVED = 'mitigationResolved';
export const MITIGATION_STATUS_RESOLVED_WILLNOTACTION = 'mitigationResolvedWillNotAction';
export const DEFAULT_MITIGATION_STATUS = MITIGATION_STATUS_IDENTIFIED;

export const MITIGATION_STATUS_COLOR_MAPPING = {
  mitigationIdentified: 'grey',
  mitigationInProgress: 'blue',
  mitigationResolved: 'green',
  mitigationResolvedWillNotAction: 'red',
  NotSet: 'grey',
};

// Threat status constants
export const THREAT_STATUS_IDENTIFIED = 'threatIdentified';
export const THREAT_STATUS_RESOLVED = 'threatResolved';
export const THREAT_STATUS_NOT_USEFUL = 'threatResolvedNotUseful';
export const DEFAULT_THREAT_STATUS = THREAT_STATUS_IDENTIFIED;

export const THREAT_STATUS_COLOR_MAPPING = {
  threatIdentified: 'grey',
  threatResolvedNotUseful: 'blue',
  threatResolved: 'green',
  NotSet: 'grey',
};

// Metadata constants
export const METADATA_KEY_COMMENTS = 'Comments';
export const METADATA_KEY_STRIDE = 'STRIDE';
export const METADATA_KEY_PRIORITY = 'Priority';
export const METADATA_KEY_PREFIX_CUSTOM = 'custom:';
export const ALLOW_METADATA_TAGS = [
  METADATA_KEY_COMMENTS,
  METADATA_KEY_PRIORITY,
  METADATA_KEY_STRIDE,
];

// Regex constants
export const REGEX_CONTENT_IMAGE_URL = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)/i;
export const REGEX_CONTENT_IMAGE_BASE64 = /^(?:data:image\/[a-z+]{3,};base64,)(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/gi;
export const REGEX_WORKSPACE_NAME = /^[A-Za-z0-9-_# ]*$/;

// Options
export const LEVEL_SELECTOR_OPTIONS = [
  { label: LEVEL_HIGH, value: LEVEL_HIGH },
  { label: LEVEL_MEDIUM, value: LEVEL_MEDIUM },
  { label: LEVEL_LOW, value: LEVEL_LOW },
];

export const LEVEL_SELECTOR_OPTIONS_INCLUDING_ALL = [
  { label: ALL_LEVELS, value: ALL_LEVELS },
  ...LEVEL_SELECTOR_OPTIONS,
];
