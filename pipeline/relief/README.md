# Relief map data

`make-lake.mjs` builds the files the 3D relief map needs for one lake: the website's hero and
interactive map (`public/hero/`), and the same model in the apps.

```
node pipeline/relief/make-lake.mjs <lake> [--out <dir>]     # lakes are configured in lakes.json
```

It writes `<lake>.json`, `<lake>-dem.png`, `<lake>-dem-half.png` and `<lake>-mask.png` (to
`pipeline/relief/out/` by default). Downloads are kept in `pipeline/relief/.cache/`.

## The recipe

It is the one the first lake (Lucerne, made in Claude Design) was built with. Rebuilding Lucerne
with this tool gives the identical elevation image (100% of pixels), the identical frame, and a
lake mask that matches on 99.8% of pixels.

1. **Frame.** The lake's outline from OpenStreetMap (a relation or way id, `osm` in `lakes.json`),
   its bounding box plus a margin on every side (150 px by default, `margin`), on whole pixels of the
   Web Mercator grid at zoom 12 (lowered automatically if the picture would be wider than 1600 px;
   `zoom` fixes it).
2. **Elevation.** Mapzen Terrain Tiles (`s3.amazonaws.com/elevation-tiles-prod/terrarium`), stitched
   and cropped, pixels unchanged: height in metres = `R*256 + G + B/256 - 32768`. The half-size copy
   (for phones, and for wide cuts) is 2 x 2 blocks averaged as heights, never per colour channel.
3. **Mask.** The lake, plus the other lakes in the frame (`alsoWater`, each an OSM id; without them
   they would show as dry valleys), drawn at double size and averaged down. Rivers are left out, so
   they do not cut channels through the towns.
4. **Piers and routes** (when `lakeId` names one of our lakes). From that lake's published timetable
   package: every pier on the lake itself (`piers`, with how many trips call there), and up to five
   real trips as example `routes` with their stops and times. A route is a path through the water
   (A* over the mask, kept off the shore, smoothed), so it never crosses land. `routes` in
   `lakes.json` picks them as `[from pier id, to pier id]`; otherwise the longest regular trip comes
   first, then the trips that add the most piers not yet shown. Piers on rivers are left out.
5. **Per-lake values** written into the json, all optional in `lakes.json`: `lakeLevel` (else the
   commonest height on the water), `exaggeration` (the map's default is 1.25; large, flat lakes will
   want 2 to 3), `center` (where the camera looks; else the middle of the lake's water), `distance`
   (camera distance against Lucerne's; else from the picture's shape), `labels` (the side of its pin
   each pier's name sits on; else away from the middle of its route).

## Adding a lake

Find its OpenStreetMap relation (search nominatim.openstreetmap.org for the lake's local name; for a
lake on a border check that the outline is the whole lake), add an entry to `lakes.json`, run the
tool, and look at it: `public/hero/Lacus Hero 3D B - Relief.html?lake=<lake>` with the files copied
into `public/hero/data/`. Then tune `exaggeration`, `center` and `labels` by eye, and add
`alsoWater` for any neighbouring lake that shows as a dry valley.

Credit required wherever a map made from these files is shown: "Elevation: Mapzen Terrain Tiles ·
Lakes © OpenStreetMap contributors".
