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
/** @jsxImportSource @emotion/react */
import { ClassNames } from '@emotion/react';
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
import styles from './styles';
import Modal from '../../generic/Modal';

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
        setActiveSlide(cur => cur === 0 ? cur : cur - 1);
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

  return (<ClassNames>
    {({ css, cx }) => (
      <Modal
        visible={visible}
        onDismiss={() => setVisible(false)}
      >
        <Carousel
          containerProps={{
            className: css(styles.container),
          }}
          preventScrollOnSwipe
          swipeTreshold={60}
          activeSlideIndex={activeSlide}
          activeSlideProps={{}}
          onRequestChange={setActiveSlide}
          forwardBtnProps={{
            children: '>',
            className: cx(css(styles.navBtn), css(styles.nextBtn)),
            hidden: activeSlide === TOTAL_SLIDES - 1,
          }}
          backwardBtnProps={{
            children: '<',
            className: cx(css(styles.navBtn), css(styles.prevBtn)),
            hidden: activeSlide === 0,
          }}
          dotsNav={{
            show: true,
            itemBtnProps: {
              className: css(styles.navBtnDot),
            },
            activeItemBtnProps: {
              className: cx(css(styles.navBtnDot), css(styles.navBtnDotActive)),
            },
          }}
          itemsToShow={2}
          speed={400}
        >
          <div
            className={css(styles.slide)}
            key='intro'
          >
            <InfoModalIntro />
          </div>
          <div
            className={css(styles.slide)}
            key='tenets'
          >
            <InfoModalFeatures />
          </div>
          <div
            className={css(styles.slide)}
            key='features'
          >
            <InfoModalMoreFeatures />
          </div>
          <div
            className={css(styles.slide)}
            key='selector'
          >
            <InfoModalSelector />
          </div>
          <div
            className={css(styles.slide)}
            key='editor'
          >
            <InfoModalEditor />
          </div>
          <div
            className={css(styles.slide)}
            key='fullexamples'
          >
            <InfoModalFullExamples />
          </div>
          <div
            className={css(styles.slide)}
            key='copy'
          >
            <InfoModalCopy />
          </div>
          <div
            className={css(styles.slide)}
            key='getstarted'
          >
            <InfoModalGetStarted onClick={() => setVisible(false)} />
          </div>
        </Carousel>
      </Modal>)}
  </ClassNames>);
};

export default InfoModal;