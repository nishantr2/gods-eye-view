const TRANSFORM_VERSION = 'wgs84-enu-v1';
const WGS84_A = 6378137.0;
const WGS84_F = 1 / 298.257223563;
const WGS84_E2 = WGS84_F * (2 - WGS84_F);

function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label} must be finite`);
  return number;
}

function coordinate(point, label = 'coordinate') {
  if (!Array.isArray(point) || point.length < 2)
    throw new TypeError(`${label} must be [longitude, latitude]`);
  const lon = finite(point[0], `${label} longitude`);
  const lat = finite(point[1], `${label} latitude`);
  if (lon < -180 || lon > 180)
    throw new RangeError(`${label} longitude out of range`);
  if (lat < -90 || lat > 90)
    throw new RangeError(`${label} latitude out of range`);
  return [
    lon,
    lat,
    point.length > 2 ? finite(point[2], `${label} elevation`) : undefined,
  ];
}

function orient(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function segmentsIntersect(a, b, c, d) {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

/** Validate a bounded WGS84 Polygon without trusting the rendering engine. */
export function validatePropertyBoundary(boundary) {
  if (boundary?.type !== 'Polygon' || !Array.isArray(boundary.coordinates))
    return { valid: false, reason: 'boundary_polygon_required' };
  if (boundary.coordinates.length !== 1)
    return {
      valid: false,
      reason: 'holes_not_supported_in_property_mission_v1',
    };
  const raw = boundary.coordinates[0];
  if (!Array.isArray(raw) || raw.length < 4)
    return { valid: false, reason: 'boundary_insufficient_vertices' };
  let ring;
  try {
    ring = raw.map((point, index) => coordinate(point, `boundary[${index}]`));
  } catch (error) {
    return { valid: false, reason: error.message };
  }
  const first = ring[0];
  const last = ring.at(-1);
  if (first[0] !== last[0] || first[1] !== last[1])
    return { valid: false, reason: 'boundary_ring_must_be_closed' };
  const unique = new Set(
    ring.slice(0, -1).map(([lon, lat]) => `${lon},${lat}`),
  );
  if (unique.size < 3)
    return { valid: false, reason: 'boundary_requires_three_unique_vertices' };
  const segments = ring.length - 1;
  for (let i = 0; i < segments; i += 1) {
    for (let j = i + 1; j < segments; j += 1) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === segments - 1)) continue;
      if (segmentsIntersect(ring[i], ring[i + 1], ring[j], ring[j + 1]))
        return { valid: false, reason: 'boundary_self_intersects' };
    }
  }
  return { valid: true, ring };
}

export function boundaryCentroid(boundary) {
  const assessment = validatePropertyBoundary(boundary);
  if (!assessment.valid) throw new Error(assessment.reason);
  const points = assessment.ring.slice(0, -1);
  const sum = points.reduce(
    (acc, point) => [acc[0] + point[0], acc[1] + point[1]],
    [0, 0],
  );
  return {
    longitude: sum[0] / points.length,
    latitude: sum[1] / points.length,
  };
}

function ecef(latitude, longitude, elevation) {
  const lat = (latitude * Math.PI) / 180;
  const lon = (longitude * Math.PI) / 180;
  const n = WGS84_A / Math.sqrt(1 - WGS84_E2 * Math.sin(lat) ** 2);
  return [
    (n + elevation) * Math.cos(lat) * Math.cos(lon),
    (n + elevation) * Math.cos(lat) * Math.sin(lon),
    (n * (1 - WGS84_E2) + elevation) * Math.sin(lat),
  ];
}

export function createLocalSiteTransform(origin) {
  const latitude = finite(origin?.latitude, 'origin latitude');
  const longitude = finite(origin?.longitude, 'origin longitude');
  const elevation = finite(origin?.elevation, 'origin ellipsoidal elevation');
  coordinate([longitude, latitude]);
  const base = ecef(latitude, longitude, elevation);
  const lat = (latitude * Math.PI) / 180;
  const lon = (longitude * Math.PI) / 180;
  return Object.freeze({
    version: TRANSFORM_VERSION,
    sourceCrs: 'EPSG:4979',
    elevationDatum: 'WGS84 ellipsoid',
    origin: { latitude, longitude, elevation },
    toLocal(point) {
      const [pointLon, pointLat, pointElevation] = coordinate(point);
      if (pointElevation === undefined)
        throw new Error('ellipsoidal_elevation_required');
      const [x, y, z] = ecef(pointLat, pointLon, pointElevation);
      const [dx, dy, dz] = [x - base[0], y - base[1], z - base[2]];
      return {
        x: -Math.sin(lon) * dx + Math.cos(lon) * dy,
        y:
          -Math.sin(lat) * Math.cos(lon) * dx -
          Math.sin(lat) * Math.sin(lon) * dy +
          Math.cos(lat) * dz,
        z:
          Math.cos(lat) * Math.cos(lon) * dx +
          Math.cos(lat) * Math.sin(lon) * dy +
          Math.sin(lat) * dz,
      };
    },
  });
}

export function createPropertyDeepLink(baseUrl, property) {
  if (!property?.property_id) throw new Error('property_id_required');
  const url = new URL(baseUrl);
  url.searchParams.set('land_v', '1');
  url.searchParams.set('property_id', property.property_id);
  if (property.mission_id)
    url.searchParams.set('mission_id', property.mission_id);
  if (property.centroid) {
    url.searchParams.set(
      'lat',
      String(finite(property.centroid.latitude, 'centroid latitude')),
    );
    url.searchParams.set(
      'lon',
      String(finite(property.centroid.longitude, 'centroid longitude')),
    );
  }
  // Precise boundary geometry intentionally stays out of share URLs.
  return url.toString();
}

export function readPropertyDeepLink(url) {
  const parsed = new URL(url);
  if (parsed.searchParams.get('land_v') !== '1') return null;
  const propertyId = parsed.searchParams.get('property_id');
  if (!propertyId) return null;
  const lat = parsed.searchParams.get('lat');
  const lon = parsed.searchParams.get('lon');
  return {
    property_id: propertyId,
    mission_id: parsed.searchParams.get('mission_id') || null,
    centroid:
      lat !== null && lon !== null
        ? {
            latitude: finite(lat, 'centroid latitude'),
            longitude: finite(lon, 'centroid longitude'),
          }
        : null,
  };
}

export function createPropertyPayload(input) {
  if (!input?.property_id) throw new Error('property_id_required');
  const assessment = validatePropertyBoundary(input.boundary);
  if (!assessment.valid) throw new Error(assessment.reason);
  if (!input.true_north?.source) throw new Error('true_north_source_required');
  const centroid = input.centroid || boundaryCentroid(input.boundary);
  return Object.freeze({
    schema_version: 'PROPERTY_MISSION_V1',
    property_id: input.property_id,
    mission_id: input.mission_id || null,
    property_name: input.property_name || null,
    boundary: input.boundary,
    boundary_source: input.boundary_source || null,
    boundary_confidence: input.boundary_confidence ?? null,
    centroid,
    source_crs: input.source_crs || 'EPSG:4326',
    true_north: input.true_north,
    terrain: input.terrain || null,
    scene_ref: input.scene_ref || `land:${input.property_id}`,
    generated_at: input.generated_at || new Date().toISOString(),
  });
}

export function propertyOverlays(payload) {
  return [
    {
      id: `land:${payload.property_id}:boundary`,
      role: 'Plot_Boundary',
      geometry: payload.boundary,
    },
    {
      id: `land:${payload.property_id}:north`,
      role: 'North_Reference',
      origin: payload.centroid,
      bearing_degrees: 0,
      source: payload.true_north.source,
    },
  ];
}

/** Session-scoped spatial adapter. It owns no retry, approval or durable state. */
export function createPropertyMode({ surface }) {
  if (typeof surface?.terrain?.resolveEllipsoidalGround !== 'function')
    throw new TypeError('property mode requires terrain surface service');
  return Object.freeze({
    validateBoundary: validatePropertyBoundary,
    createPayload: createPropertyPayload,
    createDeepLink: createPropertyDeepLink,
    readDeepLink: readPropertyDeepLink,
    overlays: propertyOverlays,
    async collectTerrain(boundary) {
      const assessment = validatePropertyBoundary(boundary);
      if (!assessment.valid) throw new Error(assessment.reason);
      const points = assessment.ring
        .slice(0, -1)
        .map(([lon, lat]) => ({ lat, lon }));
      const resolved = await surface.terrain.resolveEllipsoidalGround(points);
      return {
        source: 'application.surface.terrain',
        elevation_datum: 'WGS84 ellipsoid',
        samples: points.map((point, index) => ({
          ...point,
          ...resolved[index],
        })),
      };
    },
  });
}
