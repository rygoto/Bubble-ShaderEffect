//https://www.youtube.com/watch?v=9l5xcM20pKs
//https://www.styublog.com/shader/soap_bubble

const vertexshader =
{
    uniform float uTime;
    uniform int uOctaves;
    uniform float uTimeFrequency;
    uniform float uAmplitude;
    uniform float uFrequency;

    attribute vec4 tangent;

    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 varyNormal;

    // Permutation function for noise
    vec3 permute(vec3 x) {
        return mod(((x * 34.0) + 1.0) * x, 289.0);
    }

// Noise function
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
    float amplitude = uAmplitude;
    float frequency = 1.0;
        for (int i = 0; i < octaves; i++) {
            noiseValue += amplitude * noise(p * frequency);
            amplitude *= 0.5;
            frequency *= 2.0;
        }
        return noiseValue;
    }


float getDisplacement(vec3 p) {
        return fractalNoise(p * uFrequency + vec3(uTime * uTimeFrequency), uOctaves);
    }

float getDisplacementEffect(float noiseValue) {
        return sin(noiseValue) * cos(noiseValue);
    }

void main() {

        vec3 biTangent = cross(normal, tangent.xyz);
  float shift = 0.01;
  vec3 positionA = csm_Position + tangent.xyz * shift;
  vec3 positionB = csm_Position + biTangent * shift;

vPosition = position;

  float displacement = getDisplacementEffect(getDisplacement(vPosition));
  float displacementA = getDisplacementEffect(getDisplacement(positionA));
  float displacementB = getDisplacementEffect(getDisplacement(positionB));

csm_Position += normal * displacement;
positionA += normal * displacementA;
positionB += normal * displacementB;

  vec3 toA = normalize(positionA - csm_Position);
  vec3 toB = normalize(positionB - csm_Position);
csm_Normal = normalize(cross(toA, toB));

vUv = uv;
varyNormal = csm_Normal;
}
}


const fragmentshader = {
    varying vec2 vUv;
    varying vec3 varyNormal;
    varying vec3 vPosition;

    uniform float uOpacity;
    uniform vec3 uCameraPosition;
    uniform sampler2D uNoiseTexture;
    uniform float uNoiseStrength;
    uniform float uMinWavelength;
    uniform float uMaxWavelength;

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


void main() {
        //camera direction effect
        vec3 viewDir = normalize(uCameraPosition - vPosition);
        float dotProduct = dot(normalize(varyNormal), viewDir);
        float wavelength = mix(uMinWavelength, uMaxWavelength, abs(dotProduct));
        vec3 baseColor = mix(vec3(1.0), wavelengthToRGB(clamp(wavelength, uMinWavelength, uMaxWavelength)), 1.0 - abs(dotProduct));

        //noise effect
        vec2 repeatUv = fract(vUv * uNoiseStrength);
        float noiseValue = texture(uNoiseTexture, repeatUv).r;

// //combine effects
wavelength += noiseValue;
baseColor = mix(baseColor, wavelengthToRGB(clamp(wavelength, uMinWavelength, uMaxWavelength)), noiseValue);
baseColor = applyGammaCorrection(baseColor, 2.2);

csm_DiffuseColor.rgb = vec3(baseColor);
csm_DiffuseColor.a = uOpacity;

csm_Roughness = .0;
csm_Metalness = 1.0;
}
};