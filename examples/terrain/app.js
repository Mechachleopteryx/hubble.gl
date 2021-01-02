import React, {useState, useRef} from 'react';
import DeckGL from '@deck.gl/react';
import {TerrainLayer} from '@deck.gl/geo-layers';
import {useNextFrame, BasicControls, ResolutionGuide} from '@hubble.gl/react';
import {
  DeckAdapter,
  DeckScene,
  CameraKeyframes,
  hold,
  LayerKeyframes,
  FlyToKeyframes
} from '@hubble.gl/core';
import {easing} from 'popmotion';

const INITIAL_VIEW_STATE = {
  latitude: 46.24,
  longitude: -122.18,
  zoom: 11.5,
  bearing: 140,
  pitch: 60
};

// Set your mapbox token here
const MAPBOX_TOKEN = process.env.MapboxAccessToken; // eslint-disable-line

const TERRAIN_IMAGE = `https://api.mapbox.com/v4/mapbox.terrain-rgb/{z}/{x}/{y}.png?access_token=${MAPBOX_TOKEN}`;
const SURFACE_IMAGE = `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.png?access_token=${MAPBOX_TOKEN}`;

// https://docs.mapbox.com/help/troubleshooting/access-elevation-data/#mapbox-terrain-rgb
// Note - the elevation rendered by this example is greatly exagerated!
const ELEVATION_DECODER = {
  rScaler: 6553.6,
  gScaler: 25.6,
  bScaler: 0.1,
  offset: -10000
};

const getPrerecordedCameraKeyframes = () => {
  return new CameraKeyframes({
    timings: [0, 6000, 7000, 8000, 14000],
    keyframes: [
      {
        latitude: 46.24,
        longitude: -122.18,
        zoom: 11.5,
        bearing: 140,
        pitch: 60
      },
      {
        latitude: 46.24,
        longitude: -122.18,
        zoom: 11.5,
        bearing: 0,
        pitch: 60
      },
      {
        latitude: 36.1101,
        longitude: -112.1906,
        zoom: 12.5,
        pitch: 20,
        bearing: 15
      },
      {
        latitude: 36.1101,
        longitude: -112.1906,
        zoom: 12.5,
        pitch: 20,
        bearing: 15
      },
      {
        latitude: 36.1101,
        longitude: -112.1906,
        zoom: 12.5,
        pitch: 60,
        bearing: 180
      }
    ],
    easings: [easing.easeInOut, hold, easing.easeInOut, easing.easeInOut]
  });
};

const getKeyframes = () => {
  return {
    terrain: new LayerKeyframes({
      layerId: 'terrain',
      features: ['r', 'g', 'b'],
      keyframes: [
        {r: 255, g: 255, b: 255},
        {r: 255, g: 0, b: 0},
        {r: 255, g: 255, b: 0},
        {r: 0, g: 255, b: 0},
        {r: 0, g: 255, b: 255},
        {r: 0, g: 0, b: 255},
        {r: 255, g: 0, b: 255},
        {r: 255, g: 255, b: 255}
      ],
      timings: [0, 2000, 4000, 6000, 8000, 10000, 12000, 14000],
      easings: [
        easing.linear,
        easing.linear,
        easing.linear,
        easing.linear,
        easing.linear,
        easing.linear,
        easing.linear
      ]
    })
  };
};

/** @type {import('@hubble.gl/core/src/types').FrameEncoderSettings} */
const encoderSettings = {
  framerate: 30,
  webm: {
    quality: 0.8
  },
  jpeg: {
    quality: 0.8
  },
  gif: {
    sampleInterval: 1000
  }
};

export default function App() {
  const deckgl = useRef(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [viewStateA, setViewStateA] = useState(viewState);
  const [viewStateB, setViewStateB] = useState({
    latitude: 36.1101,
    longitude: -112.1906,
    zoom: 12.5,
    pitch: 20,
    bearing: 15
  });

  const nextFrame = useNextFrame();
  const [duration] = useState(15000);
  const [rainbow, setRainbow] = useState(false);

  const [cameraMode, setCameraMode] = useState('prerecorded');

  const getFlyToCameraKeyframes = () => {
    return new FlyToKeyframes({
      start: viewStateA,
      end: viewStateB,
      width: 640,
      height: 480,
      curve: 1
    });
  };

  const getDeckScene = animationLoop => {
    return new DeckScene({
      animationLoop,
      lengthMs: duration,
      width: 640,
      height: 480,
      initialKeyframes: getKeyframes()
    });
  };

  const [adapter] = useState(new DeckAdapter(getDeckScene));

  const getLayers = scene => {
    const terrain = scene.keyframes.terrain.getFrame();
    return [
      new TerrainLayer({
        id: 'terrain',
        minZoom: 0,
        maxZoom: 23,
        strategy: 'no-overlap',
        elevationDecoder: ELEVATION_DECODER,
        elevationData: TERRAIN_IMAGE,
        texture: rainbow ? null : SURFACE_IMAGE,
        wireframe: false,
        color: [terrain.r, terrain.g, terrain.b]
      })
    ];
  };

  const getCameraKeyframes =
    cameraMode === 'prerecorded' ? getPrerecordedCameraKeyframes : getFlyToCameraKeyframes;

  return (
    <div style={{position: 'relative'}}>
      <div style={{position: 'absolute'}}>
        <ResolutionGuide />
      </div>
      <DeckGL
        ref={deckgl}
        initialViewState={INITIAL_VIEW_STATE}
        viewState={viewState}
        onViewStateChange={({viewState: vs}) => {
          setViewState(vs);
        }}
        controller={true}
        {...adapter.getProps(deckgl, setReady, nextFrame, getLayers)}
      />
      <div style={{position: 'absolute'}}>
        {ready && (
          <BasicControls
            adapter={adapter}
            busy={busy}
            setBusy={setBusy}
            encoderSettings={encoderSettings}
            getCameraKeyframes={getCameraKeyframes}
            getKeyframes={getKeyframes}
          />
        )}
        <div style={{backgroundColor: 'rgba(255, 255, 255, 0.5)'}}>
          <label style={{fontFamily: 'sans-serif'}}>
            <input type="checkbox" checked={rainbow} onChange={() => setRainbow(!rainbow)} />
            Rainbow Animation
          </label>
        </div>
        <select value={cameraMode} onChange={e => setCameraMode(e.currentTarget.value)}>
          <option value="prerecorded">Prerecorded Sequence</option>
          <option value="fly-to">Interactive Fly-To</option>
        </select>
        <button disabled={cameraMode === 'prerecorded'} onClick={() => setViewStateA(viewState)}>
          Set FlyTo Start
        </button>
        <button disabled={cameraMode === 'prerecorded'} onClick={() => setViewStateB(viewState)}>
          Set FlyTo End
        </button>
      </div>
    </div>
  );
}
