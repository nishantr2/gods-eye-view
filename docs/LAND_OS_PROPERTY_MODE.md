# Land OS property mode

God’s Eye exposes a session-scoped `propertyMode` through application operations.
It validates one WGS84 GeoJSON Polygon, samples the existing terrain service,
returns a bounded `PROPERTY_MISSION_V1` payload, creates stable overlay IDs and
provides a property/mission deep link. Precise boundary geometry is deliberately
excluded from share URLs.

The mode is a spatial interface only. It does not schedule work, persist canon,
retry providers or approve boundaries. Google/Cesium photorealistic geometry is
contextual and is not converted into editable private geometry by this module.

The local transform is versioned `wgs84-enu-v1`, consumes EPSG:4979 ellipsoidal
heights and preserves east/north/up axes for Blender. It rejects missing
elevation instead of silently guessing a datum.

```sh
npm ci
node --test src/land/propertyMode.test.mjs src/app/operations.test.mjs
npm run build
```
