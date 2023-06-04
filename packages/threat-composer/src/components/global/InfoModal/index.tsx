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
import React, { FC, useState, useEffect, useRef, useMemo } from 'react';
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
import { useMobileMediaQuery } from '../../../hooks/useMediaQuery';
import Modal from '../../generic/Modal';

const TOTAL_SLIDES = 8;

const MARGIN_SLIDE_H = 0;

const DEFAULT_SLIDE_WIDTH = 760;

export interface InfoModalProps {
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const InfoModal: FC<InfoModalProps> = ({
  visible,
  setVisible,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const isMobileView = useMobileMediaQuery();

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

  const contentRefDimention = useMemo(() => {
    const clientWidth = contentRef.current?.clientWidth;

    return {
      width: clientWidth ? `${clientWidth - MARGIN_SLIDE_H}px` : `${DEFAULT_SLIDE_WIDTH}px`,
    };
  }, [contentRef.current?.clientHeight, contentRef.current?.clientWidth, window?.innerHeight]);

  return (<ClassNames>
    {({ css, cx }) => (
      <Modal
        visible={visible}
        onDismiss={() => setVisible(false)}
      >
        <div css={css(styles.contentRoot)} ref={contentRef as React.MutableRefObject<HTMLDivElement>}>
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
              containerProps: {
                className: css(styles.navBtnDotContainer),
              },
              itemBtnProps: {
                className: css(styles.navBtnDot),
              },
              activeItemBtnProps: {
                className: cx(css(styles.navBtnDot), css(styles.navBtnDotActive)),
              },
            }}
            itemsToShow={isMobileView ? 1 : 2}
            speed={400}
          >
            <div
              className={css(styles.slide)}
              style={{
                ['--slide-width' as any]: contentRefDimention.width,
              }}
              key='intro'
            >
              <InfoModalIntro />
            </div>
            <div
              className={css(styles.slide)}
              style={{
                ['--slide-width' as any]: contentRefDimention.width,
              }}
              key='tenets'
            >
              <InfoModalFeatures />
            </div>
            <div
              className={css(styles.slide)}
              style={{
                ['--slide-width' as any]: contentRefDimention.width,
              }}
              key='features'
            >
              <InfoModalMoreFeatures />
            </div>
            {!isMobileView && <div
              className={css(styles.slide)}
              style={{
                ['--slide-width' as any]: contentRefDimention.width,
              }}
              key='selector'
            >
              <InfoModalSelector/>
            </div>}
            {!isMobileView && <div
              className={css(styles.slide)}
              style={{
                ['--slide-width' as any]: contentRefDimention.width,
              }}
              key='editor'
            >
              <InfoModalEditor />
            </div>}
            {!isMobileView && <div
              className={css(styles.slide)}
              style={{
                ['--slide-width' as any]: contentRefDimention.width,
              }}
              key='fullexamples'
            >
              <InfoModalFullExamples />
            </div>}
            {!isMobileView && <div
              className={css(styles.slide)}
              style={{
                ['--slide-width' as any]: contentRefDimention.width,
              }}
              key='copy'
            >
              <InfoModalCopy />
            </div>}
            <div
              className={css(styles.slide)}
              style={{
                ['--slide-width' as any]: contentRefDimention.width,
              }}
              key='getstarted'
            >
              <InfoModalGetStarted onClick={() => setVisible(false)} />
            </div>
          </Carousel>
        </div>
      </Modal>)}
  </ClassNames>);
};

export default InfoModal;