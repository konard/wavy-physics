# Existing libraries, tools and data sources (issue #1)

This survey lists software and reference data that solve problems similar to
the ones in [issue #1](https://github.com/konard/wavy-physics/issues/1):
simulating physics in the browser using only wave equations (time-dependent
Schrödinger, Dirac, Maxwell/FDTD, nonlinear wave equations).

Method: every entry was checked against its own homepage, its GitHub
repository (via the GitHub API) or its npm registry entry in October 2026.
Licences are given as reported by GitHub or npm. "Relation" is our own
assessment of how the project could be used here.

Legend for the "Relation" field:

- **Reference** - read its documentation/algorithms; do not depend on it.
- **Validation** - run it offline (Python/C++) to produce reference numbers
  for our tests.
- **Dependency candidate** - could be used directly in the browser library.
- **Not suitable for browser** - native or server-side code only.

## 1. Quantum dynamics and quantum chemistry (validation, offline)

### QuTiP (Quantum Toolbox in Python)

- Link: <https://qutip.org/>, source <https://github.com/qutip/qutip>
- Language / licence: Python (NumPy, SciPy, Cython back ends); BSD-3-Clause.
- What it does: the README describes it as "open-source software for
  simulating the dynamics of closed and open quantum systems", supporting
  Hamiltonians and collapse operators with arbitrary time dependence. The
  homepage lists quantum optics, quantum information, open systems and
  opto-mechanics as application areas.
- Relation: **Validation**, **not suitable for browser**. QuTiP works in
  abstract Hilbert spaces (two-level atoms, cavity modes) rather than on
  spatial grids. Useful to cross-check Rabi oscillations, two-level
  spontaneous-emission decay (Lindblad) and expectation values that our
  grid-based simulation of a hydrogen 2p→1s transition should reproduce.

### Qiskit Dynamics (optional)

- Link: <https://github.com/qiskit-community/qiskit-dynamics>
- Language / licence: Python (NumPy, optional JAX); Apache-2.0.
- What it does: tools for building and numerically solving time-dependent
  quantum models (frame transformations, rotating-wave approximation).
- Status: the repository is marked **deprecated** ("This repo is no longer
  being actively maintained") and was archived on 31 October 2025.
- Relation: **Reference only**. Do not depend on it.

### PySCF

- Link: <https://pyscf.org/>, source <https://github.com/pyscf/pyscf>
- Language / licence: Python with C/C++ kernels; Apache-2.0.
- What it does: "Extensive collection of electronic structure methods, for
  molecules and periodic solids". Its user guide includes a page on
  "Time-dependent Hartree-Fock and density functional theory"
  (<https://pyscf.org/user/tddft.html>).
- Relation: **Validation**, **not suitable for browser**. Can produce
  reference energies and excitation energies for small atoms/molecules
  (H, He, H2+) to compare against our grid eigen-solvers.

### Psi4

- Link: <https://psicode.org/>, source <https://github.com/psi4/psi4>
- Language / licence: C++ core with Python driver (pybind11); LGPL-3.0.
- What it does: open-source quantum chemistry; the homepage highlights
  multi-core "DFT, MP2, SAPT, and coupled-cluster" calculations.
- Relation: **Validation**, **not suitable for browser**. Same role as
  PySCF; one of the two is enough.

### Octopus (real-space TDDFT)

- Link: <https://octopus-code.org/>, source on GitLab (linked from the site).
- Language / licence: Fortran/C; GNU GPL (per the project description and
  the Octopus overview paper,
  <https://pubs.rsc.org/en/content/articlehtml/2015/cp/c5cp00351b>).
- What it does: propagates Kohn-Sham orbitals in real time on real-space
  grids under time-dependent electromagnetic fields (real-time TDDFT). Its
  documentation contains a "Maxwell" variable group (e.g.
  `MaxwellCouplingMode`), i.e. coupled Maxwell-matter propagation.
- Reference paper: Castro et al., "octopus: a tool for the application of
  time-dependent density functional theory", Phys. Status Solidi B (2006),
  <https://doi.org/10.1002/pssb.200642067>.
- Relation: **Reference** and **validation**. Octopus is conceptually the
  closest professional code to this project (real-space grids, real-time
  propagation, Maxwell coupling). Its algorithms (propagators, absorbing
  boundaries) are good reading. Not usable in a browser.

### qmsolve

- Link: <https://github.com/quantum-visualizations/qmsolve>
- Language / licence: Python (NumPy/SciPy, optional CuPy GPU); BSD-3-Clause.
- What it does: "A module for solving and visualizing the Schrödinger
  equation" for one and two particles in 1D, 2D and 3D. Eigenstates via
  ARPACK (`eigsh`) or LOBPCG; time evolution via split-step Fourier or
  Cayley/Crank-Nicolson. Uses Hartree atomic units. Examples include a 2D
  double slit, resonant tunnelling, hydrogen-like atoms with Stark/Zeeman
  fields, and two fermions in a 1D trap.
- Relation: **Reference** and **validation**. Almost the same feature set as
  our Schrödinger module, so its examples are a good checklist, and it can
  generate reference eigenvalues. Being BSD-licensed, porting ideas is
  unproblematic.

## 2. Electromagnetics (FDTD)

### MEEP

- Link: <https://meep.readthedocs.io/>, source
  <https://github.com/NanoComp/meep>
- Language / licence: C++ core with Python/Scheme/C++ APIs; GPL-2.0 (the
  docs say "GNU GPL").
- What it does: FDTD electromagnetics in 1D, 2D, 3D and cylindrical
  coordinates; PML absorbing boundaries; dispersive, nonlinear (Kerr,
  Pockels), gyrotropic media; Poynting flux, near-to-far-field transforms,
  local density of states; MPI parallelism.
- Relation: **Reference** and **validation**. The de-facto standard for
  checking a Yee/FDTD implementation (dipole radiation pattern, PML
  reflection). GPL means we must not copy code into an MIT/Unlicense
  library; reading the documentation is fine.

### openEMS

- Link: <https://www.openems.de/>, source <https://github.com/thliebig/openEMS>
- Language / licence: C++; GPL-3.0 (GitHub). Scripting via Matlab, Octave or
  Python.
- What it does: "a free and open electromagnetic field solver using the FDTD
  method"; the repository description says EC-FDTD.
- Relation: **Reference** / **validation** for antenna-type problems.
  **Not suitable for browser**.

### Browser FDTD projects

- **maxwell-simulation / cemsim** -
  <https://github.com/RobinKa/maxwell-simulation>, live at
  <https://cemsim.com/>. TypeScript + React + regl (WebGL); MIT. Interactive
  2D FDTD electromagnetic wave simulator with WebGL kernels. Relation:
  **reference** for GPU FDTD in WebGL and for the regl rendering approach.
- **webgl-fdtd** - <https://github.com/timdrysdale/webgl-fdtd>. JavaScript;
  MIT. "Interactive electromagnetic simulator for your browser, running on
  your GPU via WebGL." Relation: **reference**.
- **simpleFDTD** - <https://github.com/bcerjan/simpleFDTD>. JavaScript +
  WebAssembly; AGPL-3.0. 2D FDTD using leapfrog alternating-direction
  implicit updates, "for approximate results in the visible region".
  Relation: **reference only** (AGPL is incompatible with a permissive
  library).

## 3. Educational web simulations (reference for UX and expected behaviour)

### Paul Falstad's applets

- Index: <https://www.falstad.com/mathphysics.html>
- Language / licence: originally Java, "mostly been converted to
  Javascript". Licence page (<https://www.falstad.com/licensing.html>):
  classroom use unmodified is allowed; "Modification or redistribution for
  non-commercial purposes is allowed, as long as you credit me (Paul
  Falstad)"; other uses require contacting the author. Source is "generally
  available on that applet's web page".
- Relevant applets (names from the index page):
  - Hydrogen Atom - <https://www.falstad.com/qmatom/> (3D real and complex
    hydrogen orbitals and their combinations).
  - Atomic Dipole Transitions - <https://www.falstad.com/qmatomrad/>
    (absorption/stimulated emission driven by a classical wave tuned to the
    Bohr frequency, e.g. ground state to 2p(x)). JavaScript version by Bob
    Hanson's team.
  - 1-D Quantum Mechanics - <https://www.falstad.com/qm1d/>
  - 1-D Quantum Transitions - <https://www.falstad.com/qm1drad/>
  - 2-D square/circular wells, 2-D/3-D harmonic oscillators, molecular
    orbitals, quantum crystals, rigid rotator.
  - 2-D Electrodynamics TE/TM - <https://www.falstad.com/emwave1/>,
    <https://www.falstad.com/emwave2/>
  - Antenna - <https://www.falstad.com/antenna/>
  - Ripple Tank - <https://www.falstad.com/ripple/>
- Relation: **Reference** for interaction design and as a qualitative
  check ("does our superposition of 1s and 2p look the same?"). The
  non-commercial licence means code should not be copied into this library.

### PhET Interactive Simulations (University of Colorado Boulder)

- Site: <https://phet.colorado.edu/>
- Relevant simulations: "Models of the Hydrogen Atom", "Quantum Wave
  Interference", "Davisson-Germer: Electron Diffraction", "Quantum Tunneling
  and Wave Packets", "Bound States", "Wave Interference", "Radiating
  Charge". Several older ones are Java simulations that PhET now runs in the
  browser via CheerpJ (the pages reference CheerpJ).
- Licence: PhET regular HTML simulation files are licensed CC BY 4.0
  (<https://phet.colorado.edu/en/licensing/html>); historically HTML sim
  source was GPL-3.0 and common code MIT. As of October 2026 the
  `phetsims` GitHub repositories (e.g.
  <https://github.com/phetsims/quantum-wave-interference>) carry a notice
  that they are "no longer actively maintained" and that the new monorepo
  "is not publicly available at this time".
- Relation: **Reference** for pedagogy (what concepts students are shown).
  Not a code dependency.

### Daniel V. Schroeder's HTML5 quantum simulations

- Index: <https://physics.weber.edu/schroeder/software/>
- What: "HTML5/JavaScript web apps" including 1D time evolution (square
  well, harmonic oscillator, wavepackets, barrier scattering), "Quantum Bound
  States in Two Dimensions", "Quantum Scattering in Two Dimensions",
  "Colliding Wavepackets" (two-particle entanglement), "Entanglement in a
  Box", and a "Wave Builder" for Fourier synthesis.
- Relation: **Reference**. Simple, readable single-file JavaScript
  implementations of exactly the kind of wave-packet demos planned here.

### QM-Simulator-2D (marl0ny)

- Link: <https://github.com/marl0ny/QM-Simulator-2D>, live at
  <https://marl0ny.github.io/QM-Simulator-2D/index.html>
- Language / licence: JavaScript + WebGL; BSD-2-Clause.
- What it does: single quantum particle in a 2D box with user-drawn
  potentials and Gaussian wave packets. Default integrator is Visscher's
  staggered real/imaginary scheme (Computers in Physics 5, 596 (1991),
  <https://doi.org/10.1063/1.168415>); Crank-Nicolson and split-operator are
  also available. Includes a **2D Dirac equation** simulation (staggered
  grids after Hammer and Pötz, <https://arxiv.org/abs/1306.5895>) and a
  split-operator Dirac variant.
- Relation: **Reference** (closest existing open browser project for
  Schrödinger + Dirac on the GPU). Permissive licence.

### Other small browser projects found

- <https://github.com/hfatih/quantum-double-slit> (MIT): WebGL2 2D
  double-slit TDSE demo.
- <https://github.com/flimsyhat/webgl-schrodinger-simulation> (no licence
  declared; last pushed 2020).
- These are very small projects; treat as inspiration only.

## 4. Hydrogen orbital viewers

### Atom in a Box (Dean Dauger)

- Link: <https://www.dauger.com/orbitals/>
- Platform / licence: classic Mac OS / Mac OS X, PowerPC; US $20 shareware.
- What it does: real-time 3D rendering of hydrogen probability clouds,
  "all 140 eigenstates up to the n=7 energy level", superpositions of "up to
  eight of those eigenstates".
- Relation: **Reference** for the idea of showing time-dependent
  superpositions (an atom "waving in time"). Not usable code.

### Electron-Orbital-Simulator (stef1949)

- Link: <https://github.com/stef1949/Electron-Orbital-Simulator>, live at
  <https://stef1949.github.io/Electron-Orbital-Simulator/>
- Language / licence: JavaScript; GitHub reports `NOASSERTION` (check the
  repository before reuse).
- What it does: browser hydrogen orbital visualiser with CPU, WebGL and
  WebGPU paths using normalised hydrogenic radial functions and real
  spherical harmonics.
- Relation: **Reference** for analytic-orbital rendering.

## 5. FFT libraries for JavaScript (dependency candidates)

The split-step (split-operator) Fourier method
(Feit, Fleck and Steiger, J. Comput. Phys. 47, 412 (1982),
<https://doi.org/10.1016/0021-9991(82)90091-2>) needs fast complex FFTs.

| Library      | Link                                                | Licence                           | Notes                                                                                                                                                               |
| ------------ | --------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fft.js       | <https://github.com/indutny/fft.js>                 | MIT (npm)                         | Radix-4, power-of-two sizes only, interleaved `[re, im, ...]` arrays; `transform`, `inverseTransform`, `realTransform`. 1D only.                                    |
| ndarray-fft  | <https://github.com/scijs/ndarray-fft>              | MIT                               | `fft(dir, x, y)` in place on ndarrays (separate re/im arrays), multi-dimensional; Bluestein fallback for non-power-of-two; inverse scaled by 1/N. Last pushed 2016. |
| kissfft (C)  | <https://github.com/mborgerding/kissfft>            | BSD-3-Clause                      | Reference C library; actively maintained.                                                                                                                           |
| kissfft-wasm | <https://github.com/iVilja/kissfft-wasm>            | MIT (KissFFT itself BSD-3-Clause) | Emscripten/WebAssembly build; `fft`, `ifft`, `rfft`, `irfft`; interleaved data; the `.wasm` file may need to be copied manually when bundling.                      |
| kissfft-js   | npm `kissfft-js`                                    | MIT                               | Older Emscripten port of KissFFT.                                                                                                                                   |
| jsfft        | <https://github.com/dntj/jsfft>                     | MIT                               | Small FFT implementation; last pushed 2020.                                                                                                                         |
| fft-js       | <https://github.com/vail-systems/node-fft>          | MIT (npm)                         | Simple Cooley-Tukey; last pushed 2021.                                                                                                                              |
| webfft       | npm `webfft` (<https://github.com/IQEngine/WebFFT>) | MIT                               | Benchmarks several JS/WASM back ends.                                                                                                                               |

Recommendation for this project: a small in-house radix-2 complex FFT
(about 60 lines, `Float64Array`, separate re/im arrays) is easy to test
against the DFT definition and avoids a dependency. If performance becomes
a problem, `fft.js` (MIT, zero dependencies) is the most mature pure-JS
option; 2D/3D transforms are then built from row/column 1D passes.

## 6. Rendering

### three.js

- Link: <https://github.com/mrdoob/three.js> (npm `three`)
- Licence: MIT. Description: "JavaScript 3D Library."
- Relation: **Dependency candidate** for 3D views (isosurfaces, point
  clouds, volume rendering of |psi|^2). Heavy for simple 2D heat maps.

### regl

- Link: <https://github.com/regl-project/regl> (npm `regl`)
- Licence: MIT. Description: "Functional WebGL"; npm: "a fast functional
  WebGL framework".
- Relation: **Dependency candidate** for GPU compute-by-fragment-shader
  (used by cemsim above). For a first version, plain Canvas 2D
  `ImageData` is sufficient for 1D/2D fields and has no dependency.

## 7. Reference data (validation)

### NIST Atomic Spectra Database (ASD)

- Link: <https://physics.nist.gov/asd>
- Version: 5.12, released 7 November 2024; it updated its unit conversions
  to CODATA 2022 (version history:
  <https://physics.nist.gov/PhysRefData/ASD/Html/verhist.shtml>).
- Recommended citation: Kramida, A., Ralchenko, Yu., Reader, J. and NIST
  ASD Team (2024). NIST Atomic Spectra Database (version 5.12).
  <https://doi.org/10.18434/T4W30F>
- Relation: **Validation**. Source of hydrogen level energies, Lyman-alpha
  wavelength and Einstein A coefficients used in tests (values in
  [scientific-background.md](./scientific-background.md)).

### CODATA recommended values (NIST)

- Link: <https://physics.nist.gov/cuu/Constants/>
- Publication: Mohr, Newell, Taylor and Tiesinga, "CODATA recommended values
  of the fundamental physical constants: 2022", Rev. Mod. Phys. 97, 025002
  (2025), <https://doi.org/10.1103/RevModPhys.97.025002>; preprint
  <https://arxiv.org/abs/2409.03787>.
- Relation: **Validation** / constants module. Exact digits are listed in
  [scientific-background.md](./scientific-background.md#i-codata-2022-constants).

## 8. Summary: what to reuse

| Need                  | Choice                                   | Why                                                           |
| --------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| TDSE propagation      | Own split-step Fourier + Crank-Nicolson  | Small, testable; qmsolve and QM-Simulator-2D as references    |
| Dirac 1D              | Own split-operator in momentum space     | QM-Simulator-2D, Gerritsma et al. 2010 as reference behaviour |
| Maxwell               | Own Yee FDTD (Yee 1966)                  | MEEP/openEMS for validation, cemsim for WebGL ideas           |
| FFT                   | Own radix-2, optionally `fft.js`         | MIT, zero dependencies                                        |
| Rendering             | Canvas 2D first, `three.js`/`regl` later | No build step required for GitHub Pages                       |
| Constants and spectra | CODATA 2022, NIST ASD 5.12               | Authoritative, citable                                        |
| Offline cross-checks  | QuTiP, PySCF/Psi4, MEEP                  | Python tools, not shipped                                     |

Licences to avoid copying code from: MEEP (GPL-2.0), openEMS (GPL-3.0),
Octopus (GPL), Psi4 (LGPL-3.0), simpleFDTD (AGPL-3.0), Falstad applets
(non-commercial). Permissive sources: QuTiP, qmsolve (BSD-3-Clause),
PySCF (Apache-2.0), QM-Simulator-2D (BSD-2-Clause), cemsim, fft.js,
ndarray-fft, three.js, regl (MIT).
