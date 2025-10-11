import React from "react";
import * as THREE from "three";
import { createStandardMaterial } from "./MeshUtils";
import { TubeMessage } from "../WebsocketMessages";
import { OutlinesIfHovered } from "../OutlinesIfHovered";
import { findRotation } from "./utils";

/**
 * Component for rendering basic THREE.js meshes
 */
export const TubeMesh = React.forwardRef<
    THREE.Mesh,
    TubeMessage & { children?: React.ReactNode }
>(function TubeMesh(
    { children, ...message },
    ref: React.ForwardedRef<THREE.Mesh>,
) {
    // Create material based on props.
    const material = React.useMemo(() => {
        return createStandardMaterial(message.props);
    }, [
        message.props.material,
        message.props.color,
        message.props.wireframe,
        message.props.opacity,
        message.props.flat_shading,
        message.props.side,
    ]);

    // Setup geometry using memoization.
    const geometry = React.useMemo(() => {
        // Conversion: Uint8Array to Float32Array view, then to Vector3[]
        const floatArray = new Float32Array(
          message.props.points.buffer.slice(
            message.props.points.byteOffset,
            message.props.points.byteOffset +
              message.props.points.byteLength,
          ),
        );
        const points: THREE.Vector3[] = [];
        for (let i = 0; i < floatArray.length; i += 3) {
            points.push(new THREE.Vector3(floatArray[i], floatArray[i + 1], floatArray[i + 2]));
        }

        let curve: THREE.Curve<THREE.Vector3>;
        if (message.props.smooth) {
            curve = new THREE.CatmullRomCurve3(points, message.props.closed, 'catmullrom');
        } else {
            const curvePath = new THREE.CurvePath<THREE.Vector3>();
            for (let i = 0; i < points.length - 1; i++) {
                curvePath.add(new THREE.LineCurve3(points[i], points[i + 1]));
            }
            curve = curvePath;
        }

        const alignmentQuaternion = findRotation(points);
        const alignmentMatrix = new THREE.Matrix4().makeRotationFromQuaternion(alignmentQuaternion);

        const tubularSegments = message.props.tubularSegments;
        const radius = message.props.radius;
        const radialSegments = message.props.radialSegments;
        const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, message.props.closed);
        geometry.applyMatrix4(alignmentMatrix);
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();
        return geometry;
    }, [message.props.points]);

    // Clean up geometry when it changes.
    React.useEffect(() => {
        return () => {
            if (geometry) geometry.dispose();
        };
    }, [geometry]);

    // Clean up material when it changes.
    React.useEffect(() => {
        return () => {
            if (material) material.dispose();
        };
    }, [material]);

    // Check if we should render a shadow mesh.
    const shadowOpacity =
        typeof message.props.recieveShadow === "number"
            ? message.props.recieveShadow
            : 0.0;

    // Create shadow material for shadow mesh.
    const shadowMaterial = React.useMemo(() => {
        if (shadowOpacity === 0.0) return null;
        return new THREE.ShadowMaterial({
            opacity: shadowOpacity,
            color: 0x000000,
            depthWrite: false,
        });
    }, [shadowOpacity]);

    return (
        <mesh
            ref={ref}
            geometry={geometry}
            material={material}
            castShadow={message.props.castShadow}
            receiveShadow={message.props.recieveShadow === true}
        >
            <OutlinesIfHovered
                enableCreaseAngle={
                    geometry.attributes.position.count < 1024 &&
                    geometry.boundingSphere!.radius > 0.1
                }
            />
            {shadowMaterial && shadowOpacity > 0 ? (
                <mesh geometry={geometry} material={shadowMaterial} receiveShadow />
            ) : null}
            {children}
        </mesh>
    );
});
