/**
 * Wenzoo Digital Space
 * Lichte, interactieve Three.js-wereld in de Wenzoo-kleuren.
 */
// THREE wordt geladen via three.min.js (globale variabele), zodat dit ook werkt
// wanneer je index.html rechtstreeks opent (file://), zonder webserver.

const canvas = document.getElementById("bg-canvas");
const hero = document.querySelector(".hero");

if (typeof THREE === "undefined" || !canvas || !hero) {
  console.warn("Wenzoo 3D: THREE, canvas of hero ontbreekt.");
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const compactScreen = window.matchMedia("(max-width: 700px)").matches;
const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
const savedData = Boolean(navigator.connection && navigator.connection.saveData);
const deviceMemory = navigator.deviceMemory || 8;
const processorCount = navigator.hardwareConcurrency || 8;
const constrainedDevice = savedData || deviceMemory <= 4 || processorCount <= 4;
const qualityName = reducedMotion
  ? "low"
  : compactScreen
    ? (constrainedDevice ? "low" : "medium")
    : (constrainedDevice ? "medium" : "high");

const qualityProfiles = {
  low: {
    pixelRatio: 1,
    framesPerSecond: 30,
    stars: 190,
    gridStep: 2,
    gridDepthStep: 4,
    portals: 4,
    portalSegments: 48,
    panels: 2,
    nodes: 4,
    pulseSegments: 36,
    maxPulses: 2
  },
  medium: {
    pixelRatio: 1.25,
    framesPerSecond: 40,
    stars: 360,
    gridStep: 1,
    gridDepthStep: 3,
    portals: 6,
    portalSegments: 64,
    panels: 3,
    nodes: 6,
    pulseSegments: 48,
    maxPulses: 3
  },
  high: {
    pixelRatio: 1.75,
    framesPerSecond: 60,
    stars: 900,
    gridStep: 1,
    gridDepthStep: 2,
    portals: 8,
    portalSegments: 96,
    panels: 4,
    nodes: 6,
    pulseSegments: 72,
    maxPulses: 5
  }
};
const quality = qualityProfiles[qualityName];
if (canvas) canvas.dataset.quality = qualityName;

const colors = {
  navy: 0x000b1a,
  navyLight: 0x10243b,
  gold: 0xcc9b58,
  goldSoft: 0xe6cfaf,
  ice: 0xb9d0e7
};

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: qualityName !== "low" && window.devicePixelRatio < 2,
    alpha: false,
    powerPreference: "high-performance"
  });
} catch (error) {
  canvas.dataset.webgl = "unavailable";
  console.warn("Wenzoo 3D kon WebGL niet starten.", error);
}

if (renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.pixelRatio));
  if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } else if (THREE.sRGBEncoding) {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(colors.navy);
  scene.fog = new THREE.FogExp2(colors.navy, 0.035);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
  camera.position.set(0, 0.35, 10.5);

  const world = new THREE.Group();
  scene.add(world);

  scene.add(new THREE.HemisphereLight(colors.ice, colors.navy, 1.2));

  const keyLight = new THREE.PointLight(colors.gold, 34, 26, 1.6);
  keyLight.position.set(5, 3, 6);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(colors.ice, 18, 25, 1.5);
  rimLight.position.set(-5, -1, 1);
  scene.add(rimLight);

  // Gelaagde deeltjes geven de eerste viewport direct diepte.
  const starCount = quality.stars;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const goldColor = new THREE.Color(colors.gold);
  const iceColor = new THREE.Color(colors.ice);

  for (let i = 0; i < starCount; i += 1) {
    const i3 = i * 3;
    starPositions[i3] = THREE.MathUtils.randFloatSpread(25);
    starPositions[i3 + 1] = THREE.MathUtils.randFloatSpread(14);
    starPositions[i3 + 2] = THREE.MathUtils.randFloat(-48, 5);
    const color = Math.random() > 0.73 ? goldColor : iceColor;
    starColors[i3] = color.r;
    starColors[i3 + 1] = color.g;
    starColors[i3 + 2] = color.b;
  }

  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  starsGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
  const stars = new THREE.Points(
    starsGeometry,
    new THREE.PointsMaterial({
      size: 0.045,
      transparent: true,
      opacity: 0.72,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  world.add(stars);

  // Perspectivische digitale vloer.
  const gridPositions = [];
  for (let x = -10; x <= 10; x += quality.gridStep) {
    gridPositions.push(x, -3.35, 5, x, -3.35, -42);
  }
  for (let z = 5; z >= -42; z -= quality.gridDepthStep) {
    gridPositions.push(-10, -3.35, z, 10, -3.35, z);
  }
  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute("position", new THREE.Float32BufferAttribute(gridPositions, 3));
  const grid = new THREE.LineSegments(
    gridGeometry,
    new THREE.LineBasicMaterial({ color: colors.gold, transparent: true, opacity: 0.13 })
  );
  world.add(grid);

  // Opeenvolgende poorten maken van de header een echte 3D-tunnel.
  const portals = [];
  const portalMaterial = new THREE.MeshBasicMaterial({
    color: colors.gold,
    transparent: true,
    opacity: 0.28,
    wireframe: true,
    blending: THREE.AdditiveBlending
  });

  for (let i = 0; i < quality.portals; i += 1) {
    const portal = new THREE.Mesh(
      new THREE.TorusGeometry(4.5 + i * 0.12, 0.018 + i * 0.002, 6, quality.portalSegments),
      portalMaterial.clone()
    );
    portal.position.set(2.15 + Math.sin(i) * 0.28, 0, 1.5 - i * 5.1);
    portal.rotation.z = i * 0.17;
    portal.scale.y = 0.78;
    portal.material.opacity = Math.max(0.07, 0.3 - i * 0.026);
    portals.push(portal);
    world.add(portal);
  }

  // Het centrale Wenzoo-object: een zwevende website in desktop- en mobiel formaat.
  const core = new THREE.Group();
  core.position.set(3.1, 0.08, 0.1);
  core.rotation.set(-0.04, -0.16, 0.015);
  world.add(core);

  const websiteMaterials = {
    shell: new THREE.MeshStandardMaterial({
      color: 0x061426,
      emissive: 0x020710,
      emissiveIntensity: 0.28,
      metalness: 0.24,
      roughness: 0.68
    }),
    screen: new THREE.MeshBasicMaterial({ color: 0x0a223d }),
    gold: new THREE.MeshBasicMaterial({ color: colors.gold, transparent: true, opacity: 0.94 }),
    goldSoft: new THREE.MeshBasicMaterial({ color: colors.goldSoft, transparent: true, opacity: 0.78 }),
    ice: new THREE.MeshBasicMaterial({ color: colors.ice, transparent: true, opacity: 0.58 }),
    muted: new THREE.MeshBasicMaterial({ color: 0x66829d, transparent: true, opacity: 0.52 }),
    shadow: new THREE.MeshBasicMaterial({ color: 0x00040a, transparent: true, opacity: 0.34, depthWrite: false })
  };

  function addBlock(parent, width, height, depth, material, x, y, z) {
    const block = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    block.position.set(x, y, z);
    parent.add(block);
    return block;
  }

  const browser = new THREE.Group();
  core.add(browser);

  addBlock(browser, 4.8, 3.18, 0.2, websiteMaterials.shadow, 0.1, -0.1, -0.18);
  const browserShell = addBlock(browser, 4.68, 3.05, 0.18, websiteMaterials.shell, 0, 0, 0);
  const browserOutline = new THREE.LineSegments(
    new THREE.EdgesGeometry(browserShell.geometry),
    new THREE.LineBasicMaterial({ color: colors.gold, transparent: true, opacity: 0.68 })
  );
  browser.add(browserOutline);

  addBlock(browser, 4.38, 2.5, 0.045, websiteMaterials.screen, 0, -0.16, 0.12);
  addBlock(browser, 4.38, 0.34, 0.05, websiteMaterials.shell, 0, 1.26, 0.13);

  [-2.02, -1.82, -1.62].forEach((x, index) => {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 10, 10),
      index === 0 ? websiteMaterials.gold : websiteMaterials.muted
    );
    dot.position.set(x, 1.26, 0.18);
    browser.add(dot);
  });

  // Navigatie en woordmerk in de getoonde website.
  addBlock(browser, 0.72, 0.1, 0.025, websiteMaterials.gold, -1.72, 0.78, 0.18);
  [0.5, 0.88, 1.24, 1.6].forEach((x) => {
    addBlock(browser, 0.34, 0.035, 0.018, websiteMaterials.ice, x, 0.78, 0.18);
  });

  // Hero-compositie in het scherm.
  addBlock(browser, 1.55, 0.16, 0.025, websiteMaterials.goldSoft, -1.15, 0.3, 0.18);
  addBlock(browser, 2.15, 0.12, 0.022, websiteMaterials.ice, -0.85, 0.02, 0.18);
  addBlock(browser, 1.78, 0.07, 0.02, websiteMaterials.muted, -1.04, -0.2, 0.18);
  addBlock(browser, 0.82, 0.25, 0.03, websiteMaterials.gold, -1.5, -0.55, 0.19);

  const visualPanel = addBlock(browser, 1.38, 1.18, 0.035, websiteMaterials.shell, 1.18, -0.02, 0.18);
  const visualOutline = new THREE.LineSegments(
    new THREE.EdgesGeometry(visualPanel.geometry),
    new THREE.LineBasicMaterial({ color: colors.gold, transparent: true, opacity: 0.48 })
  );
  visualOutline.position.copy(visualPanel.position);
  visualOutline.position.z += 0.02;
  browser.add(visualOutline);
  addBlock(browser, 0.92, 0.08, 0.02, websiteMaterials.goldSoft, 1.18, 0.25, 0.23);
  addBlock(browser, 0.66, 0.06, 0.02, websiteMaterials.ice, 1.05, 0.02, 0.23);
  addBlock(browser, 0.84, 0.06, 0.02, websiteMaterials.muted, 1.14, -0.16, 0.23);
  addBlock(browser, 0.46, 0.18, 0.025, websiteMaterials.gold, 0.96, -0.46, 0.23);

  [-1.4, 0, 1.4].forEach((x, index) => {
    addBlock(browser, 1.12, 0.46, 0.025, websiteMaterials.shell, x, -1.0, 0.18);
    addBlock(browser, 0.58, 0.055, 0.02, index === 1 ? websiteMaterials.goldSoft : websiteMaterials.ice, x - 0.15, -0.92, 0.22);
    addBlock(browser, 0.76, 0.035, 0.018, websiteMaterials.muted, x, -1.09, 0.22);
  });

  // Mobiele preview staat iets naar voren en maakt het responsive karakter zichtbaar.
  const mobile = new THREE.Group();
  mobile.position.set(2.05, -0.78, 0.72);
  mobile.rotation.set(-0.02, -0.18, 0.03);
  core.add(mobile);
  const mobileShell = addBlock(mobile, 1.05, 2.18, 0.18, websiteMaterials.shell, 0, 0, 0);
  const mobileOutline = new THREE.LineSegments(
    new THREE.EdgesGeometry(mobileShell.geometry),
    new THREE.LineBasicMaterial({ color: colors.goldSoft, transparent: true, opacity: 0.7 })
  );
  mobile.add(mobileOutline);
  addBlock(mobile, 0.87, 1.78, 0.035, websiteMaterials.screen, 0, -0.04, 0.12);
  addBlock(mobile, 0.3, 0.04, 0.02, websiteMaterials.muted, 0, 0.94, 0.14);
  addBlock(mobile, 0.56, 0.08, 0.02, websiteMaterials.goldSoft, -0.1, 0.55, 0.16);
  addBlock(mobile, 0.68, 0.055, 0.02, websiteMaterials.ice, 0, 0.34, 0.16);
  addBlock(mobile, 0.54, 0.035, 0.02, websiteMaterials.muted, -0.07, 0.18, 0.16);
  addBlock(mobile, 0.38, 0.16, 0.025, websiteMaterials.gold, -0.16, -0.08, 0.16);
  [-0.42, -0.69].forEach((y) => {
    addBlock(mobile, 0.68, 0.3, 0.02, websiteMaterials.shell, 0, y, 0.15);
    addBlock(mobile, 0.36, 0.035, 0.018, websiteMaterials.ice, -0.1, y + 0.05, 0.18);
  });

  // Zwevende UI-panelen verwijzen naar webdesign en digitaal maatwerk.
  function createPanel(x, y, z, scale, rotationY) {
    const panel = new THREE.Group();
    panel.position.set(x, y, z);
    panel.rotation.set(-0.08, rotationY, THREE.MathUtils.randFloat(-0.08, 0.08));
    panel.scale.setScalar(scale);

    const panelGeometry = new THREE.PlaneGeometry(2.7, 1.75);
    const surface = new THREE.Mesh(
      panelGeometry,
      new THREE.MeshPhysicalMaterial({
        color: colors.navyLight,
        transparent: true,
        opacity: 0.48,
        roughness: 0.3,
        metalness: 0.35,
        side: THREE.DoubleSide
      })
    );
    panel.add(surface);

    const border = new THREE.LineSegments(
      new THREE.EdgesGeometry(panelGeometry),
      new THREE.LineBasicMaterial({ color: colors.gold, transparent: true, opacity: 0.7 })
    );
    border.position.z = 0.012;
    panel.add(border);

    const barMaterial = new THREE.MeshBasicMaterial({ color: colors.ice, transparent: true, opacity: 0.56 });
    const accentMaterial = new THREE.MeshBasicMaterial({ color: colors.gold, transparent: true, opacity: 0.9 });
    [0.48, 0.12, -0.18].forEach((lineY, index) => {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(index === 0 ? 1.35 : 1.72, 0.07, 0.025),
        index === 0 ? accentMaterial : barMaterial
      );
      bar.position.set(index === 0 ? -0.42 : -0.2, lineY, 0.04);
      panel.add(bar);
    });
    const button = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.22, 0.035), accentMaterial);
    button.position.set(-0.72, -0.58, 0.05);
    panel.add(button);
    return panel;
  }

  const panelSettings = [
    [6.2, 2.25, -2.2, 0.78, -0.5],
    [6.6, -2.1, -5.4, 0.62, -0.7],
    [-3.6, 2.5, -7.5, 0.6, 0.58],
    [1.3, -1.65, -12, 0.52, 0.15]
  ];
  const panels = panelSettings
    .slice(0, quality.panels)
    .map((settings) => createPanel(...settings));
  panels.forEach((panel) => world.add(panel));

  // Een netwerk van goudkleurige verbindingen rond de website.
  const nodePositions = [
    [1.2, 1.8, -0.8], [5.3, 1.6, -1.1], [5.5, -1.4, -1.8],
    [1.1, -1.75, -1.3], [3.2, 2.65, -2.2], [3.1, -2.45, -2.8]
  ];
  const nodeGeometry = new THREE.SphereGeometry(0.055, 12, 12);
  const nodeMaterial = new THREE.MeshBasicMaterial({ color: colors.goldSoft });
  const connectionMaterial = new THREE.LineBasicMaterial({ color: colors.gold, transparent: true, opacity: 0.34 });

  nodePositions.slice(0, quality.nodes).forEach((position) => {
    const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
    node.position.fromArray(position);
    world.add(node);
    const connectionGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(3.15, 0.15, 0.1),
      new THREE.Vector3(...position)
    ]);
    world.add(new THREE.Line(connectionGeometry, connectionMaterial));
  });

  // Af en toe schiet een gouden W langs de centrale website.
  const shootingW = new THREE.Group();
  shootingW.visible = false;
  world.add(shootingW);

  const wMaterial = new THREE.MeshBasicMaterial({
    color: colors.gold,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const wGlowMaterial = new THREE.MeshBasicMaterial({
    color: colors.goldSoft,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const wMark = new THREE.Group();
  shootingW.add(wMark);

  function addWBar(ax, ay, bx, by, thickness, material) {
    const dx = bx - ax;
    const dy = by - ay;
    const bar = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.hypot(dx, dy), thickness),
      material
    );
    bar.position.set((ax + bx) / 2, (ay + by) / 2, 0);
    bar.rotation.z = Math.atan2(dy, dx);
    wMark.add(bar);
  }

  const wPoints = [
    [-0.48, 0.34], [-0.25, -0.3], [0, 0.2], [0.25, -0.3], [0.48, 0.34]
  ];
  for (let i = 0; i < wPoints.length - 1; i += 1) {
    addWBar(...wPoints[i], ...wPoints[i + 1], 0.105, wGlowMaterial);
    addWBar(...wPoints[i], ...wPoints[i + 1], 0.07, wMaterial);
  }

  const trailMaterial = new THREE.LineBasicMaterial({
    color: colors.gold,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const trailSoftMaterial = new THREE.LineBasicMaterial({
    color: colors.goldSoft,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const trail = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.28, 0.12, -0.02),
      new THREE.Vector3(3.1, 1.55, -0.02)
    ]),
    trailMaterial
  );
  const trailSoft = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.2, 0.08, -0.03),
      new THREE.Vector3(4.15, 2.08, -0.03)
    ]),
    trailSoftMaterial
  );
  shootingW.add(trailSoft, trail);

  let wFlightStart = -1;
  let nextWFlight = 3.8;
  const wFlightDuration = 1.75;

  const pointer = new THREE.Vector2();
  const pointerTarget = new THREE.Vector2();
  const pulses = [];
  let elapsed = 0;
  let lastTime = performance.now();
  let lastRenderedAt = 0;
  let pageVisible = !document.hidden;
  let animationFrame = 0;
  const minimumFrameTime = 1000 / quality.framesPerSecond;
  const slowFrameThreshold = (minimumFrameTime * 1.65) / 1000;
  let slowFrameCount = 0;
  let activePixelRatio = Math.min(window.devicePixelRatio || 1, quality.pixelRatio);

  function updatePointer(event) {
    pointerTarget.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointerTarget.y = -((event.clientY / window.innerHeight) * 2 - 1);
  }

  if (!coarsePointer) {
    window.addEventListener("pointermove", updatePointer, { passive: true });
  }

  // Een klik buiten knoppen stuurt een zichtbare gouden impuls de wereld in.
  window.addEventListener("pointerdown", (event) => {
    if (reducedMotion || event.target.closest("a, button, input, textarea, summary")) return;
    if (pulses.length >= quality.maxPulses) return;
    updatePointer(event);
    const pulse = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.018, 8, quality.pulseSegments),
      new THREE.MeshBasicMaterial({
        color: colors.goldSoft,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      })
    );
    pulse.position.set(pointerTarget.x * 4.2 + 1.7, pointerTarget.y * 2.8, 1.2);
    pulse.userData.life = 0;
    world.add(pulse);
    pulses.push(pulse);
  }, { passive: true });

  function resize() {
    const width = window.innerWidth;
    const height = Math.max(760, window.innerHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width < 700 ? 58 : 48;
    camera.updateProjectionMatrix();
    world.position.x = width < 700 ? 1.5 : 0;
    world.scale.setScalar(width < 700 ? 0.82 : 1);
    core.position.x = width < 700 ? 2.75 : 3.1;
    core.scale.setScalar(width < 700 ? 0.78 : 1);
  }

  function renderFrame(now) {
    animationFrame = 0;
    if (!pageVisible) return;
    if (lastRenderedAt && now - lastRenderedAt < minimumFrameTime) {
      animationFrame = requestAnimationFrame(renderFrame);
      return;
    }
    lastRenderedAt = now;
    const delta = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    elapsed += delta;

    // Verlaag alleen bij langdurige haperingen automatisch de renderresolutie.
    slowFrameCount = delta > slowFrameThreshold
      ? slowFrameCount + 1
      : Math.max(0, slowFrameCount - 2);
    if (slowFrameCount > 45 && activePixelRatio > 0.85) {
      activePixelRatio = Math.max(0.85, activePixelRatio - 0.25);
      renderer.setPixelRatio(activePixelRatio);
      resize();
      slowFrameCount = 0;
      canvas.dataset.adaptiveQuality = "reduced";
    }

    pointer.lerp(pointerTarget, 0.045);
    const scrollRange = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const scrollProgress = Math.min(window.scrollY / scrollRange, 1);

    camera.position.x += (pointer.x * 0.68 - camera.position.x) * 0.035;
    camera.position.y += (0.35 + pointer.y * 0.42 - camera.position.y) * 0.035;
    camera.position.z = 10.5 - Math.sin(scrollProgress * Math.PI) * 1.35;
    camera.lookAt(0.7 + pointer.x * 0.22, pointer.y * 0.12, -4);
    world.rotation.y += ((scrollProgress - 0.5) * 0.075 - world.rotation.y) * 0.018;

    stars.position.z = (elapsed * 0.18) % 5;
    core.position.y = 0.08 + Math.sin(elapsed * 0.58) * 0.12;
    core.position.z = 0.1 - scrollProgress * 36;
    core.rotation.y += (-0.16 + pointer.x * 0.16 - core.rotation.y) * 0.045;
    core.rotation.x += (-0.04 + pointer.y * 0.11 - core.rotation.x) * 0.045;
    core.rotation.z = 0.015 + Math.sin(elapsed * 0.34) * 0.012;
    mobile.position.y = -0.78 + Math.sin(elapsed * 0.74 + 1.1) * 0.055;
    mobile.rotation.y = -0.18 + Math.sin(elapsed * 0.42) * 0.025;

    portals.forEach((portal, index) => {
      portal.rotation.z += delta * (index % 2 ? -0.018 : 0.022);
      const targetOpacity = 0.2 + Math.sin(elapsed * 0.8 - index * 0.5) * 0.05;
      portal.material.opacity += (targetOpacity - portal.material.opacity) * 0.025;
    });

    panels.forEach((panel, index) => {
      panel.position.y += Math.sin(elapsed * 0.65 + index * 1.7) * 0.0009;
      panel.rotation.z = Math.sin(elapsed * 0.28 + index) * 0.04;
    });

    if (wFlightStart < 0 && elapsed >= nextWFlight) {
      wFlightStart = elapsed;
      shootingW.visible = true;
    }

    if (wFlightStart >= 0) {
      const flight = (elapsed - wFlightStart) / wFlightDuration;
      if (flight >= 1) {
        shootingW.visible = false;
        wFlightStart = -1;
        nextWFlight = elapsed + 10 + Math.random() * 11;
      } else {
        const eased = flight * flight * (3 - 2 * flight);
        const glow = Math.pow(Math.sin(Math.PI * flight), 0.55);
        shootingW.position.set(
          8.25 - eased * 12.4,
          3.35 - eased * 5.15 + Math.sin(Math.PI * flight) * 0.34,
          0.78 - Math.sin(Math.PI * flight) * 1.15
        );
        shootingW.rotation.z = -0.08 + flight * 0.18;
        shootingW.scale.setScalar(0.78 + Math.sin(Math.PI * flight) * 0.18);
        wMaterial.opacity = glow;
        wGlowMaterial.opacity = glow * 0.24;
        trailMaterial.opacity = glow * 0.52;
        trailSoftMaterial.opacity = glow * 0.16;
      }
    }

    for (let i = pulses.length - 1; i >= 0; i -= 1) {
      const pulse = pulses[i];
      pulse.userData.life += delta;
      const life = pulse.userData.life;
      pulse.scale.setScalar(1 + life * 5.5);
      pulse.material.opacity = Math.max(0, 0.85 - life * 0.68);
      pulse.position.z -= delta * 1.3;
      if (life > 1.3) {
        world.remove(pulse);
        pulse.geometry.dispose();
        pulse.material.dispose();
        pulses.splice(i, 1);
      }
    }

    renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(renderFrame);
  }

  function startAnimation() {
    if (reducedMotion || !pageVisible || animationFrame) return;
    lastTime = performance.now();
    lastRenderedAt = 0;
    animationFrame = requestAnimationFrame(renderFrame);
  }

  document.addEventListener("visibilitychange", () => {
    pageVisible = !document.hidden;
    if (!pageVisible && animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
    startAnimation();
  });

  window.addEventListener("resize", resize, { passive: true });
  resize();

  if (reducedMotion) {
    renderer.render(scene, camera);
  } else {
    startAnimation();
  }
}
