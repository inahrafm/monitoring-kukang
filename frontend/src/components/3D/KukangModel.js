import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Sparkles, Stars } from '@react-three/drei';
import * as THREE from 'three';

// Kukang model dengan detail lebih realistis
const KukangModel = () => {
    const groupRef = useRef();
    const eyesRef = useRef();
    const tailRef = useRef();
    const leftArmRef = useRef();
    const rightArmRef = useRef();

    // Animasi yang lebih hidup
    useFrame((state) => {
        const time = state.clock.elapsedTime;
        
        if (groupRef.current) {
            // Gerakan floating yang lebih alami
            groupRef.current.position.y = Math.sin(time * 0.5) * 0.15;
            groupRef.current.rotation.y = Math.sin(time * 0.2) * 0.2;
        }

        // Gerakan lengan (seperti sedang memegang)
        if (leftArmRef.current) {
            leftArmRef.current.rotation.z = Math.sin(time * 2) * 0.1;
        }
        if (rightArmRef.current) {
            rightArmRef.current.rotation.z = Math.sin(time * 2 + 1) * 0.1;
        }

        // Gerakan ekor
        if (tailRef.current) {
            tailRef.current.rotation.y = Math.sin(time * 3) * 0.3;
        }

        // Kedip mata (lebih natural)
        if (eyesRef.current && Math.random() < 0.002) {
            eyesRef.current.children.forEach(eye => {
                eye.scale.y = 0.1;
                setTimeout(() => {
                    eye.scale.y = 1;
                }, 100);
            });
        }
    });

    return (
        <group ref={groupRef}>
            {/* Body - Lebih proporsional */}
            <mesh position={[0, 0, 0]}>
                <capsuleGeometry args={[0.6, 1.2, 4, 8]} />
                <meshStandardMaterial 
                    color="#8B4513" 
                    roughness={0.6}
                    emissive="#3a1e0a"
                    emissiveIntensity={0.1}
                />
            </mesh>
            
            {/* Bulu texture effect */}
            <mesh position={[0, 0.1, 0.4]}>
                <sphereGeometry args={[0.7, 16, 16]} />
                <meshStandardMaterial 
                    color="#5D3A1A" 
                    roughness={0.8}
                    transparent
                    opacity={0.3}
                />
            </mesh>

            {/* Head - Lebih detail */}
            <group position={[0, 0.9, 0.5]}>
                {/* Main head */}
                <mesh>
                    <sphereGeometry args={[0.55, 32, 32]} />
                    <meshStandardMaterial 
                        color="#8B4513" 
                        roughness={0.5}
                        emissive="#3a1e0a"
                        emissiveIntensity={0.1}
                    />
                </mesh>
                
                {/* Face mask - ciri khas kukang */}
                <mesh position={[0, 0.1, 0.4]}>
                    <sphereGeometry args={[0.4, 16, 16]} />
                    <meshStandardMaterial color="#D2691E" roughness={0.7} />
                </mesh>
            </group>
            
            {/* Ears - Lebih besar dan realistis */}
            <mesh position={[-0.35, 1.25, 0.5]} rotation={[0.2, 0.3, 0.1]}>
                <coneGeometry args={[0.25, 0.4, 8]} />
                <meshStandardMaterial color="#5D3A1A" roughness={0.8} />
            </mesh>
            <mesh position={[0.35, 1.25, 0.5]} rotation={[0.2, -0.3, -0.1]}>
                <coneGeometry args={[0.25, 0.4, 8]} />
                <meshStandardMaterial color="#5D3A1A" roughness={0.8} />
            </mesh>
            
            {/* Eyes group - Lebih ekspresif */}
            <group ref={eyesRef} position={[0, 1.0, 1.0]}>
                {/* Left eye */}
                <group position={[-0.2, 0, 0]}>
                    <mesh>
                        <sphereGeometry args={[0.14, 24, 24]} />
                        <meshStandardMaterial color="white" emissive="#ccccff" emissiveIntensity={0.2} />
                    </mesh>
                    <mesh position={[0.06, 0.03, 0.06]}>
                        <sphereGeometry args={[0.06, 12, 12]} />
                        <meshStandardMaterial color="black" />
                    </mesh>
                    {/* Eye highlight */}
                    <mesh position={[0.08, 0.06, 0.08]}>
                        <sphereGeometry args={[0.02, 6, 6]} />
                        <meshStandardMaterial color="white" emissive="#ffffff" />
                    </mesh>
                </group>
                
                {/* Right eye */}
                <group position={[0.2, 0, 0]}>
                    <mesh>
                        <sphereGeometry args={[0.14, 24, 24]} />
                        <meshStandardMaterial color="white" emissive="#ccccff" emissiveIntensity={0.2} />
                    </mesh>
                    <mesh position={[0.06, 0.03, 0.06]}>
                        <sphereGeometry args={[0.06, 12, 12]} />
                        <meshStandardMaterial color="black" />
                    </mesh>
                    <mesh position={[0.08, 0.06, 0.08]}>
                        <sphereGeometry args={[0.02, 6, 6]} />
                        <meshStandardMaterial color="white" emissive="#ffffff" />
                    </mesh>
                </group>
            </group>
            
            {/* Nose */}
            <mesh position={[0, 0.8, 1.1]}>
                <sphereGeometry args={[0.12, 16, 16]} />
                <meshStandardMaterial color="black" roughness={0.3} />
            </mesh>
            
            {/* Mouth */}
            <mesh position={[-0.1, 0.7, 1.1]} rotation={[0, 0, 0.2]}>
                <torusGeometry args={[0.08, 0.02, 8, 16, Math.PI]} />
                <meshStandardMaterial color="#4a2c1a" />
            </mesh>
            
            {/* Arms - Lebih panjang dan detail */}
            <group ref={leftArmRef} position={[-0.9, 0.5, 0.2]} rotation={[0.2, 0, 0.3]}>
                <mesh>
                    <cylinderGeometry args={[0.18, 0.16, 1.0]} />
                    <meshStandardMaterial color="#5D3A1A" roughness={0.7} />
                </mesh>
                {/* Hand */}
                <mesh position={[0, -0.6, 0]}>
                    <sphereGeometry args={[0.2, 8, 8]} />
                    <meshStandardMaterial color="#4a2c1a" />
                </mesh>
            </group>
            
            <group ref={rightArmRef} position={[0.9, 0.5, 0.2]} rotation={[0.2, 0, -0.3]}>
                <mesh>
                    <cylinderGeometry args={[0.18, 0.16, 1.0]} />
                    <meshStandardMaterial color="#5D3A1A" roughness={0.7} />
                </mesh>
                <mesh position={[0, -0.6, 0]}>
                    <sphereGeometry args={[0.2, 8, 8]} />
                    <meshStandardMaterial color="#4a2c1a" />
                </mesh>
            </group>
            
            {/* Legs */}
            <mesh position={[-0.4, -0.9, 0.3]} rotation={[0.1, 0, 0]}>
                <cylinderGeometry args={[0.2, 0.18, 0.8]} />
                <meshStandardMaterial color="#5D3A1A" roughness={0.7} />
            </mesh>
            <mesh position={[0.4, -0.9, 0.3]} rotation={[0.1, 0, 0]}>
                <cylinderGeometry args={[0.2, 0.18, 0.8]} />
                <meshStandardMaterial color="#5D3A1A" roughness={0.7} />
            </mesh>
            
            {/* Tail - Lebih panjang */}
            <mesh ref={tailRef} position={[-0.6, -0.4, -0.7]} rotation={[0.2, 0.3, 0.1]}>
                <cylinderGeometry args={[0.12, 0.1, 0.8]} />
                <meshStandardMaterial color="#4a2c1a" roughness={0.8} />
            </mesh>
            
            {/* Claws (cakar) - Detail kecil */}
            <mesh position={[-0.45, -0.65, 0.4]} rotation={[0, 0, 0.2]}>
                <coneGeometry args={[0.05, 0.15, 4]} />
                <meshStandardMaterial color="#2a1a0a" roughness={0.9} />
            </mesh>
            <mesh position={[-0.35, -0.65, 0.5]} rotation={[0, 0.1, 0.1]}>
                <coneGeometry args={[0.05, 0.15, 4]} />
                <meshStandardMaterial color="#2a1a0a" roughness={0.9} />
            </mesh>
        </group>
    );
};

// Environment dengan hutan malam
export const KukangScene = () => {
    return (
        <Canvas
            camera={{ position: [4, 1.5, 6], fov: 45 }}
            style={{ 
                width: '100%', 
                height: '100%',
                background: 'linear-gradient(135deg, #0a1a2a 0%, #1a2a3a 100%)'
            }}
        >
            {/* Lighting lebih dramatis */}
            <ambientLight intensity={0.3} />
            <directionalLight position={[5, 5, 5]} intensity={0.5} color="#ffeedd" />
            <pointLight position={[-2, 3, 3]} intensity={0.8} color="#ffaa66" />
            <spotLight 
                position={[0, 5, 5]} 
                angle={0.3} 
                penumbra={0.5} 
                intensity={0.8}
                color="#ffeecc"
            />
            
            {/* Efek bintang di background */}
            <Stars 
                radius={100}
                depth={50}
                count={2000}
                factor={4}
                saturation={0}
                fade
            />
            
            {/* Sparkles efek magis */}
            <Sparkles 
                count={100}
                scale={8}
                size={1}
                speed={0.2}
                color="#88aaff"
                opacity={0.3}
            />
            
            {/* Environment map untuk refleksi */}
            <Environment preset="forest" />
            
            {/* Fog untuk efek kedalaman */}
            <fog attach="fog" args={['#0a1a2a', 5, 15]} />
            
            {/* Kukang model */}
            <KukangModel />
            
            {/* Pohon-pohon sederhana di background */}
            <Tree position={[-3, -1, -3]} scale={0.8} />
            <Tree position={[3, -1, -3]} scale={0.8} />
            <Tree position={[-2, -1, -4]} scale={1.2} />
            <Tree position={[2, -1, -4]} scale={1.2} />
            
            {/* Controls */}
            <OrbitControls 
                enableZoom={false}
                enablePan={false}
                maxPolarAngle={Math.PI / 2}
                minPolarAngle={Math.PI / 3}
                autoRotate
                autoRotateSpeed={1.0}
                rotateSpeed={0.5}
            />
            
            {/* Ground dengan efek lumut */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
                <circleGeometry args={[5, 32]} />
                <meshStandardMaterial 
                    color="#1a4a1a" 
                    roughness={0.9}
                    emissive="#0a2a0a"
                    emissiveIntensity={0.2}
                />
            </mesh>
            
            {/* Beberapa titik cahaya kunang-kunang */}
            <Fireflies count={15} />
        </Canvas>
    );
};

// Komponen pohon sederhana
const Tree = ({ position, scale = 1 }) => {
    return (
        <group position={position} scale={scale}>
            <mesh position={[0, 1, 0]}>
                <cylinderGeometry args={[0.3, 0.5, 2]} />
                <meshStandardMaterial color="#4a2a1a" roughness={0.9} />
            </mesh>
            <mesh position={[0, 2.2, 0]}>
                <coneGeometry args={[0.8, 1.5, 8]} />
                <meshStandardMaterial color="#2a6a2a" roughness={0.8} />
            </mesh>
        </group>
    );
};

// Komponen kunang-kunang
const Fireflies = ({ count = 10 }) => {
    const particlesRef = useRef();
    
    useFrame((state) => {
        if (particlesRef.current) {
            particlesRef.current.rotation.y += 0.001;
        }
    });

    return (
        <points ref={particlesRef}>
            <bufferGeometry>
                <float32BufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={new Float32Array(count * 3).map(() => (Math.random() - 0.5) * 8)}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                color="#ffffaa"
                size={0.1}
                transparent
                opacity={0.8}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};

export default KukangScene;