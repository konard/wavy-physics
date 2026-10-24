# Scientific background for issue #1: "everything is a wave"

This fact sheet supports
[issue #1](https://github.com/konard/wavy-physics/issues/1). It collects the
established physics that the simulations must reproduce, the numbers used
for validation, and the more speculative ideas behind the hypothesis. The
hypothesis is that particles are wave packets or stable wave configurations,
and that "waves consist of waves as a fractal".

Every statement carries one of these tags:

- **[Established]**: textbook physics, confirmed by experiment, or a
  mathematical theorem.
- **[Interpretation]**: a consistent reading of established physics that
  makes no different predictions. Physicists and philosophers disagree on
  these.
- **[Open/Speculative]**: an unresolved question, or an idea that has not
  been confirmed.

All DOIs below were resolved in October 2026, and all numbers were copied
from the NIST pages cited.

## (a) Wave-particle duality and particles as quanta of fields

- **[Established]** Electrons, neutrons, atoms and photons show interference.
  Each detection event is still localised.
  - Tonomura et al. sent electrons through an electron biprism at 50 kV,
    one at a time. Single dots built up into an interference pattern:
    "Demonstration of single-electron buildup of an interference pattern",
    Am. J. Phys. 57, 117 (1989), <https://doi.org/10.1119/1.16104>.
- **[Established]** Quantum field theory (QFT) describes each particle
  species by a quantum field. "Particles" are the quantised excitations
  (quanta) of those fields. This is the standard formalism of the Standard
  Model.
- **[Interpretation]** Hobson argues that fields are fundamental and
  particles are not: "There are no particles, there are only fields",
  Am. J. Phys. 81, 211-223 (2013), <https://doi.org/10.1119/1.4789885>,
  preprint <https://arxiv.org/abs/1204.4616>. The abstract says "Particles
  are epiphenomena arising from fields."
- **[Interpretation]** Hobson's view was disputed in published comments:
  - de Bianchi, "Quantum fields are not fields", Am. J. Phys. 81, 707
    (2013), <https://doi.org/10.1119/1.4811240>,
    <https://arxiv.org/abs/1204.6384>.
  - Sciamanda, "There are no particles, and there are no fields", Am. J.
    Phys. 81, 645 (2013), <https://doi.org/10.1119/1.4812316>.
  - Hobson's reply: <https://doi.org/10.1119/1.4811783>.
- **[Interpretation / Open]** The Stanford Encyclopedia of Philosophy entry
  "Quantum Field Theory" (<https://plato.stanford.edu/entries/quantum-field-theory/>)
  treats the particle-versus-field ontology of QFT as an open question.
  - Section 5.1.1 lists problems for a particle interpretation: the Unruh
    effect, non-localisability (Malament's theorem, sect. 5.3) and Haag's
    theorem.
  - Section 5.1.2 notes problems for a naive field interpretation as well.
    Quantum "fields" are operator-valued, not classical field values at
    points.
- **[Interpretation]** Wilczek describes the modern vacuum as a structured
  medium, a modern "ether" of fields: "The persistence of ether", Physics
  Today 52(1), 11 (1999),
  <https://physicstoday.aip.org/opinion/the-persistence-of-ether>.

What this means for the project:

- **[Established]** Simulating a single-particle wave function psi(x, t)
  with the Schrödinger or Dirac equation is standard quantum mechanics.
- **[Interpretation]** Calling psi "the electron itself" is an
  interpretation. psi lives in configuration space: for N particles it is a
  function of 3N coordinates, not a field in ordinary 3D space.

## (b) de Broglie hypothesis and electron diffraction

- **[Established]** de Broglie proposed that matter has a wavelength
  lambda = h / p and frequency nu = E / h:
  - "Recherches sur la théorie des Quanta", Ann. Phys. 10(3), 22-128
    (1925), <https://doi.org/10.1051/anphys/192510030022>.
  - He received the 1929 Nobel Prize in Physics "for his discovery of the
    wave nature of electrons"
    (<https://www.nobelprize.org/prizes/physics/1929/summary/>).
- **[Established]** Davisson and Germer observed electron diffraction from
  a nickel crystal, in agreement with lambda = h / p: "Diffraction of
  Electrons by a Crystal of Nickel", Phys. Rev. 30, 705-740 (1927),
  <https://doi.org/10.1103/PhysRev.30.705>.
  - Davisson shared the 1937 Nobel Prize with G. P. Thomson, who
    independently observed electron diffraction in transmission.
- Validation idea:
  - A Gaussian packet with mean momentum p_0 = hbar k_0 must show fringe
    spacing lambda = 2 pi / k_0 in a double-slit run.
  - The packet must also move with group velocity p_0 / m.

## (c) Schrödinger equation and the hydrogen spectrum

- **[Established]** The time-dependent Schrödinger equation is
  i hbar d(psi)/dt = [-(hbar^2 / 2m) nabla^2 + V] psi. Schrödinger's papers:
  - "Quantisierung als Eigenwertproblem", Ann. Phys. 384, 361-376 (1926),
    <https://doi.org/10.1002/andp.19263840404>.
  - "An Undulatory Theory of the Mechanics of Atoms and Molecules", Phys.
    Rev. 28, 1049-1070 (1926), <https://doi.org/10.1103/PhysRev.28.1049>.
- **[Established]** For the Coulomb potential V = -e^2 / (4 pi eps0 r),
  the bound-state energies are E_n = -(mu / m_e) R_inf h c / n^2.
  - mu = m_e m_p / (m_e + m_p) is the reduced mass.
  - R_inf h c = E_h / 2 = 13.605 693 122 990 eV (CODATA 2022).
  - The reduced-mass Rydberg constant for hydrogen is
    R_H = R_inf mu / m_e = 10 967 758.340 m^-1, computed from CODATA 2022.
- **[Established]** Fine structure (Dirac), the Lamb shift (QED) and
  hyperfine structure shift these levels slightly. They are not in the
  nonrelativistic Schrödinger model.
- **[Established]** A superposition of two stationary states,
  c_1 psi_1 e^{-i E_1 t / hbar} + c_2 psi_2 e^{-i E_2 t / hbar}, has a
  probability density that oscillates at the Bohr angular frequency
  omega = (E_2 - E_1) / hbar.
  - This is the precise sense in which an atom "waves in time".
  - For 1s + 2p the charge cloud oscillates as an electric dipole, which
    couples to the radiation field.

### Lyman-alpha (2p -> 1s), NIST ASD 5.12

Source: NIST Atomic Spectra Database, H I lines and levels,
<https://physics.nist.gov/asd>, version 5.12 (November 2024). Cite as
Kramida, Ralchenko, Reader and NIST ASD Team (2024),
<https://doi.org/10.18434/T4W30F>.

| Transition          | Ritz lambda (vacuum) | A_ki (s^-1) | Acc. | g_i - g_k |
| ------------------- | -------------------- | ----------- | ---- | --------- |
| 1s 2S1/2 - 2p 2P3/2 | 121.566 823 7310 nm  | 6.2647e+08  | AAA  | 2 - 4     |
| 1s 2S1/2 - 2p 2P1/2 | 121.567 364 4608 nm  | 6.2648e+08  | AAA  | 2 - 2     |
| 1s - 2s (M1)        | 121.567 312 3130 nm  | 2.495e-06   | -    | 2 - 2     |

- Observed wavelength (vacuum), both fine-structure lines unresolved:
  **121.566 99 nm**. The n = 1 - 2 multiplet row gives 121.567 01 nm.
- Upper level energies (cm^-1):
  - 2p 2P1/2 = 82 258.919 1133
  - 2p 2P3/2 = 82 259.285 0014
  - 2s 2S1/2 = 82 258.954 399 2821
- Hydrogen ionisation energy: 109 678.771 743 07(10) cm^-1, which is
  13.598 434 599 702(12) eV.
- H-alpha, for reference (air wavelengths):
  - 2p 2P3/2 - 3d 2D5/2: 656.285 175 nm, A = 6.4651e+07 s^-1.
  - 2p 2P1/2 - 3d 2D3/2: 656.270 970 nm, A = 5.3877e+07 s^-1.

### Checks computed from CODATA 2022 (this project)

| Quantity                                          | Value                  |
| ------------------------------------------------- | ---------------------- |
| mu / m_e                                          | 0.999 455 679 4248     |
| Lyman-alpha, infinite nuclear mass, 4 / (3 R_inf) | 121.502 273 nm         |
| Lyman-alpha, reduced mass, 4 / (3 R_H)            | 121.568 446 nm         |
| A(2p -> 1s), nonrelativistic, infinite mass       | 6.268 32e8 s^-1        |
| A(2p -> 1s), nonrelativistic, reduced mass        | 6.264 90e8 s^-1        |
| tau(2p) = 1 / A, reduced mass                     | 1.596 19 ns            |
| tau from NIST A = 6.2648e8 / 6.2647e8             | 1.596 22 / 1.596 25 ns |

- **[Established]** How the A coefficient was computed:
  - In atomic units, A = (4/3) omega^3 |<1s|r|2p>|^2 / c^3, with
    omega = 3/8, |<1s|r|2p>|^2 = 2^15 / 3^10 and c = 1/alpha.
  - With the reduced mass, A scales as mu / m_e.
- **[Established]** The 6.2649e8 s^-1 quoted in the issue matches this
  nonrelativistic reduced-mass value. NIST lists 6.2648e8 and 6.2647e8 for
  the two fine-structure components; their accuracy class AAA means
  uncertainty of 0.3 % or less.
- **[Established]** The 2p lifetime is therefore about 1.596 ns.
- Suggested test tolerances:
  - Lyman-alpha within 0.01 nm of 121.567 nm when the reduced mass is used.
  - A within 0.1 % of 6.265e8 s^-1.

### Numerical method

- **[Established]** The split-operator (split-step Fourier) method is
  unitary and second-order accurate in time: Feit, Fleck and Steiger,
  "Solution of the Schrödinger equation by a spectral method", J. Comput.
  Phys. 47, 412-433 (1982),
  <https://doi.org/10.1016/0021-9991(82)90091-2>.

## (d) Dirac equation and Zitterbewegung

- **[Established]** Dirac's relativistic wave equation for the electron
  explains spin 1/2 and the magnetic moment (g = 2 at tree level), and gives
  the hydrogen fine structure: "The quantum theory of the electron", Proc.
  R. Soc. A 117, 610-624 (1928), <https://doi.org/10.1098/rspa.1928.0023>.
- **[Established]** Schrödinger (1930) found that the position operator of a
  free Dirac particle has a fast trembling term ("Zitterbewegung").
  - It comes from interference between positive- and negative-energy
    components.
  - Its angular frequency is about 2 m c^2 / hbar and its amplitude is
    about the reduced Compton wavelength hbar / (m c) = 3.86e-13 m.
  - The CODATA 2022 Compton wavelength is h / (m_e c) =
    2.426 310 235 38e-12 m.
  - Source: Schrödinger, Sitzungsber. Preuss. Akad. Wiss. Phys.-Math. Kl.
    24, 418-428 (1930).
- **[Established]** Gerritsma et al. simulated the Dirac equation with a
  single trapped ion, which shows Zitterbewegung as an analogue:
  - "Quantum simulation of the Dirac equation", Nature 463, 68-71 (2010),
    <https://doi.org/10.1038/nature08688>, <https://arxiv.org/abs/0909.0674>.
  - The proposal was Lamata, León, Schätz and Solano, PRL 98, 253005 (2007),
    <https://doi.org/10.1103/PhysRevLett.98.253005>.
- **[Open]** Zitterbewegung has not been directly observed for free
  electrons. Whether it is "physical motion" or an artefact of using the
  one-particle Dirac position operator is an interpretive question. Review:
  <https://arxiv.org/abs/1101.0623>.
- Validation idea:
  - Run a 1D Dirac packet built from both energy branches. The mean position
    should oscillate at about 2 m c^2 / hbar, and the oscillation should
    damp as the branches separate.
  - A packet built from positive energies only must not tremble.
  - In 1D Dirac simulations, use units where c is small (as Gerritsma et
    al. did) so that the trembling can be resolved.

## (e) Maxwell's equations, light as a wave and Larmor radiation

- **[Established]** Maxwell's equations imply that E and B in vacuum obey
  the wave equation with speed c = 1 / sqrt(mu0 eps0). Maxwell identified
  light as an electromagnetic wave: "A dynamical theory of the
  electromagnetic field", Phil. Trans. R. Soc. 155, 459-512 (1865),
  <https://doi.org/10.1098/rstl.1865.0008>.
- **[Established]** A non-relativistic accelerating point charge radiates
  the total power given by the Larmor formula:
  - SI form: P = q^2 a^2 / (6 pi eps0 c^3) = mu0 q^2 a^2 / (6 pi c).
  - Gaussian form: P = 2 q^2 a^2 / (3 c^3).
  - The angular distribution is proportional to sin^2(theta), measured from
    the acceleration. There is no emission along a and maximum emission
    perpendicular to it.
  - Original paper: Larmor, "On the theory of the magnetic influence on
    spectra; and on the radiation from moving ions", Phil. Mag. 44, 503-512
    (1897), <https://doi.org/10.1080/14786449708621095>.
  - Lecture notes: <https://farside.ph.utexas.edu/teaching/jk1/lectures/node156.html>.
- Test number (computed): q = e and a = 1e20 m s^-2 give
  P = 5.7083e-14 W.
- **[Established]** A charge at rest or in uniform motion does not radiate.
  A classical electron orbiting a nucleus would radiate and spiral in. The
  stability of atoms is a quantum result: stationary states have a
  time-independent charge density, so they do not radiate.
- **[Established]** Spontaneous emission (2p -> 1s) needs the quantised
  electromagnetic field. A semiclassical model (a classical dipole from the
  1s + 2p superposition radiating by Larmor) gives the correct
  order-of-magnitude rate. It cannot start from a pure excited state,
  because a pure 2p state has no oscillating dipole.
- **[Established]** The Yee FDTD scheme uses staggered E and H grids and
  leapfrog time stepping: Yee, IEEE Trans. Antennas Propag. 14, 302-307
  (1966), <https://doi.org/10.1109/TAP.1966.1138693>.

## (f) Solitons as particle-like waves, and the limits of the analogy

- **[Established]** Zabusky and Kruskal solved the Korteweg-de Vries (KdV)
  equation numerically and found localised pulses that pass through one
  another and keep their shape and speed. They coined the word "soliton":
  "Interaction of 'Solitons' in a Collisionless Plasma and the Recurrence of
  Initial States", PRL 15, 240 (1965),
  <https://doi.org/10.1103/PhysRevLett.15.240>.
- **[Established]** The focusing nonlinear Schrödinger (NLS) equation
  i u_t + (1/2) u_xx + |u|^2 u = 0 has the bright soliton
  u = eta sech(eta (x - v t)) exp(i (v x + (eta^2 - v^2) t / 2)).
  - It is integrable by inverse scattering: Zakharov and Shabat, Sov. Phys.
    JETP 34, 62-69 (1972).
  - Validation: the profile and the norm must be preserved for long times,
    and two solitons must collide elastically, with only a phase shift and a
    position shift.
- **[Established]** Hasegawa and Tappert predicted optical solitons in
  fibres in 1973. Mollenauer, Stolen and Gordon observed them with 7 ps
  pulses at 1.55 um in 700 m of fibre: PRL 45, 1095 (1980),
  <https://doi.org/10.1103/PhysRevLett.45.1095>.
- **[Established]** Skyrme modelled baryons as topological solitons of a
  nonlinear meson field: "A unified field theory of mesons and baryons",
  Nucl. Phys. 31, 556-569 (1962),
  <https://doi.org/10.1016/0029-5582(62)90775-7>.
  - Skyrmions are now also an established concept in condensed matter (as
    magnetic textures).
- **[Established, theorem]** Derrick showed that, for a broad class of
  nonlinear scalar wave equations in three or more space dimensions, no
  stable, static, localised finite-energy solutions exist:
  - "Comments on Nonlinear Wave Equations as Models for Elementary
    Particles", J. Math. Phys. 5, 1252-1254 (1964),
    <https://doi.org/10.1063/1.1704233>.
  - Ways around the theorem: time-periodic solutions (Derrick's own
    suggestion; Q-balls, oscillons), higher-derivative terms (Skyrme), and
    gauge fields (monopoles).
- **[Open/Speculative]** No experiment shows that electrons, quarks or
  photons are classical solitons. Several features of real particles have
  no classical-soliton analogue:
  - Spin 1/2 and Fermi statistics.
  - Entanglement and non-local correlations (Bell tests).
  - Pointlike scattering behaviour down to the smallest probed scales.
  - Particle creation and annihilation with exact quantised charges.
- **[Established]** Solitons are excellent particle-like models in
  integrable and topological field theories. Within QFT, solitons also
  appear as quantum states (for example, sine-Gordon solitons are dual to
  massive Thirring fermions: Coleman, PRD 11, 2088 (1975),
  <https://doi.org/10.1103/PhysRevD.11.2088>). "All particles are solitons"
  is not established.

## (g) Pilot waves: walking droplets and de Broglie-Bohm

- **[Established]** de Broglie-Bohm (Bohmian) mechanics has particles with
  definite positions guided by the wave function. It reproduces all
  predictions of non-relativistic quantum mechanics:
  - Bohm, "A Suggested Interpretation of the Quantum Theory in Terms of
    'Hidden' Variables. I and II", Phys. Rev. 85, 166-179 and 180-193
    (1952), <https://doi.org/10.1103/PhysRev.85.166>.
  - SEP entry: <https://plato.stanford.edu/entries/qm-bohm/>.
- **[Interpretation]** Bohmian mechanics is empirically equivalent to
  standard quantum mechanics, so choosing it is a matter of interpretation.
  The guiding wave lives in 3N-dimensional configuration space, and the
  theory is explicitly non-local.
- **[Established]** Oil droplets bouncing on a vibrated bath can "walk",
  guided by the waves they create (Couder, Fort, Bush and others). These
  hydrodynamic analogues show orbit quantisation, tunnelling-like events,
  corral statistics and a "mirage" effect.
  - Couder and Fort, "Single-Particle Diffraction and Interference at a
    Macroscopic Scale", PRL 97, 154101 (2006),
    <https://doi.org/10.1103/PhysRevLett.97.154101>.
  - Bush, "Pilot-Wave Hydrodynamics", Annu. Rev. Fluid Mech. 47, 269-292
    (2015), <https://doi.org/10.1146/annurev-fluid-010814-014506>.
  - Bush and Oza, "Hydrodynamic quantum analogs", Rep. Prog. Phys. 84,
    017001 (2021), <https://doi.org/10.1088/1361-6633/abc22c>.
- **[Established, negative result]** The droplet double-slit
  interference claim has not been reproduced:
  - Andersen et al., "Double-slit experiment with single wave-driven
    particles and its relation to quantum mechanics", PRE 92, 013006
    (2015), <https://doi.org/10.1103/PhysRevE.92.013006>.
    - They found single-slit and double-slit distributions that do not show
      the claimed interference.
    - They argued that their wave-driven model differs qualitatively from
      quantum mechanics.
  - Pucci, Harris, Faria and Bush, "Walking droplets interacting with single
    and double slits", J. Fluid Mech. 835, 1136-1156 (2018),
    <https://doi.org/10.1017/jfm.2017.790>.
    - The diffraction pattern was dominated by interactions with the slit
      walls, not by Fraunhofer-like interference.
- **[Open/Speculative]** Whether a local, classical pilot-wave mechanism
  could underlie real quantum mechanics is open, and most physicists regard
  it as unlikely. Bell-inequality violations rule out local hidden-variable
  theories of the usual type. Walking droplets are a classical, dissipative,
  driven system, and so far they are analogues, not foundations.

## (h) Fractal-like aspects of waves

- **[Established]** Fourier synthesis: any square-integrable signal is a
  superposition of sinusoids. In that sense "waves are made of waves". This
  is the mathematical basis of the FFT-based solvers.
- **[Established]** The Weierstrass function
  W(x) = sum_n a^n cos(b^n pi x) was the first published example (1872) of a
  continuous, nowhere-differentiable function.
  - Hardy (1916) proved nowhere-differentiability for 0 < a < 1 and
    a b >= 1.
  - Its graph is self-affine. Its Hausdorff dimension is
    D = 2 + log(a) / log(b) for integer b >= 2 and 1/b < a < 1 (Shen,
    <https://arxiv.org/abs/1505.03986>; Math. Z. 289, 223-266 (2018)).
  - This is a precise example of a wave built from waves at every scale.
- **[Established]** Berry showed that a wave starting from a discontinuous
  initial state in a 1D box (e.g. uniform inside, zero at the walls) has a
  fractal probability density:
  - It is fractal in space at almost all times and in time at almost all
    points.
  - At rational multiples of the revival time the pattern is simple and
    piecewise constant ("quantum carpets").
  - Source: Berry, "Quantum fractals in boxes", J. Phys. A 29, 6617-6629
    (1996), <https://doi.org/10.1088/0305-4470/29/20/016>.
  - Related scaling relation: Wójcik, Białynicki-Birula and Życzkowski, PRL
    85, 5022 (2000), <https://arxiv.org/abs/quant-ph/0005060>.
  - This is reproducible with our split-step solver and is a good
    demonstration.
- **[Established]** Berry's fractality is cut off physically. For
  relativistic particles the smallest scale is about the Compton wavelength,
  so the self-similarity is not infinite: Schulman, "Limits of fractality:
  Zeno boxes and relativistic particles", Chaos Solitons Fractals 14,
  823-830 (2002), <https://arxiv.org/abs/quant-ph/0109149>.
- **[Established]** Renormalisation-group (RG) theory describes how physics
  changes with the scale of observation. Fixed points of the RG flow give
  scale invariance and self-similarity, for example at critical points.
  - Kenneth Wilson received the 1982 Nobel Prize in Physics "for his theory
    for critical phenomena in connection with phase transitions"
    (<https://www.nobelprize.org/prizes/physics/1982/press-release/>).
  - Running couplings in QFT (for example alpha grows slowly at high
    energy) are an established, measured RG effect.
- **[Open/Speculative]** "Waves consist of waves as a fractal", meaning that
  every particle-wave is itself made of smaller waves without end, is not
  established physics:
  - No experiment shows sub-structure in electrons or quarks. Leptons and
    quarks are pointlike down to the scales probed at colliders.
  - Self-similarity in RG flows and in Berry's fractals is approximate and
    holds only over a finite range of scales.
  - It can be explored in this project as an explicitly labelled
    visualisation, for example Weierstrass-like superpositions, but not as a
    validated physical claim.

## (i) CODATA 2022 constants

Source: NIST "Fundamental Physical Constants",
<https://physics.nist.gov/cuu/Constants/>. Each value was read from the page
<https://physics.nist.gov/cgi-bin/cuu/Value?KEY> with the given KEY. Every
page states "Source: 2022 CODATA".

Reference: Mohr, Newell, Taylor and Tiesinga, "CODATA recommended values of
the fundamental physical constants: 2022", Rev. Mod. Phys. 97, 025002
(2025), <https://doi.org/10.1103/RevModPhys.97.025002>,
<https://arxiv.org/abs/2409.03787>.

| Quantity                        | Symbol    | Value                      | Std. uncertainty       | KEY         |
| ------------------------------- | --------- | -------------------------- | ---------------------- | ----------- |
| speed of light in vacuum        | c         | 299 792 458 m s^-1         | exact                  | `c`         |
| Planck constant                 | h         | 6.626 070 15e-34 J Hz^-1   | exact                  | `h`         |
| reduced Planck constant         | hbar      | 1.054 571 817...e-34 J s   | exact                  | `hbar`      |
| elementary charge               | e         | 1.602 176 634e-19 C        | exact                  | `e`         |
| electron mass                   | m_e       | 9.109 383 7139e-31 kg      | 0.000 000 0028e-31     | `me`        |
| proton mass                     | m_p       | 1.672 621 925 95e-27 kg    | 0.000 000 000 52e-27   | `mp`        |
| fine-structure constant         | alpha     | 7.297 352 5643e-3          | 0.000 000 0011e-3      | `alph`      |
| inverse fine-structure constant | 1/alpha   | 137.035 999 177            | 0.000 000 021          | `alphinv`   |
| Bohr radius                     | a_0       | 5.291 772 105 44e-11 m     | 0.000 000 000 82e-11   | `bohrrada0` |
| Hartree energy                  | E_h       | 4.359 744 722 2060e-18 J   | 0.000 000 000 0048e-18 | `hr`        |
| Hartree energy in eV            | E_h       | 27.211 386 245 981 eV      | 0.000 000 000 030      | `hrev`      |
| Rydberg constant                | R_inf     | 10 973 731.568 157 m^-1    | 0.000 012              | `ryd`       |
| Rydberg energy in eV            | R_inf h c | 13.605 693 122 990 eV      | 0.000 000 000 015      | `rydhcev`   |
| vacuum electric permittivity    | eps_0     | 8.854 187 8188e-12 F m^-1  | 0.000 000 0014e-12     | `ep0`       |
| vacuum magnetic permeability    | mu_0      | 1.256 637 061 27e-6 N A^-2 | 0.000 000 000 20e-6    | `mu0`       |
| atomic unit of time             | hbar/E_h  | 2.418 884 326 5864e-17 s   | 0.000 000 000 0026e-17 | `aut`       |
| electron rest energy            | m_e c^2   | 0.510 998 950 69 MeV       | 0.000 000 000 16       | `mec2mev`   |
| proton-electron mass ratio      | m_p/m_e   | 1836.152 673 426           | 0.000 000 032          | `mpsme`     |
| Compton wavelength              | lambda_C  | 2.426 310 235 38e-12 m     | 0.000 000 000 76e-12   | `ecomwl`    |

Notes:

- **[Established]** Since the 2019 SI redefinition, c, h and e are exact.
  hbar = h / (2 pi) = 1.054 571 817 6462e-34 J s, computed in double
  precision. eps_0 and mu_0 are measured quantities.
- Consistency checks, computed with the values above in double precision:
  - eps_0 = e^2 / (2 alpha h c) = 8.854 187 8188e-12 F m^-1, which matches
    the table.
  - a_0 = 4 pi eps_0 hbar^2 / (m_e e^2) = 5.291 772 105 44e-11 m, which
    matches the table.
- In the code, keep the CODATA digits as string literals or `Number`
  literals. Derive atomic units from them instead of retyping rounded
  values.

## Summary table

| Claim                                                                  | Status                             |
| ---------------------------------------------------------------------- | ---------------------------------- |
| Matter shows wave interference (de Broglie, Davisson-Germer, Tonomura) | Established                        |
| Particles are quanta of quantum fields in the Standard Model formalism | Established                        |
| "There are only fields, no particles"                                  | Interpretation                     |
| Atom in a superposition oscillates at (E_2 - E_1)/hbar and radiates    | Established                        |
| Lyman-alpha 121.567 nm, A(2p) = 6.265e8 s^-1, tau = 1.596 ns           | Established                        |
| Zitterbewegung of free electrons                                       | Predicted; seen only in simulators |
| Accelerating charges radiate (Larmor), light is an EM wave             | Established                        |
| Solitons are particle-like waves in many nonlinear systems             | Established                        |
| All elementary particles are solitons                                  | Open/Speculative                   |
| Bohmian mechanics reproduces QM                                        | Established (interpretation)       |
| Walking droplets reproduce double-slit interference                    | Not reproduced                     |
| Quantum wave functions can be fractal (Berry)                          | Established                        |
| Waves are made of waves at every scale, without limit                  | Open/Speculative                   |
