import { Matrix3, Quaternion, Vector3 } from "three"

/**
 * An auxiliary function used for a multiplication of Vector3 with a 3x3 matrix
 * @returns The Vector3 that results from the operation
 */
export function mat3x3Vec3Mul(mat: Matrix3, vec: Vector3): Vector3 {
    return new Vector3(
        mat.elements[0] * vec.x + mat.elements[1] * vec.y + mat.elements[2] * vec.z,
        mat.elements[3] * vec.x + mat.elements[4] * vec.y + mat.elements[5] * vec.z,
        mat.elements[6] * vec.x + mat.elements[7] * vec.y + mat.elements[8] * vec.z
    );
}

/**
 * Decomposes iteratively the matrix into its eigenvectors and eigenvalues, assumes that the matrix is symmetric
 * @param matrix The matrix to be decomposed
 * @returns The 3 eigenvectors and associated eigenvalues
 */
export function eigenDecomposition(matrix: Matrix3): { eigenvectors: Vector3[]; eigenvalues: number[] } {
    const iterationNumber = 15;
    let v = new Vector3(1, 0, 0);
    for (let i = 0; i < iterationNumber; i++) {
        v = mat3x3Vec3Mul(matrix, v).normalize();
    }

    const lambda1 = mat3x3Vec3Mul(matrix, v).dot(v);
    const v1 = v.clone();
    const outer = new Matrix3();
    outer.set(
        v1.x * v1.x, v1.x * v1.y, v1.x * v1.z,
        v1.y * v1.x, v1.y * v1.y, v1.y * v1.z,
        v1.z * v1.x, v1.z * v1.y, v1.z * v1.z
    );
    outer.multiplyScalar(lambda1);
    const deflated = new Matrix3().copy(matrix);
    for (let i = 0; i < 9; i++) {
        deflated.elements[i] -= outer.elements[i];
    }

    v = new Vector3(0, 1, 0);
    for (let i = 0; i < iterationNumber; i++) {
        v = mat3x3Vec3Mul(deflated, v).normalize();
    }

    const lambda2 = mat3x3Vec3Mul(deflated, v).dot(v);
    const v2 = v.clone();
    const v3 = new Vector3().crossVectors(v1, v2).normalize();
    return { eigenvectors: [v1, v2, v3], eigenvalues: [lambda1, lambda2, 0] };
}

/**
 * Creates the covariance matrix from a set of points, the three coordinates xyz are considered as random variables
 * @param points List of points
 * @returns The 3x3 symmetric covariance matrix
 */
export function createCovarianceMatrixFromPoints(points: Vector3[]): Matrix3 {
    const centroid = new Vector3(0., 0., 0.,);
    points.forEach(element => centroid.add(element));
    centroid.divideScalar(points.length);
    const centered = points.map(point => new Vector3().subVectors(point, centroid));
    const matrix = new Matrix3();
    matrix.set(0., 0., 0., 0., 0., 0., 0., 0., 0.,);
    centered.forEach(element => {
        matrix.elements[0] += element.x*element.x;
        matrix.elements[1] += element.x*element.y;
        matrix.elements[2] += element.x*element.z;
        matrix.elements[3] += element.y*element.x;
        matrix.elements[4] += element.y*element.y;
        matrix.elements[5] += element.y*element.z;
        matrix.elements[6] += element.z*element.x;
        matrix.elements[7] += element.z*element.y;
        matrix.elements[8] += element.z*element.z;
    });
    matrix.multiplyScalar(1/(points.length-1));
    return matrix;
}

/**
 * Finds the rotation that aligns an object with the xy plane as much as possible using the principal component analysis
 * @param points The list of points of the object
 * @returns The rotation that is necessary to apply to the object to align it into the xy plane (quaternion)
 */
export function findRotation(points: Vector3[]): Quaternion {
    const matrix = createCovarianceMatrixFromPoints(points);
    const { eigenvectors } = eigenDecomposition(matrix);
    const normal = eigenvectors[2];
    const zVector = new Vector3(0., 0., 1.);
    const rotation = new Quaternion();
    rotation.setFromUnitVectors(normal, zVector);
    return rotation;
}