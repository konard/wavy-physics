# Issue 1 Case Study: Everything Is a Wave

Issue: <https://github.com/konard/wavy-physics/issues/1>
Pull request: <https://github.com/konard/wavy-physics/pull/2>
Live site: <https://konard.github.io/wavy-physics/>

## Contents of this folder

| File                                                         | What it holds                                                                     |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| [README.md](README.md)                                       | This analysis: data, hypothesis review, design, results, limits                   |
| [requirements.md](requirements.md)                           | Every requirement of the issue, the options considered, the plan and the evidence |
| [scientific-background.md](scientific-background.md)         | Online facts with sources (NIST, CODATA, papers), tagged by how established       |
| [existing-libraries.md](existing-libraries.md)               | Survey of libraries, simulators and data sets that solve similar problems         |
| [data/issue-1.json](data/issue-1.json)                       | The issue as returned by `gh issue view 1 --json ...` (title, body, labels)       |
| [data/pull-request-2.json](data/pull-request-2.json)         | The pull request metadata when the work started                                   |
| [data/validation-results.json](data/validation-results.json) | Output of `runValidation()`: computed vs reference value for all 30 benchmarks    |

## Data Collected

- **Issue text**: saved verbatim in `data/issue-1.json`. Labels:
  `documentation`, `enhancement`. The issue had no comments when this work
  was done, and the pull request had no review comments.
- **Reference physics**: hydrogen energies, wavelengths, Einstein A
  coefficients and lifetimes from the NIST Atomic Spectra Database 5.12
  (doi:10.18434/T4W30F). Constants from CODATA 2022. Formulas from the
  original papers (Larmor 1897, Liénard 1898, Schrödinger 1930 on
  Zitterbewegung, Zakharov–Shabat 1972, Yee 1966, Berry 1996 on fractal
  waves, Shen 2018 on the Weierstrass graph dimension). Every number and
  source is listed in [scientific-background.md](scientific-background.md).
- **Existing software**: QuTiP, PySCF, Psi4, Octopus, qmsolve, MEEP,
  openEMS, PhET, Falstad's applets, Schroeder's HTML5 simulations,
  QM-Simulator-2D, Atom in a Box, fft.js, three.js, regl. See
  [existing-libraries.md](existing-libraries.md), including licences.

## The Hypothesis, Checked Against Current Physics

The issue makes three claims. The site's "Hypothesis" tab gives the same
review in shorter form.

1. **"All particles are wave packets or stable configurations of waves."**
   In quantum field theory, the framework of the Standard Model,
   particles are excitations (quanta) of fields. Every measured property of
   the electron in an atom follows from one wave equation (Schrödinger, or
   Dirac when relativistic). The particle-like behaviour comes from
   localisation (packets), from stability (bound standing waves and
   solitons), and from the quantisation of the wave's energy. So the
   hypothesis matches the mathematics physicists actually use. Two points
   need care:
   - A free single-electron packet spreads (validated: σ(t) of a free
     Gaussian). A packet stays together only when something holds it,
     such as the Coulomb potential (Rydberg packets, which still
     dephase) or nonlinearity (solitons).
   - Detection is local, one click per particle, with Born-rule
     statistics. Wave equations alone do not produce single detection
     events. Every interpretation adds something for this: collapse,
     decoherence with many worlds, or Bohm's pilot wave. The Hypothesis tab
     names this as the main open point (Born rule).
2. **"Light is the result of changing acceleration of charged waves."** This
   is established. The charge density |ψ|² of an atom in a superposition of
   1s and 2p oscillates at the Bohr frequency (E₂ − E₁)/ħ. Its oscillating
   dipole radiates by Maxwell's equations at exactly the Lyman-α wavelength.
   The semiclassical radiated power, ħω·A·|c₁|²|c₂|², reproduces the NIST
   Einstein coefficient. Spontaneous emission from a pure excited state
   needs the quantised field (QED). The semiclassical picture explains why
   the light has that frequency, but not why a pure 2p state decays at all.
   The Light tab says this, and the Hypothesis tab plots semiclassical
   power against the QED result.
3. **"A wave consists of waves, as a fractal."** This holds mathematically
   in two senses:
   - Fourier: any wave is a sum of waves, and the sum can be repeated at
     every scale.
   - Weierstrass-type sums Σ aⁿ cos(bⁿx) are continuous, nowhere
     differentiable and have box dimension 2 + ln a / ln b. The validation
     measures it numerically: 1.356 against 1.369.

   Berry (1996) showed that quantum wavefunctions can be fractal in space
   and time. Whether physical waves contain more waves "all the way down"
   is open. At the Planck scale no tested theory applies. The Fractal tab
   presents this as a hypothesis, not as a result.

Summary: the simulations show that a wave-only description reproduces
every measured number on the validation list. The open questions are where
the measurement problem and quantum gravity begin.

## Design

### Library (`src/physics`, exported from `src/index.js`, typed in `src/index.d.ts`)

All dynamics are wave equations. Particles are never moved as points,
except for the classical comparison curve and the textbook source
trajectories in Liénard–Wiechert radiation.

| Module              | Wave equation / content                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| `constants.js`      | CODATA 2022 SI values and Hartree atomic units                                                   |
| `fft.js`            | Radix-2 complex FFT (1D/2D), no dependencies                                                     |
| `split-operator.js` | Strang split-operator core, e^{−iVdt/2} e^{−iTdt} e^{−iVdt/2}, unitary to round-off              |
| `schrodinger.js`    | `Schrodinger1D/2D`: free packets, barriers, oscillators, imaginary-time ground states            |
| `hydrogen.js`       | Exact hydrogen waves ψₙₗₘ, `HydrogenSuperposition` (an atom waving in time), dipoles, Einstein A |
| `radial.js`         | Radial wave equation solved by imaginary-time relaxation (no analytic input)                     |
| `tunneling.js`      | Exact plane-wave transmission and packet averages                                                |
| `dirac.js`          | `Dirac1D` split-operator: relativistic packets, Zitterbewegung, exact Dirac hydrogen levels      |
| `nls.js`            | Nonlinear Schrödinger: solitons as particle-like waves                                           |
| `maxwell.js`        | Yee FDTD in 1D and 2D (TE), with dielectrics and absorbing boundaries                            |
| `radiation.js`      | Liénard–Wiechert retarded fields, Larmor and Liénard power, Poynting flux                        |
| `waves.js`          | String (d'Alembert), Fourier synthesis, Weierstrass "wave of waves", box-counting dimension      |
| `validation.js`     | 30 benchmarks, each with a reference value, source, tolerance and method                         |

### Website (`examples/universal-app`, deployed to GitHub Pages)

A Vite + React app. The `example-app.yml` workflow builds it and deploys it
to Pages. Tabs:

- **Atom**: |ψ|² or Re ψ in a plane through the nucleus, for 1s alone,
  1s + 2p₀, 1s + 2p₊₁, 2p₀ + 3d₀ or 2s + 3p₀. It shows the dipole
  against time, the emitted wavelength, the period and the lifetime.
- **Electron packet**: a circular Rydberg wave packet built from
  neighbouring n states. It orbits at the Kepler period, smears into a
  ring and later revives. The Bohr radius and the wave's ⟨r⟩ are drawn
  for comparison.
- **Light**:
  - Liénard–Wiechert fields of an oscillating charge, a single push and a
    kicked charge, with the radiation shell.
  - An FDTD pulse hitting glass.
- **Matter waves**: a free packet spreading, tunnelling through a
  barrier, a coherent state in a harmonic trap, a Dirac packet showing
  Zitterbewegung, and two colliding solitons.
- **Waves of waves**: a square wave built from sine waves (with the Gibbs
  overshoot), and the Weierstrass "waves on waves" with a zoom and its
  box-counting dimension.
- **Validation**: runs all 30 benchmarks in a Web Worker, live in the
  browser.
- **Hypothesis**: the claim-by-claim review above.

Responsiveness:

- A CSS grid collapses to one column at 960 px or less, and the tab bar
  scrolls horizontally.
- Canvases scale to the container width. The body works down to 320 px.
- Light and dark themes are supported, and reduced motion is respected.
- Screenshots of every tab at desktop 1366×900 and phone 390×844, in both
  themes, are in `docs/screenshots/tabs/`. The script
  `experiments/screenshot-tabs.mjs` generates them and reports any
  horizontal overflow or page errors. It reported none.

## Validation Results

`npx wavy-physics validate` (or the site's Validation tab) prints the
following. All 30 pass. The raw output is in
[data/validation-results.json](data/validation-results.json).

| Benchmark                                  | Computed      | Reference     | Source                                    |
| ------------------------------------------ | ------------- | ------------- | ----------------------------------------- |
| Free wave packet spreading (bohr)          | 2.69258       | 2.69258       | Exact Gaussian spreading                  |
| Minimum uncertainty packet (ħ)             | 0.500000      | 0.500000      | Heisenberg–Kennard                        |
| Harmonic oscillator E₀, E₁ (ħω)            | 0.5, 1.5      | 0.5, 1.5      | Exact                                     |
| Tunnelling probability                     | 0.5504        | 0.5541        | Exact T(E) averaged over the packet       |
| Hydrogen 1s, 2s, 2p (Hartree, relaxed)     | −0.499725 ... | −0.499728 ... | Schrödinger with reduced mass             |
| Ionization energy (Dirac, eV)              | 13.5985       | 13.5984       | NIST ASD (Lamb shift ≈ 2.5·10⁻⁶ remains)  |
| 2p fine structure (GHz)                    | 10.9437       | 10.9690       | NIST ASD (anomalous moment, QED, remains) |
| Rydberg packet orbit period (a.u.)         | 405003        | 402343        | Kepler / correspondence                   |
| Charge-cloud oscillation → Lyman-α (nm)    | 121.569       | 121.568       | Bohr frequency                            |
| Lyman-α wavelength (nm)                    | 121.566       | 121.567       | NIST ASD (Ritz, vacuum)                   |
| Einstein A 2p→1s, 3p→1s, 3d→2p (s⁻¹)       | 6.2649e8 ...  | 6.2648e8 ...  | NIST ASD                                  |
| 2p lifetime (ns)                           | 1.59619       | 1.59622       | NIST ASD                                  |
| Light from the oscillating atom            | 1.41992e−9    | 1.41992e−9    | Semiclassical radiation                   |
| Larmor / circling charge                   | 3.3336e−5 ... | 3.3333e−5 ... | Larmor, Liénard                           |
| Light pulse speed, Fresnel, dipole pattern | 1, −0.334, …  | 1, −0.333, 2  | Maxwell, Fresnel, sin²θ                   |
| Dirac group velocity, Zitterbewegung       | 0.7063, 2.826 | 0.7071, 2.828 | Relativistic kinematics, Schrödinger 1930 |
| Soliton shape, collision                   | 1.8e−5, 1.200 | 0, 1.2        | Zakharov–Shabat                           |
| String, Gibbs, fractal dimension           | 4e−14, 1.1790 | 0, 1.1790     | d'Alembert, Wilbraham–Gibbs, Shen 2018    |

The two largest gaps against experiment are known physics that the wave
equations used here do not include:

- the Lamb shift (QED vacuum fluctuations);
- the electron's anomalous magnetic moment.

The fractal-dimension gap comes from finite box counting; the tolerance in
`validation.js` documents it. The Rydberg period gap is real physics: a
packet with a spread of n has a mean period between T(n) values.

## Limits and Remaining Uncertainty

- The simulations run in 1D and 2D grids plus exact 3D hydrogen waves.
  A full 3D time-dependent grid solver for the whole atom would also run
  in the browser, but slowly. The exact eigenfunction superposition is
  both exact and fast, so it is used for the Atom tab.
- Spontaneous emission, the Lamb shift and g − 2 need quantised fields.
  The library reports these as the remaining differences against NIST.
  It does not tune them away.
- The fractal claim is presented as a mathematical fact (Weierstrass sums,
  Berry) together with an open physical hypothesis. No experiment exists
  that tests waves below the Planck length.

## Human Actions Needed After Merge

These cannot be done from a pull request and are documented in the PR:

1. Settings → Pages → Source = **GitHub Actions**, so `example-app.yml`
   can deploy the site to <https://konard.github.io/wavy-physics/>.
2. On npm, configure a trusted publisher for the `wavy-physics` package
   (this repository, `release.yml`) so the release workflow can publish.

## Verification

```bash
npm ci
npm test                      # node: library + physics tests
bun test                      # bun
deno test -A                  # deno
npx wavy-physics validate     # the 30 benchmarks
node examples/basic-usage.js  # walkthrough of the API
cd examples/universal-app && npm ci && npm run build && npm run preview
```
