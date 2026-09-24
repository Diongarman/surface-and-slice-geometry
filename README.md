# Surface & Slice

An interactive geometry explorer for connecting a surface, a cutting plane, its 3D intersection, and the corresponding 2D contour or cross-section. The highlighted point sets update with the plots.

## Run locally

No installation or build step is needed. Clone or download this repository, then open `dist/index.html` in a modern browser.

If you prefer a local web address, run this from the repository root:

```sh
python3 -m http.server 8000 --directory dist
```

Open [http://localhost:8000](http://localhost:8000). Stop the server with `Ctrl+C`. Everything runs in your browser; the equation is not sent to a server.

## Use the explorer

1. Pick a surface or enter an equation in the `z =` field, then click **Plot**. Both `x² + y²` and `z = x² + y²` work. Write multiplication explicitly, as in `2*x`.
2. Pick a horizontal plane `z = c`, a vertical plane `x = c` or `y = c`, or an oblique plane `z = ax + by + c`.
3. Move the sliders. Drag the 3D plot to rotate it, and scroll or pinch to zoom. The red curve appears in both the 3D plot and its 2D view.
4. Read `I = S ∩ P` under the plots for the highlighted 3D points. The `C` expression gives their coordinates in the flat view.

The surface input supports numbers, `x`, `y`, `+`, `-`, `*`, `/`, `^`, parentheses, and `sin`, `cos`, `tan`, `sqrt`, `abs`, `exp`, and `log`. Surfaces must be expressible as `z = f(x,y)`. The plotted horizontal domain is `[-2, 2]²`; the curves are sampled numerically. Displayed coefficients are rounded to one decimal place, while the plots use the unrounded slider values.

## Project files

- `dist/index.html`, `dist/styles.css`, `dist/app.js`: the complete static site, with no runtime dependencies.
- `tests/smoke.cjs`: optional checks for formulas, contours, presets, sliders, rotation, and zoom. Run with `node tests/smoke.cjs` from the repository root.
- `.openai/hosting.json`: configuration for the existing Sites deployment. It is not needed to run locally.
