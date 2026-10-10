// Keep only running panes in the session saved for the next app launch.
// Collapsing a split also updates the active pane's path in that saved tree.
export function serializeRestorableNode(node, activeLeaf, serializeProfile) {
  if (!node) return null;
  if (node.type === "leaf") {
    const leaf = node.leaf;
    if (leaf.closed || leaf.closing || leaf.exited) return null;
    return {
      layout: { type: "leaf", profile: serializeProfile(leaf.profile) },
      activePane: leaf === activeLeaf ? "" : null,
    };
  }

  const a = serializeRestorableNode(node.a, activeLeaf, serializeProfile);
  const b = serializeRestorableNode(node.b, activeLeaf, serializeProfile);
  if (!a) return b;
  if (!b) return a;
  return {
    layout: {
      type: "split",
      dir: node.dir,
      sizes: [...node.sizes],
      a: a.layout,
      b: b.layout,
    },
    activePane: a.activePane !== null
      ? `a${a.activePane}`
      : b.activePane !== null ? `b${b.activePane}` : null,
  };
}
