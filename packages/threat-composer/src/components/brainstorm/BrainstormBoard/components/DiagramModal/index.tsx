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
import {
  Button,
  Modal,
  SpaceBetween,
  Box,
  StatusIndicator,
  Grid,
  SegmentedControl,
} from '@cloudscape-design/components';
import { Mode } from '@cloudscape-design/global-styles';
import mermaid from 'mermaid';
import { FC, useState, useEffect, useCallback, CSSProperties } from 'react';
import { useThemeContext } from '../../../../generic/ThemeProvider';

/**
 * Props interface for DiagramModal component
 */
export interface DiagramModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback function called when modal should be dismissed */
  onDismiss: () => void;
  /** Title to display in the modal header */
  title: string;
  /** Optional image URL to display in the modal */
  image?: string;
}

/**
 * DiagramModal component for displaying architecture and dataflow diagrams
 * with enhanced zoom and pan functionality using Cloudscape components
 */
export const DiagramModal: FC<DiagramModalProps> = ({
  visible,
  onDismiss,
  title,
  image,
}) => {
  // Check if image is a mermaid diagram
  const isMermaidDiagram = image && image.startsWith('mermaid:');
  const mermaidCode = isMermaidDiagram ? image.substring(8) : '';
  const { theme } = useThemeContext();

  // State management
  const [zoomLevel, setZoomLevel] = useState(100);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState<'fit' | 'custom'>('fit');
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [containerDimensions, setContainerDimensions] = useState({ width: 800, height: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [mermaidSvg, setMermaidSvg] = useState<string>('');


  // Load image and calculate dimensions or render mermaid
  useEffect(() => {
    if (isMermaidDiagram && mermaidCode) {
      // Render mermaid diagram
      const mermaidTheme = theme === Mode.Dark ? 'dark' : 'default';
      mermaid.initialize({ startOnLoad: true, theme: mermaidTheme });

      mermaid
        .render('mermaid-modal-diagram', mermaidCode)
        .then(({ svg }: { svg: string }) => {
          setMermaidSvg(svg);

          // Parse SVG to get dimensions
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
          const svgElement = svgDoc.documentElement;
          const width = parseFloat(svgElement.getAttribute('width') || '800');
          const height = parseFloat(svgElement.getAttribute('height') || '600');

          setImageDimensions({ width, height });

          // Calculate optimal container size
          const maxWidth = Math.min(window.innerWidth * 0.85, 1200);
          const maxHeight = Math.min(window.innerHeight * 0.75, 800);

          let containerWidth = maxWidth;
          let containerHeight = containerWidth * (height / width);

          if (containerHeight > maxHeight) {
            containerHeight = maxHeight;
            containerWidth = containerHeight * (width / height);
          }

          setContainerDimensions({ width: containerWidth, height: containerHeight });

          const scaleX = containerWidth / width;
          const scaleY = containerHeight / height;
          const fitZoom = Math.min(scaleX, scaleY) * 100;

          setZoomLevel(fitZoom);
          setPanPosition({ x: 0, y: 0 });
          setViewMode('fit');
        })
        .catch(err => {
          console.error('Mermaid render error:', err);
        });
    } else if (image && !isMermaidDiagram) {
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });

        // Calculate optimal container size based on viewport
        const maxWidth = Math.min(window.innerWidth * 0.85, 1200);
        const maxHeight = Math.min(window.innerHeight * 0.75, 800);

        let containerWidth = maxWidth;
        let containerHeight = containerWidth / aspectRatio;

        if (containerHeight > maxHeight) {
          containerHeight = maxHeight;
          containerWidth = containerHeight * aspectRatio;
        }

        setContainerDimensions({ width: containerWidth, height: containerHeight });

        // Calculate initial fit-to-window zoom level
        const scaleX = containerWidth / img.naturalWidth;
        const scaleY = containerHeight / img.naturalHeight;
        const fitZoom = Math.min(scaleX, scaleY) * 100;

        setZoomLevel(fitZoom);
        setPanPosition({ x: 0, y: 0 });
        setViewMode('fit');
      };
      img.src = image;
    }
  }, [image, isMermaidDiagram, mermaidCode, theme]);

  // Handle fit to window - calculate proper zoom to fit image in container
  const handleFitToWindow = useCallback(() => {
    if (imageDimensions.width && imageDimensions.height) {
      const scaleX = containerDimensions.width / imageDimensions.width;
      const scaleY = containerDimensions.height / imageDimensions.height;
      const fitZoom = Math.min(scaleX, scaleY) * 100;

      setZoomLevel(fitZoom);
      setPanPosition({ x: 0, y: 0 });
      setViewMode('fit');
    }
  }, [imageDimensions, containerDimensions]);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -10 : 10;
    const newZoom = Math.max(25, Math.min(400, zoomLevel + delta));
    setZoomLevel(newZoom);
    setViewMode('custom');
  }, [zoomLevel]);

  // Handle drag panning (when zoomed in)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && zoomLevel > 100) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  }, [zoomLevel]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setPanPosition(prev => ({
        x: prev.x + deltaX / (zoomLevel / 100),
        y: prev.y + deltaY / (zoomLevel / 100),
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning, panStart, zoomLevel]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Handle zoom preset selection from segmented control
  const handleZoomPresetChange = useCallback((event: any) => {
    const zoomValue = parseInt(event.detail.selectedId);
    setZoomLevel(zoomValue);
    setViewMode('custom');
    if (zoomValue === 100) {
      setPanPosition({ x: 0, y: 0 });
    }
  }, []);

  // Get selected zoom preset for segmented control
  const getSelectedZoomPreset = useCallback(() => {
    if (viewMode === 'custom') {
      const presetValues = [25, 50, 100, 150, 200];
      if (presetValues.includes(zoomLevel)) {
        return zoomLevel.toString();
      }
    }
    return null;
  }, [viewMode, zoomLevel]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!visible) return;

      switch (e.key) {
        case '=':
        case '+':
          setZoomLevel(prev => Math.min(400, prev + 25));
          setViewMode('custom');
          break;
        case '-':
          setZoomLevel(prev => Math.max(25, prev - 25));
          setViewMode('custom');
          break;
        case '0':
          handleFitToWindow();
          break;
        case '1':
          // Set to 100% zoom (actual size)
          setZoomLevel(100);
          setPanPosition({ x: 0, y: 0 });
          setViewMode('custom');
          break;
        case 'ArrowUp':
          setPanPosition(prev => ({ ...prev, y: prev.y + 50 }));
          break;
        case 'ArrowDown':
          setPanPosition(prev => ({ ...prev, y: prev.y - 50 }));
          break;
        case 'ArrowLeft':
          setPanPosition(prev => ({ ...prev, x: prev.x + 50 }));
          break;
        case 'ArrowRight':
          setPanPosition(prev => ({ ...prev, x: prev.x - 50 }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [visible, handleFitToWindow]);

  // Styles
  const imageContainerStyles: CSSProperties = {
    width: `${containerDimensions.width}px`,
    height: `${containerDimensions.height}px`,
    margin: '0 auto',
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid #d5dbdb',
    borderRadius: '4px',
    cursor: isPanning ? 'move' : (zoomLevel > 100 ? 'grab' : 'default'),
  };

  const imageStyles: CSSProperties = {
    maxWidth: 'none',
    maxHeight: 'none',
    width: `${imageDimensions.width}px`,
    height: `${imageDimensions.height}px`,
    transform: `scale(${zoomLevel / 100}) translate(${panPosition.x}px, ${panPosition.y}px)`,
    transformOrigin: 'center center',
    transition: isPanning ? 'none' : 'transform 0.2s ease',
    userSelect: 'none',
    pointerEvents: 'none',
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: `${-imageDimensions.height / 2}px`,
    marginLeft: `${-imageDimensions.width / 2}px`,
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      size="max"
      header={title}
      footer={
        <SpaceBetween direction="horizontal" size="xs">
          <span style={{ fontSize: '12px', color: '#5f6b7a' }}>
            {isMermaidDiagram ? 'Mermaid diagram' : 'Use mouse wheel to zoom, arrow keys or pan controls to navigate'}
          </span>
        </SpaceBetween>
      }
    >
      {image ? (
        <SpaceBetween size='s'>
          <Box>
            {/* Main Toolbar */}
            <Grid gridDefinition={[{ colspan: 8 }, { colspan: 4 }]}>
              <SpaceBetween direction="horizontal" size="s" alignItems="center">
                <SegmentedControl
                  selectedId={getSelectedZoomPreset()}
                  onChange={handleZoomPresetChange}
                  options={[
                    { text: '25%', id: '25' },
                    { text: '50%', id: '50' },
                    { text: '100%', id: '100' },
                    { text: '150%', id: '150' },
                    { text: '200%', id: '200' },
                  ]}
                />
                <Button onClick={handleFitToWindow} variant={viewMode === 'fit' ? 'primary' : 'normal'}>
                  Fit Window
                </Button>
                <StatusIndicator type="info">
                  {Math.round(zoomLevel)}%
                </StatusIndicator>
              </SpaceBetween>

              <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Pan:</span>
                <SpaceBetween direction="horizontal" size="xs">
                  <Button
                    variant="icon"
                    iconName="caret-up-filled"
                    onClick={() => { setPanPosition(prev => ({ ...prev, y: prev.y + 50 })); setViewMode('custom'); }}
                    ariaLabel="Pan up"
                  />
                  <Button
                    variant="icon"
                    iconName="caret-down-filled"
                    onClick={() => { setPanPosition(prev => ({ ...prev, y: prev.y - 50 })); setViewMode('custom'); }}
                    ariaLabel="Pan down"
                  />
                  <Button
                    variant="icon"
                    iconName="caret-left-filled"
                    onClick={() => { setPanPosition(prev => ({ ...prev, x: prev.x + 50 })); setViewMode('custom'); }}
                    ariaLabel="Pan left"
                  />
                  <Button
                    variant="icon"
                    iconName="caret-right-filled"
                    onClick={() => { setPanPosition(prev => ({ ...prev, x: prev.x - 50 })); setViewMode('custom'); }}
                    ariaLabel="Pan right"
                  />
                </SpaceBetween>
              </SpaceBetween>
            </Grid>
          </Box>
          <Box>
            <div
              style={imageContainerStyles}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {isMermaidDiagram && mermaidSvg ? (
                <div
                  dangerouslySetInnerHTML={{ __html: mermaidSvg }}
                  style={imageStyles}
                />
              ) : (
                <img
                  src={image}
                  alt={title}
                  style={imageStyles}
                  draggable={false}
                />
              )}
            </div>
          </Box>
        </SpaceBetween>
      ) : (
        <Box textAlign="center" padding="xxl">
          <StatusIndicator type="info">No diagram available</StatusIndicator>
        </Box>
      )}
    </Modal>
  );
};

export default DiagramModal;
