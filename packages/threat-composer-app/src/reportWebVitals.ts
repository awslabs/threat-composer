import type { Metric } from 'web-vitals';

// web-vitals 6 replaced the `getX` functions with `onX` and dropped the
// `ReportHandler` type. Every metric-specific callback type extends `Metric`, so
// one handler taking `Metric` can be passed to all of them.
//
// FID has no successor here: it was retired in favour of INP, which is reported
// by `onINP` below.
type ReportHandler = (metric: Metric) => void;

const reportWebVitals = (onPerfEntry?: ReportHandler) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(
      ({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
        onCLS(onPerfEntry);
        onFCP(onPerfEntry);
        onINP(onPerfEntry);
        onLCP(onPerfEntry);
        onTTFB(onPerfEntry);
      },
      () => {}
    );
  }
};

export default reportWebVitals;
