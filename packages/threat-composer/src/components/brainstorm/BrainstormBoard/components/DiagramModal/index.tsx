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
import { Button, Header } from '@cloudscape-design/components';
import { FC, useState, CSSProperties } from 'react';
import { Modal } from '../../../..';

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
 * with zoom and pan functionality using only React core APIs
 */
export const DiagramModal: FC<DiagramModalProps> = ({
  visible,
  onDismiss,
  title,
  image,
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerStyles: CSSProperties = {
    color: 'white',
    transition: 'all 0.3s ease',
  };

  const imageContainerStyles: CSSProperties = {
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
    height: '500px',
    margin: '0 auto',
  };

  const imageStyles: CSSProperties = {
    position: 'absolute',
    transform: `scale(${zoomLevel / 100}) translate(${panPosition.x}px, ${panPosition.y}px)`,
    transformOrigin: 'center center',
    transition: isDragging ? 'none' : 'transform 0.2s ease',
    cursor: zoomLevel > 100 ? 'move' : 'default',
    maxWidth: '100%',
    maxHeight: '100%',
    display: 'block',
    margin: '0 auto',
  };

  const headerStyles: CSSProperties = {
    marginBottom: '16px',
  };

  const controlsStyles: CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '16px',
    gap: '10px',
  };

  const sliderContainerStyles: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: '200px',
  };

  /**
   * Reset zoom level to 100% and pan position to center
   */
  const resetZoomAndPan = () => {
    setZoomLevel(100);
    setPanPosition({ x: 0, y: 0 });
  };

  /**
   * Handle zoom level changes from the slider
   * @param value - New zoom level value
   */
  const handleZoomChange = (value: number) => {
    setZoomLevel(value);
    // Reset pan position when zooming back to 100%
    if (value === 100) {
      setPanPosition({ x: 0, y: 0 });
    }
  };

  /**
   * Handle mouse down event to start dragging
   * @param e - Mouse event
   */
  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (zoomLevel > 100) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  /**
   * Handle mouse move event for panning
   * @param e - Mouse event
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (isDragging && zoomLevel > 100) {
      const dx = (e.clientX - dragStart.x) / (zoomLevel / 100);
      const dy = (e.clientY - dragStart.y) / (zoomLevel / 100);
      setPanPosition({
        x: panPosition.x + dx,
        y: panPosition.y + dy,
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  /**
   * Handle mouse up event to stop dragging
   */
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  /**
   * Handle mouse leave event to stop dragging
   */
  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
    >
      <div style={containerStyles}>
        <div style={headerStyles}>
          <Header variant="h2">{title}</Header>
        </div>
        {image && (
          <div style={controlsStyles}>
            <div style={sliderContainerStyles}>
              <span>Zoom:</span>
              <input
                type="range"
                min="100"
                max="400"
                step="10"
                value={zoomLevel}
                onChange={(e) => handleZoomChange(parseInt(e.target.value, 10))}
                style={{ width: '100%' }}
              />
              <span>{zoomLevel}%</span>
            </div>
            <Button
              iconName="undo"
              onClick={resetZoomAndPan}
              ariaLabel="Reset Zoom"
            >
              Reset
            </Button>
          </div>
        )}
        {image ? (
          <div style={imageContainerStyles}>
            <img
              src={image}
              alt={title}
              style={imageStyles}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            />
          </div>
        ) : (
          <p>No diagram available</p>
        )}
      </div>
    </Modal>
  );
};

export default DiagramModal;