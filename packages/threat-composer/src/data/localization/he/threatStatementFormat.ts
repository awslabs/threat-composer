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
import { ThreatStatementFormat } from '../../../customTypes';

const threatStatementFormat: ThreatStatementFormat = {
  7: {
    template: '[threat_source] [prerequisites] יכול [threat_action]',
    suggestions: [
      '[threat_impact] שקול אם יש השפעה ראשונית של האיום כתוצאה מהצלחת פעולת האיום',
      '[impacted_goal] שקול איזו מטרה רצויה ספציפית (למשל סודיות) נפגעת ביחס לנכסים המפורטים. חשוב להבין את השפעת הסיכון ולסייע בתעדוף',
      '[impacted_assets] שקול אילו נכסים מושפעים. חשוב להבין את השפעת הסיכון ולסייע בתעדוף',
    ],
  },
  15: {
    template: '[threat_source] [prerequisites] יכול [threat_action], אשר מוביל ל-[threat_impact]',
    suggestions: [
      '[impacted_assets] שקול אילו נכסים עלולים להיפגע. חשוב להבין את השפעת הסיכון ולסייע בתעדוף',
      '[impacted_goal] שקול איזו מטרה רצויה ספציפית (למשל סודיות) נפגעת. חשוב להבין את השפעת הסיכון ולסייע בתעדוף',
    ],
  },
  23: {
    template: '[threat_source] [prerequisites] יכול [threat_action], שמוביל לירידה ב-[impacted_goal]',
    suggestions: [
      '[threat_impact] שקול אם יש השפעה ראשונית של האיום המובילה לפגיעה במטרה הרצויה',
      '[impacted_assets] שקול אילו נכסים מושפעים. חשוב להבין את השפעת הסיכון ולסייע בתעדוף',
    ],
  },
  31: {
    template: '[threat_source] [prerequisites] יכול [threat_action], אשר מוביל ל-[threat_impact], שמוביל לירידה ב-[impacted_goal]',
    suggestions: [
      '[impacted_assets] שקול אילו נכסים מושפעים. חשוב להבין את השפעת הסיכון ולסייע בתעדוף',
    ],
  },
  39: {
    template: '[threat_source] [prerequisites] יכול [threat_action], משפיע לרעה על [impacted_assets]',
    suggestions: [
      '[threat_impact] שקול אם יש השפעה ראשונית של האיום כתוצאה מהצלחת פעולת האיום',
      '[impacted_goal] שקול איזו מטרה רצויה ספציפית (למשל סודיות) נפגעת ביחס לנכסים המפורטים. חשוב להבין את השפעת הסיכון ולסייע בתעדוף',
    ],
  },
  47: {
    template: '[threat_source] [prerequisites] יכול [threat_action], אשר מוביל ל-[threat_impact], משפיע לרעה על [impacted_assets]',
    suggestions: [
      '[impacted_goal] שקול איזו מטרה רצויה ספציפית (למשל סודיות) נפגעת. חשוב להבין את השפעת הסיכון ולסייע בתעדוף',
    ],
  },
  55: {
    template: '[threat_source] [prerequisites] יכול [threat_action], שמוביל לירידה ב-[impacted_goal] של [impacted_assets]',
    suggestions: [
      '[threat_impact] שקול אם יש השפעה ראשונית של האיום המובילה לפגיעה במטרה הרצויה בנכסים המוגדרים',
    ],
  },
  63: {
    template: '[threat_source] [prerequisites] יכול [threat_action], אשר מוביל ל-[threat_impact], שמוביל לירידה ב-[impacted_goal] של [impacted_assets]',
    suggestions: [],
  },
};

export default threatStatementFormat;