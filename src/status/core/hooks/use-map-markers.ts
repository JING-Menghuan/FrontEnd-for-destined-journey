import OpenSeadragon from 'openseadragon';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MapMarker } from '../types/map-markers';
import { DEFAULT_MARKER_COLOR, DEFAULT_MARKER_ICON } from '../utils/map-constants';

interface UseMapMarkersOptions {
  viewerRef: React.RefObject<OpenSeadragon.Viewer | null>;
  classNames: {
    mapMarker: string;
    mapMarkerActive: string;
    mapMarkerIcon: string;
    mapMarkerIconNode: string;
    mapMarkerLabel: string;
    mapMarkerCard: string;
    mapMarkerTitle: string;
    mapMarkerGroup: string;
    mapMarkerSummary: string;
  };
  onMarkerSelect?: (id: string | null) => void;
}

interface UseMapMarkersResult {
  markers: MapMarker[];
  setMarkers: React.Dispatch<React.SetStateAction<MapMarker[]>>;
  activeMarkerId: string | null;
  setActiveMarkerId: React.Dispatch<React.SetStateAction<string | null>>;
  markerAddMode: boolean;
  setMarkerAddMode: React.Dispatch<React.SetStateAction<boolean>>;
  updateMarker: (id: string, patch: Partial<MapMarker>) => void;
  deleteMarker: (id: string) => void;
  addMarkerAt: (nx: number, ny: number) => void;
  focusMarker: (marker: MapMarker) => void;
  getNormalizedPointFromClient: (
    clientX: number,
    clientY: number,
  ) => { nx: number; ny: number } | null;
  syncMarkerOverlaysRef: React.RefObject<() => void>;
  viewerRef: React.RefObject<OpenSeadragon.Viewer | null>;
  overlayMapRef: React.RefObject<Map<string, HTMLElement>>;
}

export const useMapMarkers = ({
  viewerRef,
  classNames,
  onMarkerSelect,
}: UseMapMarkersOptions): UseMapMarkersResult => {
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [markerAddMode, setMarkerAddMode] = useState(false);
  const overlayMapRef = useRef<Map<string, HTMLElement>>(new Map());
  const syncMarkerOverlaysRef = useRef<() => void>(() => undefined);
  const draggingRef = useRef<{ id: string | null; pointerId: number | null }>({
    id: null,
    pointerId: null,
  });

  const createMarkerId = () => {
    return `marker-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  };

  const updateMarker = useCallback((id: string, patch: Partial<MapMarker>) => {
    setMapMarkers(prev =>
      prev.map(marker =>
        marker.id === id
          ? {
              ...marker,
              ...patch,
              position: patch.position ?? marker.position,
            }
          : marker,
      ),
    );
  }, []);

  const deleteMarker = useCallback(
    (id: string) => {
      setMapMarkers(prev => prev.filter(marker => marker.id !== id));
      setActiveMarkerId(prev => (prev === id ? null : prev));
      onMarkerSelect?.(null);
    },
    [onMarkerSelect],
  );

  const addMarkerAt = useCallback(
    (nx: number, ny: number) => {
      const id = createMarkerId();
      const newMarker: MapMarker = {
        id,
        name: '新标记',
        group: '',
        description: '',
        icon: DEFAULT_MARKER_ICON,
        color: DEFAULT_MARKER_COLOR,
        position: { nx, ny },
      };
      setMapMarkers(prev => [...prev, newMarker]);
      setActiveMarkerId(id);
      setMarkerAddMode(false);
      onMarkerSelect?.(id);
    },
    [onMarkerSelect],
  );

  const focusMarker = useCallback((marker: MapMarker) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const imageItem = viewer.world.getItemAt(0);
    if (!imageItem) return;
    const size = imageItem.getContentSize();
    if (!size.x || !size.y) return;
    const imagePoint = new OpenSeadragon.Point(
      marker.position.nx * size.x,
      marker.position.ny * size.y,
    );
    const viewportPoint = viewer.viewport.imageToViewportCoordinates(imagePoint);
    viewer.viewport.panTo(viewportPoint);
    viewer.viewport.applyConstraints();
  }, []);

  const getNormalizedPointFromClient = useCallback((clientX: number, clientY: number) => {
    const viewer = viewerRef.current;
    if (!viewer) return null;
    const imageItem = viewer.world.getItemAt(0);
    if (!imageItem) return null;
    const size = imageItem.getContentSize();
    if (!size.x || !size.y) return null;
    const rect = viewer.element.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const viewerPoint = new OpenSeadragon.Point(clientX - rect.left, clientY - rect.top);
    const imagePoint = viewer.viewport.viewerElementToImageCoordinates(viewerPoint);
    return {
      nx: _.clamp(imagePoint.x / size.x, 0, 1),
      ny: _.clamp(imagePoint.y / size.y, 0, 1),
    };
  }, []);

  const updateMarkerElement = useCallback(
    (element: HTMLElement, marker: MapMarker, isActive: boolean) => {
      element.className =
        `${classNames.mapMarker} ${isActive ? classNames.mapMarkerActive : ''}`.trim();
      const iconElement = element.querySelector(
        `.${classNames.mapMarkerIcon}`,
      ) as HTMLDivElement | null;
      const iconNode = element.querySelector(
        `.${classNames.mapMarkerIconNode}`,
      ) as HTMLElement | null;
      const labelElement = element.querySelector(
        `.${classNames.mapMarkerLabel}`,
      ) as HTMLDivElement | null;
      const titleElement = element.querySelector(
        `.${classNames.mapMarkerTitle}`,
      ) as HTMLDivElement | null;
      const groupElement = element.querySelector(
        `.${classNames.mapMarkerGroup}`,
      ) as HTMLDivElement | null;
      const summaryElement = element.querySelector(
        `.${classNames.mapMarkerSummary}`,
      ) as HTMLDivElement | null;

      if (iconElement) {
        const color = marker.color ?? DEFAULT_MARKER_COLOR;
        iconElement.style.color = color;
      }
      if (iconNode) {
        const iconKey = marker.icon ?? DEFAULT_MARKER_ICON;
        iconNode.className = `${classNames.mapMarkerIconNode} ${iconKey}`;
      }
      if (labelElement) {
        labelElement.textContent = marker.name || '未命名标记';
      }
      if (titleElement) {
        titleElement.textContent = marker.name || '未命名标记';
      }
      if (groupElement) {
        if (marker.group) {
          groupElement.textContent = marker.group;
          groupElement.style.display = 'block';
        } else {
          groupElement.style.display = 'none';
        }
      }
      if (summaryElement) {
        if (marker.description) {
          summaryElement.textContent = marker.description;
          summaryElement.style.display = 'block';
        } else {
          summaryElement.style.display = 'none';
        }
      }
    },
    [classNames],
  );

  const createMarkerElement = useCallback(
    (marker: MapMarker) => {
      const element = document.createElement('div');
      element.className = classNames.mapMarker;
      element.dataset.markerId = marker.id;
      element.setAttribute('role', 'button');
      element.tabIndex = 0;

      const iconElement = document.createElement('div');
      iconElement.className = classNames.mapMarkerIcon;
      const iconNode = document.createElement('i');
      iconNode.className = classNames.mapMarkerIconNode;
      iconElement.appendChild(iconNode);

      const labelElement = document.createElement('div');
      labelElement.className = classNames.mapMarkerLabel;

      const cardElement = document.createElement('div');
      cardElement.className = classNames.mapMarkerCard;
      const titleElement = document.createElement('div');
      titleElement.className = classNames.mapMarkerTitle;
      const groupElement = document.createElement('div');
      groupElement.className = classNames.mapMarkerGroup;
      const summaryElement = document.createElement('div');
      summaryElement.className = classNames.mapMarkerSummary;
      cardElement.append(titleElement, groupElement, summaryElement);

      element.append(iconElement, labelElement, cardElement);

      const handleSelect = () => {
        setActiveMarkerId(marker.id);
        onMarkerSelect?.(marker.id);
      };

      const handlePointerDown = (event: PointerEvent) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        const viewer = viewerRef.current;
        viewer?.setMouseNavEnabled(false);
        draggingRef.current = { id: marker.id, pointerId: event.pointerId };
        element.setPointerCapture(event.pointerId);
      };

      const handlePointerMove = (event: PointerEvent) => {
        const dragging = draggingRef.current;
        if (!dragging || dragging.id !== marker.id) return;
        const nextPoint = getNormalizedPointFromClient(event.clientX, event.clientY);
        if (!nextPoint) return;
        updateMarker(marker.id, { position: nextPoint });
      };

      const handlePointerUp = (event: PointerEvent) => {
        const dragging = draggingRef.current;
        if (!dragging || dragging.id !== marker.id) return;
        draggingRef.current = { id: null, pointerId: null };
        element.releasePointerCapture(event.pointerId);
        const viewer = viewerRef.current;
        viewer?.setMouseNavEnabled(true);
      };

      element.addEventListener('click', handleSelect);
      element.addEventListener('pointerdown', handlePointerDown);
      element.addEventListener('pointermove', handlePointerMove);
      element.addEventListener('pointerup', handlePointerUp);
      element.addEventListener('pointercancel', handlePointerUp);

      return element;
    },
    [classNames, getNormalizedPointFromClient, onMarkerSelect, updateMarker],
  );

  const syncMarkerOverlays = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const imageItem = viewer.world.getItemAt(0);
    if (!imageItem) return;
    const size = imageItem.getContentSize();
    if (!size.x || !size.y) return;
    const overlayMap = overlayMapRef.current;
    const markerIds = new Set(mapMarkers.map(marker => marker.id));

    overlayMap.forEach((element, id) => {
      if (!markerIds.has(id)) {
        viewer.removeOverlay(element);
        overlayMap.delete(id);
      }
    });

    mapMarkers.forEach(marker => {
      const imagePoint = new OpenSeadragon.Point(
        marker.position.nx * size.x,
        marker.position.ny * size.y,
      );
      const viewportPoint = viewer.viewport.imageToViewportCoordinates(imagePoint);
      let element = overlayMap.get(marker.id);
      if (!element) {
        element = createMarkerElement(marker);
        overlayMap.set(marker.id, element);
      } else {
        viewer.removeOverlay(element);
      }
      viewer.addOverlay({
        element,
        location: viewportPoint,
        placement: OpenSeadragon.Placement.CENTER,
      });
      updateMarkerElement(element, marker, marker.id === activeMarkerId);
    });
  }, [activeMarkerId, createMarkerElement, mapMarkers, updateMarkerElement]);

  useEffect(() => {
    syncMarkerOverlaysRef.current = syncMarkerOverlays;
  }, [syncMarkerOverlays]);

  return {
    markers: mapMarkers,
    setMarkers: setMapMarkers,
    activeMarkerId,
    setActiveMarkerId,
    markerAddMode,
    setMarkerAddMode,
    updateMarker,
    deleteMarker,
    addMarkerAt,
    focusMarker,
    getNormalizedPointFromClient,
    syncMarkerOverlaysRef,
    viewerRef,
    overlayMapRef,
  };
};
