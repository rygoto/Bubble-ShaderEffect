import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export const transformControll = () => {
    type Data = {
        position: THREE.Vector3
        scale: number
        direction: THREE.Vector3
        floatOffset: number
        floatSpeed: number
        turbulence: number
        startDelay: number
        index: number
    }

    const generateParticlesInLeft = (): Data[] => {
        return [...Array(24)].map((i) => ({
            position: new THREE.Vector3(
                THREE.MathUtils.randFloat(-15.5, -16.3),
                THREE.MathUtils.randFloat(-5, -5.3),
                0
            ),
            scale: THREE.MathUtils.randFloat(0.2, 1.2),
            direction: new THREE.Vector3(1, 0, 0),
            floatOffset: Math.random() * Math.PI * 20, // ランダムな初期位相
            floatSpeed: THREE.MathUtils.randFloat(0.5, 1.5), // ランダムな浮遊速度
            turbulence: THREE.MathUtils.randFloat(0.005, 0.015) * 1.5,// ランダムな乱流

            startDelay: Math.random() * 3.0, // 開始遅延
            index: i
        }))
    }

    const speedControll = () => {
        const data = generateParticlesInLeft()[0]
        const time = 0.0

        //最初の動き（思いっきりｘ軸方向を移動）
        const initialDirection = new THREE.Vector3(0.5, 0.1, 0.0)
        const initialDuration = THREE.MathUtils.randFloat(0.8, 1.3)
        const initialSpeed = THREE.MathUtils.randFloat(1.8, 2.1)

        const newPosition = data.position.clone()
        newPosition.x += initialDirection.x * initialSpeed * initialDuration
        newPosition.y += initialDirection.y * initialSpeed * initialDuration

        //if time>duration タービュランスと風
        const floatY = Math.sin(time * data.floatSpeed + data.floatOffset) * 0.04 * 3.0
        const floatX = Math.cos(time * data.floatSpeed * 0.5 + data.floatOffset) * 0.02 * 3.0

        const Turbulence = data.turbulence * 8.0;
        //ここの数値でタービュランスの強さを調整
        const noise = {
            x: Math.sin(time * 2.1 + data.floatOffset * 3.7) * Turbulence,
            y: Math.cos(time * 1.7 + data.floatOffset * 2.3) * Turbulence
        }

        const windStrength = 10.0
        const windEffect = {
            x: Math.sin(time * 0.5) * windStrength * (1 + Math.sin(time * 0.23)),
            y: Math.cos(time * 0.3) * windStrength * (1 + Math.cos(time * 0.17))
        }
        const reverseFlow = {
            x: Math.sin(time * 0.15) * 0.006 * Math.max(0, Math.sin(time * 0.4)),
            y: Math.cos(time * 0.12) * 0.005 * Math.max(0, Math.sin(time * 0.3))
        }

        //turblanceと風の影響を加味
        newPosition.x += floatX + noise.x + windEffect.x - reverseFlow.x
        newPosition.y += floatY + noise.y + windEffect.y - reverseFlow.y
    };
}