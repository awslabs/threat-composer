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
import React, { FC, useState, useEffect } from 'react';
import Carousel from 'react-simply-carousel';
import InfoModalCopy from './components/Copy';
import InfoModalEditor from './components/Editor';
import InfoModalFeatures from './components/Features';
import InfoModalFullExamples from './components/FullExample';
import InfoModalGetStarted from './components/GetStarted';
import InfoModalIntro from './components/Intro';
import InfoModalMoreFeatures from './components/MoreFeatures';
import InfoModalSelector from './components/Selector';
import Modal from '../Modal';

import './index.css';

const TOTAL_SLIDES = 8;

export interface InfoModalProps {
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const InfoModal: FC<InfoModalProps> = ({
  visible,
  setVisible,
}) => {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const handleKeyDown = (event: any) => {
      if (event.key === 'ArrowRight') {
        setActiveSlide(cur => cur + 1);
      } else if (event.key === 'ArrowLeft') {
        setActiveSlide(cur => cur === 0 ? cur : cur - 1 );
      }
    };

    document.addEventListener('keydown', handleKeyDown, false);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, false);
    };
  }, [setActiveSlide]);


  useEffect(() => {
    activeSlide >= TOTAL_SLIDES && setVisible(false);
  }, [activeSlide]);

  return <Modal
    visible={visible}
    onDismiss={() => setVisible(false)}
  >
    <Carousel
      containerProps={{
        className: 'threat-statement-editor-info-model-container',
      }}
      preventScrollOnSwipe
      swipeTreshold={60}
      activeSlideIndex={activeSlide}
      activeSlideProps={{
        className: 'threat-statement-editor-info-model-slide-active',
      }}
      onRequestChange={setActiveSlide}
      forwardBtnProps={{
        children: '>',
        className: 'threat-statement-editor-info-model-navigation-next-button',
        hidden: activeSlide === TOTAL_SLIDES - 1,
      }}
      backwardBtnProps={{
        children: '<',
        className: 'threat-statement-editor-info-model-navigation-prev-button',
        hidden: activeSlide === 0,
      }}
      dotsNav={{
        show: true,
        itemBtnProps: {
          className: 'threat-statement-editor-info-model-navigation-button',
        },
        activeItemBtnProps: {
          className: 'threat-statement-editor-info-model-navigation-button-active',
        },
      }}
      itemsToShow={2}
      speed={400}
    >
      <div
        className='threat-statement-editor-info-model-slide'
        key='intro'
      >
        <InfoModalIntro/>
      </div>
      <div
        className='threat-statement-editor-info-model-slide'
        key='tenets'
      >
        <InfoModalFeatures/>
      </div>
      <div
        className='threat-statement-editor-info-model-slide'
        key='features'
      >
        <InfoModalMoreFeatures/>
      </div>
      <div
        className='threat-statement-editor-info-model-slide'
        key='selector'
      >
        <InfoModalSelector/>
      </div>
      <div
        className='threat-statement-editor-info-model-slide'
        key='editor'
      >
        <InfoModalEditor/>
      </div>
      <div
        className='threat-statement-editor-info-model-slide'
        key='fullexamples'
      >
        <InfoModalFullExamples/>
      </div>
      <div
        className='threat-statement-editor-info-model-slide'
        key='copy'
      >
        <InfoModalCopy/>
      </div>
      <div
        className='threat-statement-editor-info-model-slide'
        key='getstarted'
      >
        <InfoModalGetStarted onClick={() => setVisible(false)}/>
      </div>
    </Carousel>
  </Modal>;
};

export default InfoModal;