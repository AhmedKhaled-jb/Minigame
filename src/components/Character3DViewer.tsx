import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Skin } from '../types/game';
import { RotateCcw, ZoomIn, ZoomOut, Sparkles } from 'lucide-react';

interface Character3DViewerProps {
  skin: Skin;
  className?: string;
}

export const Character3DViewer: React.FC<Character3DViewerProps> = ({ skin, className = '' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const characterGroupRef = useRef<THREE.Group | null>(null);
  const modelPartsRef = useRef<{
    torso?: THREE.Object3D;
    head?: THREE.Object3D;
    leftArm?: THREE.Object3D;
    rightArm?: THREE.Object3D;
    cape?: THREE.Object3D;
  }>({});

  const [zoomLevel, setZoomLevel] = useState<number>(4.4);
  const [isInteracting, setIsInteracting] = useState(false);

  // Drag interaction states
  const isPointerDownRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rotationVelocityRef = useRef<{ y: number; x: number }>({ y: 0, x: 0 });
  const touchDistanceRef = useRef<number | null>(null);

  // Reset to default camera view
  const handleResetView = useCallback(() => {
    if (characterGroupRef.current) {
      characterGroupRef.current.rotation.y = 0.25;
      characterGroupRef.current.rotation.x = 0.05;
      rotationVelocityRef.current = { x: 0, y: 0 };
    }
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 1.25, 4.4);
      setZoomLevel(4.4);
    }
  }, []);

  const handleZoom = useCallback((delta: number) => {
    if (!cameraRef.current) return;
    const newZ = Math.min(6.5, Math.max(2.8, cameraRef.current.position.z + delta));
    cameraRef.current.position.z = newZ;
    setZoomLevel(newZ);
  }, []);

  // Quick preset angle
  const handleSetAngle = useCallback((yAngle: number) => {
    if (characterGroupRef.current) {
      characterGroupRef.current.rotation.y = yAngle;
      characterGroupRef.current.rotation.x = 0.05;
      rotationVelocityRef.current = { x: 0, y: 0 };
    }
  }, []);

  // Helper to build 3D voxel-style character mesh based on skin
  const buildCharacterModel = useCallback((targetSkin: Skin) => {
    const charGroup = new THREE.Group();
    charGroup.name = 'MiniWorldCharacter';

    const p = targetSkin.palette;
    const hairCol = new THREE.Color(p.hair);
    const skinCol = new THREE.Color(p.skin);
    const shirtCol = new THREE.Color(p.shirt);
    const pantsCol = new THREE.Color(p.pants);
    const bootsCol = new THREE.Color(p.boots);
    const hatCol = p.hat ? new THREE.Color(p.hat) : hairCol;
    const capeCol = p.cape ? new THREE.Color(p.cape) : shirtCol;
    const accentCol = p.accent ? new THREE.Color(p.accent) : new THREE.Color(0xf59e0b);

    const makeMat = (color: THREE.Color, roughness = 0.45, metalness = 0.08) =>
      new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness
      });

    // 1. Torso
    const torsoGeo = new THREE.BoxGeometry(0.72, 0.82, 0.42);
    const torsoMat = makeMat(shirtCol, 0.4);
    const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    torsoMesh.position.y = 1.05;
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    charGroup.add(torsoMesh);

    // Torso accent / belt
    const beltGeo = new THREE.BoxGeometry(0.74, 0.12, 0.44);
    const beltMat = makeMat(accentCol, 0.3, 0.2);
    const beltMesh = new THREE.Mesh(beltGeo, beltMat);
    beltMesh.position.y = 0.72;
    beltMesh.castShadow = true;
    charGroup.add(beltMesh);

    // 2. Head Group
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.76;

    // Head base block
    const headGeo = new THREE.BoxGeometry(0.64, 0.64, 0.62);
    const headMat = makeMat(skinCol, 0.6);
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // Eyes (dark pixel pupils with sparkle)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const eyeSparkleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.02), eyeMat);
    leftEye.position.set(-0.16, 0.04, 0.32);
    headGroup.add(leftEye);

    const leftSparkle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.025), eyeSparkleMat);
    leftSparkle.position.set(-0.17, 0.07, 0.322);
    headGroup.add(leftSparkle);

    const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.02), eyeMat);
    rightEye.position.set(0.16, 0.04, 0.32);
    headGroup.add(rightEye);

    const rightSparkle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.025), eyeSparkleMat);
    rightSparkle.position.set(0.15, 0.07, 0.322);
    headGroup.add(rightSparkle);

    // Subtle cheeks
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.7 });
    const leftCheek = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.01), blushMat);
    leftCheek.position.set(-0.2, -0.08, 0.32);
    headGroup.add(leftCheek);

    const rightCheek = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.01), blushMat);
    rightCheek.position.set(0.2, -0.08, 0.32);
    headGroup.add(rightCheek);

    // Hair
    const hairGeo = new THREE.BoxGeometry(0.68, 0.28, 0.66);
    const hairMat = makeMat(hairCol, 0.5);
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);
    hairMesh.position.set(0, 0.24, -0.01);
    headGroup.add(hairMesh);

    // Hair back/sides
    const hairBackGeo = new THREE.BoxGeometry(0.68, 0.44, 0.2);
    const hairBackMesh = new THREE.Mesh(hairBackGeo, hairMat);
    hairBackMesh.position.set(0, 0.06, -0.24);
    headGroup.add(hairBackMesh);

    // Hat / Headgear depending on hatType
    const hatType = targetSkin.hatType || 'none';
    const hatMeshMat = makeMat(hatCol, 0.35, targetSkin.id === 'knight' ? 0.4 : 0.1);

    if (hatType === 'cap') {
      const capBrimGeo = new THREE.BoxGeometry(0.68, 0.08, 0.4);
      const capBrim = new THREE.Mesh(capBrimGeo, hatMeshMat);
      capBrim.position.set(0, 0.22, 0.35);
      headGroup.add(capBrim);
    } else if (hatType === 'helmet') {
      // Knight Visor and crest plume
      const visorGeo = new THREE.BoxGeometry(0.72, 0.16, 0.66);
      const visorMesh = new THREE.Mesh(visorGeo, makeMat(hatCol, 0.25, 0.7));
      visorMesh.position.set(0, 0.02, 0.04);
      headGroup.add(visorMesh);

      // Crimson crest plume
      const plumeGeo = new THREE.BoxGeometry(0.14, 0.34, 0.6);
      const plumeMesh = new THREE.Mesh(plumeGeo, makeMat(new THREE.Color(0xdc2626), 0.3, 0.1));
      plumeMesh.position.set(0, 0.45, -0.05);
      headGroup.add(plumeMesh);
    } else if (hatType === 'hood') {
      // Forest Ranger cowl
      const hoodGeo = new THREE.BoxGeometry(0.74, 0.72, 0.72);
      const hoodMat = makeMat(hatCol, 0.6);
      const hoodMesh = new THREE.Mesh(hoodGeo, hoodMat);
      hoodMesh.position.set(0, 0.08, -0.04);
      headGroup.add(hoodMesh);
    } else if (hatType === 'wizard') {
      // Conical Wizard Hat
      const brimGeo = new THREE.CylinderGeometry(0.58, 0.62, 0.08, 16);
      const brimMesh = new THREE.Mesh(brimGeo, hatMeshMat);
      brimMesh.position.set(0, 0.34, 0);
      headGroup.add(brimMesh);

      const coneGeo = new THREE.ConeGeometry(0.42, 0.72, 16);
      const coneMesh = new THREE.Mesh(coneGeo, hatMeshMat);
      coneMesh.position.set(0, 0.74, -0.05);
      coneMesh.rotation.x = -0.15;
      headGroup.add(coneMesh);

      // Golden buckle
      const starGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
      const starMesh = new THREE.Mesh(starGeo, makeMat(accentCol, 0.2, 0.8));
      starMesh.position.set(0, 0.42, 0.34);
      starMesh.rotation.z = Math.PI / 4;
      headGroup.add(starMesh);
    } else if (hatType === 'visor') {
      // Cyberpunk glowing visor
      const cyberGeo = new THREE.BoxGeometry(0.7, 0.16, 0.15);
      const cyberMat = new THREE.MeshStandardMaterial({
        color: hatCol,
        emissive: hatCol,
        emissiveIntensity: 0.85,
        roughness: 0.2
      });
      const cyberVisor = new THREE.Mesh(cyberGeo, cyberMat);
      cyberVisor.position.set(0, 0.04, 0.32);
      headGroup.add(cyberVisor);
    } else if (hatType === 'panda') {
      // Panda Hood with rounded ears
      const earMat = makeMat(new THREE.Color(0x0f172a));
      const leftEar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12), earMat);
      leftEar.position.set(-0.32, 0.44, 0);
      leftEar.rotation.z = Math.PI / 2;
      headGroup.add(leftEar);

      const rightEar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12), earMat);
      rightEar.position.set(0.32, 0.44, 0);
      rightEar.rotation.z = Math.PI / 2;
      headGroup.add(rightEar);
    } else if (hatType === 'pirate') {
      // Pirate Tricorn Hat
      const brimGeo = new THREE.BoxGeometry(0.95, 0.1, 0.85);
      const brim = new THREE.Mesh(brimGeo, hatMeshMat);
      brim.position.set(0, 0.34, 0);
      headGroup.add(brim);

      const goldTrim = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.03, 0.88), makeMat(accentCol, 0.2, 0.7));
      goldTrim.position.set(0, 0.38, 0);
      headGroup.add(goldTrim);
    } else if (hatType === 'crown') {
      // Royal jeweled crown
      const crownBase = new THREE.CylinderGeometry(0.4, 0.42, 0.22, 8);
      const crownMesh = new THREE.Mesh(crownBase, makeMat(new THREE.Color(0xfacc15), 0.25, 0.75));
      crownMesh.position.set(0, 0.42, 0);
      headGroup.add(crownMesh);

      // Jewel spheres
      for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI) / 2;
        const gem = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), makeMat(new THREE.Color(0xef4444), 0.1, 0.9));
        gem.position.set(Math.cos(ang) * 0.41, 0.46, Math.sin(ang) * 0.41);
        headGroup.add(gem);
      }
    } else if (hatType === 'ninja') {
      // Crimson ninja headband
      const bandGeo = new THREE.BoxGeometry(0.68, 0.14, 0.66);
      const bandMesh = new THREE.Mesh(bandGeo, makeMat(hatCol, 0.4));
      bandMesh.position.set(0, 0.14, 0);
      headGroup.add(bandMesh);

      // Trailing headband knot tails behind head
      const tailGeo = new THREE.BoxGeometry(0.08, 0.35, 0.04);
      const tailMesh1 = new THREE.Mesh(tailGeo, makeMat(hatCol, 0.4));
      tailMesh1.position.set(-0.06, 0.0, -0.36);
      tailMesh1.rotation.z = -0.3;
      headGroup.add(tailMesh1);

      const tailMesh2 = new THREE.Mesh(tailGeo, makeMat(hatCol, 0.4));
      tailMesh2.position.set(0.06, -0.05, -0.37);
      tailMesh2.rotation.z = 0.25;
      headGroup.add(tailMesh2);

      // Lower face ninja mask
      const maskGeo = new THREE.BoxGeometry(0.66, 0.24, 0.36);
      const maskMesh = new THREE.Mesh(maskGeo, makeMat(new THREE.Color(0x18181b), 0.5));
      maskMesh.position.set(0, -0.16, 0.16);
      headGroup.add(maskMesh);
    } else if (hatType === 'astronaut') {
      // White astronaut helmet & golden reflective bubble visor
      const helmetGeo = new THREE.BoxGeometry(0.78, 0.78, 0.78);
      const helmetMesh = new THREE.Mesh(helmetGeo, makeMat(new THREE.Color(0xf8fafc), 0.3, 0.1));
      helmetMesh.position.set(0, 0.02, 0);
      headGroup.add(helmetMesh);

      // Golden spherical/box visor
      const visorGeo = new THREE.BoxGeometry(0.64, 0.44, 0.2);
      const goldVisorMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.85,
        roughness: 0.15,
        emissive: 0xd97706,
        emissiveIntensity: 0.3
      });
      const goldVisor = new THREE.Mesh(visorGeo, goldVisorMat);
      goldVisor.position.set(0, 0.04, 0.34);
      headGroup.add(goldVisor);
    } else if (hatType === 'viking') {
      // Iron helmet base
      const ironGeo = new THREE.CylinderGeometry(0.38, 0.44, 0.28, 16);
      const ironMat = makeMat(hatCol, 0.3, 0.6);
      const ironMesh = new THREE.Mesh(ironGeo, ironMat);
      ironMesh.position.set(0, 0.36, 0);
      headGroup.add(ironMesh);

      // Sturdy ivory horns
      const hornGeo = new THREE.ConeGeometry(0.1, 0.42, 10);
      const hornMat = makeMat(new THREE.Color(0xf8fafc), 0.4);

      const leftHorn = new THREE.Mesh(hornGeo, hornMat);
      leftHorn.position.set(-0.42, 0.48, 0);
      leftHorn.rotation.z = 0.65;
      headGroup.add(leftHorn);

      const rightHorn = new THREE.Mesh(hornGeo, hornMat);
      rightHorn.position.set(0.42, 0.48, 0);
      rightHorn.rotation.z = -0.65;
      headGroup.add(rightHorn);
    } else if (hatType === 'chef') {
      // Tall white pleated chef's toque
      const chefGeo = new THREE.CylinderGeometry(0.44, 0.38, 0.58, 20);
      const chefMat = makeMat(new THREE.Color(0xffffff), 0.6);
      const chefMesh = new THREE.Mesh(chefGeo, chefMat);
      chefMesh.position.set(0, 0.54, 0);
      headGroup.add(chefMesh);

      // Base band
      const bandGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.12, 20);
      const bandMat = makeMat(new THREE.Color(0xf1f5f9), 0.4);
      const bandMesh = new THREE.Mesh(bandGeo, bandMat);
      bandMesh.position.set(0, 0.28, 0);
      headGroup.add(bandMesh);
    } else if (hatType === 'cat') {
      // Pointed feline cat ears
      const earGeo = new THREE.ConeGeometry(0.16, 0.28, 4);
      const earMat = makeMat(hatCol, 0.5);
      const innerMat = makeMat(new THREE.Color(0xf472b6), 0.6);

      const leftEar = new THREE.Mesh(earGeo, earMat);
      leftEar.position.set(-0.25, 0.48, 0.05);
      leftEar.rotation.z = 0.25;
      leftEar.rotation.y = Math.PI / 4;
      headGroup.add(leftEar);

      const leftInner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.04), innerMat);
      leftInner.position.set(-0.24, 0.44, 0.1);
      headGroup.add(leftInner);

      const rightEar = new THREE.Mesh(earGeo, earMat);
      rightEar.position.set(0.25, 0.48, 0.05);
      rightEar.rotation.z = -0.25;
      rightEar.rotation.y = Math.PI / 4;
      headGroup.add(rightEar);

      const rightInner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.04), innerMat);
      rightInner.position.set(0.24, 0.44, 0.1);
      headGroup.add(rightInner);
    } else if (hatType === 'detective') {
      // Tweed fedora hat
      const brimGeo = new THREE.CylinderGeometry(0.62, 0.66, 0.06, 16);
      const brimMesh = new THREE.Mesh(brimGeo, hatMeshMat);
      brimMesh.position.set(0, 0.32, 0);
      headGroup.add(brimMesh);

      const crownGeo = new THREE.BoxGeometry(0.52, 0.28, 0.52);
      const crownMesh = new THREE.Mesh(crownGeo, hatMeshMat);
      crownMesh.position.set(0, 0.46, 0);
      headGroup.add(crownMesh);

      // Hat ribbon band
      const ribbonGeo = new THREE.BoxGeometry(0.54, 0.08, 0.54);
      const ribbonMesh = new THREE.Mesh(ribbonGeo, makeMat(accentCol, 0.3));
      ribbonMesh.position.set(0, 0.38, 0);
      headGroup.add(ribbonMesh);
    } else if (hatType === 'firefighter') {
      // Rescue Firefighter Helmet with wide rear brim
      const brimGeo = new THREE.CylinderGeometry(0.64, 0.72, 0.08, 16);
      const brimMesh = new THREE.Mesh(brimGeo, hatMeshMat);
      brimMesh.position.set(0, 0.32, -0.04);
      headGroup.add(brimMesh);

      const domeGeo = new THREE.SphereGeometry(0.42, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const domeMesh = new THREE.Mesh(domeGeo, hatMeshMat);
      domeMesh.position.set(0, 0.34, 0);
      headGroup.add(domeMesh);

      // Front Shield Emblem
      const shieldGeo = new THREE.BoxGeometry(0.16, 0.18, 0.04);
      const shieldMesh = new THREE.Mesh(shieldGeo, makeMat(new THREE.Color(0xfacc15), 0.3, 0.5));
      shieldMesh.position.set(0, 0.46, 0.36);
      headGroup.add(shieldMesh);
    } else if (targetSkin.id === 'punk') {
      // Fiery mohawk along top center
      const mohawkGeo = new THREE.BoxGeometry(0.18, 0.38, 0.72);
      const mohawkMat = makeMat(hairCol, 0.3);
      const mohawk = new THREE.Mesh(mohawkGeo, mohawkMat);
      mohawk.position.set(0, 0.48, 0);
      headGroup.add(mohawk);
    }

    charGroup.add(headGroup);

    // 3. Arms
    const armGeo = new THREE.BoxGeometry(0.24, 0.72, 0.26);
    const armMat = makeMat(shirtCol, 0.45);
    const handGeo = new THREE.BoxGeometry(0.22, 0.2, 0.24);
    const handMat = makeMat(skinCol, 0.55);

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.5, 1.05, 0);
    const lSleeve = new THREE.Mesh(armGeo, armMat);
    lSleeve.castShadow = true;
    leftArm.add(lSleeve);
    const lHand = new THREE.Mesh(handGeo, handMat);
    lHand.position.y = -0.36;
    lHand.castShadow = true;
    leftArm.add(lHand);
    charGroup.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.5, 1.05, 0);
    const rSleeve = new THREE.Mesh(armGeo, armMat);
    rSleeve.castShadow = true;
    rightArm.add(rSleeve);
    const rHand = new THREE.Mesh(handGeo, handMat);
    rHand.position.y = -0.36;
    rHand.castShadow = true;
    rightArm.add(rHand);
    charGroup.add(rightArm);

    // 4. Legs and Boots
    const legGeo = new THREE.BoxGeometry(0.28, 0.45, 0.32);
    const legMat = makeMat(pantsCol, 0.5);
    const bootGeo = new THREE.BoxGeometry(0.3, 0.3, 0.38);
    const bootMat = makeMat(bootsCol, 0.4);

    // Left Leg
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.2, 0.4, 0);
    const lPants = new THREE.Mesh(legGeo, legMat);
    lPants.castShadow = true;
    leftLeg.add(lPants);
    const lBoot = new THREE.Mesh(bootGeo, bootMat);
    lBoot.position.set(0, -0.26, 0.03);
    lBoot.castShadow = true;
    leftLeg.add(lBoot);
    charGroup.add(leftLeg);

    // Right Leg
    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.2, 0.4, 0);
    const rPants = new THREE.Mesh(legGeo, legMat);
    rPants.castShadow = true;
    rightLeg.add(rPants);
    const rBoot = new THREE.Mesh(bootGeo, bootMat);
    rBoot.position.set(0, -0.26, 0.03);
    rBoot.castShadow = true;
    rightLeg.add(rBoot);
    charGroup.add(rightLeg);

    // 5. Cape if present
    let capeMesh: THREE.Mesh | undefined;
    if (targetSkin.capeType && targetSkin.capeType !== 'none') {
      const capeHeight = targetSkin.capeType === 'short' ? 0.75 : 1.1;
      const capeGeo = new THREE.BoxGeometry(0.68, capeHeight, 0.06);
      const capeMat = makeMat(capeCol, 0.55);
      capeMesh = new THREE.Mesh(capeGeo, capeMat);
      capeMesh.position.set(0, 1.3 - capeHeight / 2, -0.26);
      capeMesh.rotation.x = 0.12;
      capeMesh.castShadow = true;
      charGroup.add(capeMesh);
    }

    // 6. Pedestal & Glowing Base
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.y = -0.08;

    const baseGeo = new THREE.CylinderGeometry(1.25, 1.35, 0.16, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      metalness: 0.3,
      roughness: 0.4
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.receiveShadow = true;
    pedestalGroup.add(baseMesh);

    // Golden / Accent Ring
    const ringGeo = new THREE.TorusGeometry(1.28, 0.04, 16, 40);
    const ringMat = new THREE.MeshStandardMaterial({
      color: accentCol,
      emissive: accentCol,
      emissiveIntensity: 0.6,
      roughness: 0.2
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.08;
    pedestalGroup.add(ringMesh);

    // Soft Shadow disc on pedestal
    const shadowGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.02, 24);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x09090b,
      transparent: true,
      opacity: 0.45
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.y = 0.09;
    pedestalGroup.add(shadowMesh);

    charGroup.add(pedestalGroup);

    modelPartsRef.current = {
      torso: torsoMesh,
      head: headGroup,
      leftArm,
      rightArm,
      cape: capeMesh
    };

    return charGroup;
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 380;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
    camera.position.set(0, 1.25, 4.4);
    cameraRef.current = camera;

    // 3. Renderer with antialias and tone mapping
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    // Main key light
    const keyLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    // Cool rim light
    const rimLight = new THREE.DirectionalLight(0x818cf8, 0.7);
    rimLight.position.set(-3, 3, -3);
    scene.add(rimLight);

    // Subtle front fill
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(0, 1, 4);
    scene.add(fillLight);

    // 5. Initial Character Model
    const model = buildCharacterModel(skin);
    model.rotation.y = 0.25;
    model.rotation.x = 0.05;
    scene.add(model);
    characterGroupRef.current = model;

    // 6. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Inertia / damping rotation when not actively dragging
      if (characterGroupRef.current) {
        if (!isPointerDownRef.current) {
          characterGroupRef.current.rotation.y += rotationVelocityRef.current.y;
          characterGroupRef.current.rotation.x += rotationVelocityRef.current.x;

          // Gentle continuous slow rotation if almost still
          if (Math.abs(rotationVelocityRef.current.y) < 0.0005) {
            characterGroupRef.current.rotation.y += 0.003;
          }

          // Friction
          rotationVelocityRef.current.y *= 0.94;
          rotationVelocityRef.current.x *= 0.94;
        }

        // Clamp vertical tilt
        characterGroupRef.current.rotation.x = Math.max(-0.25, Math.min(0.35, characterGroupRef.current.rotation.x));

        // Breathing / idle bounce
        const parts = modelPartsRef.current;
        if (parts.torso && parts.head) {
          const breath = Math.sin(elapsed * 2.8) * 0.018;
          parts.torso.position.y = 1.05 + breath;
          parts.head.position.y = 1.76 + breath * 1.3;
          if (parts.leftArm) parts.leftArm.rotation.z = Math.sin(elapsed * 2.8) * 0.04;
          if (parts.rightArm) parts.rightArm.rotation.z = -Math.sin(elapsed * 2.8) * 0.04;
          if (parts.cape) parts.cape.rotation.x = 0.12 + Math.sin(elapsed * 3.2) * 0.05;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 7. Handle Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || 320;
      const h = container.clientHeight || 380;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      if (characterGroupRef.current && scene) {
        scene.remove(characterGroupRef.current);
      }
      renderer.dispose();
    };
  }, [buildCharacterModel]);

  // Update model whenever the selected skin changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove existing model
    if (characterGroupRef.current) {
      const prevRotY = characterGroupRef.current.rotation.y;
      const prevRotX = characterGroupRef.current.rotation.x;
      scene.remove(characterGroupRef.current);

      // Deep dispose previous geometries and materials
      characterGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });

      // Build and attach new model
      const newModel = buildCharacterModel(skin);
      newModel.rotation.y = prevRotY;
      newModel.rotation.x = prevRotX;
      scene.add(newModel);
      characterGroupRef.current = newModel;
    }
  }, [skin, buildCharacterModel]);

  // Pointer event handlers for drag rotation (mouse + touch)
  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isPointerDownRef.current = true;
    setIsInteracting(true);
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    rotationVelocityRef.current = { x: 0, y: 0 };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current || !characterGroupRef.current) return;

    const deltaX = e.clientX - pointerStartRef.current.x;
    const deltaY = e.clientY - pointerStartRef.current.y;

    const rotSpeedY = 0.009;
    const rotSpeedX = 0.006;

    characterGroupRef.current.rotation.y += deltaX * rotSpeedY;
    characterGroupRef.current.rotation.x += deltaY * rotSpeedX;

    rotationVelocityRef.current = {
      y: deltaX * rotSpeedY * 0.7,
      x: deltaY * rotSpeedX * 0.7
    };

    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if capture was already released
    }
    isPointerDownRef.current = false;
    setTimeout(() => setIsInteracting(false), 200);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleZoom(e.deltaY * 0.0035);
  };

  // Touch pinch to zoom support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDistanceRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const diff = touchDistanceRef.current - dist;
      handleZoom(diff * 0.01);
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[300px] flex items-center justify-center select-none overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 via-indigo-950/70 to-slate-950 border-2 border-indigo-500/40 shadow-2xl ${className}`}
    >
      {/* Subtle backdrop radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.2)_0%,transparent_75%)] pointer-events-none" />

      {/* Top Status & Name Badge */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-indigo-500/50 px-2.5 py-1 rounded-xl shadow-lg backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-pixel text-indigo-300">3D PREVIEW</span>
        </div>

        {/* Rotation Hint */}
        <span className="text-[9px] font-pixel text-slate-400 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-700/80">
          DRAG TO ROTATE
        </span>
      </div>

      {/* Interactive 3D Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none relative z-10"
        title="Drag or swipe to rotate 3D character"
      />

      {/* Subtle swipe hint */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-slate-900/70 border border-slate-700/60 px-3 py-1 rounded-full backdrop-blur-sm">
        <span className="text-[10px] font-pixel text-slate-400">
          SWIPE TO ROTATE
        </span>
      </div>
    </div>
  );
};
