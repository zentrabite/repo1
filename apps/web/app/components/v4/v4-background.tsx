/**
 * Pure CSS ambient background for the 3D landing v4 — three radial-gradient
 * blobs that drift on mouse-move (handled by V4Effects). Replaces the v4
 * prototype's three.js layer.
 */
export function V4Background() {
  return (
    <>
      <div id="prog" />
      <div className="blob blob-a" id="blob-a" />
      <div className="blob blob-b" id="blob-b" />
      <div className="blob blob-c" id="blob-c" />
    </>
  );
}
