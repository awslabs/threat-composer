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
const STRIDE = [{
  label: 'Spoofing',
  value: 'S',
  violates: 'Authenticity',
  description: 'Pretending to be something or somebody other than who you are',
},
{
  label: 'Tampering',
  value: 'T',
  violates: 'Integrity',
  description: 'Changing data on disk, in memory, on the network, or elsewhere',
},
{
  label: 'Repudiation',
  value: 'R',
  violates: 'Non-repudiation',
  description: 'Claiming that you were not responsible for an action',
},
{
  label: 'Information Disclosure',
  value: 'I',
  violates: 'Confidentiality',
  description: 'Obtaining information that was not intended for you (such as side-channel timing attacks, verbose error messages, or internal developer comments in public code)',
},
{
  label: 'Denial of Service',
  value: 'D',
  violates: 'Availability',
  description: 'Destruction or excessive consumption of finite resources (such as expensive regular expressions or lack of request throttling leading to service quotas being reached)',
},
{
  label: 'Elevation of Privilege',
  value: 'E',
  violates: 'Authorization',
  description: 'Performing actions on protected resources that you should not be allowed to perform',
}];

export default STRIDE;