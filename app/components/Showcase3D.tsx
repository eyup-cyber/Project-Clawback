"use client";
import { useEffect, useRef, useState, Suspense, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment } from "@react-three/drei";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";

gsap.registerPlugin(ScrollTrigger);

// Ballot Box Component
function BallotBox({ position, scrollProgress }: { position: [number, number, number]; scrollProgress: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.2 + scrollProgress * Math.PI;
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
      <group ref={groupRef} position={position}>
        {/* Main box */}
        <mesh>
          <boxGeometry args={[0.8, 1, 0.6]} />
          <meshStandardMaterial
            color="#1a1a1a"
            metalness={0.3}
            roughness={0.7}
          />
        </mesh>
        {/* Slot */}
        <mesh position={[0, 0.51, 0]}>
          <boxGeometry args={[0.5, 0.02, 0.05]} />
          <meshStandardMaterial
            color="#32CD32"
            emissive="#32CD32"
            emissiveIntensity={0.5}
          />
        </mesh>
        {/* Edge glow */}
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(0.82, 1.02, 0.62)]} />
          <lineBasicMaterial color="#32CD32" linewidth={2} />
        </lineSegments>
      </group>
    </Float>
  );
}

// Megaphone Component
function Megaphone({ position, scrollProgress }: { position: [number, number, number]; scrollProgress: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.15 + scrollProgress * Math.PI * 0.5;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={0.4}>
      <group ref={groupRef} position={position} rotation={[0, 0, -0.3]}>
        {/* Cone */}
        <mesh>
          <coneGeometry args={[0.5, 1.2, 32]} />
          <meshStandardMaterial
            color="#1a1a1a"
            metalness={0.4}
            roughness={0.6}
          />
        </mesh>
        {/* Inner glow */}
        <mesh position={[0, 0.4, 0]}>
          <circleGeometry args={[0.45, 32]} />
          <meshStandardMaterial
            color="#32CD32"
            emissive="#32CD32"
            emissiveIntensity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Handle */}
        <mesh position={[0, -0.7, 0.2]} rotation={[0.3, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.4, 16]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
      </group>
    </Float>
  );
}

// CCTV Camera Component
function CCTVCamera({ position, scrollProgress }: { position: [number, number, number]; scrollProgress: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Panning effect
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.3 + scrollProgress * Math.PI * 0.3;
    }
  });

  return (
    <Float speed={1} rotationIntensity={0.1} floatIntensity={0.2}>
      <group ref={groupRef} position={position}>
        {/* Camera body */}
        <mesh>
          <boxGeometry args={[0.4, 0.3, 0.6]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* Lens */}
        <mesh position={[0, 0, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.1, 0.15, 32]} />
          <meshStandardMaterial color="#0a0a0a" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Recording light */}
        <mesh position={[0.15, 0.1, 0.31]}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshStandardMaterial
            color="#FF00FF"
            emissive="#FF00FF"
            emissiveIntensity={2}
          />
        </mesh>
        {/* Mount */}
        <mesh position={[0, 0.25, -0.2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.3, 16]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
      </group>
    </Float>
  );
}

// Burning Pound Note Component
function BurningNote({ position, scrollProgress }: { position: [number, number, number]; scrollProgress: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1 + scrollProgress * Math.PI * 0.2;
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  // Create particle positions for fire effect (using stable seeded values)
  const particlePositions = useMemo(() => {
    const particleCount = 50;
    const positions = new Float32Array(particleCount * 3);
    // Using deterministic pseudo-random values for stable rendering
    for (let i = 0; i < particleCount; i++) {
      const seed = i * 0.1;
      positions[i * 3] = (Math.sin(seed * 12.9898) * 0.5 - 0.25) * 0.4;
      positions[i * 3 + 1] = ((Math.sin(seed * 78.233) + 1) * 0.3) + 0.2;
      positions[i * 3 + 2] = (Math.sin(seed * 43.758) * 0.5 - 0.25) * 0.1;
    }
    return positions;
  }, []);

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
      <group ref={groupRef} position={position}>
        {/* Note */}
        <mesh>
          <planeGeometry args={[0.7, 0.35]} />
          <meshStandardMaterial
            color="#FFD700"
            emissive="#FFD700"
            emissiveIntensity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Fire particles */}
        <points ref={particlesRef} position={[0, 0.1, 0]}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[particlePositions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.05}
            color="#FF4500"
            transparent
            opacity={0.8}
          />
        </points>
      </group>
    </Float>
  );
}

// Central Torus Knot (main focal point)
function CentralShape({ scrollProgress }: { scrollProgress: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.1 + scrollProgress * Math.PI * 0.5;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.15 + scrollProgress * Math.PI;
      const scale = 1 + scrollProgress * 0.3;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <mesh ref={meshRef}>
      <torusKnotGeometry args={[0.8, 0.25, 128, 32]} />
      <meshStandardMaterial
        color="#32CD32"
        emissive="#32CD32"
        emissiveIntensity={0.4}
        metalness={0.7}
        roughness={0.3}
        wireframe={false}
      />
    </mesh>
  );
}

function Scene({ scrollProgress }: { scrollProgress: number }) {
  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#32CD32" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#FFD700" />
      <pointLight position={[0, -10, 5]} intensity={0.3} color="#013220" />
      <spotLight
        position={[0, 10, 0]}
        angle={0.3}
        penumbra={1}
        intensity={0.5}
        color="#32CD32"
      />
      
      {/* Central shape */}
      <CentralShape scrollProgress={scrollProgress} />
      
      {/* Political artifacts floating around */}
      <BallotBox position={[-3, 1, -2]} scrollProgress={scrollProgress} />
      <Megaphone position={[3, -0.5, -1.5]} scrollProgress={scrollProgress} />
      <CCTVCamera position={[-2.5, -1.5, -1]} scrollProgress={scrollProgress} />
      <BurningNote position={[2.5, 1.5, -2]} scrollProgress={scrollProgress} />
      
      <Environment preset="night" />
    </>
  );
}

function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="w-12 h-12 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}
      />
    </div>
  );
}

export default function Showcase3D() {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => {
          setScrollProgress(self.progress);
        },
      });

      gsap.fromTo(
        textRef.current,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: textRef.current,
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="h-screen relative flex items-center justify-center overflow-hidden"
    >
      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <Suspense fallback={<LoadingFallback />}>
          <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
            <Scene scrollProgress={scrollProgress} />
          </Canvas>
        </Suspense>
      </div>

      {/* Gradient overlays for depth */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 30%, var(--background) 80%)",
        }}
      />
      <div 
        className="absolute inset-x-0 top-0 h-32 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, var(--background), transparent)",
        }}
      />
      <div 
        className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
        style={{
          background: "linear-gradient(to top, var(--background), transparent)",
        }}
      />

      {/* Overlay text */}
      <div
        ref={textRef}
        className="relative z-10 text-center pointer-events-none px-4"
      >
        <p
          className="text-xs sm:text-sm uppercase tracking-[0.2em] mb-3 sm:mb-4 italic font-light"
          style={{ 
            fontFamily: "var(--font-body)",
            color: "var(--accent)",
            letterSpacing: "-0.02em",
          }}
        >
          A View From The Sewer
        </p>
        <h2
          className="text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-bold"
          style={{
            fontFamily: "var(--font-kindergarten)",
            color: "var(--accent)",
            textShadow: "0 0 40px var(--glow-accent), 0 0 80px var(--glow-accent)",
          }}
        >
          EXPLORE
        </h2>
        <p 
          className="mt-4 sm:mt-6 text-sm sm:text-base lg:text-lg max-w-xs sm:max-w-sm md:max-w-md mx-auto font-medium"
          style={{ 
            fontFamily: "var(--font-body)",
            color: "var(--accent)",
            letterSpacing: "-0.02em",
          }}
        >
          Ballot boxes, megaphones, surveillance — the symbols of our political world
        </p>
      </div>
    </section>
  );
}
