import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLocalSiteTransform,
  createPropertyDeepLink,
  createPropertyMode,
  createPropertyPayload,
  readPropertyDeepLink,
  validatePropertyBoundary,
} from './propertyMode.js';

const square = {
  type: 'Polygon',
  coordinates: [
    [
      [85.32, 27.71],
      [85.33, 27.71],
      [85.33, 27.72],
      [85.32, 27.72],
      [85.32, 27.71],
    ],
  ],
};

test('rejects an insufficient or self-intersecting property boundary', () => {
  assert.equal(
    validatePropertyBoundary({
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    }).valid,
    false,
  );
  const bow = {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [1, 1],
        [0, 1],
        [1, 0],
        [0, 0],
      ],
    ],
  };
  assert.deepEqual(validatePropertyBoundary(bow), {
    valid: false,
    reason: 'boundary_self_intersects',
  });
});

test('builds a bounded property payload and stable scene reference', () => {
  const payload = createPropertyPayload({
    property_id: 'sow-valley',
    boundary: square,
    true_north: { source: 'survey-1' },
    generated_at: '2026-09-17T00:00:00.000Z',
  });
  assert.equal(payload.schema_version, 'PROPERTY_MISSION_V1');
  assert.equal(payload.scene_ref, 'land:sow-valley');
  assert.equal(payload.centroid.latitude, 27.715);
});

test('deep link restores identity but does not leak the precise boundary', () => {
  const link = createPropertyDeepLink('https://example.test/view', {
    property_id: 'p-1',
    mission_id: 'm-1',
    centroid: { latitude: 27.7, longitude: 85.3 },
    boundary: square,
  });
  assert.equal(link.includes('coordinates'), false);
  assert.deepEqual(readPropertyDeepLink(link), {
    property_id: 'p-1',
    mission_id: 'm-1',
    centroid: { latitude: 27.7, longitude: 85.3 },
  });
});

test('local transform is deterministic and preserves north/east orientation', () => {
  const transform = createLocalSiteTransform({
    latitude: 27.7,
    longitude: 85.3,
    elevation: 1000,
  });
  const east = transform.toLocal([85.3001, 27.7, 1000]);
  const north = transform.toLocal([85.3, 27.7001, 1000]);
  assert.equal(transform.version, 'wgs84-enu-v1');
  assert.ok(east.x > 0);
  assert.ok(north.y > 0);
});

test('terrain collection uses the accepted application surface service', async () => {
  const mode = createPropertyMode({
    surface: {
      terrain: {
        async resolveEllipsoidalGround(points) {
          return points.map((_, index) => ({
            ellipsoid: 100 + index,
            source: 'reearth',
          }));
        },
      },
    },
  });
  const terrain = await mode.collectTerrain(square);
  assert.equal(terrain.samples.length, 4);
  assert.equal(terrain.samples[0].ellipsoid, 100);
  assert.equal(terrain.elevation_datum, 'WGS84 ellipsoid');
});
