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
import * as awsui from '@cloudscape-design/design-tokens';
import getMobileMediaQuery from '../../../utils/getMobileMediaQuery';

const styles: any = {
  contentRoot: {
    width: '100%',
    height: '100%',
    maxHeight: 'calc(100vh - 60px)',
    position: 'relative',
    [`${getMobileMediaQuery()}, screen and (max-height: 640px)`]: {
      paddingBottom: awsui.spaceScaledL,
    },
  },
  container: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    userSelect: 'none',
  },
  slide: {
    width: 'var(--slide-width)',
    maxWidth: 'calc(100vw - 40px)',
    textAlign: 'center',
    padding: '20px',
    paddingBottom: '50px',
    boxSizing: 'border-box',
    lineHeight: '240px',
  },
  navBtn: {
    width: '30px',
    height: '30px',
    alignSelf: 'center',
    bottom: '20px',
    zIndex: '100',
    position: 'absolute',
    backgroundColor: '#414d5c',
    color: '#d1d5db',
    border: 'none',
  },
  nextBtn: {
    float: 'right',
    right: '20px',
  },
  prevBtn: {
    float: 'left',
    left: '20px',
  },
  navBtnDotContainer: {
    position: 'absolute',
    bottom: '20px',
  },
  navBtnDot: {
    height: '16px',
    width: '16px',
    borderRadius: '50%',
    border: '0',
    marginRight: '10px',
    marginLeft: '10px',
    backgroundColor: '#5f6b7a',
  },
  navBtnDotActive: {
    backgroundColor: '#d1d5db',
  },
  contentBase: {
    color: '#fbfbfb',
    width: '100%',
    height: '100%',
    textAlign: 'start',
  },
  contentBaseHeader: {
    textAlign: 'center',
    fontSize: '32px',
    lineHeight: '48px',
    marginBottom: '20px',
    [`${getMobileMediaQuery()}, screen and (max-height: 640px)`]: {
      fontSize: '24px',
      lineHeight: '32px',
    },
  },
  contentBaseMain: {
    maxHeight: 'calc(100vh - 150px)',
    overflow: 'auto',
  },
  contentBaseText: {
    fontSize: '20px',
    lineHeight: '32px',
    color: '#fbfbfb',
    [`${getMobileMediaQuery()}, screen and (max-height: 640px)`]: {
      fontSize: '16px',
      lineHeight: '20px',
    },
  },
  contentHighlight: {
    color: 'rgb(9, 114, 211)',
    fontWeight: 'bold',
  },
  contentList: {
    '& ol': {
      counterReset: 'LIST-ITEMS 0',
      marginLeft: '0',
      paddingLeft: '0',
    },
    '& li': {
      position: 'relative',
      margin: '0 0 6px 2em',
      padding: '4px 8px',
      listStyle: 'none',
      [`${getMobileMediaQuery()}, screen and (max-height: 640px)`]: {
        padding: '3px 8px',
        margin: 0,
      },
    },
    '& li:before': {
      content: 'counter( LIST-ITEMS )',
      counterIncrement: 'LIST-ITEMS',
      padding: '3px 10px',
      marginRight: '20px',
      background: 'rgb(9, 114, 211)',
      borderRadius: '16px',
      width: '20px',
      [`${getMobileMediaQuery()}, screen and (max-height: 640px)`]: {
        padding: '3px 8px',
      },
    },
  },
  featureSets: {
    marginTop: '50px',
    marginLeft: '20px',
    marginRight: '20px',
    [`${getMobileMediaQuery()}, screen and (max-height: 640px)`]: {
      marginTop: '20px',
    },
  },
  featureSet: {
    'textAlign': 'center',
    'boxSizing': 'border-box',
    'overflow': 'hidden',
    '& svg': {
      width: '60px',
      height: '60px',
    },
    [`${getMobileMediaQuery()}, screen and (max-height: 640px)`]: {
      '& svg': {
        width: '40px',
        height: '40px',
      },
    },
  },
  image: {
    width: '100%',
    height: '100%',
    maxWidth: '740px',
    marginTop: '40px',
    [`${getMobileMediaQuery()}, screen and (max-height: 640px)`]: {
      marginTop: '20px',
    },
  },
  getStartedBtnContainer: {
    textAlign: 'center',
    marginTop: '100px',
    [`${getMobileMediaQuery()}, screen and (max-height: 640px)`]: {
      marginTop: '40px',
    },
  },
};

export default styles;