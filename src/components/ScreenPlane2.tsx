import { FC, useCallback, useEffect, useState, useRef } from 'react'
import * as THREE from 'three'
import { Plane, useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { pass } from 'three/webgpu'
//import { datas } from './Data'
//import { vertexShader, fragmentShader } from './shaders'

type Data = {
    position: THREE.Vector3
    scale: number
    direction: THREE.Vector3
    floatOffset: number
    floatSpeed: number
    turbulence: number
    startDelay: number
    index: number
    birthTime: number
}

const generateParticlesInLeft = (timeRef): Data[] => {
    return [...Array(24)].map((_, i) => ({
        position: new THREE.Vector3(
            THREE.MathUtils.randFloat(-16.6, -17.3),
            THREE.MathUtils.randFloat(-5, -5.3),
            0
        ),
        /*position: new THREE.Vector3(
            THREE.MathUtils.randFloat(-13, 13),
            THREE.MathUtils.randFloat(-5, 5.3),
            0
        ),*/
        scale: THREE.MathUtils.randFloat(0.2, 1.2),
        /*direction: new THREE.Vector3(
            THREE.MathUtils.randFloat(0.9, 0.5),
            THREE.MathUtils.randFloat(0.6, 0.2),
            THREE.MathUtils.randFloat(0.8, 0.2)
        ),*/
        direction: new THREE.Vector3(1, 1, 0),
        floatOffset: Math.random() * Math.PI * 20, // ランダムな初期位相
        floatSpeed: THREE.MathUtils.randFloat(0.5, 1.5), // ランダムな浮遊速度
        turbulence: THREE.MathUtils.randFloat(0.005, 0.015) * 1.5,// ランダムな乱流

        startDelay: Math.random() * 3.0,// 開始遅延
        index: i,
        birthTime: timeRef.current
    }))
}

const generateParticlesInRight = (timeRef): Data[] => {
    return [...Array(24)].map((_, i) => ({
        position: new THREE.Vector3(
            THREE.MathUtils.randFloat(16.6, 17.3),
            THREE.MathUtils.randFloat(-5, -5.3),
            0
        ),
        scale: THREE.MathUtils.randFloat(0.2, 1.2),
        /*direction: new THREE.Vector3(
            THREE.MathUtils.randFloat(-0.9, -0.5),
            THREE.MathUtils.randFloat(0.6, 0.2),
            THREE.MathUtils.randFloat(0.8, 0.2)
        ),*/
        direction: new THREE.Vector3(-1, 1, 0),
        floatOffset: Math.random() * Math.PI * 2, // ランダムな初期位相
        floatSpeed: THREE.MathUtils.randFloat(0.5, 1.5), // ランダムな浮遊速度
        turbulence: THREE.MathUtils.randFloat(0.005, 0.015),
        startDelay: Math.random() * 3.0, // 開始遅延,
        index: i,
        birthTime: timeRef.current
    }))
}

export const ScreenPlane: FC = () => {
    const timeRef = useRef(0)
    useFrame((state, delta) => {
        timeRef.current += delta
    })

    const { viewport, camera } = useThree()
    //const texture = useTexture('/no05-super-169.jpg')
    //const texture = useTexture('/city1-1.jpg')
    const texture = useTexture('/cityscape1.png')
    texture.wrapS = THREE.MirroredRepeatWrapping
    texture.wrapT = THREE.MirroredRepeatWrapping

    const [particles, setParticles] = useState(generateParticlesInLeft(timeRef))

    const textureAspect = texture.image.width / texture.image.height
    const aspect = viewport.aspect
    const ratio = aspect / textureAspect
    const [x, y] = aspect < textureAspect ? [ratio, 1] : [1, 1 / ratio]

    //const texture2 = useTexture('/sky.png')
    //const texture2 = useTexture('/city1-2.jpg')
    const texture2 = useTexture('/cityscape2.png')
    texture2.wrapS = THREE.MirroredRepeatWrapping
    texture2.wrapT = THREE.MirroredRepeatWrapping

    const shader = {
        uniforms: {
            u_aspect: { value: viewport.aspect },
            u_datas: { value: particles },
            u_texture: { value: texture },
            u_uvScale: { value: new THREE.Vector2(x, y) },
            //以下追加
            u_time: { value: 0.1 },
            u_filmThickness: { value: 0.1 }, // 追加：薄膜厚み
            u_refractiveIndex: { value: 1.33 }, // 追加：屈折率
            u_MinWavelength: { value: 380.0 }, // 波長の最小値
            u_MaxWavelength: { value: 780.0 }, // 波長の最大値
            u_NoiseStrength: { value: 3.0 }, // ノイズの強度
            u_NoiseTexture: { value: useTexture('/noisetexture.png') }, // ノイズテクスチャnoisetexture.png

            //以下追加
            u_Octaves: { value: 4.0 }, // ノイズのオクターブ数
            u_TimeFrequency: { value: 1.0 }, // ノイズの時間周波数
            u_Amplitude: { value: 1.0 }, // ノイズの振幅
            u_Frequency: { value: 1.0 }, // ノイズの周波数
        },
        vertexShader,
        fragmentShader,
        side: THREE.DoubleSide,
    };

    const handleInteraction = useCallback((event: MouseEvent | Touch) => {
        const x = (event.clientX / window.innerWidth) * 2 - 1
        //console.log(x)
        if (x < 0) {
            setParticles(generateParticlesInLeft(timeRef))
        } else {
            setParticles(generateParticlesInRight(timeRef))
        }
    }, [])

    useFrame(() => {
        shader.uniforms.u_time.value += 0.01;
    });

    //const timeRef = useRef(0)
    useFrame((state, delta) => {
        timeRef.current += delta
        setParticles(prevParticles => {
            return prevParticles.map(data => {
                const time = timeRef.current

                const initialDirection = new THREE.Vector3(0.5, 0.07, 0.0)
                const initialSpeedControll = 0.7
                const initialSpeed = THREE.MathUtils.randFloat(1.8, 2.1) * initialSpeedControll
                const dataInitialTime = time * data.index;
                const dataGapPosition = new THREE.Vector3(data.index, 0, 0)
                //const newPosition = data.position.clone()
                const newPosition = data.position.clone()
                const passedTime = time - data.birthTime;
                const clampIndex = data.index % 24
                //console.log(passedTime)
                //console.log(data.index)
                const decayVariableX = 0.45//大きくするとすぐに上にあがる、小さくするとｘ軸の移動が多くなる
                const decayFactorX = Math.exp(-passedTime * decayVariableX);
                const decayVariableY = 0.3
                const decayFactorY = Math.exp(-passedTime * decayVariableY);
                //console.log(decayFactor)
                newPosition.x += initialDirection.x * data.direction.x * initialSpeed * decayFactorX
                newPosition.y += initialDirection.y * data.direction.y * initialSpeed * decayFactorY

                //if (passedTime > 2.0) {
                // 以下は既存の風やタービュランスの計算

                //個々のしゃぼん玉の位相変位
                const floatStrength = 2.0
                const floatY = Math.sin(time * data.floatSpeed + data.floatOffset) * 0.04 * 3.0 * floatStrength
                const floatX = Math.cos(time * data.floatSpeed * 0.5 + data.floatOffset) * 0.02 * 3.0 * floatStrength

                const strongerTurbulence = data.turbulence * 3.0
                const noise = {
                    x: Math.sin(time * 2.1 + data.floatOffset * 3.7) * strongerTurbulence,
                    y: Math.cos(time * 1.7 + data.floatOffset * 2.3) * strongerTurbulence
                }

                //しゃぼん玉全体に影響する
                const windStrength = 0.008 * 10.0 / 3.0
                const windEffect = {
                    x: Math.sin(time * 0.5) * windStrength * (1 + Math.sin(time * 0.23)),
                    y: Math.cos(time * 0.3) * windStrength * (1 + Math.cos(time * 0.17))
                }

                const reverseStrength = 3.0
                const reverseFlow = {
                    x: Math.sin(time * 0.15) * 0.006 * Math.max(0, Math.sin(time * 0.4)) * reverseStrength,
                    y: Math.cos(time * 0.12) * 0.005 * Math.max(0, Math.sin(time * 0.3)) / 3.0
                }

                //const zenkin = 1 / passedTime
                //passeTimeと同時に増えるが1に達するとずっと1のまま:turblenceControll
                const turblenceVariable = 0.2//turblenceが効く時間を調整。大きいとすぐに効く
                const turblenceControll = Math.min(passedTime * turblenceVariable, 1)
                newPosition.x += (floatX + noise.x + windEffect.x) * turblenceControll// - reverseFlow.x) * turblenceControll
                newPosition.y += (floatY + noise.y + windEffect.y) * turblenceControll// - reverseFlow.y) * turblenceControll
                //turblenceControllは各々変数にかけた方が良い（最初はreverseFlowは小さく、とか）
                //}

                const newScale = data.scale * 0.995

                return {
                    ...data,
                    position: newPosition,
                    scale: newScale
                }
            })
        })
    });

    useFrame(() => {
        particles.forEach((data, i) => {
            shader.uniforms.u_datas.value[i].position.copy(data.position)
        })
    })

    return (
        <>
            <ambientLight intensity={1.5} />
            <Plane
                args={[1, 1]}
                scale={[viewport.width, viewport.height * 0.9, 1]}
                onClick={handleInteraction}
                onPointerDown={handleInteraction}
                position={[0, 0, -0.3]}
            //onClick={(e) => handleInteraction(e.nativeEvent)}
            >
                <meshStandardMaterial attach="material" map={texture2} />
            </Plane>
            <Plane
                args={[1, 1]}
                scale={[viewport.width, viewport.height, 1]}
                onClick={(e) => handleInteraction}
                onPointerDown={(e) => handleInteraction}
            >
                <shaderMaterial attach="material" args={[shader]} transparent={true} />
            </Plane>
        </>
    )
}

const vertexShader = `
varying vec2 v_uv;

void main(){
    v_uv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
}
`;

/*const vertexShader = `
varying vec2 v_uv;
uniform float u_Time;
uniform int u_Octaves;
uniform float u_TimeFrequency;
uniform float u_Amplitude;
uniform float u_Frequency;
 
attribute vec4 tangent;
 
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 varyNormal;
 
vec3 permute(vec3 x) {
    return mod(((x * 34.0) + 1.0) * x, 289.0);
}
 
float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
 
        return mix(mix(mix(dot(permute(i + vec3(0, 0, 0)), f - vec3(0, 0, 0)),
            dot(permute(i + vec3(1, 0, 0)), f - vec3(1, 0, 0)), u.x),
            mix(dot(permute(i + vec3(0, 1, 0)), f - vec3(0, 1, 0)),
                dot(permute(i + vec3(1, 1, 0)), f - vec3(1, 1, 0)), u.x), u.y),
            mix(mix(dot(permute(i + vec3(0, 0, 1)), f - vec3(0, 0, 1)),
                dot(permute(i + vec3(1, 0, 1)), f - vec3(1, 0, 1)), u.x),
                mix(dot(permute(i + vec3(0, 1, 1)), f - vec3(0, 1, 1)),
                    dot(permute(i + vec3(1, 1, 1)), f - vec3(1, 1, 1)), u.x), u.y), u.z);
}
 
float fractalNoise(vec3 p, int octaves) {
    float noiseValue = 0.0;
    float amplitude = u_Amplitude;
    float frequency = 1.0;
        for (int i = 0; i < octaves; i++) {
            noiseValue += amplitude * noise(p * frequency);
            amplitude *= 0.5;
            frequency *= 2.0;
        }
        return noiseValue;
    }
 
float getDisplacement(vec3 p) {
        return fractalNoise(p * u_Frequency + vec3(u_Time * u_TimeFrequency), u_Octaves);
    }
 
float getDisplacementEffect(float noiseValue) {
        return sin(noiseValue) * cos(noiseValue);
    }
 
 
void main() {
    // 変位計算
    vec3 biTangent = cross(normal, tangent.xyz);
    float shift = 0.01;
    vec3 modifiedPosition = position; // csm_Position の代わりに position を使用
    vec3 positionA = position + tangent.xyz * shift;
    vec3 positionB = position + biTangent * shift;
    
    vPosition = position;
    
    float displacement = getDisplacementEffect(getDisplacement(vPosition));
    float displacementA = getDisplacementEffect(getDisplacement(positionA));
    float displacementB = getDisplacementEffect(getDisplacement(positionB));
    
    // 位置の更新
    modifiedPosition += normal * displacement;
    positionA += normal * displacementA;
    positionB += normal * displacementB;
    
    // 法線の計算
    vec3 toA = normalize(positionA - modifiedPosition);
    vec3 toB = normalize(positionB - modifiedPosition);
    vec3 newNormal = normalize(cross(toA, toB));
    
    // varying変数の設定
    v_uv = uv;
    varyNormal = newNormal;
    
    // 最終的な頂点位置の設定
    gl_Position = projectionMatrix * modelViewMatrix * vec4(modifiedPosition, 1.0);
}
`;*/

//https://claude.ai/chat/e6b5a717-c8db-4a98-9f80-cbdcca70a3bf
const fragmentShader = `
struct Data {
    vec3 position;
    float scale;
};

uniform float u_aspect;
uniform Data u_datas[24];
uniform sampler2D u_texture;
uniform vec2 u_uvScale;
varying vec2 v_uv;
uniform float u_time;//時間
uniform float u_filmThickness; // 追加：薄膜厚み
uniform float u_refractiveIndex; // 追加：屈折率
uniform float u_MinWavelength; // 波長の最小値
uniform float u_MaxWavelength; // 波長の最大値
uniform float u_NoiseStrength; // ノイズの強度
uniform sampler2D u_NoiseTexture; // ノイズテクスチャ

//displace用に追加
uniform int u_Octaves;
uniform float u_Amplitude;
uniform float u_Frequency;
uniform float u_TimeFrequency;

float hash(vec3 p) {
    p = fract(p * 0.3183099 + .1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

// 単純化したノイズ関数
float simpleNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // Smoothstep
    
    // 単純化した補間
    float n = dot(i, vec3(1.0, 157.0, 113.0));
    vec4 h = vec4(0.0, 1.0, 157.0, 158.0);
    vec4 grad = fract(sin(vec4(n) + h) * 43758.5453);
    float a = mix(grad.x, grad.y, f.x);
    float b = mix(grad.z, grad.w, f.x);
    return mix(a, b, f.y);
}

// 最適化された変位計算
/*float getDisplacement(vec3 p) {
    // 一回のノイズ計算のみを使用
    return simpleNoise(p * u_Frequency + vec3(u_time * u_TimeFrequency)) * u_Amplitude;
}*/
float getDisplacement(vec3 p) {
    // テクスチャからノイズ値を取得
    vec3 noiseCoord = fract(p * u_Frequency + vec3(u_time * u_TimeFrequency));
    return texture2D(u_NoiseTexture, noiseCoord.xy).r * u_Amplitude;
}


float sdSphere(vec3 p,float s){
        return length(p) - s;
        //float displacement = getDisplacement(p) * 0.005;
        //return length(p) - (s + displacement);
    }

float onSmoothUnion(float d1, float d2, float k){
        float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
        return mix(d2, d1, h) - k * h * (1.0 - h);
    }  

float sdf(vec3 p){
    vec3 correct = vec3(u_aspect, 1.0, 1.0) * vec3(0.08, 0.15, 0.2);

    vec3 pos = p + -u_datas[0].position * correct;
    float final = sdSphere(pos, u_datas[0].scale * 0.3); 

    for(int i = 1; i < 24; i++){
        pos = p + -u_datas[i].position * correct;
        float sphere = sdSphere(pos, 0.2 * u_datas[i].scale * 1.6);
        final = onSmoothUnion(final, sphere, 0.02);//0.4
        //final =  min(final, sphere);
    }
    return final;
}

vec3 wavelengthToRGB(float wavelength) {
    vec3 color;

        if (wavelength >= 380.0 && wavelength < 440.0) {
            color = vec3((440.0 - wavelength) / (440.0 - 380.0), 0.0, 1.0);
        } else if (wavelength >= 440.0 && wavelength < 490.0) {
            color = vec3(0.0, (wavelength - 440.0) / (490.0 - 440.0), 1.0);
        } else if (wavelength >= 490.0 && wavelength < 510.0) {
            color = vec3(0.0, 1.0, (510.0 - wavelength) / (510.0 - 490.0));
        } else if (wavelength >= 510.0 && wavelength < 580.0) {
            color = vec3((wavelength - 510.0) / (580.0 - 510.0), 1.0, 0.0);
        } else if (wavelength >= 580.0 && wavelength < 645.0) {
            color = vec3(1.0, (645.0 - wavelength) / (645.0 - 580.0), 0.0);
        } else if (wavelength >= 645.0 && wavelength <= 780.0) {
            color = vec3(1.0, 0.0, 0.0);
        } else {
            color = vec3(0.0);
        }

    // 波長に基づいて強度を調整
    float factor = 0.1;
        if (wavelength >= 380.0 && wavelength < 420.0) {
            factor = 0.1 + 0.9 * (wavelength - 380.0) / (420.0 - 380.0);
        } else if (wavelength >= 420.0 && wavelength <= 700.0) {
            factor = 1.0;
        } else if (wavelength > 700.0 && wavelength <= 780.0) {
            factor = 0.1 + 0.9 * (780.0 - wavelength) / (780.0 - 700.0);
        }

        color *= factor;

        return color;
    }

vec3 applyGammaCorrection(vec3 color, float gamma) {
    return pow(color, vec3(1.0 / gamma));
}


vec3 calcNormal(in vec3 p){
        const float h = 0.0001;
        const vec2 k = vec2(1, -1) * h;
        return normalize( k.xyy * sdf( p + k.xyy ) + 
                          k.yyx * sdf( p + k.yyx ) + 
                          k.yxy * sdf( p + k.yxy ) + 
                          k.xxx * sdf( p + k.xxx ) );
    }

float fresnel(vec3 eye, vec3 normal){
        return pow(1.0 + dot(eye, normal), 3.0);
    }

void main(){
    vec2 centeredUV = (v_uv - 0.5) * vec2(u_aspect, 1.0);
    vec3 ray = normalize(vec3(centeredUV, -1.0));
    //vec3 viewDir = normalize(uCameraPosition - vPosition);
    

    vec3 camPos = vec3(0.0, 0.0, 2.3);
    vec3 rayPos = camPos;
    float totalDist = 0.0;
    float tMax = 5.0;

    for(int i = 0; i < 256; i++){
        float dist = sdf(rayPos);
        if(dist < 0.0001 || totalDist > tMax) break;
        totalDist += dist;
        rayPos = camPos + totalDist * ray;    
    }

    vec2 uv = (v_uv - 0.5) * u_uvScale + 0.5;
    vec4 tex = texture2D(u_texture, uv);
    //tex = vec4(vec3((tex.r + tex.g + tex.b) / 3.0), tex.a);//これが少し暗くなって良い
    //tex = vec4(0.0, 0.0, 0.0, tex.a);
    //tex = vec4(tex.rgb, 0.3);
    tex = vec4(tex.rgb, 0.0);
    vec4 outgoing = tex;

    if(totalDist < tMax){
        vec3 normal = calcNormal(rayPos);
        float f = fresnel(ray, normal);
        //以下追加
        float dotProduct = dot(normalize(normal), ray);        
        float wavelength = mix(u_MinWavelength, u_MaxWavelength, abs(dotProduct));
        vec3 baseColor = mix(vec3(1.0), wavelengthToRGB(clamp(wavelength, u_MinWavelength, u_MaxWavelength)), 1.0 - abs(dotProduct));
    
        // Apply noise
        vec2 repeatUv = fract(v_uv * u_NoiseStrength); // Repeat UV based on strength
        float noiseValue = texture2D(u_NoiseTexture, repeatUv).r; // Sample noise texture
        wavelength += noiseValue * 10.0;

        baseColor = mix(baseColor, wavelengthToRGB(clamp(wavelength, u_MinWavelength, u_MaxWavelength)), noiseValue);
        baseColor = applyGammaCorrection(baseColor, 2.2);

       
        //float len = pow(length(normal.xy), 3.0);
        float len = pow(length(normal.xy), 8.0);
        uv += normal.xy * len * 0.1 * 0.8 * 2.0;

        tex = texture2D(u_texture, uv);

        tex += f * 0.3;
        baseColor = mix(baseColor, tex.rgb, 0.8);
        //outgoing = tex;
        outgoing = vec4(baseColor, 1.0);
    }
    gl_FragColor = outgoing;
}
`;

/*

const fragmentShader = `
struct Data {
    vec3 position;
    float scale;
};

uniform float u_aspect;
uniform Data u_datas[24];
uniform sampler2D u_texture;
uniform vec2 u_uvScale;
varying vec2 v_uv;
uniform float u_time;//時間
uniform float u_filmThickness; // 追加：薄膜厚み
uniform float u_refractiveIndex; // 追加：屈折率
uniform float u_MinWavelength; // 波長の最小値
uniform float u_MaxWavelength; // 波長の最大値
uniform float u_NoiseStrength; // ノイズの強度
uniform sampler2D u_NoiseTexture; // ノイズテクスチャ

float sdSphere(vec3 p,float s){
        return length(p) - s;
    }

float onSmoothUnion(float d1, float d2, float k){
        float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
        return mix(d2, d1, h) - k * h * (1.0 - h);
    }  

float sdf(vec3 p){
    vec3 correct = vec3(u_aspect, 1.0, 1.0) * vec3(0.08, 0.15, 0.2);

    vec3 pos = p + -u_datas[0].position * correct;
    float final = sdSphere(pos, u_datas[0].scale * 0.3); 

    for(int i = 1; i < 24; i++){
        pos = p + -u_datas[i].position * correct;
        float sphere = sdSphere(pos, 0.2 * u_datas[i].scale * 1.6);
        final = onSmoothUnion(final, sphere, 0.02);//0.4
        //final =  min(final, sphere);
    }
    return final;
}

vec3 wavelengthToRGB(float wavelength) {
    vec3 color;

        if (wavelength >= 380.0 && wavelength < 440.0) {
            color = vec3((440.0 - wavelength) / (440.0 - 380.0), 0.0, 1.0);
        } else if (wavelength >= 440.0 && wavelength < 490.0) {
            color = vec3(0.0, (wavelength - 440.0) / (490.0 - 440.0), 1.0);
        } else if (wavelength >= 490.0 && wavelength < 510.0) {
            color = vec3(0.0, 1.0, (510.0 - wavelength) / (510.0 - 490.0));
        } else if (wavelength >= 510.0 && wavelength < 580.0) {
            color = vec3((wavelength - 510.0) / (580.0 - 510.0), 1.0, 0.0);
        } else if (wavelength >= 580.0 && wavelength < 645.0) {
            color = vec3(1.0, (645.0 - wavelength) / (645.0 - 580.0), 0.0);
        } else if (wavelength >= 645.0 && wavelength <= 780.0) {
            color = vec3(1.0, 0.0, 0.0);
        } else {
            color = vec3(0.0);
        }

    // 波長に基づいて強度を調整
    float factor = 0.1;
        if (wavelength >= 380.0 && wavelength < 420.0) {
            factor = 0.1 + 0.9 * (wavelength - 380.0) / (420.0 - 380.0);
        } else if (wavelength >= 420.0 && wavelength <= 700.0) {
            factor = 1.0;
        } else if (wavelength > 700.0 && wavelength <= 780.0) {
            factor = 0.1 + 0.9 * (780.0 - wavelength) / (780.0 - 700.0);
        }

        color *= factor;

        return color;
    }

vec3 applyGammaCorrection(vec3 color, float gamma) {
    return pow(color, vec3(1.0 / gamma));
}


vec3 calcNormal(in vec3 p){
        const float h = 0.0001;
        const vec2 k = vec2(1, -1) * h;
        return normalize( k.xyy * sdf( p + k.xyy ) + 
                          k.yyx * sdf( p + k.yyx ) + 
                          k.yxy * sdf( p + k.yxy ) + 
                          k.xxx * sdf( p + k.xxx ) );
    }

float fresnel(vec3 eye, vec3 normal){
        return pow(1.0 + dot(eye, normal), 3.0);
    }

void main(){
    vec2 centeredUV = (v_uv - 0.5) * vec2(u_aspect, 1.0);
    vec3 ray = normalize(vec3(centeredUV, -1.0));
    //vec3 viewDir = normalize(uCameraPosition - vPosition);
    

    vec3 camPos = vec3(0.0, 0.0, 2.3);
    vec3 rayPos = camPos;
    float totalDist = 0.0;
    float tMax = 5.0;

    for(int i = 0; i < 256; i++){
        float dist = sdf(rayPos);
        if(dist < 0.0001 || totalDist > tMax) break;
        totalDist += dist;
        rayPos = camPos + totalDist * ray;    
    }

    vec2 uv = (v_uv - 0.5) * u_uvScale + 0.5;
    vec4 tex = texture2D(u_texture, uv);
    //tex = vec4(vec3((tex.r + tex.g + tex.b) / 3.0), tex.a);//これが少し暗くなって良い
    //tex = vec4(0.0, 0.0, 0.0, tex.a);
    //tex = vec4(tex.rgb, 0.3);
    tex = vec4(tex.rgb, 0.0);
    vec4 outgoing = tex;

    if(totalDist < tMax){
        vec3 normal = calcNormal(rayPos);
        float f = fresnel(ray, normal);
        //以下追加
        float dotProduct = dot(normalize(normal), ray);        
        float wavelength = mix(u_MinWavelength, u_MaxWavelength, abs(dotProduct));
        vec3 baseColor = mix(vec3(1.0), wavelengthToRGB(clamp(wavelength, u_MinWavelength, u_MaxWavelength)), 1.0 - abs(dotProduct));
    
        // Apply noise
        vec2 repeatUv = fract(v_uv * u_NoiseStrength); // Repeat UV based on strength
        float noiseValue = texture2D(u_NoiseTexture, repeatUv).r; // Sample noise texture
        wavelength += noiseValue * 10.0;

        baseColor = mix(baseColor, wavelengthToRGB(clamp(wavelength, u_MinWavelength, u_MaxWavelength)), noiseValue);
        baseColor = applyGammaCorrection(baseColor, 2.2);

       
        //float len = pow(length(normal.xy), 3.0);
        float len = pow(length(normal.xy), 8.0);
        uv += normal.xy * len * 0.1 * 0.8 * 2.0;

        tex = texture2D(u_texture, uv);

        tex += f * 0.3;
        baseColor = mix(baseColor, tex.rgb, 0.8);
        //outgoing = tex;
        outgoing = vec4(baseColor, 1.0);
    }
    gl_FragColor = outgoing;
}
`;
*/
