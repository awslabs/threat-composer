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

const styles: any = {
  container: {
    width: '100%',
    justifyContent: 'space-between',
    userSelect: 'none',
  },
  slide: {
    width: '760px',
    height: '600px',
    textAlign: 'center',
    padding: '20px',
    boxSizing: 'border-box',
    lineHeight: '240px',
  },
  text: {
    fontSize: '20px !important',
    lineHeight: '24px !important',
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
    width: '720px',
    height: '560px',
    textAlign: 'start',
  },
  contentBaseHeader: {
    textAlign: 'center',
    fontSize: '32px',
    lineHeight: '48px',
    marginBottom: '20px',
  },
  contentBaseText: {
    fontSize: '20px',
    lineHeight: '32px',
    color: '#fbfbfb',
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
    },
    '& li:before': {
      content: 'counter( LIST-ITEMS )',
      counterIncrement: 'LIST-ITEMS',
      padding: '3px 10px',
      marginRight: '20px',
      background: 'rgb(9, 114, 211)',
      borderRadius: '16px',
      width: '20px',
    },
  },
  featureSets: {
    marginTop: '50px',
    marginLeft: '20px',
    marginRight: '20px',
  },
  featureSet: {
    'textAlign': 'center',
    'boxSizing': 'border-box',
    '& svg': {
      width: '60px',
      height: '60px',
    },
  },
  image: {
    width: '100%',
    maxWidth: '740px',
    marginTop: awsui.spaceScaledXxxl,
  },
  getStartedBtnContainer: {
    textAlign: 'center',
    marginTop: '100px',
  },
};

export default styles;