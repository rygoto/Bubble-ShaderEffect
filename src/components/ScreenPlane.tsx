import { FC, useEffect } from 'react'
import * as THREE from 'three'
import { Plane, useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
//import { datas } from './Data'
//import { vertexShader, fragmentShader } from './shaders'

type Data = {
    position: THREE.Vector3
    scale: number
    direction: THREE.Vector3
}

const datas: Data[] = [...Array(24)].map(() => {
    const position = new THREE.Vector3(THREE.MathUtils.randFloat(-10, -11), THREE.MathUtils.randFloat(-3.5, -3.3), 0)
    const scale = THREE.MathUtils.randFloat(0.2, 1.2)
    const direction = new THREE.Vector3(THREE.MathUtils.randFloat(0.9, 0.5), THREE.MathUtils.randFloat(0.6, 0.2), THREE.MathUtils.randFloat(0.8, 0.2))
    return { position, scale, direction }
})

export const ScreenPlane: FC = () => {


    const { viewport, camera } = useThree()
    //const texture = useTexture('/no05-super-169.jpg')
    const texture = useTexture('/city1-1.jpg')
    texture.wrapS = THREE.MirroredRepeatWrapping
    texture.wrapT = THREE.MirroredRepeatWrapping

    const textureAspect = texture.image.width / texture.image.height
    const aspect = viewport.aspect
    const ratio = aspect / textureAspect
    const [x, y] = aspect < textureAspect ? [ratio, 1] : [1, 1 / ratio]

    //const texture2 = useTexture('/sky.png')
    const texture2 = useTexture('/city1-2.jpg')
    texture2.wrapS = THREE.MirroredRepeatWrapping
    texture2.wrapT = THREE.MirroredRepeatWrapping

    const shader = {
        uniforms: {
            u_aspect: { value: viewport.aspect },
            u_datas: { value: datas },
            u_texture: { value: texture },
            u_uvScale: { value: new THREE.Vector2(x, y) },
            //以下追加
            u_time: { value: 0 },
            u_filmThickness: { value: 0.1 }, // 追加：薄膜厚み
            u_refractiveIndex: { value: 1.33 }, // 追加：屈折率
            u_MinWavelength: { value: 380.0 }, // 波長の最小値
            u_MaxWavelength: { value: 780.0 }, // 波長の最大値
            u_NoiseStrength: { value: 3.0 }, // ノイズの強度
            u_NoiseTexture: { value: useTexture('/noisetexture.png') }, // ノイズテクスチャnoisetexture.png
        },
        vertexShader,
        fragmentShader,
        side: THREE.DoubleSide,
    };

    useFrame(() => {
        shader.uniforms.u_time.value += 0.01;
    });

    // マウス位置をワールド座標に変換する関数
    /*const getWorldPosition = (event: MouseEvent | Touch) => {
        const x = (event.clientX / window.innerWidth) * 2 - 1
        const y = -(event.clientY / window.innerHeight) * 2 + 1
        const vector = new THREE.Vector3(x, y, 0)
        vector.unproject(camera)
        console.log(vector)
        return vector
    }

    const generateNewParticles = (worldPos: THREE.Vector3) => {
        const newDatas = Array(5).fill(null).map(() => ({
            position: new THREE.Vector3(
                worldPos.x,
                worldPos.y,
                worldPos.z
            ),
            scale: THREE.MathUtils.randFloat(0.5, 1.5)
        }))

        datas.push(...newDatas)
    }

    const handleInteraction = (event: MouseEvent | Touch) => {
        const worldPos = getWorldPosition(event)
        generateNewParticles(worldPos)
    }*/

    useFrame(() => {
        datas.forEach((data) => {
            const speed = THREE.MathUtils.randFloat(0.12, 0.08)
            const speedScale = 0.8
            data.position.x += data.direction.x * speed * speedScale;
            data.position.y += data.direction.y * speed * speedScale;
            //data.position.z += data.direction.z * speed * speedScale;
            data.position.x += THREE.MathUtils.randFloat(-0.01, 0.01);// x をランダムに揺らす
            data.position.z += THREE.MathUtils.randFloat(-0.01, 0.01);
            data.scale *= 0.997
        });
    }
    );

    useFrame(() => {
        datas.forEach((data, i) => {
            shader.uniforms.u_datas.value[i].position.copy(data.position)
        })
    })

    return (
        <>
            <ambientLight intensity={1.5} />
            <Plane
                args={[1, 1]}
                scale={[viewport.width, viewport.height * 0.9, 1]}
                position={[0, 0, -0.01]}
            //onClick={(e) => handleInteraction(e.nativeEvent)}
            >
                <meshStandardMaterial attach="material" map={texture2} />
            </Plane>
            <Plane
                args={[1, 1]}
                scale={[viewport.width, viewport.height, 1]}
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

       
        float len = pow(length(normal.xy), 3.0);
        uv += normal.xy * len * 0.1 * 0.8;

        tex = texture2D(u_texture, uv);

        tex += f * 0.3;
        baseColor = mix(baseColor, tex.rgb, 0.8);
        //outgoing = tex;
        outgoing = vec4(baseColor, 1.0);
    }
    gl_FragColor = outgoing;
}
`;
