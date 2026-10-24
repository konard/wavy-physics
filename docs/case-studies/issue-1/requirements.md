# Issue 1 Requirements, Solution Options and Evidence

Every requirement below is quoted or paraphrased from
[issue #1](https://github.com/konard/wavy-physics/issues/1) (text saved in
[data/issue-1.json](data/issue-1.json)). For each one we list the options
we considered, the chosen plan and where it is implemented and verified.
Status is **Done** for all of them. The two settings that only a
repository owner can change are listed under R12 and R11.

## Hypothesis

### R1. "Wave consists of waves as a fractal"

- Options:
  1. Fourier synthesis (a wave as a sum of waves).
  2. Weierstrass-type lacunary sums, which are self-similar at every scale.
  3. Berry's fractal quantum wavefunctions (a particle in a box with a
     discontinuous initial state).
- Plan: show options 1 and 2 interactively and measure the fractal
  dimension numerically. Cite option 3 and keep the physical "all the way
  down" claim marked as open.
- Implementation:
  - `src/physics/waves.js`: `squareWavePartialSum`, `gibbsPeak`,
    `weierstrass`, `weierstrassDimension` and `boxCountingDimension`
  - The site's "Waves of waves" tab.
- Evidence:
  - The benchmarks "Fourier synthesis overshoot (Gibbs)" (1.17898 against
    1.17898) and "Fractal dimension of a wave of waves" (1.356 against
    2 + ln a / ln b = 1.369).
  - Tests in `tests/physics-relativistic-nonlinear-fractal.test.js`.
  - Sources in [scientific-background.md](scientific-background.md#h-fractal-like-aspects-of-waves).

### R2. "All particles are wave packets or stable configurations of wave"

- Options:
  1. Linear wave packets, which spread.
  2. Bound standing waves (atomic orbitals).
  3. Nonlinear solitons, which keep their shape.
  4. Relativistic Dirac packets.
- Plan: implement all four, show where each holds together, and state
  honestly that free linear packets spread and that detection is
  particle-like (Born rule).
- Implementation:
  - `schrodinger.js`: packets, oscillator, tunnelling.
  - `hydrogen.js`: standing waves and Rydberg packets.
  - `nls.js`: solitons.
  - `dirac.js`.
  - On the site: the Matter waves tab, the Electron packet tab and the
    Hypothesis tab.
- Evidence:
  - The benchmarks "Free wave packet spreading", "Minimum uncertainty
    packet", "Soliton keeps its shape", "Solitons survive a collision",
    "Dirac packet group velocity" and "Zitterbewegung frequency".
  - `tests/physics-matter-waves.test.js` and
    `tests/physics-relativistic-nonlinear-fractal.test.js`.

## Simulation

### R3. "Explain how atom is waving in time"

- Options:
  1. A 3D time-dependent grid solver.
  2. Exact eigenfunction superpositions ψ = Σ cₙ ψₙₗₘ e^{−iEₙt}.
  3. A radial 1D solver.
- Plan: option 2 for the live picture, because it is exact and fast enough
  for phones. Option 3 shows the same levels emerging from the wave
  equation alone. The split-operator 2D solver relaxes the 1s/2s/2p waves
  numerically for validation.
- Implementation: `HydrogenSuperposition`, `createPlaneSampler`,
  `solveRadialStates`, and the Atom tab with five superpositions. Both
  |ψ|² and Re ψ are shown, together with the dipole against time.
- Evidence:
  - A stationary state is still and a superposition oscillates at
    (E₂ − E₁)/ħ (`tests/physics-hydrogen.test.js`).
  - The benchmarks "Hydrogen 1s/2s/2p energy from a relaxed wave" and
    "Charge-cloud oscillation → Lyman-α" (121.569 nm against 121.568 nm).
  - Screenshots in `docs/screenshots/tabs/atom-*.png`.

### R4. "How electron as a wave packet waving around the atom"

- Options:
  1. A circular Rydberg packet with Gaussian weights over n.
  2. A 2D Coulomb grid propagation.
- Plan: option 1, built from exact hydrogen waves with l = m = n − 1. It
  shows the classical Kepler orbit, the smearing caused by the
  anharmonic spacing, and the revival.
- Implementation: `circularWavePacket`, `keplerPeriod`, and the Electron
  packet tab.
- Evidence:
  - The benchmark "Rydberg wave packet orbit period" (within 0.7 % of
    T = 2πn³; the remaining difference is the dispersion of the packet).
  - The test "builds a Rydberg packet that orbits like a classical
    electron".
  - Screenshots in `docs/screenshots/tabs/orbit-*.png`.

### R5. "How light is result of changing in acceleration of charged waves"

- Options:
  1. Liénard–Wiechert retarded fields of a moving charge.
  2. FDTD Maxwell driven by a current.
  3. Semiclassical radiation of the atom's oscillating dipole.
  4. QED spontaneous emission.
- Plan: options 1 to 3 as wave calculations. Option 4 is computed as the
  Einstein A coefficient, so that the difference from the classical
  picture is visible, not hidden.
- Implementation:
  - `radiation.js` (`lienardWiechertField`, `larmorPower`,
    `lienardPower`, `poyntingFlux`).
  - `maxwell.js` (`FDTD1D`, `FDTD2D`).
  - `hydrogen.js` (`dipoleMatrixElement`, `einsteinA`,
    `radiativeLifetime`).
  - The Light tab: an oscillating charge, a single push, a kicked charge,
    and light meeting glass.
- Evidence: the benchmarks
  - "Larmor radiation", "Radiation of a circling charge", "Speed of a light
    pulse", "Reflection of light from glass" and "Dipole radiation pattern";
  - "Light from the oscillating atom", "Einstein A 2p/3p/3d",
    "2p radiative lifetime" (1.59619 ns against NIST 1.59622 ns) and
    "Lyman-α wavelength".

  Also `tests/physics-light.test.js`.

### R6. "...and so on"

- Plan: cover the other standard wave phenomena:
  - tunnelling;
  - the harmonic oscillator;
  - the uncertainty principle;
  - relativistic waves;
  - fine structure;
  - waves on a string.
- Evidence: the benchmarks "Quantum tunnelling probability", "Harmonic
  oscillator ground/first excited state", "Hydrogen ionization energy
  (Dirac)", "2p fine-structure splitting (Dirac)" and "Wave on a string
  vs d'Alembert".

### R7. "The most accurate physical simulation we can make to date based on latest science"

- Plan:
  - Constants from CODATA 2022 and reference data from NIST ASD 5.12.
  - Reduced-mass corrections, and Dirac energies for fine structure.
  - Spectral (FFT) split-operator propagation, which is unitary and
    accurate to second order in time and spectrally accurate in space.
  - Every remaining gap against experiment is named. These are QED
    effects: the Lamb shift, and g − 2 in the fine structure.
- Implementation: `constants.js`, `dirac.js` (`diracEnergy`), and
  `hydrogen.js` with the reduced mass.
- Evidence: ionization energy 13.5985 eV against NIST 13.5984 eV.
  Lyman-α 121.566 nm against 121.567 nm. See the table in
  [README.md](README.md#validation-results).

### R8. "Tested using all we know are correct and proven"

- Plan:
  - A validation suite in which every benchmark has a reference value, a
    citable source, a tolerance and a description of the method.
  - It runs in the unit tests, in the CLI, and live in the browser
    (Web Worker).
- Implementation: `src/physics/validation.js` (`runValidation`), the
  `wavy-physics validate` CLI and the Validation tab.
- Evidence:
  - 30/30 pass ([data/validation-results.json](data/validation-results.json)).
  - `tests/physics-validation.test.js` runs on Node, Bun and Deno in CI,
    on Ubuntu, macOS and Windows.
  - Screenshot `docs/screenshots/tabs/validation-desktop-light.png`.

### R9. "We should only use wave-like math to actually calculate the simulation"

- Plan: every dynamical quantity comes from a wave equation:
  - Schrödinger, Dirac and nonlinear Schrödinger for matter;
  - Maxwell (FDTD) for light;
  - the d'Alembert wave equation for strings.

  There are two kinds of exception, both documented in the code:
  - the textbook source trajectories in Liénard–Wiechert, where a given
    charge motion is the input and the field is computed as a wave;
  - the ⟨r⟩ marker and the Bohr circle drawn for comparison.

- Evidence: the module list in [README.md](README.md#design). No solver
  integrates point-particle equations of motion.

### R10. "It must be fully correct according to all best science"

- Plan: label each claim as Established, Interpretation or
  Open/Speculative. Never present the hypothesis's speculative parts as
  results.
- Implementation:
  - The Hypothesis tab, which also plots semiclassical power against QED.
  - [scientific-background.md](scientific-background.md), with its
    summary table.
- Evidence: [README.md](README.md#the-hypothesis-checked-against-current-physics).

## Deliverables

### R11. "Please make me library"

- Options: a new package, or reuse of an existing one
  ([existing-libraries.md](existing-libraries.md)). No browser library
  combines Schrödinger, Dirac, Maxwell and validation, and the scientific
  ones (QuTiP, MEEP) are native or Python.
- Plan:
  - An ES module package `wavy-physics` with no runtime dependencies.
  - Types in `src/index.d.ts` and a CLI.
  - It works on Node, Bun, Deno and browsers.
- Evidence:
  - `src/index.js` and `bin/wavy-physics.js`.
  - `examples/basic-usage.js`.
  - The test matrix in `.github/workflows/release.yml`.
  - The changeset `.changeset/everything-is-a-wave.md`.
- Human action: publishing to npm needs an npm trusted publisher for
  `wavy-physics`.

### R12. "GitHub Pages website"

- Plan: build `examples/universal-app` with Vite and deploy it with
  `.github/workflows/example-app.yml` (upload-pages-artifact and
  deploy-pages).
- Evidence: the workflow's build job on the PR. Screenshots in
  `docs/screenshots/tabs/`.
- Human action: Settings → Pages → Source = GitHub Actions.

### R13. "See it on any device, it should support mobile and other screen sizes on all OSes"

- Plan:
  - Responsive CSS: grids collapse at 960 px or less, the tab bar
    scrolls, canvases are fluid, and the layout works down to 320 px.
  - Touch-friendly controls, light and dark themes, reduced motion.
  - No WebGL requirement: Canvas 2D runs in every browser.
  - The same app is packaged for desktop (Electron on Ubuntu, macOS and
    Windows) and mobile (Capacitor Android and iOS) in `example-app.yml`.
- Evidence:
  - `experiments/screenshot-tabs.mjs` captures every tab at 1366×900 and
    390×844 in both themes and checks for horizontal overflow and page
    errors. None were found. The 28 images are in
    `docs/screenshots/tabs/`.

## Case study

### R14. "Collect data related about the issue ... compile that data to `./docs/case-studies/issue-1`"

- Evidence: [data/issue-1.json](data/issue-1.json),
  [data/pull-request-2.json](data/pull-request-2.json) and
  [data/validation-results.json](data/validation-results.json).

### R15. "Deep case study analysis (also make sure to search online for additional facts and data)"

- Evidence: [README.md](README.md) and
  [scientific-background.md](scientific-background.md), with NIST, CODATA
  and DOI-cited papers checked online in October 2026.

### R16. "List of each and all requirements from the issue"

- Evidence: this file, R1–R19.

### R17. "Propose possible solutions and solution plans for each requirement"

- Evidence: the "Options" and "Plan" entries above.

### R18. "Check known existing components/libraries"

- Evidence: [existing-libraries.md](existing-libraries.md) covers QuTiP,
  PySCF, Psi4, Octopus, qmsolve, MEEP, openEMS, PhET, Falstad, Schroeder,
  QM-Simulator-2D, Atom in a Box, FFT libraries, three.js, regl, NIST ASD
  and CODATA. It gives licences and a reuse decision for each.

### R19. "Plan and execute everything in this single pull request"

- Evidence: <https://github.com/konard/wavy-physics/pull/2> contains the
  library, the site, the tests, the case study and the screenshots.
