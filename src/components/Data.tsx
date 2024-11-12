import * as THREE from 'three';

export type Data = {
    position: THREE.Vector3
    scale: number
    direction: THREE.Vector3
}

export const datas: Data[] = [...Array(24)].map(() => {
    const position = new THREE.Vector3(THREE.MathUtils.randFloat(-10, -11), THREE.MathUtils.randFloat(-3.5, -3.3), 0)
    const scale = THREE.MathUtils.randFloat(0.2, 1.2)
    const direction = new THREE.Vector3(THREE.MathUtils.randFloat(0.9, 0.5), THREE.MathUtils.randFloat(0.6, 0.2), THREE.MathUtils.randFloat(0.8, 0.2))
    return { position, scale, direction }
})
