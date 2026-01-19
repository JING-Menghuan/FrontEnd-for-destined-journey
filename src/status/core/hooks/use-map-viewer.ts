import OpenSeadragon from 'openseadragon';
import { useEffect, useRef } from 'react';
import { mapSources } from '../types/map-sources';

interface UseMapViewerOptions {
  mapSourceKey: 'small' | 'large';
  onOpen?: () => void;
  onUpdate?: () => void;
  onBeforeOpen?: () => void;
  viewerRef?: React.RefObject<OpenSeadragon.Viewer | null>;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

interface UseMapViewerResult {
  viewerRef: React.RefObject<OpenSeadragon.Viewer | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const useMapViewer = ({
  mapSourceKey,
  onOpen,
  onUpdate,
  onBeforeOpen,
  viewerRef: externalViewerRef,
  containerRef: externalContainerRef,
}: UseMapViewerOptions): UseMapViewerResult => {
  const containerRef = externalContainerRef ?? useRef<HTMLDivElement | null>(null);
  const viewerRef = externalViewerRef ?? useRef<OpenSeadragon.Viewer | null>(null);
  const onOpenRef = useRef(onOpen);
  const onUpdateRef = useRef(onUpdate);
  const onBeforeOpenRef = useRef(onBeforeOpen);

  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    onBeforeOpenRef.current = onBeforeOpen;
  }, [onBeforeOpen]);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const viewer = OpenSeadragon({
      element: containerRef.current,
      tileSources: mapSourceKey === 'large' ? mapSources.large : mapSources.small,
      prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
      showNavigator: true,
      showNavigationControl: true,
      showFullPageControl: false,
      visibilityRatio: 1,
      constrainDuringPan: true,
      preserveImageSizeOnResize: true,
      crossOriginPolicy: 'Anonymous',
      gestureSettingsMouse: {
        clickToZoom: false,
        dblClickToZoom: true,
        dragToPan: true,
        scrollToZoom: true,
      },
      gestureSettingsTouch: {
        pinchToZoom: true,
        dragToPan: true,
      },
    });

    viewerRef.current = viewer;

    const handleOpen = () => {
      onOpenRef.current?.();
    };

    const handleUpdate = () => {
      onUpdateRef.current?.();
    };

    viewer.addHandler('open', handleOpen);
    viewer.addHandler('animation', handleUpdate);
    viewer.addHandler('resize', handleUpdate);

    return () => {
      viewerRef.current = null;
      viewer.destroy();
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    onBeforeOpenRef.current?.();
    const handleOpen = () => {
      onOpenRef.current?.();
      viewer.removeHandler('open', handleOpen);
    };
    viewer.addHandler('open', handleOpen);
    viewer.open(mapSourceKey === 'large' ? mapSources.large : mapSources.small);
  }, [mapSourceKey]);

  return { viewerRef, containerRef };
};
