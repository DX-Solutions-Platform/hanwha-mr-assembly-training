import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2, WebGLRenderTarget } from 'three';
import { theme } from '@/styles/theme';

export function PreviewOutline({ color }: { color?: string }) {
  const invalidate = useThree((state) => state.invalidate);
  const pass = useMemo(() => {
    const target = new WebGLRenderTarget(1, 1);
    const viewport = new Vector2();
    const scene = new Scene(), camera = new OrthographicCamera(-1, 1, 1, -1, 0, 2);
    const geometry = new PlaneGeometry(2, 2);
    const material = new ShaderMaterial({
      depthTest: false, depthWrite: false, premultipliedAlpha: true,
      uniforms: { model: { value: target.texture }, pixel: { value: new Vector2() }, accent: { value: new Color(theme.color.primary) }, contrast: { value: new Vector2(.44, 0) } },
      vertexShader: 'varying vec2 uvOnScreen; void main() { uvOnScreen = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        uniform sampler2D model;
        uniform vec2 pixel;
        uniform vec3 accent;
        uniform vec2 contrast;
        varying vec2 uvOnScreen;

        float nearby(vec2 delta) {
          vec2 uv = uvOnScreen + delta * pixel;
          return texture2D(model, uv).a;
        }

        void main() {
          vec4 base = texture2D(model, uvOnScreen);
          float edge = max(max(nearby(vec2(-1.0, 0.0)), nearby(vec2(1.0, 0.0))), max(nearby(vec2(0.0, -1.0)), nearby(vec2(0.0, 1.0))));
          float glow = max(max(nearby(vec2(-2.0, -1.0)), nearby(vec2(2.0, 1.0))), max(nearby(vec2(-1.0, 2.0)), nearby(vec2(1.0, -2.0))));
          float halo = max(edge, glow * .25) * contrast.x * (1.0 - base.a);
          base.rgb += sqrt(max(base.rgb, vec3(0.0)) + .0004) * contrast.y;
          float alpha = base.a + halo;
          gl_FragColor = vec4((base.rgb * base.a + accent * halo) / max(alpha, .0001), alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <premultiplied_alpha_fragment>
        }
      `,
    });
    const screen = new Mesh(geometry, material);
    screen.frustumCulled = false;
    scene.add(screen);
    return { target, viewport, scene, camera, geometry, material };
  }, []);
  useEffect(() => () => { pass.target.dispose(); pass.geometry.dispose(); pass.material.dispose(); }, [pass]);
  useEffect(() => {
    const surface = new Color(color ?? theme.color.inkMuted);
    const dark = .2126 * surface.r + .7152 * surface.g + .0722 * surface.b < .09;
    pass.material.uniforms.contrast.value.set(dark ? .78 : .44, dark ? .16 : 0);
    invalidate();
  }, [pass, color, invalidate]);
  useFrame(({ gl, scene, camera }) => {
    gl.getDrawingBufferSize(pass.viewport);
    const width = Math.max(1, pass.viewport.x), height = Math.max(1, pass.viewport.y);
    if (pass.target.width !== width || pass.target.height !== height) pass.target.setSize(width, height);
    pass.material.uniforms.pixel.value.set(1 / width, 1 / height);
    const previousTarget = gl.getRenderTarget();
    gl.setRenderTarget(pass.target);
    try { gl.render(scene, camera); }
    finally { gl.setRenderTarget(previousTarget); }
    gl.render(pass.scene, pass.camera);
  }, 1);
  return null;
}
